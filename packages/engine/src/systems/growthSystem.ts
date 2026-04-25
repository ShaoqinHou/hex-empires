import type { GameState, GameAction, CityState, Age, TownSpecialization, PlayerState, PendingGrowthChoice, HexTile } from '../types/GameState';
import type { ResourceId, ImprovementId } from '../types/Ids';
import { calculateCityYieldsWithAdjacency } from '../state/CityYieldsWithAdjacency';
import { coordToKey, neighbors, keyToCoord } from '../hex/HexMath';
import { getGrowthThreshold as _getGrowthThreshold } from '../state/GrowthUtils';
import { deriveImprovementType } from '../state/ImprovementRules';

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
  if (action.type === 'RESOLVE_GROWTH_CHOICE') {
    return handleResolveGrowthChoice(
      state, action.cityId, action.kind, action.improvementId, action.tileId,
    );
  }
  if (action.type !== 'END_TURN') return state;

  const updatedCities = new Map(state.cities);
  // Track new pending growth choices accumulated this turn, keyed by playerId.
  const newGrowthChoices = new Map<string, PendingGrowthChoice[]>();
  // F-07 (W4-05): Track newly acquired resources from border expansion, keyed by playerId.
  const newResourceAcquisitions = new Map<string, ResourceId[]>();
  let changed = false;

  for (const [cityId, city] of state.cities) {
    if (city.owner !== state.currentPlayerId) continue;

    // Determine the player's current age for growth formula
    const player = state.players.get(city.owner);
    const age: Age = player?.age ?? state.age.currentAge;

    const yields = calculateCityYieldsWithAdjacency(city, state);
    // F-02: specialists cost 2 food each per turn (Civ VII §spec).
    // Food cost is consolidated here (not in YieldCalculator) so the surplus
    // calculation and starvation check both account for specialist maintenance.
    const foodConsumed = city.population * 2 + city.specialists * 2;
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
        const { territory: expandedTerritory, newTileKey } = expandBorders(city, state, updatedCities);
        updatedCities.set(cityId, {
          ...city,
          population: city.population + 1,
          food: clampedFood - growthThreshold,
          territory: expandedTerritory,
        });
        // F-07 (W4-05): If the newly claimed tile has a resource, add it to the player's ownedResources.
        const playerId = city.owner;
        if (newTileKey !== null) {
          const newTile = state.map.tiles.get(newTileKey);
          if (newTile?.resource) {
            const resourceId = newTile.resource as ResourceId;
            const owningPlayer = state.players.get(playerId);
            if (owningPlayer) {
              const currentOwned = (owningPlayer as typeof owningPlayer & { readonly ownedResources?: ReadonlyArray<ResourceId> }).ownedResources ?? [];
              if (!currentOwned.includes(resourceId)) {
                // Queue for player update — will be merged below with pendingGrowthChoices
                newResourceAcquisitions.set(playerId, [
                  ...(newResourceAcquisitions.get(playerId) ?? []),
                  resourceId,
                ]);
              }
            }
          }
        }
        // Emit a pending growth choice so the player can place an improvement
        // or assign a specialist (Civ VII W2-01 mechanic).
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

  // Apply new pending growth choices + newly acquired resources to the relevant players.
  let updatedPlayers = state.players;
  if (newGrowthChoices.size > 0 || newResourceAcquisitions.size > 0) {
    const playersMap = new Map(state.players);
    // Collect all playerIds that need updating
    const playerIds = new Set([...newGrowthChoices.keys(), ...newResourceAcquisitions.keys()]);
    for (const playerId of playerIds) {
      const p = playersMap.get(playerId);
      if (!p) continue;
      const newChoices = newGrowthChoices.get(playerId) ?? [];
      const merged: ReadonlyArray<PendingGrowthChoice> = [
        ...(p.pendingGrowthChoices ?? []),
        ...newChoices,
      ];
      const newResources = newResourceAcquisitions.get(playerId) ?? [];
      const existingOwned = (p as typeof p & { readonly ownedResources?: ReadonlyArray<ResourceId> }).ownedResources ?? [];
      const mergedOwned: ReadonlyArray<ResourceId> = newResources.length > 0
        ? [...existingOwned, ...newResources.filter((r) => !existingOwned.includes(r))]
        : existingOwned;
      const updatedPlayer: PlayerState = {
        ...p,
        pendingGrowthChoices: merged,
        ...(newResources.length > 0 ? { ownedResources: mergedOwned } : {}),
      };
      playersMap.set(playerId, updatedPlayer);
    }
    updatedPlayers = playersMap;
  }

  return { ...state, cities: updatedCities, players: updatedPlayers };
}

