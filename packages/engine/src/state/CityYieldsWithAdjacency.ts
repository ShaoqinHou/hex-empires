import type { GameState, CityState } from '../types/GameState';
import type { YieldSet } from '../types/Yields';
import { addYields } from '../types/Yields';
import { calculateCityYields } from './YieldCalculator';
import { totalAdjacencyYieldsForCity, quarterBonus } from './DistrictAdjacency';

/**
 * Stacked city-yield calculator (M11 Cycle follow-up).
 *
 * Composes the existing `calculateCityYields` output with the pure adjacency
 * helpers from `DistrictAdjacency` — i.e. the tile-level adjacency bonus and
 * the +50% Quarter amplification introduced by the Districts Overhaul.
 *
 * Design notes:
 *   - This module does NOT replace `YieldCalculator`. It simply calls it and
 *     adds the adjacency layer on top. `YieldCalculator.ts` is untouched so
 *     the pipeline can continue to use the base calculator until a later
 *     cycle wires this stacked helper in.
 *   - Cities that predate the M9 Cycle B spatial data (i.e. `urbanTiles` or
 *     `quarters` are `undefined`) transparently contribute zero adjacency —
 *     the underlying helpers already return `EMPTY_YIELDS` in that case, so
 *     the result equals the base `calculateCityYields` output.
 *   - Purely additive: every yield field in the result is ≥ the corresponding
 *     field in the base output, because adjacency and quarter bonuses are
 *     always non-negative under the current rules.
 *   - Pure function: no mutation of the `CityState` or `GameState` inputs,
 *     no I/O, no RNG.
 */
export function calculateCityYieldsWithAdjacency(
  city: CityState,
  state: GameState,
): YieldSet {
  const base = calculateCityYields(city, state);
  const adjacency = totalAdjacencyYieldsForCity(city, state);
  const quarters = quarterBonus(city, state);
  return addYields(addYields(base, adjacency), quarters);
}
