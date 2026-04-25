import type { GameState, CityState, TownSpecialization } from '../types/GameState';
import type { GameConfig } from '../types/GameConfig';
import type { YieldSet } from '../types/Yields';
import { addYields, EMPTY_YIELDS } from '../types/Yields';
import { getYieldBonus } from './EffectUtils';

/**
 * F-10 (W8): Per-yield cap applied as a final clamp to city yields.
 * No normal gameplay should hit this cap (cities rarely exceed 999 of any yield),
 * but it prevents runaway exploit values from stacking errors.
 */
export const YIELD_CAP_PER_CITY = 999;

/** Calculate total yields for a city from its territory tiles */
export function calculateCityYields(city: CityState, state: GameState): YieldSet {
  let total = { ...EMPTY_YIELDS };

  for (const hexKey of city.territory) {
    const tile = state.map.tiles.get(hexKey);
    if (!tile) continue;

    // Base terrain yields
    const terrainYields = getTerrainYields(tile.terrain);
    total = addYields(total, terrainYields);

    // Feature yield modifiers
    if (tile.feature) {
      const featureYields = getFeatureYieldModifiers(tile.feature);
      total = addYields(total, featureYields);
    }

    // Resource yield bonus
    if (tile.resource) {
      const resourceDef = state.config.resources.get(tile.resource);
      if (resourceDef) {
        total = addYields(total, resourceDef.yieldBonus);
      }
    }

    // Improvement yields (NEW)
    if (tile.improvement) {
      const improvementYields = getImprovementYields(tile.improvement, state.config);
      total = addYields(total, improvementYields);
    }

    // River bonus intentionally omitted from the base tile-yield layer.
    // Per GDD §yields-adjacency F-03: the river benefit belongs exclusively in
    // the adjacency layer (DistrictAdjacency.computeAdjacencyBonus → +1 Food per
    // adjacent river tile). The pre-adjacency +1 Gold river bonus that previously
    // lived here was a holdover and caused double-attribution when
    // CityYieldsWithAdjacency stacked both layers.

    // F-08: Natural wonder tile yields — if this tile is a natural wonder,
    // look up its def via state.config.naturalWonders and add its yields.
    if (tile.naturalWonderId) {
      const wonderDef = state.config.naturalWonders.get(tile.naturalWonderId);
      if (wonderDef?.yields) {
        total = addYields(total, wonderDef.yields);
      }
    }
  }

  // City center always produces at least 2 food, 1 production
  total = addYields(total, { food: 2, production: 1 });

  // Town specialization yield bonuses
  if (city.specialization !== null) {
    total = addYields(total, getSpecializationYields(city.specialization));
  }

  // Specialist yields: each specialist produces +2 science and +2 culture.
  // Food cost (−2 per specialist) is handled in growthSystem.foodConsumed (F-02).
  if (city.specialists > 0) {
    total = addYields(total, {
      science: city.specialists * 2,
      culture: city.specialists * 2,
    });
  }

  // Building base yields. F-02: ALL buildings contribute base yields regardless of
  // age — obsolete (different age, non-ageless) buildings lose adjacency only,
  // not base yields. Adjacency skip is handled in DistrictAdjacency.ts.
  for (const buildingId of city.buildings) {
    const buildingDef = state.config.buildings.get(buildingId);
    if (buildingDef) {
      total = addYields(total, buildingDef.yields);
    }
  }

  // Civ/leader/legacy ability yield bonuses (MODIFY_YIELD with target: 'empire')
  // All YieldType fields included so that MODIFY_YIELD effects for happiness and
  // influence apply correctly (e.g. a leader ability granting +2 happiness empire-wide).
  total = addYields(total, {
    food: getYieldBonus(state, city.owner, 'food'),
    production: getYieldBonus(state, city.owner, 'production'),
    gold: getYieldBonus(state, city.owner, 'gold'),
    science: getYieldBonus(state, city.owner, 'science'),
    culture: getYieldBonus(state, city.owner, 'culture'),
    faith: getYieldBonus(state, city.owner, 'faith'),
    happiness: getYieldBonus(state, city.owner, 'happiness'),
    influence: getYieldBonus(state, city.owner, 'influence'),
  });

  // Y2.2: Slotted policy MODIFY_YIELD effects (both 'empire' and 'city' targets apply per city).
  const player = state.players.get(city.owner);
  if (player?.slottedPolicies) {
    for (const policyId of player.slottedPolicies) {
      if (!policyId) continue;
      const policyDef = state.config.policies.get(policyId);
      const bonus = policyDef?.bonus;
      if (bonus?.type === 'MODIFY_YIELD') {
        total = addYields(total, { [bonus.yield]: bonus.value });
      }
    }
  }

  // Y2.3: Tech-effect MODIFY_YIELD — iterate researchedTechs and apply any effects.
  if (player?.researchedTechs) {
    for (const techId of player.researchedTechs) {
      const techDef = state.config.technologies.get(techId);
      if (!techDef?.effects) continue;
      for (const effect of techDef.effects) {
        if (effect.type === 'MODIFY_YIELD') {
          total = addYields(total, { [effect.yield]: effect.value });
        }
      }
    }
  }

  // F-06: Per-age yield bonuses from assigned resources (W4-05).
  // Each resource assigned to this city contributes yields from its bonusTable
  // row for the current age.
  const currentAge = state.age.currentAge;
  const assignedResources = (city as CityState & { readonly assignedResources?: ReadonlyArray<string> }).assignedResources;
  if (assignedResources && assignedResources.length > 0) {
    for (const resId of assignedResources) {
      const resDef = state.config.resources.get(resId);
      const row = resDef?.bonusTable?.[currentAge];
      if (row?.yields) {
        total = addYields(total, row.yields);
      }
    }
  }

  // BB5.3: Placed codex science yield — each codex with placedInCityId === city.id
  // contributes +2 science per turn to that city.
  if (state.codices) {
    for (const codex of state.codices.values()) {
      if (codex.placedInCityId === city.id) {
        total = addYields(total, { science: 2 });
      }
    }
  }

  // Y2.4: localHappiness penalty — each unit of negative happiness reduces
  // all yields by 2% (i.e. multiplier = 1 + localHappiness * 0.02, clamped to [0, 1]).
  // city.happiness holds the current local happiness value.
  const localHappiness = city.happiness;
  if (localHappiness < 0) {
    const multiplier = Math.max(0, 1 + localHappiness * 0.02);
    total = {
      food:       Math.floor(total.food * multiplier),
      production: Math.floor(total.production * multiplier),
      gold:       Math.floor(total.gold * multiplier),
      science:    Math.floor(total.science * multiplier),
      culture:    Math.floor(total.culture * multiplier),
      faith:      Math.floor(total.faith * multiplier),
      influence:  Math.floor(total.influence * multiplier),
      happiness:  Math.floor(total.happiness * multiplier),
    };
  }

  // F-10 (W8): Apply per-yield cap as final clamp to prevent runaway values.
  return clampYields(total, YIELD_CAP_PER_CITY);
}

