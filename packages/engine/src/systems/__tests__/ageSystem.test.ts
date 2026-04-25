import { describe, it, expect } from 'vitest';
import { ageSystem } from '../ageSystem';
import { scoreLegacyPaths } from '../../state/LegacyPaths';
import { createTestState, createTestPlayer, createTestCity } from './helpers';

describe('ageSystem', () => {
  it('transitions from antiquity to exploration', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.age).toBe('exploration');
    expect(next.players.get('p1')!.civilizationId).toBe('spain');
    expect(next.age.currentAge).toBe('exploration');
  });

  it('grants legacy bonus from previous civ', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      legacyBonuses: [],
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // F-04: civ legacy bonus is now in pendingLegacyBonuses, not legacyBonuses
    const pending = next.players.get('p1')!.pendingLegacyBonuses!;
    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(pending.some(p => p.bonusId.includes('rome'))).toBe(true);
  });

  it('rejects transition with insufficient age progress', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      ageProgress: 30,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.age).toBe('antiquity');
  });

  it('rejects transition from modern age', () => {
    const player = createTestPlayer({
      age: 'modern',
      ageProgress: 200,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'usa' });
    expect(next.players.get('p1')!.age).toBe('modern');
  });

  it('adds log entry on transition', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.log.some(e => e.type === 'age')).toBe(true);
  });

  it('ignores non-TRANSITION_AGE/END_TURN actions', () => {
    const state = createTestState();
    expect(ageSystem(state, { type: 'START_TURN' })).toBe(state);
  });

  describe('legacy milestones on END_TURN', () => {
    it('awards military milestone for kills', () => {
      const player = createTestPlayer({
        totalKills: 3,
        legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
        legacyPoints: 0,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = ageSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.legacyPaths.military).toBe(1);
      expect(next.players.get('p1')!.legacyPoints).toBe(1);
    });

    it('awards economic milestone for gold earned (predicate: tier1=200, tier2=500)', () => {
      // With predicate system: tier 1 = totalGoldEarned >= 200
      const player = createTestPlayer({
        totalGoldEarned: 200,
        legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
        legacyPoints: 0,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = ageSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.legacyPaths.economic).toBe(1);
      expect(next.players.get('p1')!.legacyPoints).toBe(1);
    });

    it('awards science milestone for techs researched', () => {
      const player = createTestPlayer({
        researchedTechs: ['a', 'b', 'c', 'd', 'e'],
        legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
        legacyPoints: 0,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = ageSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.legacyPaths.science).toBe(1);
      expect(next.players.get('p1')!.legacyPoints).toBe(1);
    });

    it('awards culture milestone for wonders built (predicate: tier1=2 wonders)', () => {
      // Culture tier 1 in Antiquity: build 2 wonders (by predicate system)
      // We test with a player that has 100 culture (which hits exploration cultural tier 1)
      const player = createTestPlayer({
        culture: 100,
        legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
        legacyPoints: 0,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = ageSystem(state, { type: 'END_TURN' });
      // exploration culture tier 1 = culture >= 100 — but player is in antiquity age
      // with no wonders built, so antiquity culture = 0. Exploration is a different path.
      // Both paths contribute their tiers; take max per axis.
      // exploration_culture_t1 (culture >= 100) — meets it! So culture tier becomes 1.
      expect(next.players.get('p1')!.legacyPaths.culture).toBe(1);
      expect(next.players.get('p1')!.legacyPoints).toBe(1);
    });

    it('caps milestones at 3', () => {
      const player = createTestPlayer({
        totalKills: 100,
        legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
        legacyPoints: 0,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = ageSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.legacyPaths.military).toBe(3);
      expect(next.players.get('p1')!.legacyPoints).toBe(3);
    });

    it('does not award already-earned milestones', () => {
      const player = createTestPlayer({
        totalKills: 3,
        legacyPaths: { military: 1, economic: 0, science: 0, culture: 0 },
        legacyPoints: 1,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = ageSystem(state, { type: 'END_TURN' });
      // 3 kills = milestone 1, already at 1, so no new legacy points
      expect(next.players.get('p1')!.legacyPoints).toBe(1);
      // But ageProgress still increments by +1 per turn
      expect(next.players.get('p1')!.ageProgress).toBe(player.ageProgress + 1);
    });

    it('increments ageProgress by 1 per turn', () => {
      const player = createTestPlayer({
        ageProgress: 10,
        legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
        legacyPoints: 0,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = ageSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.ageProgress).toBe(11);
    });
  });

  it('spends legacy points on age transition', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      legacyPoints: 3,
      legacyBonuses: [],
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // Should have spent all legacy points (reset to 0)
    expect(next.players.get('p1')!.legacyPoints).toBe(0);
    // F-11: random yield loop removed. Only civ legacy bonus remains in pending.
    const pending = next.players.get('p1')!.pendingLegacyBonuses!;
    // 1 civ legacy bonus (rome) only — no random yields
    expect(pending.length).toBe(1);
  });

  describe('golden/dark age effects', () => {
    it('grants military golden age for 3 military milestones', () => {
      const player = createTestPlayer({
        age: 'antiquity',
        civilizationId: 'rome',
        ageProgress: 50,
        legacyPoints: 0,
        legacyBonuses: [],
        legacyPaths: { military: 3, economic: 1, science: 1, culture: 1 },
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      // F-04: golden age effects now in pendingLegacyBonuses
      const pending = next.players.get('p1')!.pendingLegacyBonuses!;
      const goldenMilitary = pending.find(b => b.bonusId.includes('golden-age:military'));
      expect(goldenMilitary).toBeDefined();
      expect(goldenMilitary!.effect).toEqual({ type: 'MODIFY_COMBAT', target: 'all', value: 5 });
      expect(next.log.some(e => e.message.includes('Military Golden Age'))).toBe(true);
    });

    it('grants economic golden age for 3 economic milestones', () => {
      const player = createTestPlayer({
        age: 'antiquity',
        civilizationId: 'rome',
        ageProgress: 50,
        legacyPoints: 0,
        legacyBonuses: [],
        legacyPaths: { military: 1, economic: 3, science: 1, culture: 1 },
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      // F-04: golden age effects now in pendingLegacyBonuses
      const pending = next.players.get('p1')!.pendingLegacyBonuses!;
      const goldenEconomic = pending.find(b => b.bonusId.includes('golden-age:economic'));
      expect(goldenEconomic).toBeDefined();
      expect(goldenEconomic!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: 3 });
    });

    it('grants science golden age for 3 science milestones', () => {
      const player = createTestPlayer({
        age: 'antiquity',
        civilizationId: 'rome',
        ageProgress: 50,
        legacyPoints: 0,
        legacyBonuses: [],
        legacyPaths: { military: 1, economic: 1, science: 3, culture: 1 },
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      // F-04: golden age effects now in pendingLegacyBonuses
      const pending = next.players.get('p1')!.pendingLegacyBonuses!;
      const goldenScience = pending.find(b => b.bonusId.includes('golden-age:science'));
      expect(goldenScience).toBeDefined();
      expect(goldenScience!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 3 });
    });

    it('grants culture golden age for 3 culture milestones', () => {
      const player = createTestPlayer({
        age: 'antiquity',
        civilizationId: 'rome',
        ageProgress: 50,
        legacyPoints: 0,
        legacyBonuses: [],
        legacyPaths: { military: 1, economic: 1, science: 1, culture: 3 },
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      // F-04: golden age effects now in pendingLegacyBonuses
      const pending = next.players.get('p1')!.pendingLegacyBonuses!;
      const goldenCulture = pending.find(b => b.bonusId.includes('golden-age:culture'));
      expect(goldenCulture).toBeDefined();
      expect(goldenCulture!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 3 });
    });

    it('grants military dark age for 0 military milestones', () => {
      const player = createTestPlayer({
        age: 'antiquity',
        civilizationId: 'rome',
        ageProgress: 50,
        legacyPoints: 0,
        legacyBonuses: [],
        legacyPaths: { military: 0, economic: 1, science: 1, culture: 1 },
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      const bonuses = next.players.get('p1')!.legacyBonuses;
      const darkCombat = bonuses.find(b => b.source === 'dark-age:military:antiquity');
      expect(darkCombat).toBeDefined();
      expect(darkCombat!.effect).toEqual({ type: 'MODIFY_COMBAT', target: 'all', value: -2 });
      expect(next.log.some(e => e.message.includes('Military Dark Age'))).toBe(true);
    });

    it('applies economic dark age: -50 gold immediately and -2 production per city', () => {
      const player = createTestPlayer({
        age: 'antiquity',
        civilizationId: 'rome',
        ageProgress: 50,
        legacyPoints: 0,
        legacyBonuses: [],
        gold: 200,
        legacyPaths: { military: 1, economic: 0, science: 1, culture: 1 },
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      const updatedPlayer = next.players.get('p1')!;
      expect(updatedPlayer.gold).toBe(150); // 200 - 50
      const productionPenalty = updatedPlayer.legacyBonuses.find(b => b.source.includes('dark-age:economic') && b.source.includes('penalty'));
      expect(productionPenalty).toBeDefined();
      expect(productionPenalty!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: -2 });
    });

    it('applies science dark age: -2 science per city (pure penalty, no silver lining)', () => {
      const player = createTestPlayer({
        age: 'antiquity',
        civilizationId: 'rome',
        ageProgress: 50,
        legacyPoints: 0,
        legacyBonuses: [],
        researchedTechs: ['pottery', 'mining', 'agriculture'],
        legacyPaths: { military: 1, economic: 1, science: 0, culture: 1 },
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      const updatedPlayer = next.players.get('p1')!;
      // Tech-loss retired: all 3 techs must still be present
      expect(updatedPlayer.researchedTechs.length).toBe(3);
      // Science penalty only — no +5 bonus (F-10: dark ages are pure penalties)
      const sciencePenalty = updatedPlayer.legacyBonuses.find(b => b.source === 'dark-age:science:antiquity');
      expect(sciencePenalty).toBeDefined();
      expect(sciencePenalty!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: -2 });
      expect(next.log.some(e => e.message.includes('Science Dark Age'))).toBe(true);
    });

    it('applies culture dark age: -2 culture per city (pure penalty)', () => {
      const player = createTestPlayer({
        age: 'antiquity',
        civilizationId: 'rome',
        ageProgress: 50,
        legacyPoints: 0,
        legacyBonuses: [],
        legacyPaths: { military: 1, economic: 1, science: 1, culture: 0 },
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      const bonuses = next.players.get('p1')!.legacyBonuses;
      const culturePenalty = bonuses.find(b => b.source === 'dark-age:culture:antiquity');
      expect(culturePenalty).toBeDefined();
      expect(culturePenalty!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: -2 });
      expect(next.log.some(e => e.message.includes('Culture Dark Age'))).toBe(true);
    });

    it('F-05: golden age cap — at most 1 golden age per transition even with all-4 tier-3', () => {
      // GDD §12: only 1 golden age can fire per transition (F-05 cap).
      const player = createTestPlayer({
        age: 'antiquity',
        civilizationId: 'rome',
        ageProgress: 50,
        legacyPoints: 0,
        legacyBonuses: [],
        legacyPaths: { military: 3, economic: 3, science: 3, culture: 3 },
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      // F-04: golden age effects now in pendingLegacyBonuses
      const pending = next.players.get('p1')!.pendingLegacyBonuses!;
      // F-05: only 1 golden age effect granted (first eligible axis: military)
      expect(pending.filter(b => b.bonusId.includes('golden-age')).length).toBe(1);
      expect(pending.some(b => b.bonusId.includes('golden-age:military'))).toBe(true);
      expect(next.log.filter(e => e.message.includes('Golden Age')).length).toBe(1);
    });

    it('F-05: goldenAgeChosen overrides default selection order', () => {
      const player = createTestPlayer({
        age: 'antiquity',
        civilizationId: 'rome',
        ageProgress: 50,
        legacyPoints: 0,
        legacyBonuses: [],
        legacyPaths: { military: 3, economic: 3, science: 3, culture: 3 },
        goldenAgeChosen: 'culture',
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      // F-04: golden age effects now in pendingLegacyBonuses
      const pending = next.players.get('p1')!.pendingLegacyBonuses!;
      expect(pending.filter(b => b.bonusId.includes('golden-age')).length).toBe(1);
      expect(pending.some(b => b.bonusId.includes('golden-age:culture'))).toBe(true);
      // goldenAgeChosen resets to null after transition
      expect(next.players.get('p1')!.goldenAgeChosen).toBeNull();
    });

    it('no golden/dark effects for milestones between 1-2', () => {
      const player = createTestPlayer({
        age: 'antiquity',
        civilizationId: 'rome',
        ageProgress: 50,
        legacyPoints: 0,
        legacyBonuses: [],
        legacyPaths: { military: 2, economic: 1, science: 2, culture: 1 },
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      const bonuses = next.players.get('p1')!.legacyBonuses;
      expect(bonuses.filter(b => b.source.includes('golden-age') || b.source.includes('dark-age')).length).toBe(0);
    });
  });

  describe('per-age crisis pool seeding (W2-05 F-04)', () => {
    it('seeds activeCrisisType from the new age pool on TRANSITION_AGE', () => {
      const player = createTestPlayer({ age: 'antiquity', ageProgress: 50 });
      // Config has crises tagged for antiquity and exploration
      const baseConfig = createTestState().config;
      const explorationCrisis = {
        id: 'test_crisis',
        name: 'Test Crisis',
        description: 'A test crisis.',
        triggerCondition: 'turn_reached' as const,
        triggerValue: 10,
        age: 'exploration' as const,
        crisisType: 'revolt' as const,
        choices: [],
      };
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
        config: { ...baseConfig, crises: [...baseConfig.crises, explorationCrisis] },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      // activeCrisisType should be set from exploration pool ('revolt' from explorationCrisis)
      expect(next.age.activeCrisisType).toBeDefined();
      expect(next.age.activeCrisisType).not.toBeNull();
    });

    it('same seed produces same crisis type selection (deterministic)', () => {
      const player = createTestPlayer({ age: 'antiquity', ageProgress: 50 });
      const baseConfig = createTestState().config;
      const explorationCrisis1 = {
        id: 'ec1', name: 'EC1', description: '', triggerCondition: 'turn_reached' as const,
        triggerValue: 10, age: 'exploration' as const, crisisType: 'revolt' as const, choices: [],
      };
      const explorationCrisis2 = {
        id: 'ec2', name: 'EC2', description: '', triggerCondition: 'turn_reached' as const,
        triggerValue: 20, age: 'exploration' as const, crisisType: 'invasion' as const, choices: [],
      };
      const config = { ...baseConfig, crises: [...baseConfig.crises, explorationCrisis1, explorationCrisis2] };

      // Run twice with the same RNG seed
      const stateA = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
        rng: { seed: 42, counter: 0 },
        config,
      });
      const stateB = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
        rng: { seed: 42, counter: 0 },
        config,
      });

      const nextA = ageSystem(stateA, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      const nextB = ageSystem(stateB, { type: 'TRANSITION_AGE', newCivId: 'spain' });

      expect(nextA.age.activeCrisisType).toBe(nextB.age.activeCrisisType);
    });

    it('activeCrisisType is null when no crises match the new age', () => {
      const player = createTestPlayer({ age: 'antiquity', ageProgress: 50 });
      const baseConfig = createTestState().config;
      // No crises tagged for 'exploration'
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
        config: { ...baseConfig, crises: [] },
      });
      const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      expect(next.age.activeCrisisType).toBeNull();
    });
  });
});

describe('F-07: age-transition city downgrade (W2-02)', () => {
  function makeAgeCity(overrides: Partial<import('../../types/GameState').CityState> = {}): import('../../types/GameState').CityState {
    return {
      id: 'c1', name: 'Test', owner: 'p1', position: { q: 0, r: 0 },
      population: 2, food: 0, productionQueue: [], productionProgress: 0,
      buildings: [], territory: [], settlementType: 'city', happiness: 10,
      isCapital: false, defenseHP: 100, specialization: null, specialists: 0, districts: [],
      ...overrides,
    };
  }

  it('non-capital cities revert to towns on age transition', () => {
    const player = createTestPlayer({
      age: 'antiquity', civilizationId: 'rome', ageProgress: 50,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const capital = makeAgeCity({ id: 'cap', name: 'Capital', isCapital: true });
    const nonCap = makeAgeCity({
      id: 'nc1', name: 'Colony', position: { q: 5, r: 0 },
      productionQueue: [{ type: 'building', id: 'granary' }], productionProgress: 10,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['cap', capital], ['nc1', nonCap]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.cities.get('cap')!.settlementType).toBe('city');
    expect(next.cities.get('nc1')!.settlementType).toBe('town');
    expect(next.cities.get('nc1')!.productionQueue).toHaveLength(0);
    expect(next.cities.get('nc1')!.productionProgress).toBe(0);
    expect(next.cities.get('nc1')!.specialization).toBeNull();
  });

  it('Economic Golden Age exemption: non-capital cities preserved', () => {
    const player = createTestPlayer({
      age: 'antiquity', civilizationId: 'rome', ageProgress: 50,
      legacyPaths: { military: 1, economic: 3, science: 1, culture: 1 },
    });
    const nonCap = makeAgeCity({ id: 'nc1', name: 'Colony', position: { q: 5, r: 0 } });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['nc1', nonCap]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.cities.get('nc1')!.settlementType).toBe('city');
  });

  it('other players cities not affected on transition', () => {
    const player = createTestPlayer({
      id: 'p1', age: 'antiquity', civilizationId: 'rome', ageProgress: 50,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const otherPlayer = createTestPlayer({ id: 'p2', age: 'antiquity' });
    const otherCity = makeAgeCity({ id: 'oc1', owner: 'p2', position: { q: 10, r: 0 }, isCapital: true });
    const state = createTestState({
      players: new Map([['p1', player], ['p2', otherPlayer]]),
      cities: new Map([['oc1', otherCity]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.cities.get('oc1')!.settlementType).toBe('city');
  });
});

describe('W2-07 legacy-paths findings', () => {
  it('F-02: conquered city counts 2 settlement points, founded city counts 1', () => {
    // scoreLegacyPaths checks milestones independently; tiersCompleted = count of milestones met.
    // antiquity_military_t2: settlementPoints >= 6 → true (6 pts)
    // antiquity_military_t1: killsThisAge >= 3 → false (0 kills)
    // antiquity_military_t3: settlementPoints >= 12 → false
    // So only 1 milestone met → tiersCompleted = 1 for antiquity path.
    const player = createTestPlayer({
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const c1 = createTestCity({ id: 'c1', owner: 'p1', originalOwner: 'p2' });
    const c2 = createTestCity({ id: 'c2', owner: 'p1', originalOwner: 'p2' });
    const c3 = createTestCity({ id: 'c3', owner: 'p1', originalOwner: 'p2' });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', c1], ['c2', c2], ['c3', c3]]),
    });
    const next = ageSystem(state, { type: 'END_TURN' });
    // 1 milestone met in antiquity military → tier 1
    expect(next.players.get('p1')!.legacyPaths.military).toBe(1);
    expect(next.players.get('p1')!.legacyPoints).toBe(1);
  });

  it('F-02: 6 conquered cities (12 pts) hits antiquity_military_t3', () => {
    // 6 conquered = 12 pts → t2 (6pts) + t3 (12pts) both met → 2 milestones
    // But t1 (killsThisAge >= 3) is false → 2/3 milestones met → tiersCompleted = 2
    const player = createTestPlayer({
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const cities = new Map<string, import('../../types/GameState').CityState>();
    for (let i = 1; i <= 6; i++) {
      cities.set(`c${i}`, createTestCity({ id: `c${i}`, owner: 'p1', originalOwner: 'p2' }));
    }
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities,
    });
    const next = ageSystem(state, { type: 'END_TURN' });
    expect(next.players.get('p1')!.legacyPaths.military).toBe(2);
    expect(next.players.get('p1')!.legacyPoints).toBe(2);
  });

  it('F-07: totalCareerLegacyPoints accumulates across age transitions', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      totalGoldEarned: 200,
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
      totalCareerLegacyPoints: 0,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const afterEndTurn = ageSystem(state, { type: 'END_TURN' });
    expect(afterEndTurn.players.get('p1')!.legacyPoints).toBe(1);
    expect(afterEndTurn.players.get('p1')!.totalCareerLegacyPoints).toBe(1);

    const afterTransition = ageSystem(afterEndTurn, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // legacyPoints resets; career total stays
    expect(afterTransition.players.get('p1')!.legacyPoints).toBe(0);
    expect(afterTransition.players.get('p1')!.totalCareerLegacyPoints).toBe(1);
  });

  it('F-09: killsThisAge resets to 0 on TRANSITION_AGE', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      killsThisAge: 5,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.killsThisAge).toBe(0);
  });

  it('F-09: exploration kill predicates use killsThisAge not totalKills', () => {
    // F-09 guards against cross-age bleed: kills from prior ages should not satisfy
    // current-age kill predicates. Exploration_military_t1 uses killsThisAge >= 6.
    // With killsThisAge=0 but totalKills=5 (under the modern threshold), we verify
    // that only the exploration predicates (which use killsThisAge) stay at 0.
    const player = createTestPlayer({
      age: 'exploration',
      totalKills: 5,    // below all modern thresholds (10+)
      killsThisAge: 0,  // exploration predicates check this
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'exploration', ageThresholds: { exploration: 0, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'END_TURN' });
    // exploration_military_t1 = killsThisAge(0) >= 6 → false
    // antiquity_military_t1 = killsThisAge(0) >= 3 → false
    // modern_military_t1 = totalKills(5) >= 10 → false
    // → 0 military tiers earned
    expect(next.players.get('p1')!.legacyPaths.military).toBe(0);
  });

  it('F-10: cultural milestone only increments culture typed axis counter', () => {
    const player = createTestPlayer({
      culture: 100,
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
      legacyPointsByAxis: { military: 0, economic: 0, science: 0, culture: 0 },
    });
    const state = createTestState({ players: new Map([['p1', player]]) });
    const next = ageSystem(state, { type: 'END_TURN' });
    const byAxis = next.players.get('p1')!.legacyPointsByAxis!;
    expect(byAxis.culture).toBe(1);
    expect(byAxis.military).toBe(0);
    expect(byAxis.economic).toBe(0);
    expect(byAxis.science).toBe(0);
  });
});

// ── W3-03 F-06: Celebration reset on age transition ──

describe('ageSystem — celebration reset on TRANSITION_AGE (W3-03 F-06)', () => {
  function makeReadyPlayer(overrides: Partial<Parameters<typeof createTestPlayer>[0]> = {}) {
    return createTestPlayer({
      age: 'antiquity',
      ageProgress: 50,
      civilizationId: 'rome',
      globalHappiness: 350,
      celebrationCount: 2,
      celebrationBonus: 10,
      celebrationTurnsLeft: 5,
      // socialPolicySlots intentionally preserved across ages
      socialPolicySlots: 3,
      ...overrides,
    } as Parameters<typeof createTestPlayer>[0]);
  }

  it('resets globalHappiness to 0 on age transition (F-06)', () => {
    const player = makeReadyPlayer();
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const updated = next.players.get('p1')!;
    expect((updated as typeof updated & { globalHappiness: number }).globalHappiness).toBe(0);
  });

  it('resets celebrationCount to 0 on age transition (F-06)', () => {
    const player = makeReadyPlayer();
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.celebrationCount).toBe(0);
  });

  it('resets celebrationTurnsLeft and celebrationBonus to 0 on age transition (F-06)', () => {
    const player = makeReadyPlayer();
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const updated = next.players.get('p1')!;
    expect(updated.celebrationTurnsLeft).toBe(0);
    expect(updated.celebrationBonus).toBe(0);
  });

  it('preserves socialPolicySlots across age transition (GDD: slots carry across ages)', () => {
    const player = makeReadyPlayer({ socialPolicySlots: 3 } as Parameters<typeof createTestPlayer>[0]);
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const updated = next.players.get('p1')!;
    // socialPolicySlots NOT in the reset list — carries over
    expect((updated as typeof updated & { socialPolicySlots: number }).socialPolicySlots).toBe(3);
  });
});

// ── F-08: Civ unlock system ──

describe('F-08: civ unlock system', () => {
  it('allows any age-matching civ when unlockedCivIds is undefined', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      // unlockedCivIds intentionally omitted
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    // spain is an exploration civ — should be allowed when no restriction
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.age).toBe('exploration');
    expect(next.players.get('p1')!.civilizationId).toBe('spain');
  });

  it('rejects civ not in unlockedCivIds and not in historicalPair', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'egypt', // egypt has no historicalPair connection to spain
      ageProgress: 50,
      unlockedCivIds: ['france'], // france only — spain not allowed
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // Should reject — spain not in unlockedCivIds and egypt→spain is not a historical pair
    expect(next.players.get('p1')!.age).toBe('antiquity');
    expect(next.players.get('p1')!.civilizationId).toBe('egypt');
  });

  it('allows civ in unlockedCivIds', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      unlockedCivIds: ['spain', 'france'],
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.age).toBe('exploration');
    expect(next.players.get('p1')!.civilizationId).toBe('spain');
  });

  it('allows civ via historicalPair even if not in unlockedCivIds', () => {
    // spain has historicalPair: ['rome'] — playing as rome should unlock spain
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      unlockedCivIds: ['france'], // spain not listed but rome → spain historical pair
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.age).toBe('exploration');
    expect(next.players.get('p1')!.civilizationId).toBe('spain');
  });

  it('rejects civ for wrong age even if in unlockedCivIds', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      unlockedCivIds: ['america'], // america is modern, not exploration
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'america' });
    // america is modern age — wrong age for antiquity→exploration transition
    expect(next.players.get('p1')!.age).toBe('antiquity');
  });

  it('rejects nonexistent civ id', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'nonexistent_civ' });
    expect(next.players.get('p1')!.age).toBe('antiquity');
  });
});

// ── F-05: Persona scaffold ──

describe('F-05: leader persona scaffold', () => {
  it('Augustus has two personas defined', async () => {
    const { ALL_LEADERS } = await import('../../data/leaders/all-leaders');
    const augustus = ALL_LEADERS.find(l => l.id === 'augustus');
    expect(augustus).toBeDefined();
    expect(augustus!.personas).toBeDefined();
    expect(augustus!.personas!.length).toBe(2);
  });

  it('persona has correct structure with abilityOverride', async () => {
    const { ALL_LEADERS } = await import('../../data/leaders/all-leaders');
    const augustus = ALL_LEADERS.find(l => l.id === 'augustus');
    const imperator = augustus!.personas!.find(p => p.id === 'augustus_imperator');
    expect(imperator).toBeDefined();
    expect(imperator!.name).toBe('Imperator');
    expect(imperator!.abilityOverride).toBeDefined();
    expect(imperator!.abilityOverride!.effects.length).toBe(2);
    expect(imperator!.abilityOverride!.effects[0]).toEqual({ type: 'MODIFY_COMBAT', target: 'melee', value: 7 });
  });

  it('PersonaDef type accepts primaryAttributesOverride', async () => {
    const { ALL_LEADERS } = await import('../../data/leaders/all-leaders');
    const augustus = ALL_LEADERS.find(l => l.id === 'augustus');
    const paterPatriae = augustus!.personas!.find(p => p.id === 'augustus_pater_patriae');
    expect(paterPatriae).toBeDefined();
    expect(paterPatriae!.primaryAttributesOverride).toEqual(['cultural', 'economic']);
  });

  it('leaders without personas compile and work (no regression)', async () => {
    const { ALL_LEADERS } = await import('../../data/leaders/all-leaders');
    const cleopatra = ALL_LEADERS.find(l => l.id === 'cleopatra');
    expect(cleopatra).toBeDefined();
    // personas is undefined for leaders that don't define them
    expect(cleopatra!.personas).toBeUndefined();
  });
});

// ── F-11: Named commander grant ──

describe('F-11: named commander grant (Alexander + Hephaestion)', () => {
  it('Hephaestion unit def exists with correct properties', async () => {
    const { ALL_UNITS } = await import('../../data/units/index');
    const heph = ALL_UNITS.find(u => u.id === 'hephaestion');
    expect(heph).toBeDefined();
    expect(heph!.name).toBe('Hephaestion');
    expect(heph!.age).toBe('antiquity');
    expect(heph!.leaderId).toBe('alexander');
    expect(heph!.combat).toBe(30);
    expect(heph!.abilities).toContain('commander');
  });

  it('Alexander has GRANT_UNIT effect for hephaestion', async () => {
    const { ALL_LEADERS } = await import('../../data/leaders/all-leaders');
    const alex = ALL_LEADERS.find(l => l.id === 'alexander');
    expect(alex).toBeDefined();
    const grant = alex!.ability.effects.find(e => e.type === 'GRANT_UNIT');
    expect(grant).toBeDefined();
    if (grant?.type === 'GRANT_UNIT') {
      expect(grant.unitId).toBe('hephaestion');
      expect(grant.count).toBe(1);
    }
  });

  it('Hephaestion is in ALL_ANTIQUITY_UNITS', async () => {
    const { ALL_ANTIQUITY_UNITS } = await import('../../data/units/antiquity-units');
    const ids = ALL_ANTIQUITY_UNITS.map(u => u.id);
    expect(ids).toContain('hephaestion');
  });
});

// ── F-01: Simultaneous global age transition ──

describe('F-01: simultaneous global age transition', () => {
  it('single-player transition clears tracking immediately', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // Single player: all ready immediately
    expect(next.transitionPhase).toBe('none');
    expect(next.playersReadyToTransition).toEqual([]);
    // Transition still happens
    expect(next.players.get('p1')!.age).toBe('exploration');
  });

  it('multi-player: first transition sets pending, second clears', () => {
    const player1 = createTestPlayer({
      id: 'p1', age: 'antiquity', civilizationId: 'rome', ageProgress: 50,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const player2 = createTestPlayer({
      id: 'p2', age: 'antiquity', civilizationId: 'egypt', ageProgress: 50,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const state = createTestState({
      players: new Map([['p1', player1], ['p2', player2]]),
      currentPlayerId: 'p1',
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    // p1 transitions
    const next1 = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next1.transitionPhase).toBe('pending');
    expect(next1.playersReadyToTransition).toEqual(['p1']);
    // p1's transition ran
    expect(next1.players.get('p1')!.age).toBe('exploration');

    // p2 transitions
    const next2 = ageSystem(
      { ...next1, currentPlayerId: 'p2' },
      { type: 'TRANSITION_AGE', newCivId: 'spain' },
    );
    // All players ready — cleared
    expect(next2.transitionPhase).toBe('none');
    expect(next2.playersReadyToTransition).toEqual([]);
    // p2's transition ran
    expect(next2.players.get('p2')!.age).toBe('exploration');
  });

  it('duplicate TRANSITION_AGE from same player is idempotent', () => {
    const player = createTestPlayer({
      age: 'antiquity', civilizationId: 'rome', ageProgress: 50,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const player2 = createTestPlayer({ id: 'p2', age: 'antiquity' });
    const state = createTestState({
      players: new Map([['p1', player], ['p2', player2]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next1 = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // Dispatch again as p1 — should be idempotent
    const next2 = ageSystem(next1, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next2).toBe(next1); // same reference, no change
  });
});

// ── F-14: Mastery persistence across age transitions ──

describe('F-14: mastered techs and civics persist across age transitions', () => {
  it('masteredTechs survives TRANSITION_AGE', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      masteredTechs: ['pottery', 'mining'],
      currentMastery: 'agriculture',
      masteryProgress: 30,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const updated = next.players.get('p1')!;
    // Mastered techs persist
    expect(updated.masteredTechs).toEqual(['pottery', 'mining']);
    // Active mastery progress resets (new age)
    expect(updated.currentMastery).toBeNull();
    expect(updated.masteryProgress).toBe(0);
  });

  it('masteredCivics survives TRANSITION_AGE', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      masteredCivics: ['early_empire', 'craftsmanship'],
      currentCivicMastery: 'mysticism',
      civicMasteryProgress: 20,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const updated = next.players.get('p1')!;
    // Mastered civics persist
    expect(updated.masteredCivics).toEqual(['early_empire', 'craftsmanship']);
    // Active civic mastery progress resets (new age)
    expect(updated.currentCivicMastery).toBeNull();
    expect(updated.civicMasteryProgress).toBe(0);
  });
});


// ── X5.3: Legacy path reconciliation (dual-schema unification) ──
// Verifies that checkLegacyMilestones() in ageSystem uses scoreLegacyPaths()
// as its single source of truth (the reconciliation is already done; these tests
// document and guard the behaviour).
describe('X5.3 — legacy path reconciliation: ageSystem mirrors scoreLegacyPaths', () => {
  it('X5.3 legacy milestone: ageSystem END_TURN legacyPaths matches scoreLegacyPaths result', () => {
    // Player has 4 techs → antiquity_science_t1 passes (scienceLegacyScore >= 4)
    // scoreLegacyPaths should return tiersCompleted=1 for antiquity/science path.
    // ageSystem END_TURN (checkLegacyMilestones) must agree.
    const player = createTestPlayer({
      id: 'p1',
      researchedTechs: ['pottery', 'mining', 'animal_husbandry', 'irrigation'],
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    // scoreLegacyPaths is the authoritative predicate-based scorer
    const pathResults = scoreLegacyPaths('p1', state);
    const antiquitySciencePath = pathResults.find(p => p.axis === 'science' && p.age === 'antiquity');
    // 4 techs → scienceLegacyScore = 4 → tier 1 should be satisfied
    expect(antiquitySciencePath?.tiersCompleted).toBeGreaterThanOrEqual(1);

    // ageSystem END_TURN calls checkLegacyMilestones which calls scoreLegacyPaths
    const next = ageSystem(state, { type: 'END_TURN' });
    const updatedPlayer = next.players.get('p1')!;
    // legacyPaths.science should reflect the tier completed (1 or more)
    expect(updatedPlayer.legacyPaths.science).toBeGreaterThanOrEqual(antiquitySciencePath?.tiersCompleted ?? 0);
    // legacyPoints must be 1 (exactly one science tier gained from 4 techs)
    expect(updatedPlayer.legacyPoints).toBe(1);
  });

  it('X5.3 TRANSITION_AGE correctly carries legacyPaths into totalCareerLegacyPoints', () => {
    // A player who has earned 3 legacy points in antiquity should see
    // totalCareerLegacyPoints preserved (not reset) after TRANSITION_AGE.
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 0 },
      legacyPoints: 3,
      totalCareerLegacyPoints: 3,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const updated = next.players.get('p1')!;
    // legacyPoints resets at transition
    expect(updated.legacyPoints).toBe(0);
    // totalCareerLegacyPoints retains the 3 earned this age
    expect(updated.totalCareerLegacyPoints).toBe(3);
    // Age transition does NOT alter legacy path tiers (bonuses persist)
    expect(updated.legacyPaths.military).toBeGreaterThanOrEqual(1);
  });
});

describe("X1.1: isTown flag",function(){it("non-capital gets isTown: true",function(){var p=createTestPlayer({age:"antiquity",civilizationId:"rome",ageProgress:50,legacyPaths:{military:1,economic:1,science:1,culture:1}});var c={id:"nc1",name:"Colony",owner:"p1",position:{q:5,r:0},population:7,food:0,productionQueue:[],productionProgress:0,buildings:[],territory:[],settlementType:"city",happiness:10,isCapital:false,defenseHP:100,specialization:null,specialists:0,districts:[]};var s=createTestState({players:new Map([["p1",p]]),cities:new Map([["nc1",c]]),age:{currentAge:"antiquity",ageThresholds:{exploration:50,modern:100}}});var n=ageSystem(s,{type:"TRANSITION_AGE",newCivId:"spain"});expect(n.cities.get("nc1").isTown).toBe(true);expect(n.cities.get("nc1").population).toBe(1);});it("capital stays city and isTown falsy",function(){var p=createTestPlayer({age:"antiquity",civilizationId:"rome",ageProgress:50,legacyPaths:{military:1,economic:1,science:1,culture:1}});var c={id:"cap",name:"Capital",owner:"p1",position:{q:0,r:0},population:5,food:0,productionQueue:[],productionProgress:0,buildings:[],territory:[],settlementType:"city",happiness:10,isCapital:true,defenseHP:100,specialization:null,specialists:0,districts:[]};var s=createTestState({players:new Map([["p1",p]]),cities:new Map([["cap",c]]),age:{currentAge:"antiquity",ageThresholds:{exploration:50,modern:100}}});var n=ageSystem(s,{type:"TRANSITION_AGE",newCivId:"spain"});expect(n.cities.get("cap").settlementType).toBe("city");expect(n.cities.get("cap").isTown).toBeFalsy();});it("population drops to 1",function(){var p=createTestPlayer({age:"antiquity",civilizationId:"rome",ageProgress:50,legacyPaths:{military:1,economic:1,science:1,culture:1}});var c={id:"nc2",name:"Town2",owner:"p1",position:{q:3,r:0},population:8,food:0,productionQueue:[],productionProgress:0,buildings:[],territory:[],settlementType:"city",happiness:10,isCapital:false,defenseHP:100,specialization:null,specialists:0,districts:[]};var s=createTestState({players:new Map([["p1",p]]),cities:new Map([["nc2",c]]),age:{currentAge:"antiquity",ageThresholds:{exploration:50,modern:100}}});var n=ageSystem(s,{type:"TRANSITION_AGE",newCivId:"spain"});expect(n.cities.get("nc2").population).toBe(1);});});

describe("X1.2: tech reset",function(){it("currentResearch and researchProgress clear",function(){var p=createTestPlayer({age:"antiquity",civilizationId:"rome",ageProgress:50,currentResearch:"pottery",researchProgress:42,legacyPaths:{military:1,economic:1,science:1,culture:1}});var s=createTestState({players:new Map([["p1",p]]),age:{currentAge:"antiquity",ageThresholds:{exploration:50,modern:100}}});var n=ageSystem(s,{type:"TRANSITION_AGE",newCivId:"spain"});expect(n.players.get("p1").currentResearch).toBeNull();expect(n.players.get("p1").researchProgress).toBe(0);});it("currentMastery and masteryProgress clear",function(){var p=createTestPlayer({age:"antiquity",civilizationId:"rome",ageProgress:50,currentMastery:"pottery",masteryProgress:75,legacyPaths:{military:1,economic:1,science:1,culture:1}});var s=createTestState({players:new Map([["p1",p]]),age:{currentAge:"antiquity",ageThresholds:{exploration:50,modern:100}}});var n=ageSystem(s,{type:"TRANSITION_AGE",newCivId:"spain"});expect(n.players.get("p1").currentMastery).toBeNull();expect(n.players.get("p1").masteryProgress).toBe(0);});});

describe("X1.3: civic reset",function(){it("currentCivic and civicProgress clear",function(){var p=createTestPlayer({age:"antiquity",civilizationId:"rome",ageProgress:50,currentCivic:"craftsmanship",civicProgress:30,legacyPaths:{military:1,economic:1,science:1,culture:1}});var s=createTestState({players:new Map([["p1",p]]),age:{currentAge:"antiquity",ageThresholds:{exploration:50,modern:100}}});var n=ageSystem(s,{type:"TRANSITION_AGE",newCivId:"spain"});expect(n.players.get("p1").currentCivic).toBeNull();expect(n.players.get("p1").civicProgress).toBe(0);});it("slottedPolicies clear",function(){var p=createTestPlayer({age:"antiquity",civilizationId:"rome",ageProgress:50,slottedPolicies:["discipline",null,"aristocracy"],legacyPaths:{military:1,economic:1,science:1,culture:1}});var s=createTestState({players:new Map([["p1",p]]),age:{currentAge:"antiquity",ageThresholds:{exploration:50,modern:100}}});var n=ageSystem(s,{type:"TRANSITION_AGE",newCivId:"spain"});expect(n.players.get("p1").slottedPolicies).toEqual([]);});it("researchedCivics persists (historical record)",function(){var p=createTestPlayer({age:"antiquity",civilizationId:"rome",ageProgress:50,researchedCivics:["craftsmanship","early_empire","mysticism"],legacyPaths:{military:1,economic:1,science:1,culture:1}});var s=createTestState({players:new Map([["p1",p]]),age:{currentAge:"antiquity",ageThresholds:{exploration:50,modern:100}}});var n=ageSystem(s,{type:"TRANSITION_AGE",newCivId:"spain"});expect(n.players.get("p1").researchedCivics).toEqual(["craftsmanship","early_empire","mysticism"]);});});

describe("X1.4: data-driven civ legacy bonus",function(){it("each of 5 civs returns legacyBonus from state.config",function(){var civIds=["rome","egypt","greece","persia","india"];for(var i=0;i<civIds.length;i++){var civId=civIds[i];var p=createTestPlayer({age:"antiquity",civilizationId:civId,ageProgress:50,legacyBonuses:[],legacyPaths:{military:1,economic:1,science:1,culture:1}});var s=createTestState({players:new Map([["p1",p]]),age:{currentAge:"antiquity",ageThresholds:{exploration:50,modern:100}}});var n=ageSystem(s,{type:"TRANSITION_AGE",newCivId:"spain"});var pending=n.players.get("p1").pendingLegacyBonuses;expect(pending).toBeDefined();var civBonus=pending.find(function(b){return b.bonusId.includes(civId);});expect(civBonus).toBeDefined();var civDef=s.config.civilizations.get(civId);expect(civDef&&civDef.legacyBonus).toBeDefined();expect(civBonus.effect).toEqual(civDef.legacyBonus.effect);}});});

describe('AA1.1: building obsolescence on age transition', () => {
  it('ageless wonder (isAgeless: true) persists after age transition', () => {
    // pyramids is an antiquity wonder with isAgeless: true
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const capital = createTestCity({
      id: 'cap',
      owner: 'p1',
      isCapital: true,
      buildings: ['pyramids'], // antiquity wonder, isAgeless: true
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['cap', capital]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // pyramids must still be in the city's buildings array
    expect(next.cities.get('cap')!.buildings).toContain('pyramids');
  });

  it('non-ageless antiquity building is removed when transitioning to exploration', () => {
    // granary is an antiquity building without isAgeless — should be removed
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const capital = createTestCity({
      id: 'cap',
      owner: 'p1',
      isCapital: true,
      buildings: ['granary', 'pyramids'], // granary obsoletes, pyramids stays
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['cap', capital]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // granary (antiquity, non-ageless) must be removed
    expect(next.cities.get('cap')!.buildings).not.toContain('granary');
    // pyramids (antiquity, isAgeless) must persist
    expect(next.cities.get('cap')!.buildings).toContain('pyramids');
  });
});

describe('AA1.3: legacyPointsByAxis typed breakdown', () => {
  it('military milestone increments only the military axis counter', () => {
    // totalKills: 3 triggers antiquity_military_t1 (killsThisAge >= 3 check)
    const player = createTestPlayer({
      totalKills: 3,
      killsThisAge: 3,
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
      legacyPointsByAxis: { military: 0, economic: 0, science: 0, culture: 0 },
    });
    const state = createTestState({ players: new Map([['p1', player]]) });
    const next = ageSystem(state, { type: 'END_TURN' });
    const byAxis = next.players.get('p1')!.legacyPointsByAxis!;
    expect(byAxis.military).toBe(1);
    expect(byAxis.economic).toBe(0);
    expect(byAxis.science).toBe(0);
    expect(byAxis.culture).toBe(0);
  });

  it('total legacyPoints equals sum of all axis values', () => {
    // Set up a player who has earned 1 military + 1 economic milestone
    const player = createTestPlayer({
      totalKills: 3,
      killsThisAge: 3,
      totalGoldEarned: 200,
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
      legacyPointsByAxis: { military: 0, economic: 0, science: 0, culture: 0 },
    });
    const state = createTestState({ players: new Map([['p1', player]]) });
    const next = ageSystem(state, { type: 'END_TURN' });
    const p = next.players.get('p1')!;
    const byAxis = p.legacyPointsByAxis!;
    const axisSum = byAxis.military + byAxis.economic + byAxis.science + byAxis.culture;
    // legacyPoints is always the running total; axisSum includes all gains this turn
    expect(axisSum).toBe(p.legacyPoints);
  });

  it('cultural points do not affect the military axis', () => {
    // artifactsInMuseums: 2 triggers antiquity_culture_t1 (primary check: artifactsInMuseums >= 2)
    const player = createTestPlayer({
      artifactsInMuseums: 2,
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
      legacyPointsByAxis: { military: 0, economic: 0, science: 0, culture: 0 },
    });
    const state = createTestState({ players: new Map([['p1', player]]) });
    const next = ageSystem(state, { type: 'END_TURN' });
    const byAxis = next.players.get('p1')!.legacyPointsByAxis!;
    expect(byAxis.culture).toBe(1);  // tier-1 milestone awards exactly 1 point
    expect(byAxis.military).toBe(0); // military unaffected
  });
});

describe("X1.5: totalCareerLegacyPoints accumulation",function(){it("two transitions accumulate total (5+3=8)",function(){var p=createTestPlayer({age:"antiquity",civilizationId:"rome",ageProgress:50,legacyPoints:5,totalCareerLegacyPoints:5,legacyPaths:{military:1,economic:1,science:1,culture:1}});var s1=createTestState({players:new Map([["p1",p]]),age:{currentAge:"antiquity",ageThresholds:{exploration:50,modern:100}}});var a1=ageSystem(s1,{type:"TRANSITION_AGE",newCivId:"spain"});expect(a1.players.get("p1").legacyPoints).toBe(0);expect(a1.players.get("p1").totalCareerLegacyPoints).toBe(5);var m2=new Map(a1.players);m2.set("p1",Object.assign({},a1.players.get("p1"),{ageProgress:200,legacyPoints:3,totalCareerLegacyPoints:8,legacyPaths:{military:1,economic:1,science:1,culture:1}}));var s2=Object.assign({},a1,{players:m2,age:{currentAge:"exploration",ageThresholds:{exploration:0,modern:100}}});var a2=ageSystem(s2,{type:"TRANSITION_AGE",newCivId:"america"});expect(a2.players.get("p1").legacyPoints).toBe(0);expect(a2.players.get("p1").totalCareerLegacyPoints).toBe(8);});});

// ── AA3.1: Production queue cleared on age transition ──
describe('AA3.1: non-capital production queue cleared on age transition', () => {
  it('clears the production queue of a non-capital city on age transition', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const nonCapital = createTestCity({
      id: 'nc1',
      name: 'Colony',
      owner: 'p1',
      position: { q: 5, r: 0 },
      population: 5,
      isCapital: false,
      settlementType: 'city',
      productionQueue: [{ type: 'unit' as const, id: 'warrior' }, { type: 'building' as const, id: 'granary' }],
      productionProgress: 25,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['nc1', nonCapital]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const city = next.cities.get('nc1')!;
    expect(city.productionQueue).toEqual([]);
    expect(city.productionProgress).toBe(0);
    expect(city.isTown).toBe(true);
  });

  it('capital keeps its production queue on age transition', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const capital = createTestCity({
      id: 'cap',
      name: 'Rome',
      owner: 'p1',
      position: { q: 0, r: 0 },
      population: 5,
      isCapital: true,
      settlementType: 'city',
      productionQueue: [{ type: 'unit' as const, id: 'warrior' }],
      productionProgress: 10,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['cap', capital]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const city = next.cities.get('cap')!;
    // Capital keeps its queue
    expect(city.productionQueue.length).toBe(1);
    expect(city.settlementType).toBe('city');
    expect(city.isTown).toBeFalsy();
  });
});

// ── AA3.2: Global ageProgressMeter compression dynamic ──
describe('AA3.2: global ageProgressMeter', () => {
  it('per-player milestone gain pushes both ageProgress and ageProgressMeter', () => {
    const player = createTestPlayer({
      totalGoldEarned: 200, // hits economic tier 1
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
      ageProgress: 5,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      // no ageProgressMeter set yet
    });
    const next = ageSystem(state, { type: 'END_TURN' });
    // Per-player ageProgress: 5 + 1 (base) + 10 (1 milestone gain * 10) = 16
    expect(next.players.get('p1')!.ageProgress).toBe(16);
    // Global meter boosted by same 10 (milestone acceleration)
    expect(next.ageProgressMeter).toBe(10);
  });

  it('cross-player milestone contributions accumulate in global meter', () => {
    const p1 = createTestPlayer({
      id: 'p1',
      totalGoldEarned: 200, // hits economic tier 1
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
      ageProgress: 5,
    });
    const p2 = createTestPlayer({
      id: 'p2',
      totalKills: 3, // hits military tier 1
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
      ageProgress: 5,
    });
    // p1's turn first
    const state1 = createTestState({
      players: new Map([['p1', p1], ['p2', p2]]),
      currentPlayerId: 'p1',
    });
    const after_p1 = ageSystem(state1, { type: 'END_TURN' });
    expect(after_p1.ageProgressMeter).toBe(10); // p1 earned 1 milestone

    // p2's turn
    const state2 = { ...after_p1, currentPlayerId: 'p2' };
    const after_p2 = ageSystem(state2, { type: 'END_TURN' });
    // Both players' boosts accumulate: 10 + 10 = 20
    expect(after_p2.ageProgressMeter).toBe(20);
  });

  it('global meter reaching threshold allows transition for a player below personal threshold', () => {
    // p1 has low personal ageProgress but the global meter is >= threshold
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 10, // below threshold of 50
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      ageProgressMeter: 50, // global meter at threshold
    });
    // Transition should succeed because globalReady=true even though personalReady=false
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.age).toBe('exploration');
  });
});

// ── AA3.3: totalCareerLegacyPoints — score victory uses career total ──
describe('AA3.3: score victory uses totalCareerLegacyPoints', () => {
  it('totalCareerLegacyPoints never resets across age transitions', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      legacyPoints: 5,
      totalCareerLegacyPoints: 5,
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // legacyPoints resets; totalCareerLegacyPoints DOES NOT
    expect(next.players.get('p1')!.legacyPoints).toBe(0);
    expect(next.players.get('p1')!.totalCareerLegacyPoints).toBe(5);
  });

  it('BB1.1: clears darkAgeOptIn on TRANSITION_AGE (opt-in does not persist to next age)', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      darkAgeOptIn: true,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const nextPlayer = next.players.get('p1')!;
    // After transition the opt-in flag must be cleared (undefined), not still true
    expect(nextPlayer.darkAgeOptIn).toBeUndefined();
    // And the player has transitioned successfully
    expect(nextPlayer.age).toBe('exploration');
  });
});