/**
 * F-12: Resolve a pending growth choice via a single RESOLVE_GROWTH_CHOICE action.
 *
 * kind === "specialist": increments city.specialists at city-level (same as
 *   ASSIGN_SPECIALIST_FROM_GROWTH). Clears the pending growth choice.
 *
 * kind === "improvement": derives the improvement type from tile terrain/resource
 *   (or uses improvementId if provided) and places it on tileId. Also handles
 *   F-10 resource depletion: decrements resourceUsesRemaining by 1 when the tile
 *   has a bonus resource; clears the resource when uses reach 0.
 *
 * NOTE (F-10): The PLACE_IMPROVEMENT action in improvementSystem.ts does NOT
 * currently decrement resourceUsesRemaining. That wiring should be added to
 * improvementSystem in a follow-up once the W8 productionSystem changes settle.
 */
function handleResolveGrowthChoice(
  state: GameState,
  cityId: string,
  kind: 'improvement' | 'specialist',
  improvementId: string | undefined,
  tileCoord: { readonly q: number; readonly r: number } | undefined,
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Verify there is a pending growth choice for this city
  const hasPending = (player.pendingGrowthChoices ?? []).some(c => c.cityId === cityId);
  if (!hasPending) return state;

  // Clear the pending choice for this city
  const newPending = (player.pendingGrowthChoices ?? []).filter(c => c.cityId !== cityId);
  const updatedPlayer: PlayerState = { ...player, pendingGrowthChoices: newPending };
  const updatedPlayers = new Map(state.players);

  if (kind === 'specialist') {
    if (city.specialists >= city.population - 1) return state;
    const updatedCities = new Map(state.cities);
    updatedCities.set(cityId, { ...city, specialists: city.specialists + 1 });
    updatedPlayers.set(state.currentPlayerId, updatedPlayer);
    return {
      ...state,
      cities: updatedCities,
      players: updatedPlayers,
      log: [...state.log, {
        turn: state.turn,
        playerId: state.currentPlayerId,
        message: `${city.name}: growth resolved via specialist assignment (${city.specialists + 1} total)`,
        type: 'city' as const,
      }],
    };
  }

  // kind === "improvement"
  if (!tileCoord) return state;
  const tileKey = coordToKey(tileCoord);
  const currentTile = state.map.tiles.get(tileKey);
  if (!currentTile) return state;
  if (currentTile.improvement) return state; // already improved

  // Use explicit improvementId or derive from terrain + resource
  const resolvedImprovementId: ImprovementId | null =
    (improvementId as ImprovementId | undefined) ?? deriveImprovementType(currentTile, state);
  if (!resolvedImprovementId) return state;

  // F-10: Resource depletion — decrement resourceUsesRemaining by 1 on first harvest.
  const DEFAULT_RESOURCE_USES = 5;
  let updatedTileData: HexTile = { ...currentTile, improvement: resolvedImprovementId };
  if (currentTile.resource !== null) {
    const usesLeft = currentTile.resourceUsesRemaining ?? DEFAULT_RESOURCE_USES;
    const newUses = usesLeft - 1;
    if (newUses <= 0) {
      updatedTileData = { ...updatedTileData, resource: null, resourceUsesRemaining: 0 };
    } else {
      updatedTileData = { ...updatedTileData, resourceUsesRemaining: newUses };
    }
  }

  const updatedTiles = new Map(state.map.tiles);
  updatedTiles.set(tileKey, updatedTileData);
  updatedPlayers.set(state.currentPlayerId, updatedPlayer);

  const improvementDef = state.config.improvements.get(resolvedImprovementId);
  const improvementName = improvementDef?.name ?? resolvedImprovementId;

  return {
    ...state,
    map: { ...state.map, tiles: updatedTiles },
    players: updatedPlayers,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${city.name}: growth resolved via ${improvementName} at (${tileCoord.q}, ${tileCoord.r})`,
      type: 'production' as const,
    }],
  };
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

/** Expand city borders by claiming one adjacent unclaimed tile.
 * Returns the updated territory array and the key of the newly claimed tile (null if none). */
function expandBorders(
  city: CityState,
  state: GameState,
  updatedCities: Map<string, CityState>,
): { readonly territory: ReadonlyArray<string>; readonly newTileKey: string | null } {
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

  return { territory, newTileKey: bestTile };
}

// Re-export calculateCityYields from shared utility for backward compatibility
export { calculateCityYields } from '../state/YieldCalculator';