/**
 * Clamp all yield values in a YieldSet to the given maximum.
 */
function clampYields(yields: YieldSet, cap: number): YieldSet {
  return {
    food:       Math.min(yields.food, cap),
    production: Math.min(yields.production, cap),
    gold:       Math.min(yields.gold, cap),
    science:    Math.min(yields.science, cap),
    culture:    Math.min(yields.culture, cap),
    faith:      Math.min(yields.faith, cap),
    influence:  Math.min(yields.influence, cap),
    happiness:  Math.min(yields.happiness, cap),
  };
}

/**
 * Yield bonuses granted by town specializations.
 * growing_town growth rate is handled in growthSystem (threshold reduction).
 */
export function getSpecializationYields(specialization: TownSpecialization): Partial<YieldSet> {
  switch (specialization) {
    case 'farming_town':   return { food: 2 };
    case 'mining_town':    return { production: 2 };
    case 'trade_outpost':  return { gold: 3 };
    case 'growing_town':   return {}; // bonus is applied as growth threshold reduction
    case 'fort_town':      return {}; // bonus is defense HP + healing, not yields
    case 'religious_site': return { faith: 3 };
    case 'hub_town':       return { gold: 2, production: 1 };
    case 'urban_center':   return { food: 1, production: 1, gold: 1 };
    case 'factory_town':   return { production: 3 };
    default:               return {};
  }
}

function getTerrainYields(terrain: string): Partial<YieldSet> {
  const table: Record<string, Partial<YieldSet>> = {
    grassland: { food: 3 },
    plains: { food: 2, production: 1 },
    desert: { food: 2, production: 1 },
    tundra: { food: 3 },
    snow: {},
    coast: { food: 1, gold: 1 },
    ocean: { food: 1 },
  };
  return table[terrain] ?? {};
}

function getFeatureYieldModifiers(feature: string): Partial<YieldSet> {
  const table: Record<string, Partial<YieldSet>> = {
    hills: { production: 1 },
    forest: { production: 1 },
    jungle: { production: 2, science: 1 },
    marsh: { food: 1 },
    floodplains: { food: 3 },
    oasis: { food: 3, gold: 1 },
    reef: { food: 1, production: 1 },
  };
  return table[feature] ?? {};
}

function getImprovementYields(improvementId: string, config: GameConfig): Partial<YieldSet> {
  const improvement = config.improvements.get(improvementId);
  return improvement?.yields ?? {};
}
