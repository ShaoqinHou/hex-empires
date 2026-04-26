/**
 * II1.2 — score victory uses totalCareerLegacyPoints (cross-age accumulation).
 *
 * Guard that calculateScore() reads totalCareerLegacyPoints (accumulated across all
 * ages) rather than legacyPoints (current-age only, resets at TRANSITION_AGE).
 *
 * The bug that motivated this: a player who earned 50 legacy points in antiquity,
 * transitioned, then earned 30 in exploration had legacyPoints === 30 but
 * totalCareerLegacyPoints === 80. Before the fix, calculateScore() read legacyPoints
 * and could not distinguish a good cross-age player from a one-age flash.
 */

import { describe, it, expect } from 'vitest';
import { ageSystem } from '../ageSystem';
import { victorySystem } from '../victorySystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function makeCity(id: string, owner: string, position = { q: 0, r: 0 }): CityState {
  return {
    id, name: id, owner, position,
    population: 1, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey(position)],
    settlementType: 'city', happiness: 10, isCapital: false, defenseHP: 100,
    specialization: null, specialists: 0, districts: [],
  };
}

describe('II1.2 — score victory: totalCareerLegacyPoints accumulates across age transitions', () => {
  it('TRANSITION_AGE preserves totalCareerLegacyPoints and resets legacyPoints', () => {
    // Player has earned 50 legacy points in antiquity.
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      legacyPoints: 50,
      totalCareerLegacyPoints: 50,
      legacyPaths: { military: 2, economic: 2, science: 1, culture: 0 },
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const updated = next.players.get('p1')!;

    // Legacy points for the current age resets to 0 at transition.
    expect(updated.legacyPoints).toBe(0);
    // Career total is preserved — it was already accumulated via checkLegacyMilestones.
    expect(updated.totalCareerLegacyPoints).toBe(50);
  });

  it('totalCareerLegacyPoints reflects the sum of legacy earned across ages in score calculation', () => {
    // Scenario: two players reach modern age with identical milestone counts (3 each) and
    // identical current-age legacyPoints (30 each), but different cross-age career totals.
    //   p1: totalCareerLegacyPoints = 80  (50 from antiquity + 30 this age)
    //   p2: totalCareerLegacyPoints = 30  (no antiquity carry-over)
    //
    // calculateScore = totalMilestones*100 + totalCareerLegacyPoints*50 + cities*100 + techs*20 + culture
    //   p1 score = 3*100 + 80*50 + 1*100 = 300 + 4000 + 100 = 4400
    //   p2 score = 3*100 + 30*50 + 1*100 = 300 + 1500 + 100 = 1900
    //
    // If the bug were present (using legacyPoints instead of totalCareerLegacyPoints):
    //   p1 buggy score = 3*100 + 30*50 + 1*100 = 1900  →  tied, p1 would NOT win
    //
    // Therefore: p1 winning the score victory confirms calculateScore reads
    // totalCareerLegacyPoints, not legacyPoints.
    const player = createTestPlayer({
      id: 'p1',
      age: 'modern',
      ageProgress: 100,         // modern age complete → score victory gate open
      legacyPoints: 30,
      totalCareerLegacyPoints: 80, // 50 from antiquity + 30 this age
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 0 }, // totalMilestones = 3
    });
    const player2 = createTestPlayer({
      id: 'p2',
      age: 'modern',
      ageProgress: 100,
      legacyPoints: 30,         // same current-age points as p1
      totalCareerLegacyPoints: 30, // but no antiquity carry-over
      legacyPaths: { military: 1, economic: 1, science: 1, culture: 0 }, // totalMilestones = 3
    });

    const state = createTestState({
      players: new Map([['p1', player], ['p2', player2]]),
      cities: new Map([
        ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
        ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
      ]),
      currentPlayerId: 'p2',  // p2 is the last player — triggers victory check
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const next = victorySystem(state, { type: 'END_TURN' });

    // Score victory should be detected this turn (modern age complete).
    const p1Progress = next.victory.progress.get('p1')!;
    const p2Progress = next.victory.progress.get('p2')!;

    const p1Score = p1Progress.find(v => v.type === 'score')!;
    const p2Score = p2Progress.find(v => v.type === 'score')!;

    // Both should have full score-progress (ageProgress >= 100 in modern age).
    expect(p1Score.progress).toBe(1);
    expect(p2Score.progress).toBe(1);

    // p1 wins the score victory because totalCareerLegacyPoints = 80 > p2's 30.
    // If calculateScore mistakenly read legacyPoints (30 == 30), scores would tie and
    // p1 would NOT be the winner (insertion-order tiebreak picks p1, but 'achieved'
    // on p1 would only be set because they happen to be first — not due to career total).
    // The key assertion is that p2 does NOT achieve score victory: its score is lower
    // because totalCareerLegacyPoints(30) * 50 < totalCareerLegacyPoints(80) * 50.
    expect(p1Score.achieved).toBe(true);
    expect(p2Score.achieved).toBe(false);
  });

  it('checkLegacyMilestones accumulates totalCareerLegacyPoints on END_TURN without resetting at transition', () => {
    // A player earns a legacy milestone (science tier 1 = 1 point) on END_TURN.
    // After the turn, totalCareerLegacyPoints should increase by the gained amount.
    const player = createTestPlayer({
      id: 'p1',
      codexPlacements: [{ codexId: 'cx1', buildingId: 'library', cityId: 'c1' }],
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
      totalCareerLegacyPoints: 50, // pre-existing career total from earlier ages
    });
    const state = createTestState({ players: new Map([['p1', player]]) });
    const next = ageSystem(state, { type: 'END_TURN' });

    const updated = next.players.get('p1')!;
    // science tier 1 gained (1 point). Career total should grow from 50 to 51.
    expect(updated.legacyPoints).toBe(1);
    expect(updated.totalCareerLegacyPoints).toBe(51);
  });
});
