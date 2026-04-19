import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { createTestState, createTestPlayer } from '../systems/__tests__/helpers';
import type { CityState } from '../types/GameState';
import { coordToKey } from '../hex/HexMath';

/**
 * L2 Integration: research → age progress → age transition cross-system pipeline.
 *
 * Verifies that the full GameEngine pipeline correctly chains:
 *   - researchSystem: completing a tech grants +5 ageProgress
 *   - ageSystem: when ageProgress reaches the transition threshold, the player
 *     can call TRANSITION_AGE and move to the next age with a new civilization
 *
 * These tests exercise applyAction (the full pipeline) rather than the systems
 * in isolation — the point is the cross-system outcome: END_TURN finishes
 * research → ageProgress crosses threshold → TRANSITION_AGE succeeds.
 */
describe('integration-research-age: researching techs drives age-progress threshold; transition moves to next age', () => {
  const engine = new GameEngine();

  function createTestCity(overrides: Partial<CityState> = {}): CityState {
    return {
      id: 'c1',
      name: 'Rome',
      owner: 'p1',
      position: { q: 3, r: 3 },
      population: 10, // large population → fast science (1 + 10 = 11/turn)
      food: 0,
      productionQueue: [],
      productionProgress: 0,
      buildings: [],
      territory: [coordToKey({ q: 3, r: 3 })],
      settlementType: 'city',
      happiness: 10,
      isCapital: true,
      defenseHP: 100,
      specialization: null,
      specialists: 0,
      districts: [],
      ...overrides,
    };
  }

  it('completing a tech via END_TURN does NOT grant +5 ageProgress (F-11 retired)', () => {
    // pottery costs 25. Place player at 24 progress + pop-10 city → completes on END_TURN.
    const player = createTestPlayer({
      id: 'p1',
      currentResearch: 'pottery',
      researchProgress: 24,
      ageProgress: 10,
      researchedTechs: [],
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', createTestCity()]]),
    });

    const next = engine.applyAction(state, { type: 'END_TURN' });

    const p1 = next.players.get('p1');
    expect(p1).toBeDefined();
    expect(p1!.researchedTechs).toContain('pottery');
    expect(p1!.currentResearch).toBeNull();
    // 10 (initial) + 1 (ageSystem natural +1/turn) = 11; +5 per tech is retired (F-11)
    expect(p1!.ageProgress).toBe(11);
  });

  it('player can transition age once ageProgress reaches the threshold', () => {
    // Threshold is 50; seed player at exactly 50 so TRANSITION_AGE is immediately valid.
    const player = createTestPlayer({
      id: 'p1',
      civilizationId: 'rome',
      age: 'antiquity',
      ageProgress: 50,
      legacyPaths: { military: 1, economic: 0, science: 0, culture: 0 },
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const next = engine.applyAction(state, {
      type: 'TRANSITION_AGE',
      newCivId: 'spain',
    });

    const p1 = next.players.get('p1');
    expect(p1).toBeDefined();
    expect(p1!.age).toBe('exploration');
    expect(p1!.civilizationId).toBe('spain');
    // ageProgress resets to 0 after transition.
    expect(p1!.ageProgress).toBe(0);
    // Legacy bonus from rome should be present somewhere in the list
    // (the system also appends golden/dark-age effects, so total count >= 1).
    const romeBonuses = p1!.legacyBonuses.filter(b => b.source.includes('rome'));
    expect(romeBonuses.length).toBe(1);
    // State-level age must also advance.
    expect(next.age.currentAge).toBe('exploration');
  });

  it('TRANSITION_AGE is rejected when ageProgress is below the threshold', () => {
    const player = createTestPlayer({
      id: 'p1',
      civilizationId: 'rome',
      age: 'antiquity',
      ageProgress: 40, // below threshold of 50
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const next = engine.applyAction(state, {
      type: 'TRANSITION_AGE',
      newCivId: 'spain',
    });

    const p1 = next.players.get('p1');
    expect(p1).toBeDefined();
    // Player stays in antiquity with original civ and progress.
    expect(p1!.age).toBe('antiquity');
    expect(p1!.civilizationId).toBe('rome');
    expect(p1!.ageProgress).toBe(40);
  });

  it('full pipeline sequence: research tech → cross threshold → transition age', () => {
    /**
     * Chains two engine actions to confirm research grants age progress that
     * can immediately be used to satisfy the TRANSITION_AGE prerequisite:
     *
     *   1. Seed player at ageProgress = 45, researching pottery at progress 24.
     *      Threshold = 50.
     *   2. END_TURN completes pottery → +5 ageProgress → total = 50 + 1 (natural) = 51.
     *   3. TRANSITION_AGE succeeds: player moves to 'exploration' with new civ.
     *
     * The ageSystem natural +1/turn brings the initial 45 to 46 before the
     * research completion bump fires. We account for this by starting at 44.
     */
    const player = createTestPlayer({
      id: 'p1',
      civilizationId: 'rome',
      age: 'antiquity',
      currentResearch: 'pottery',
      researchProgress: 24, // will complete with pop-10 city (+11 science/turn)
      ageProgress: 49, // 49 + 1 (natural) = 50, exactly at threshold; +5 per tech retired (F-11)
      researchedTechs: [],
      legacyPaths: { military: 1, economic: 0, science: 0, culture: 0 },
    });
    const initial = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', createTestCity()]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    // Step 1: END_TURN completes research, grants ageProgress.
    const afterResearch = engine.applyAction(initial, { type: 'END_TURN' });
    const p1AfterResearch = afterResearch.players.get('p1');
    expect(p1AfterResearch).toBeDefined();
    expect(p1AfterResearch!.researchedTechs).toContain('pottery');
    expect(p1AfterResearch!.ageProgress).toBe(50); // 49 + 1 = 50

    // Step 2: TRANSITION_AGE is now valid.
    const afterTransition = engine.applyAction(afterResearch, {
      type: 'TRANSITION_AGE',
      newCivId: 'spain',
    });

    const p1Final = afterTransition.players.get('p1');
    expect(p1Final).toBeDefined();
    expect(p1Final!.age).toBe('exploration');
    expect(p1Final!.civilizationId).toBe('spain');
    expect(p1Final!.ageProgress).toBe(0);
    expect(afterTransition.age.currentAge).toBe('exploration');
    // Transition log entry should be present.
    expect(afterTransition.log.some(e => e.type === 'age')).toBe(true);
  });
});
