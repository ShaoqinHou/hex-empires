import type { GameState, GameAction, CityState, UnitState, HexTile, ProductionItem } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import type { BuildingId } from '../types/Ids';
import { coordToKey } from '../hex/HexMath';
import { calculateCityYields } from '../state/YieldCalculator';
import { validateBuildingPlacement } from '../state/BuildingPlacementValidator';

/** Generate deterministic unit ID from state */
function nextUnitId(state: GameState, cityId: string): string {
  return `unit_${state.units.size + 1}_${cityId}_t${state.turn}`;
}

/**
 * Helper function to create an invalid result with validation reason
 */
function createInvalidResult(
  state: GameState,
  reason: string,
  category: 'movement' | 'combat' | 'production' | 'general',
): GameState {
  return {
    ...state,
    lastValidation: { valid: false, reason, category },
    log: state.log, // Keep log unchanged
  };
}

/**
 * ProductionSystem processes production queues on END_TURN.
 * Also handles SET_PRODUCTION and PURCHASE_ITEM actions.
 * Towns cannot produce via production queue — they must use PURCHASE_ITEM.
 */
export function productionSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PRODUCTION':
      return handleSetProduction(state, action.cityId, action.itemId, action.itemType, action.tile);
    case 'CANCEL_BUILDING_PLACEMENT':
      return handleCancelBuildingPlacement(state, action.cityId);
    case 'PURCHASE_ITEM':
      return handlePurchaseItem(state, action.cityId, action.itemId, action.itemType);
    case 'END_TURN':
      return processProduction(state);
    default:
      return state;
  }
}

/**
 * Compute the cancel threshold for a city's current building/wonder in queue.
 *
 * Per `.claude/workflow/design/building-placement-rework.md` §2.2, a player may
 * cancel placement so long as `productionProgress` is strictly below
 * `max(10, floor(0.5 * productionPerTurn))` — i.e. less than half of one turn's
 * worth of accumulated production (with a 10-point floor so zero-production
 * cities still have a cancel window).
 *
 * Exposed (non-exported) helper kept close to the handler for easy unit
 * verification via behavioural assertions. Pure — reads state, returns number.
 */
function computeCancelThreshold(state: GameState, city: CityState): number {
  const yields = calculateCityYields(city, state);
  const prod = yields.production;
  return Math.max(10, Math.floor(0.5 * prod));
}

/**
 * Handle CANCEL_BUILDING_PLACEMENT — Cycle 2 of the building-placement rework.
 *
 * Clears the head of the production queue iff it is a 'building' or 'wonder'
 * item with a `lockedTile`, and production has not yet crossed the cancel
 * threshold. Returns state unchanged for every other shape (no queue, wrong
 * head type, no lockedTile, past threshold, missing city). Does not emit a
 * validation error when declining to cancel — the UI is responsible for
 * disabling the Cancel button via `computeCancelThreshold` (mirrored into the
 * React layer in Cycle 3+).
 */
function handleCancelBuildingPlacement(state: GameState, cityId: string): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.productionQueue.length === 0) return state;

  const head = city.productionQueue[0];
  if (head.type !== 'building' && head.type !== 'wonder') return state;
  if (!head.lockedTile) return state;

  const threshold = computeCancelThreshold(state, city);
  if (city.productionProgress >= threshold) return state;

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, {
    ...city,
    productionQueue: city.productionQueue.slice(1),
    productionProgress: 0,
  });

  return { ...state, cities: updatedCities, lastValidation: null };
}

