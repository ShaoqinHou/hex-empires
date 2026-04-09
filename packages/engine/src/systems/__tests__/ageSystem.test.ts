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
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // Should have civ legacy bonus + 3 legacy point bonuses
    expect(next.players.get('p1')!.legacyPoints).toBe(0);
    // 1 civ legacy bonus (rome) + 3 from legacy points = 4 total
    expect(next.players.get('p1')!.legacyBonuses.length).toBe(4);
  });
});
