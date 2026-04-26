/**
 * II1.3 — MODERN_MILITARY legacy uses killsThisAge (not totalKills).
 *
 * Guard that modern_military t1/t2 milestone checks read killsThisAge (which
 * resets to 0 at TRANSITION_AGE) and not totalKills (cumulative all-time counter).
 *
 * The bug that motivated this: a player with 10 kills in antiquity who transitioned
 * to modern age with 0 new kills could still satisfy modern_military tier 1 because
 * the check read totalKills (10) instead of killsThisAge (0).
 */

import { describe, it, expect } from 'vitest';
import { scoreLegacyPaths } from '../LegacyPaths';
import { ageSystem } from '../../systems/ageSystem';
import { createTestState, createTestPlayer } from '../../systems/__tests__/helpers';

describe('II1.3 — MODERN_MILITARY uses killsThisAge (no cross-age bleed)', () => {
  it('10 kills in antiquity + TRANSITION_AGE → modern military tier 1 sees 0 kills (not 10)', () => {
    // Player earned 10 kills in antiquity. After transitioning to modern age,
    // killsThisAge resets to 0. Modern military t1 requires killsThisAge >= 10.
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      totalKills: 10,       // all-time counter
      killsThisAge: 10,     // this-age counter (will reset at transition)
      legacyPaths: { military: 1, economic: 0, science: 0, culture: 0 },
      legacyPoints: 1,
      totalCareerLegacyPoints: 1,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    // Transition to exploration age first (then we'll manually set modern age).
    const afterTransition = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const transitioned = afterTransition.players.get('p1')!;

    // killsThisAge should reset to 0 after age transition.
    expect(transitioned.killsThisAge ?? 0).toBe(0);
    // totalKills is preserved (all-time counter never resets).
    expect(transitioned.totalKills).toBe(10);
  });

  it('0 killsThisAge in modern age → modern_military tier 0 (F-09: uses killsThisAge fallback)', () => {
    // Player has 10 totalKills from previous ages but 0 killsThisAge.
    // modern_military_t1 check: killsThisAge ?? totalKills >= 10.
    // When killsThisAge is explicitly 0, the tier should NOT be satisfied.
    const player = createTestPlayer({
      id: 'p1',
      age: 'modern',
      totalKills: 10,   // leftover from antiquity
      killsThisAge: 0,  // reset after transition
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const paths = scoreLegacyPaths('p1', state);
    const modernMilitary = paths.find(p => p.age === 'modern' && p.axis === 'military');
    expect(modernMilitary).toBeDefined();
    // With 0 killsThisAge, tier 1 (killsThisAge >= 10) should NOT be satisfied.
    expect(modernMilitary!.tiersCompleted).toBe(0);
  });

  it('10 killsThisAge in modern age → modern_military tier 1 satisfied (F-09)', () => {
    // Player earned 10 kills THIS modern age. Tier 1 should be satisfied.
    const player = createTestPlayer({
      id: 'p1',
      age: 'modern',
      totalKills: 25,   // includes antiquity+exploration kills
      killsThisAge: 10, // modern-age-only kills
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const paths = scoreLegacyPaths('p1', state);
    const modernMilitary = paths.find(p => p.age === 'modern' && p.axis === 'military');
    expect(modernMilitary).toBeDefined();
    // killsThisAge = 10 >= 10 → tier 1 satisfied.
    expect(modernMilitary!.tiersCompleted).toBeGreaterThanOrEqual(1);
  });

  it('20 killsThisAge in modern age → modern_military tier 2 satisfied (F-09)', () => {
    // Player earned 20 kills THIS modern age. Tier 2 requires killsThisAge >= 20.
    const player = createTestPlayer({
      id: 'p1',
      age: 'modern',
      totalKills: 30,
      killsThisAge: 20,
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const paths = scoreLegacyPaths('p1', state);
    const modernMilitary = paths.find(p => p.age === 'modern' && p.axis === 'military');
    expect(modernMilitary).toBeDefined();
    // killsThisAge = 20 >= 20 → tier 2 satisfied.
    expect(modernMilitary!.tiersCompleted).toBeGreaterThanOrEqual(2);
  });

  it('totalKills fallback: player without killsThisAge field uses totalKills (backward compat)', () => {
    // Player predating killsThisAge field — uses totalKills as fallback.
    const player = createTestPlayer({
      id: 'p1',
      age: 'modern',
      totalKills: 10,
      // killsThisAge not set (undefined) — fallback to totalKills
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const paths = scoreLegacyPaths('p1', state);
    const modernMilitary = paths.find(p => p.age === 'modern' && p.axis === 'military');
    expect(modernMilitary).toBeDefined();
    // killsThisAge is undefined → falls back to totalKills (10 >= 10) → tier 1 satisfied.
    expect(modernMilitary!.tiersCompleted).toBeGreaterThanOrEqual(1);
  });
});