function handleSetProduction(
  state: GameState,
  cityId: string,
  itemId: string,
  itemType: 'unit' | 'building' | 'wonder' | 'district',
  tile?: HexCoord,
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return createInvalidResult(state, 'City not found', 'production');
  if (city.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your city', 'production');
  // Towns cannot use production queue — they must purchase with gold
  if (city.settlementType === 'town') return createInvalidResult(state, 'Towns cannot produce - must purchase with gold', 'production');

  // Check if wonder is already built globally (for SET_PRODUCTION)
  const buildingDef = itemType === 'wonder' || itemType === 'building' ? state.config.buildings.get(itemId) : undefined;
  const isWonder = buildingDef?.isWonder === true;
  if (isWonder && state.builtWonders.includes(itemId)) {
    return createInvalidResult(state, 'This wonder has already been built', 'production');
  }

  // If producing a unit that requires a strategic resource, verify the player
  // has access to it (any city's territory must contain that resource).
  if (itemType === 'unit') {
    const unitDef = state.config.units.get(itemId);
    if (unitDef?.requiredResource) {
      const hasResource = playerHasResource(state, state.currentPlayerId, unitDef.requiredResource);
      if (!hasResource) return createInvalidResult(state, `Requires resource: ${unitDef.requiredResource}`, 'production');
    }
  }

  // Check if building is already built
  if (itemType === 'building' && city.buildings.includes(itemId)) {
    return createInvalidResult(state, 'Building already constructed', 'production');
  }

  // Check if wonder is unique and already built globally
  if (itemType === 'wonder' && state.builtWonders.includes(itemId)) {
    return createInvalidResult(state, 'This wonder has already been built', 'production');
  }

  // Check if district is already built by this city
  if (itemType === 'district') {
    const cityDistricts = city.districts.map(did => state.districts.get(did)).filter((d): d is any => d !== undefined);
    const districtDef = state.config.districts.get(itemId);
    if (districtDef && cityDistricts.some(d => d.type === districtDef.type)) {
      return createInvalidResult(state, 'City already has this district type', 'production');
    }
  }

  // ── Building-placement rework (Cycle 4) — attach locked tile ──
  //
  // When the caller passes a `tile` (via the additive SET_PRODUCTION field),
  // store it on the queue item as `lockedTile`. productionSystem Cycle 1
  // then auto-places the building on this tile when production completes.
  // Only applied for 'building' / 'wonder'; for other item types the tile
  // is ignored (units spawn at the city centre; districts have their own
  // placement flow).
  const attachTile = tile && (itemType === 'building' || itemType === 'wonder');
  const queueItem: ProductionItem = attachTile
    ? { type: itemType, id: itemId, lockedTile: tile }
    : { type: itemType, id: itemId };

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, {
    ...city,
    productionQueue: [queueItem],
    // Keep existing progress when switching production (no waste)
    productionProgress: city.productionProgress,
  });

  return { ...state, cities: updatedCities, lastValidation: null };
}

/**
 * Returns true if the player controls at least one tile with the given resource
 * across all of their cities' territories.
 */
function playerHasResource(state: GameState, playerId: string, resourceId: string): boolean {
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    for (const tileKey of city.territory) {
      const tile = state.map.tiles.get(tileKey);
      if (tile?.resource === resourceId) return true;
    }
  }
  return false;
}

function handlePurchaseItem(
  state: GameState,
  cityId: string,
  itemId: string,
  itemType: 'unit' | 'building',
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return createInvalidResult(state, 'City not found', 'production');
  if (city.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your city', 'production');

  // Check if building is already built
  if (itemType === 'building' && city.buildings.includes(itemId)) {
    return createInvalidResult(state, 'Building already constructed', 'production');
  }

  let goldCost = getGoldCost(state, itemId);
  // Market: 10% discount on all unit gold purchases
  if (city.buildings.includes('market') && itemType === 'unit') {
    goldCost = Math.floor(goldCost * 0.9);
  }
  const player = state.players.get(state.currentPlayerId);
  if (!player || player.gold < goldCost) return createInvalidResult(state, `Not enough gold (need ${goldCost})`, 'production');

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, { ...player, gold: player.gold - goldCost });

  const updatedCities = new Map(state.cities);
  const updatedUnits = new Map(state.units);
  const newLog = [...state.log];

  if (itemType === 'unit') {
    const unitId = nextUnitId(state, cityId);
    const newUnit: UnitState = {
      id: unitId,
      typeId: itemId,
      owner: city.owner,
      position: city.position,
      movementLeft: 0,
      health: 100,
      experience: 0,
      promotions: [],
      fortified: false,
    };
    updatedUnits.set(unitId, newUnit);
    newLog.push({
      turn: state.turn,
      playerId: city.owner,
      message: `${city.name} purchased ${itemId}`,
      type: 'production',
    });
  } else if (itemType === 'building') {
    // Check if this is a wonder (has isWonder flag)
    const buildingDef = state.config.buildings.get(itemId);
    const isWonder = buildingDef?.isWonder === true;

    // Check if wonder is already built
    if (isWonder && state.builtWonders.includes(itemId)) {
      return createInvalidResult(state, 'This wonder has already been built', 'production');
    }

    const wallsBonus = itemId === 'walls' ? 100 : 0;
    updatedCities.set(cityId, {
      ...city,
      buildings: [...city.buildings, itemId],
      defenseHP: city.defenseHP + wallsBonus,
    });
    newLog.push({
      turn: state.turn,
      playerId: city.owner,
      message: `${city.name} purchased ${itemId}${isWonder ? ' 🏆' : ''}`,
      type: 'production',
    });

    // If it's a wonder, add to global builtWonders
    if (isWonder) {
      return {
        ...state,
        players: updatedPlayers,
        cities: updatedCities,
        units: updatedUnits,
        log: newLog,
        lastValidation: null,
        builtWonders: [...state.builtWonders, itemId],
      };
    }
  }

  return {
    ...state,
    players: updatedPlayers,
    cities: updatedCities,
    units: updatedUnits,
    log: newLog,
    lastValidation: null,
  };
}

