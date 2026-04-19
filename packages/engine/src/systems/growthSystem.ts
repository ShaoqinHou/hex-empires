import type { GameState, GameAction, CityState, Age, TownSpecialization, PlayerState, PendingGrowthChoice } from '../types/GameState';
import { calculateCityYields } from '../state/YieldCalculator';
import { coordToKey, neighbors, keyToCoord } from '../hex/HexMath';
import { getGrowthThreshold as _getGrowthThreshold } from '../state/GrowthUtils';

// Re-export so existing callers (tests, barrel, web) continue to work.
export { getGrowthThreshold } from '../state/GrowthUtils';

/** Minimum population required to assign a town specialization */
const SPECIALIZATION_POP_MINIMUM = 7;

/**
 * Attempt to assign a specialization to a town.
 * Constraints:
 * - Settlement must be a town (not a city)
 * - Population must be >= 7
 * - Specialization cannot be changed once set
 */
function handleSetSpecialization(
  state: GameState,
  cityId: string,
  specialization: TownSpecialization,
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;
  if (city.settlementType !== 'town') return state;
  if (city.population < SPECIALIZATION_POP_MINIMUM) return state;
  if (city.specialization !== null) return state; // already specialized

  // fort_town grants +5 defense HP immediately on specialization
  const defenseHP = specialization === 'fort_town' ? city.defenseHP + 5 : city.defenseHP;
  const updatedCity: CityState = { ...city, specialization, defenseHP };
  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, updatedCity);
  return { ...state, cities: updatedCities };
}

/**
 * GrowthSystem processes city growth on END_TURN.
 * Each city:
 * 1. Calculates food yield from territory
 * 2. Subtracts food consumed by population (2 food per pop)
 * 3. Surplus food accumulates toward next population
 * 4. At threshold, population grows
 *
 * Growth threshold is age-dependent (Civ VII-style):
 * - Antiquity: 30 + 3*g + g^3.3 (fast early growth)
 * - Exploration: 20 + 20*g + g^3.0 (moderate growth)
 * - Modern: 20 + 40*g + g^2.7 (slow late growth)
 * where g = growthEvents = population - 1
 */
