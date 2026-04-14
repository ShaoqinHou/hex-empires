import type { GameState } from '../types/GameState';
import type { PlayerId } from '../types/Ids';

/**
 * Pure analytics helpers for cross-player economic and demographic stats.
 *
 * All functions are side-effect free and read from an immutable GameState.
 * This module is intentionally NOT re-exported from the engine barrel — callers
 * that need these utilities import them directly by path.
 */

export type RankingMetric = 'gold' | 'score' | 'cities' | 'units' | 'population';

export interface PlayerRankingEntry {
  readonly playerId: PlayerId;
  readonly value: number;
  readonly rank: number;
}

/**
 * Count units owned by a given player.
 *
 * Returns 0 when the player has no units or when `playerId` does not exist.
 */
export function totalOwnedUnits(state: GameState, playerId: PlayerId): number {
  let count = 0;
  for (const unit of state.units.values()) {
    if (unit.owner === playerId) count++;
  }
  return count;
}

/**
 * Count cities owned by a given player.
 *
 * Returns 0 when the player owns no cities or when `playerId` does not exist.
 */
export function totalOwnedCities(state: GameState, playerId: PlayerId): number {
  let count = 0;
  for (const city of state.cities.values()) {
    if (city.owner === playerId) count++;
  }
  return count;
}

/**
 * Sum `population` across all cities owned by the given player.
 *
 * Returns 0 when the player owns no cities.
 */
export function totalPopulation(state: GameState, playerId: PlayerId): number {
  let total = 0;
  for (const city of state.cities.values()) {
    if (city.owner === playerId) total += city.population;
  }
  return total;
}

/**
 * Read a numeric `score` field from a player record in a type-safe way.
 *
 * `PlayerState` does not currently expose `score`, but some consumers (save
 * files, future systems) may attach it. Missing or non-numeric values are
 * treated as 0.
 */
function readScore(player: unknown): number {
  if (typeof player !== 'object' || player === null) return 0;
  const candidate = (player as { readonly score?: unknown }).score;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0;
}

function metricValue(state: GameState, playerId: PlayerId, metric: RankingMetric): number {
  const player = state.players.get(playerId);
  if (!player) return 0;
  switch (metric) {
    case 'gold':
      return player.gold;
    case 'score':
      return readScore(player);
    case 'cities':
      return totalOwnedCities(state, playerId);
    case 'units':
      return totalOwnedUnits(state, playerId);
    case 'population':
      return totalPopulation(state, playerId);
  }
}

/**
 * Rank every player by the requested metric, sorted descending (rank 1 is
 * highest value).
 *
 * Uses dense ranking — tied values share a rank, and the next distinct value
 * receives the immediately following rank (e.g. values [10, 8, 8, 5] produce
 * ranks [1, 2, 2, 3], not [1, 2, 2, 4]).
 */
export function playerRanking(
  state: GameState,
  metric: RankingMetric,
): ReadonlyArray<PlayerRankingEntry> {
  const entries: Array<{ playerId: PlayerId; value: number }> = [];
  for (const playerId of state.players.keys()) {
    entries.push({ playerId, value: metricValue(state, playerId, metric) });
  }
  entries.sort((a, b) => b.value - a.value);

  const ranked: PlayerRankingEntry[] = [];
  let currentRank = 0;
  let previousValue: number | null = null;
  for (const entry of entries) {
    if (previousValue === null || entry.value !== previousValue) {
      currentRank += 1;
      previousValue = entry.value;
    }
    ranked.push({ playerId: entry.playerId, value: entry.value, rank: currentRank });
  }
  return ranked;
}

/**
 * Number of players ahead of `playerId` on the gold leaderboard.
 *
 * Returns 0 when the player is tied for first (or is the sole leader) and -1
 * when the player does not exist in `state.players`.
 */
export function economicLead(state: GameState, playerId: PlayerId): number {
  if (!state.players.has(playerId)) return -1;
  const ranking = playerRanking(state, 'gold');
  const entry = ranking.find((e) => e.playerId === playerId);
  if (!entry) return -1;
  return entry.rank - 1;
}
