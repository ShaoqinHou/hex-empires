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

  it('ignores non-TRANSITION_AGE actions', () => {
    const state = createTestState();
    expect(ageSystem(state, { type: 'END_TURN' })).toBe(state);
  });
});