/**
 * Apply the auto-placement state mutation for a building whose queue item
 * carried a valid `lockedTile`. Mirrors `buildingPlacementSystem`'s map-tile
 * write; inlined here because systems cannot import each other (see
 * `.claude/rules/import-boundaries.md`). Pure — returns a new state.
 *
 * Pre-condition: `validateBuildingPlacement` has already returned `valid: true`
 * for (cityId, tile, buildingId, state). Caller is responsible for having
 * already added the building to `city.buildings`.
 */
function applyAutoPlacement(
  tiles: Map<string, HexTile>,
  tile: HexCoord,
  buildingId: BuildingId,
  state: GameState,
): void {
  const tileKey = coordToKey(tile);
  const existingTile = tiles.get(tileKey) ?? state.map.tiles.get(tileKey);
  if (!existingTile) return;
  tiles.set(tileKey, { ...existingTile, building: buildingId });
}

function processProduction(state: GameState): GameState {
  const updatedCities = new Map(state.cities);
  const updatedUnits = new Map(state.units);
  const updatedTiles = new Map<string, HexTile>();
  let updatedBuiltWonders: BuildingId[] | null = null;
  const newLog = [...state.log];
  let changed = false;
  let mapChanged = false;

  for (const [cityId, city] of state.cities) {
    if (city.owner !== state.currentPlayerId) continue;
    if (city.settlementType === 'town') continue; // Towns cannot produce via queue
    if (city.productionQueue.length === 0) continue;

    // Read the freshest city snapshot (an earlier iteration may have updated it).
    const currentCity = updatedCities.get(cityId) ?? city;
    const currentItem = currentCity.productionQueue[0];
    const yields = calculateCityYields(currentCity, state);
    let productionPerTurn = yields.production;

    // Barracks: +10% production toward military land units
    if (currentCity.buildings.includes('barracks') && currentItem.type === 'unit') {
      const unitDef = state.config.units.get(currentItem.id);
      if (unitDef) {
        const militaryCategories: ReadonlyArray<string> = ['melee', 'ranged', 'cavalry', 'siege'];
        if (militaryCategories.includes(unitDef.category)) {
          productionPerTurn = Math.floor(productionPerTurn * 1.1);
        }
      }
    }

    // Workshop: +10% production toward all buildings
    if (currentCity.buildings.includes('workshop') && currentItem.type === 'building') {
      productionPerTurn = Math.floor(productionPerTurn * 1.1);
    }

    // Celebration bonus: +celebrationBonus% production toward everything
    const player = state.players.get(currentCity.owner);
    if (player && player.celebrationBonus > 0) {
      productionPerTurn = Math.floor(productionPerTurn * (100 + player.celebrationBonus) / 100);
    }

    const newProgress = currentCity.productionProgress + productionPerTurn;
    const cost = getProductionCost(state, currentItem.id);

    if (newProgress >= cost) {
      // Production complete
      if (currentItem.type === 'unit') {
        const unitId = nextUnitId(state, cityId);
        const newUnit: UnitState = {
          id: unitId,
          typeId: currentItem.id,
          owner: currentCity.owner,
          position: currentCity.position,
          movementLeft: 0, // refreshed next turn
          health: 100,
          experience: 0,
          promotions: [],
          fortified: false,
        };
        updatedUnits.set(unitId, newUnit);

        newLog.push({
          turn: state.turn,
          playerId: currentCity.owner,
          message: `${currentCity.name} produced ${currentItem.id}`,
          type: 'production',
        });

        // Production overflow carries to next project (Civ VII rule)
        updatedCities.set(cityId, {
          ...currentCity,
          productionQueue: currentCity.productionQueue.slice(1),
          productionProgress: newProgress - cost,
        });
        changed = true;
      } else if (currentItem.type === 'building' || currentItem.type === 'wonder') {
        // Check if this is a wonder (has isWonder flag) — also triggers when
        // the queue item is typed as 'wonder', which is the new data-driven
        // path for the building-placement rework.
        const buildingDef = state.config.buildings.get(currentItem.id);
        const isWonder = currentItem.type === 'wonder' || buildingDef?.isWonder === true;

        // ── Building-placement rework (Cycle 1) — auto-place on lockedTile ──
        //
        // If the queue item carries a locked tile, re-validate it *now*. A
        // tile locked at SET_PRODUCTION time may be invalid at completion if
        // the world changed (culture bomb, conquest, terrain crisis, a
        // sibling queue item landed on the same tile this same turn, etc.).
        // On failure, fall back to the legacy "completed but not placed"
        // state — player will place it manually via PLACE_BUILDING.
        const lockedTile = currentItem.lockedTile;
        let autoPlaceTile: HexCoord | null = null;
        if (lockedTile) {
          const placementResult = validateBuildingPlacement(cityId, lockedTile, currentItem.id, state);
          // Additional late-validation: the *live* tile (including any
          // auto-placements from earlier iterations this same END_TURN) must
          // still have no building. `validateBuildingPlacement` checks the
          // V2 `urbanTiles` cap but not the legacy map-tile `building` field.
          const lockedKey = coordToKey(lockedTile);
          const liveTile = updatedTiles.get(lockedKey) ?? state.map.tiles.get(lockedKey);
          const tileFree = liveTile ? (liveTile.building === null || liveTile.building === undefined) : false;
          if (placementResult.valid && tileFree) {
            autoPlaceTile = lockedTile;
          }
        }

        // Add building to city
        const wallsBonus = currentItem.id === 'walls' ? 100 : 0;
        const updatedBuildings = [...currentCity.buildings, currentItem.id as BuildingId];

        // Production overflow carries to next project (Civ VII rule)
        updatedCities.set(cityId, {
          ...currentCity,
          buildings: updatedBuildings,
          productionQueue: currentCity.productionQueue.slice(1),
          productionProgress: newProgress - cost,
          defenseHP: currentCity.defenseHP + wallsBonus,
        });
        changed = true;

        newLog.push({
          turn: state.turn,
          playerId: currentCity.owner,
          message: `${currentCity.name} built ${currentItem.id}${isWonder ? ' 🏆' : ''}`,
          type: 'production',
        });

        // Apply the auto-placement (writes the building onto the map tile).
        if (autoPlaceTile) {
          applyAutoPlacement(updatedTiles, autoPlaceTile, currentItem.id as BuildingId, state);
          mapChanged = true;
          newLog.push({
            turn: state.turn,
            playerId: currentCity.owner,
            message: `Placed ${buildingDef?.name ?? currentItem.id} at (${autoPlaceTile.q}, ${autoPlaceTile.r})`,
            type: 'production',
          });
        }

        // If it's a wonder, accumulate onto builtWonders (emitted at the end).
        if (isWonder) {
          updatedBuiltWonders = [...(updatedBuiltWonders ?? state.builtWonders), currentItem.id as BuildingId];
        }
      } else if (currentItem.type === 'district') {
        // District production complete - trigger placement mode
        // For now, we'll just log it and remove from queue
        // The actual placement will be handled by PLACE_DISTRICT action
        updatedCities.set(cityId, {
          ...currentCity,
          productionQueue: currentCity.productionQueue.slice(1),
          productionProgress: newProgress - cost,
        });
        changed = true;

        newLog.push({
          turn: state.turn,
          playerId: currentCity.owner,
          message: `${currentCity.name} completed ${currentItem.id} - ready to place`,
          type: 'production',
        });
      }
    } else {
      updatedCities.set(cityId, {
        ...currentCity,
        productionProgress: newProgress,
      });
      changed = true;
    }
  }

  if (!changed && updatedUnits.size === state.units.size && !mapChanged && updatedBuiltWonders === null) {
    return state;
  }

  // Merge map tile updates (only if something was placed this turn).
  const nextMap = mapChanged
    ? { ...state.map, tiles: mergeTiles(state.map.tiles, updatedTiles) }
    : state.map;

  return {
    ...state,
    cities: updatedCities,
    units: updatedUnits,
    map: nextMap,
    log: newLog,
    builtWonders: updatedBuiltWonders ?? state.builtWonders,
    lastValidation: null,
  };
}

function mergeTiles(
  base: ReadonlyMap<string, HexTile>,
  overrides: ReadonlyMap<string, HexTile>,
): Map<string, HexTile> {
  const merged = new Map(base);
  for (const [k, v] of overrides) merged.set(k, v);
  return merged;
}

/** Production cost for items — driven by state.config.units, state.config.buildings, and state.config.districts */
function getProductionCost(state: GameState, itemId: string): number {
  return state.config.units.get(itemId)?.cost
    ?? state.config.buildings.get(itemId)?.cost
    ?? state.config.districts.get(itemId)?.cost
    ?? 100;
}

/** Gold cost for purchasing items (2x production cost) */
/** Gold purchase cost = 4x production cost (Civ VII standard) */
function getGoldCost(state: GameState, itemId: string): number {
  return getProductionCost(state, itemId) * 4;
}
