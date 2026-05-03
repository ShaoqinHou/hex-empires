import type { GameState, CityState } from '../types/GameState';
import type { YieldSet } from '../types/Yields';
import { addYields } from '../types/Yields';
import { calculateCityYields } from './YieldCalculator';
import { totalAdjacencyYieldsForCity, quarterBonus } from './DistrictAdjacency';
import { findDistrictStationedCityId } from './DistrictStationing';

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
  const stacked = addYields(addYields(base, adjacency), quarters);
  const zealPercent = getCityLeadershipZealPercent(state, city);
  return applyLeadershipZeal(stacked, zealPercent);
}

function getCityLeadershipZealPercent(state: GameState, city: CityState): number {
  if (!state.commanders || !state.config.commanderPromotions) return 0;

  let totalZealPercent = 0;
  for (const [commanderId, commanderState] of state.commanders) {
    const commanderUnit = state.units.get(commanderId);
    if (!commanderUnit) continue;
    if (commanderUnit.owner !== city.owner) continue;
    if (findDistrictStationedCityId(state, commanderUnit) !== city.id) continue;

    const promotionIds = new Set([...commanderState.promotions, ...commanderUnit.promotions]);
    for (const promotionId of promotionIds) {
      const promotion = state.config.commanderPromotions.get(promotionId);
      if (promotion?.aura.type !== 'AURA_SETTLEMENT_YIELD_BONUS_WHILE_STATIONED') continue;
      totalZealPercent += promotion.aura.value;
    }
  }

  return totalZealPercent;
}

function applyLeadershipZeal(yields: YieldSet, percent: number): YieldSet {
  if (percent <= 0) return yields;
  return {
    food: applyPositivePercent(yields.food, percent),
    production: applyPositivePercent(yields.production, percent),
    gold: applyPositivePercent(yields.gold, percent),
    science: applyPositivePercent(yields.science, percent),
    culture: applyPositivePercent(yields.culture, percent),
    faith: applyPositivePercent(yields.faith, percent),
    influence: applyPositivePercent(yields.influence, percent),
    happiness: applyPositivePercent(yields.happiness, percent),
  };
}

function applyPositivePercent(value: number, percent: number): number {
  if (value <= 0) return value;
  return Math.floor(value * (100 + percent) / 100);
}
