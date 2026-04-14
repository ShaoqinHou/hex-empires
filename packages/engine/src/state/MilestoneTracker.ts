import type { GameState } from '../types/GameState';
import type { PlayerId } from '../types/Ids';
import {
  ALL_LEGACY_PATHS,
  scoreLegacyPaths,
  type LegacyAge,
  type LegacyAxis,
} from './LegacyPaths';

/**
 * MilestoneTracker — pure analytics helpers that expose, for every player, the
 * flat list of Legacy-Path milestones they have currently satisfied.
 *
 * This is a queryable superset of M18's `scoreLegacyPaths` output: where
 * `scoreLegacyPaths` returns only `tiersCompleted` per path, this module emits
 * a specific record per achieved milestone (including the exact tier and
 * description) and provides empire-wide summaries and a dense-rank leaderboard.
 *
 * Intentionally NOT re-exported from the engine barrel — callers that need
 * these utilities import them directly by path, matching the pattern used by
 * EconomyAnalytics / CombatAnalytics / MapAnalytics.
 *
 * All functions are pure: they read from an immutable GameState, perform no
 * I/O, never mutate, and return fresh collections on every call.
 */

export interface MilestoneAchievement {
  readonly pathId: string;
  readonly axis: LegacyAxis;
  readonly age: LegacyAge;
  readonly tier: 1 | 2 | 3;
  readonly description: string;
}

export interface MilestoneSummary {
  readonly totalAchieved: number;
  readonly byAxis: Readonly<Record<LegacyAxis, number>>;
  readonly byAge: Readonly<Record<LegacyAge, number>>;
}

export interface MilestoneLeaderboardEntry {
  readonly playerId: PlayerId;
  readonly totalAchieved: number;
  readonly rank: number;
}

/**
 * Build the complete list of milestone achievements for a single player.
 *
 * Uses `scoreLegacyPaths` (from M18) to determine how many tiers of each path
 * are satisfied, then cross-references `ALL_LEGACY_PATHS` to emit one record
 * per satisfied milestone. Because `scoreLegacyPaths` counts how many of a
 * path's 3 check predicates are currently true — not strictly which tiers
 * those are — and the M18 thresholds are monotonically non-decreasing (t1 ≤ t2
 * ≤ t3 within every path), we emit the first `tiersCompleted` milestones of
 * each path to reflect the cumulative progression.
 *
 * Unknown player id → empty array (matches `scoreLegacyPaths` semantics).
 */
export function playerAchievedMilestones(
  playerId: PlayerId,
  state: GameState,
): ReadonlyArray<MilestoneAchievement> {
  const progress = scoreLegacyPaths(playerId, state);
  const out: MilestoneAchievement[] = [];
  for (let i = 0; i < ALL_LEGACY_PATHS.length; i++) {
    const path = ALL_LEGACY_PATHS[i];
    const entry = progress[i];
    const tiers = entry.tiersCompleted;
    if (tiers === 0) continue;
    for (let t = 0; t < tiers; t++) {
      const milestone = path.milestones[t];
      out.push({
        pathId: `${path.age}_${path.axis}`,
        axis: path.axis,
        age: path.age,
        tier: milestone.tier,
        description: milestone.description,
      });
    }
  }
  return out;
}

function emptyByAxis(): Record<LegacyAxis, number> {
  return { science: 0, culture: 0, military: 0, economic: 0 };
}

function emptyByAge(): Record<LegacyAge, number> {
  return { antiquity: 0, exploration: 0, modern: 0 };
}

/**
 * Summarise milestone achievements across every player in `state.players`.
 *
 * The returned map always has one entry per known player (even when that
 * player has zero achievements — in which case all counters are 0).
 */
export function empireMilestoneSummary(
  state: GameState,
): ReadonlyMap<PlayerId, MilestoneSummary> {
  const result = new Map<PlayerId, MilestoneSummary>();
  for (const playerId of state.players.keys()) {
    const achievements = playerAchievedMilestones(playerId, state);
    const byAxis = emptyByAxis();
    const byAge = emptyByAge();
    for (const a of achievements) {
      byAxis[a.axis] += 1;
      byAge[a.age] += 1;
    }
    result.set(playerId, {
      totalAchieved: achievements.length,
      byAxis,
      byAge,
    });
  }
  return result;
}

/**
 * Dense-ranked leaderboard of every known player by total milestones achieved.
 *
 * Sorted descending by `totalAchieved`. Ties share a rank; the next distinct
 * value takes the immediately following rank (e.g. totals [10, 5, 5, 2] rank
 * [1, 2, 2, 3], matching `EconomyAnalytics.playerRanking`).
 */
export function milestoneLeaderboard(
  state: GameState,
): ReadonlyArray<MilestoneLeaderboardEntry> {
  const summary = empireMilestoneSummary(state);
  const entries: Array<{ playerId: PlayerId; totalAchieved: number }> = [];
  for (const [playerId, s] of summary) {
    entries.push({ playerId, totalAchieved: s.totalAchieved });
  }
  entries.sort((a, b) => b.totalAchieved - a.totalAchieved);

  const ranked: MilestoneLeaderboardEntry[] = [];
  let currentRank = 0;
  let previousValue: number | null = null;
  for (const entry of entries) {
    if (previousValue === null || entry.totalAchieved !== previousValue) {
      currentRank += 1;
      previousValue = entry.totalAchieved;
    }
    ranked.push({
      playerId: entry.playerId,
      totalAchieved: entry.totalAchieved,
      rank: currentRank,
    });
  }
  return ranked;
}