export function growthSystem(state: GameState, action: GameAction): GameState {
  if (action.type === 'SET_SPECIALIZATION') {
    return handleSetSpecialization(state, action.cityId, action.specialization);
  }
  if (action.type !== 'END_TURN') return state;

  const updatedCities = new Map(state.cities);
  // Track new pending growth choices accumulated this turn, keyed by playerId.
  const newGrowthChoices = new Map<string, PendingGrowthChoice[]>();
  let changed = false;

  for (const [cityId, city] of state.cities) {
    if (city.owner !== state.currentPlayerId) continue;

    // Determine the player's current age for growth formula
    const player = state.players.get(city.owner);
    const age: Age = player?.age ?? state.age.currentAge;

    const yields = calculateCityYields(city, state);
    // W3-02: specialists cost 2 food each per turn (Civ VII §spec).
    // Note: YieldCalculator already deducts -(specialists * 2) from yields.food,
    // so the net food surplus already accounts for specialist food cost.
    // The foodConsumed line below tracks only population baseline consumption
    // for starvation detection; specialist cost flows through yields.food.
    const foodConsumed = city.population * 2;
    const foodSurplus = yields.food - foodConsumed;
    const newFood = city.food + foodSurplus;
    const baseThreshold = _getGrowthThreshold(city.population, age);
    const totalGrowthRate = calculateTotalGrowthRate(city, state);
    let growthThreshold = Math.max(1, Math.round(baseThreshold * (1 - totalGrowthRate)));
    // growing_town specialization: +50% growth rate = -33% threshold
    if (city.specialization === 'growing_town') {
      growthThreshold = Math.round(growthThreshold / 1.5);
    }

    if (newFood < 0 && city.population > 1) {
      // Starvation — lose population
      updatedCities.set(cityId, { ...city, population: city.population - 1, food: 0 });
      changed = true;
    } else {
      const clampedFood = Math.max(0, newFood);
      // Towns soft-cap at 7 pop (Civ VII parity — unblocks full town specialization focus); cities grow as long as happiness >= 0
      const townCap = city.settlementType === 'town' ? 7 : Infinity;
      const canGrow = city.happiness >= 0 && city.population < townCap;
      if (clampedFood >= growthThreshold && canGrow) {
        // Population grows + territory expands
        const expandedTerritory = expandBorders(city, state, updatedCities);
        updatedCities.set(cityId, {
          ...city,
          population: city.population + 1,
          food: clampedFood - growthThreshold,
          territory: expandedTerritory,
        });
        // Emit a pending growth choice so the player can place an improvement
        // or assign a specialist (Civ VII W2-01 mechanic).
        const playerId = city.owner;
        if (!newGrowthChoices.has(playerId)) {
          newGrowthChoices.set(playerId, []);
        }
        newGrowthChoices.get(playerId)!.push({
          cityId,
          triggeredOnTurn: state.turn,
        });
        changed = true;
      } else if (!canGrow) {
        // At population cap — stop accumulating food (reset to threshold to avoid runaway)
        const cappedFood = Math.min(clampedFood, growthThreshold);
        if (cappedFood !== city.food) {
          updatedCities.set(cityId, { ...city, food: cappedFood });
          changed = true;
        }
      } else if (clampedFood !== city.food) {
        updatedCities.set(cityId, { ...city, food: clampedFood });
        changed = true;
      }
    }
  }

  if (!changed) return state;

  // Apply new pending growth choices to the relevant players.
  let updatedPlayers = state.players;
  if (newGrowthChoices.size > 0) {
    const playersMap = new Map(state.players);
    for (const [playerId, newChoices] of newGrowthChoices) {
      const p = playersMap.get(playerId);
      if (!p) continue;
      const merged: ReadonlyArray<PendingGrowthChoice> = [
        ...(p.pendingGrowthChoices ?? []),
        ...newChoices,
      ];
      const updatedPlayer: PlayerState = { ...p, pendingGrowthChoices: merged };
      playersMap.set(playerId, updatedPlayer);
    }
    updatedPlayers = playersMap;
  }

  return { ...state, cities: updatedCities, players: updatedPlayers };
}

/**
 * Calculate the total growth rate bonus for a city from its buildings.
 * Each building with a growthRateBonus contributes to the sum.
 * Example: Granary (0.1) + Watermill (0.05) = 0.15 → threshold × 0.85.
 */
export function calculateTotalGrowthRate(city: CityState, state: GameState): number {
  let total = 0;
  for (const buildingId of city.buildings) {
    const building = state.config.buildings.get(buildingId);
    if (building?.growthRateBonus) {
      total += building.growthRateBonus;
    }
  }
  return total;
}

/** Expand city borders by claiming one adjacent unclaimed tile */
function expandBorders(
  city: CityState,
  state: GameState,
  updatedCities: Map<string, CityState>,
): ReadonlyArray<string> {
  const territory = [...city.territory];

  // Find all hexes adjacent to current territory that aren't claimed
  const claimed = new Set<string>();
  for (const c of updatedCities.values()) {
    for (const t of c.territory) claimed.add(t);
  }
  // Also check original cities for claimed tiles
  for (const c of state.cities.values()) {
    for (const t of c.territory) claimed.add(t);
  }

  let bestTile: string | null = null;
  let bestYield = -1;

  for (const hexKey of territory) {
    const coord = keyToCoord(hexKey);
    for (const neighbor of neighbors(coord)) {
      const nKey = coordToKey(neighbor);
      if (claimed.has(nKey)) continue;
      if (territory.includes(nKey)) continue;
      const tile = state.map.tiles.get(nKey);
      if (!tile) continue;
      const terrain = state.config.terrains.get(tile.terrain);
      if (!terrain || terrain.isWater) continue;

      // Score by total yields
      const yieldScore = terrain.baseYields.food + terrain.baseYields.production + terrain.baseYields.gold;
      if (yieldScore > bestYield) {
        bestYield = yieldScore;
        bestTile = nKey;
      }
    }
  }

  if (bestTile) {
    territory.push(bestTile);
  }

  return territory;
}

// Re-export calculateCityYields from shared utility for backward compatibility
export { calculateCityYields } from '../state/YieldCalculator';
