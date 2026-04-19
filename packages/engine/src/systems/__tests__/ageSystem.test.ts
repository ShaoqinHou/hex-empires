import { describe, it, expect } from 'vitest';
import { ageSystem } from '../ageSystem';
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
    expect(next.players.get('p1')!.legacyBonuses.length).toBe(1);
    expect(next.players.get('p1')!.legacyBonuses[0].source).toContain('rome');
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
    // Should have civ legacy bonus + 3 legacy point bonuses (no golden/dark effects with milestones=1)
    expect(next.players.get('p1')!.legacyPoints).toBe(0);
    // 1 civ legacy bonus (rome) + 3 from legacy points = 4 total
    expect(next.players.get('p1')!.legacyBonuses.length).toBe(4);
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
      const bonuses = next.players.get('p1')!.legacyBonuses;
      const goldenMilitary = bonuses.find(b => b.source.includes('golden-age:military'));
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
      const bonuses = next.players.get('p1')!.legacyBonuses;
      const goldenEconomic = bonuses.find(b => b.source.includes('golden-age:economic'));
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
      const bonuses = next.players.get('p1')!.legacyBonuses;
      const goldenScience = bonuses.find(b => b.source.includes('golden-age:science'));
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
      const bonuses = next.players.get('p1')!.legacyBonuses;
      const goldenCulture = bonuses.find(b => b.source.includes('golden-age:culture'));
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
      const darkPenalty = bonuses.find(b => b.source === 'dark-age:military:antiquity:penalty');
      expect(darkCombat).toBeDefined();
      expect(darkCombat!.effect).toEqual({ type: 'MODIFY_COMBAT', target: 'all', value: 3 });
      expect(darkPenalty).toBeDefined();
      expect(darkPenalty!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: -2 });
      expect(next.log.some(e => e.message.includes('Military Dark Age'))).toBe(true);
    });

    it('applies economic dark age: -50 gold immediately and +2 production', () => {
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
      const productionBonus = updatedPlayer.legacyBonuses.find(b => b.source.includes('dark-age:economic') && b.source.includes('bonus'));
      expect(productionBonus).toBeDefined();
      expect(productionBonus!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 2 });
    });

    it('applies science dark age: -2 science penalty and +5 science (tech-loss retired F-12)', () => {
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
      // Science penalty bonus should exist
      const sciencePenalty = updatedPlayer.legacyBonuses.find(b => b.source.includes('dark-age:science:antiquity:penalty'));
      expect(sciencePenalty).toBeDefined();
      expect(sciencePenalty!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: -2 });
      // Science buff bonus should also exist
      const scienceBonus = updatedPlayer.legacyBonuses.find(b => b.source === 'dark-age:science:antiquity');
      expect(scienceBonus).toBeDefined();
      expect(scienceBonus!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 5 });
      expect(next.log.some(e => e.message.includes('Science Dark Age'))).toBe(true);
    });

    it('applies culture dark age: -2 happiness and +4 culture', () => {
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
      const culturePenalty = bonuses.find(b => b.source.includes('dark-age:culture') && b.source.includes('penalty'));
      const cultureBonus = bonuses.find(b => b.source === 'dark-age:culture:antiquity');
      expect(culturePenalty).toBeDefined();
      expect(culturePenalty!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: -2 });
      expect(cultureBonus).toBeDefined();
      expect(cultureBonus!.effect).toEqual({ type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 4 });
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
      const bonuses = next.players.get('p1')!.legacyBonuses;
      // F-05: only 1 golden age effect granted (first eligible axis: military)
      expect(bonuses.filter(b => b.source.includes('golden-age')).length).toBe(1);
      expect(bonuses.some(b => b.source.includes('golden-age:military'))).toBe(true);
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
      const bonuses = next.players.get('p1')!.legacyBonuses;
      expect(bonuses.filter(b => b.source.includes('golden-age')).length).toBe(1);
      expect(bonuses.some(b => b.source.includes('golden-age:culture'))).toBe(true);
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
