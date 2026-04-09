import { describe, it, expect } from 'vitest';
import { ageSystem } from '../ageSystem';
import { createTestState, createTestPlayer } from './helpers';

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

    it('awards economic milestone for gold earned', () => {
      const player = createTestPlayer({
        totalGoldEarned: 200,
        legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
        legacyPoints: 0,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = ageSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.legacyPaths.economic).toBe(2);
      expect(next.players.get('p1')!.legacyPoints).toBe(2);
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

    it('awards culture milestone for civics researched', () => {
      const player = createTestPlayer({
        researchedCivics: ['a', 'b', 'c'],
        legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
        legacyPoints: 0,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = ageSystem(state, { type: 'END_TURN' });
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
      // 3 kills = milestone 1, already at 1, so no new points
      expect(next).toBe(state);
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

    it('applies science dark age: loses a random tech and +5 science', () => {
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
      // Should have lost exactly 1 tech
      expect(updatedPlayer.researchedTechs.length).toBe(2);
      const scienceBonus = updatedPlayer.legacyBonuses.find(b => b.source.includes('dark-age:science'));
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

    it('grants multiple golden ages simultaneously', () => {
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
      expect(bonuses.filter(b => b.source.includes('golden-age')).length).toBe(4);
      expect(next.log.filter(e => e.message.includes('Golden Age')).length).toBe(4);
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
});
