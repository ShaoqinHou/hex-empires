import type { BuildingCategory, GameState, GameAction, CityState, UnitState, HexTile, ProductionItem, PlayerState, GameEvent } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import type { BuildingId } from '../types/Ids';
import type { BuildingDef } from '../types/Building';
import { coordToKey } from '../hex/HexMath';
import { calculateCityYieldsWithAdjacency } from '../state/CityYieldsWithAdjacency';
import { validateBuildingPlacement } from '../state/BuildingPlacementValidator';
import { getProductionPercentBonus, isStructuredActiveCelebrationBonus } from '../state/EffectUtils';

/** Generate deterministic unit ID from state */
function nextUnitId(state: GameState, cityId: string): string {
  return `unit_${state.units.size + 1}_${cityId}_t${state.turn}`;
}

function getBuildingAdmissionFailure(
  player: PlayerState | undefined,
  buildingDef: Pick<BuildingDef, 'requiredTech' | 'requiredCivic' | 'isCivUnique' | 'civId'> | undefined,
): string | null {
  if (!player || !buildingDef) return null;

  if (buildingDef.requiredTech && !player.researchedTechs.includes(buildingDef.requiredTech)) {
    return `Requires tech: ${buildingDef.requiredTech}`;
  }

  if (buildingDef.requiredCivic && !player.researchedCivics.includes(buildingDef.requiredCivic)) {
    return `Requires civic: ${buildingDef.requiredCivic}`;
  }

  if (buildingDef.isCivUnique === true && buildingDef.civId !== player.civilizationId) {
    return `Requires civilization: ${buildingDef.civId}`;
  }

  return null;
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
    case 'REPAIR_BUILDING':
      return handleRepairBuilding(state, action.cityId, action.buildingId);
    case 'END_TURN':
      return processProduction(state);
    default:
      return state;
  }
}

/**
 * Compute the cancel threshold for a city's current building/wonder in queue.
 *
 * Per `.codex/workflow/design/building-placement-rework.md` §2.2, a player may
 * cancel placement so long as `productionProgress` is strictly below
 * `max(10, floor(0.5 * productionPerTurn))` — i.e. less than half of one turn's
 * worth of accumulated production (with a 10-point floor so zero-production
 * cities still have a cancel window).
 *
 * Exposed (non-exported) helper kept close to the handler for easy unit
 * verification via behavioural assertions. Pure — reads state, returns number.
 */
function computeCancelThreshold(state: GameState, city: CityState): number {
  const yields = calculateCityYieldsWithAdjacency(city, state);
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

  const buildingDef = itemType === 'wonder' || itemType === 'building' ? state.config.buildings.get(itemId) : undefined;
  const isWonder = itemType === 'wonder' || buildingDef?.isWonder === true;

  // Check duplicate ownership before prerequisites so validation reports the
  // actionable city/wonder conflict instead of a tech gate for an item already built.
  if (itemType === 'building' && city.buildings.includes(itemId)) {
    return createInvalidResult(state, 'Building already constructed', 'production');
  }

  if (isWonder && state.builtWonders.includes(itemId)) {
    return createInvalidResult(state, 'This wonder has already been built', 'production');
  }

  if (buildingDef) {
    const player = state.players.get(state.currentPlayerId);
    const admissionFailure = getBuildingAdmissionFailure(player, buildingDef);
    if (admissionFailure) return createInvalidResult(state, admissionFailure, 'production');
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

  const raceNotifications = isWonder
    ? createWonderRaceStartNotifications(state, city, itemId)
    : [];

  return {
    ...state,
    cities: updatedCities,
    lastValidation: null,
    ...(raceNotifications.length > 0
      ? { log: [...state.log, ...raceNotifications] }
      : {}),
  };
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

/**
 * Handle REPAIR_BUILDING action (W8 — buildings F-12).
 *
 * Validates that the city exists, the current player owns it, and the building
 * is present in city.buildings. Charges player gold = buildingDef.repairCost (defaults 50).
 *
 * NOTE: Full damage tracking (BuildingState.damaged field) is deferred. When it ships,
 * also reset the damaged flag on the city building slot here.
 */
function handleRepairBuilding(
  state: GameState,
  cityId: string,
  buildingId: string,
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return createInvalidResult(state, 'City not found', 'production');
  if (city.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your city', 'production');
  if (!city.buildings.includes(buildingId as BuildingId)) {
    return createInvalidResult(state, `Building ${buildingId} not found in city`, 'production');
  }

  // NOTE: Full BuildingState.damaged tracking is deferred to a future phase.
  // When it ships, validate that the building is actually damaged here.

  const buildingDef = state.config.buildings.get(buildingId);
  // repairCost is not yet on BuildingDef — default to 50 (W8 spec)
  const repairCost = (buildingDef as (typeof buildingDef) & { readonly repairCost?: number })?.repairCost ?? 50;

  const player = state.players.get(state.currentPlayerId);
  if (!player || player.gold < repairCost) {
    return createInvalidResult(state, `Not enough gold to repair (need ${repairCost})`, 'production');
  }

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, { ...player, gold: player.gold - repairCost });

  return {
    ...state,
    players: updatedPlayers,
    lastValidation: null,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Repaired ${buildingId} in ${city.name} (cost: ${repairCost} gold)`,
      type: 'production',
    }],
  };
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
  if (itemType === 'building') {
    const buildingDef = state.config.buildings.get(itemId);
    const admissionFailure = getBuildingAdmissionFailure(player, buildingDef);
    if (admissionFailure) return createInvalidResult(state, admissionFailure, 'production');
  }
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
      category: 'production' as const,
      panelTarget: 'city' as const,
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
      severity: isWonder ? 'warning' as const : 'info' as const,
      category: 'production' as const,
      panelTarget: 'city' as const,
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
 * `.codex/rules/import-boundaries.md`). Pure — returns a new state.
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

function isWonderItem(state: GameState, item: ProductionItem): boolean {
  return item.type === 'wonder' || state.config.buildings.get(item.id)?.isWonder === true;
}

function getWonderDisplayName(state: GameState, itemId: string): string {
  return state.config.buildings.get(itemId)?.name ?? itemId;
}

function getWonderCancellationReason(completedByPlayerId: string | undefined, cityOwner: string): string {
  if (!completedByPlayerId) return 'it has already been completed';
  if (completedByPlayerId === cityOwner) return 'your empire completed it';
  return 'a rival completed it';
}

function createWonderRaceStartNotifications(
  state: GameState,
  startingCity: CityState,
  wonderId: string,
): GameEvent[] {
  const notifications: GameEvent[] = [];
  const wonderName = getWonderDisplayName(state, wonderId);

  for (const rivalCity of state.cities.values()) {
    if (rivalCity.id === startingCity.id) continue;
    if (rivalCity.owner === startingCity.owner) continue;
    const isAlsoBuilding = rivalCity.productionQueue.some(item =>
      item.id === wonderId && isWonderItem(state, item),
    );
    if (!isAlsoBuilding) continue;

    notifications.push({
      turn: state.turn,
      playerId: rivalCity.owner,
      message: `${startingCity.name} has started work on ${wonderName}, competing with ${rivalCity.name}.`,
      type: 'production',
      severity: 'warning' as const,
      category: 'production' as const,
      panelTarget: 'city' as const,
    });
  }

  return notifications;
}

function cancelUnavailableWonderQueues(
  state: GameState,
  cities: Map<string, CityState>,
  builtWonders: ReadonlyArray<BuildingId>,
  log: GameEvent[],
  completedByPlayerId?: string,
): boolean {
  if (builtWonders.length === 0) return false;

  const unavailableWonderIds = new Set<string>(builtWonders);
  let changed = false;

  for (const [cityId, city] of cities) {
    if (city.productionQueue.length === 0) continue;

    let removedHead = false;
    const removedWonderIds = new Set<string>();
    const nextQueue = city.productionQueue.filter((item, index) => {
      if (!isWonderItem(state, item)) return true;
      if (!unavailableWonderIds.has(item.id)) return true;

      if (index === 0) removedHead = true;
      removedWonderIds.add(item.id);
      return false;
    });

    if (removedWonderIds.size === 0) continue;

    cities.set(cityId, {
      ...city,
      productionQueue: nextQueue,
      productionProgress: removedHead ? 0 : city.productionProgress,
    });

    const reason = getWonderCancellationReason(completedByPlayerId, city.owner);
    for (const wonderId of removedWonderIds) {
      log.push({
        turn: state.turn,
        playerId: city.owner,
        message: `${city.name} stopped work on ${getWonderDisplayName(state, wonderId)} because ${reason}.`,
        type: 'production',
        severity: 'warning' as const,
        category: 'production' as const,
        panelTarget: 'city' as const,
      });
    }

    changed = true;
  }

  return changed;
}

function processProduction(state: GameState): GameState {
  const updatedCities = new Map(state.cities);
  const updatedUnits = new Map(state.units);
  const updatedTiles = new Map<string, HexTile>();
  let updatedBuiltWonders: BuildingId[] | null = null;
  const newLog = [...state.log];
  let changed = false;
  let mapChanged = false;
  // KK2 (F-09): Track player relic grants when religious wonders are built.
  let updatedPlayers: Map<string, PlayerState> | null = null;

  changed = cancelUnavailableWonderQueues(state, updatedCities, state.builtWonders, newLog) || changed;

  for (const [cityId, city] of state.cities) {
    // Read the freshest city snapshot (an earlier iteration may have updated it).
    const currentCity = updatedCities.get(cityId) ?? city;
    if (currentCity.owner !== state.currentPlayerId) continue;
    if (currentCity.settlementType === 'town') continue; // Towns cannot produce via queue
    if (currentCity.productionQueue.length === 0) continue;

    const currentItem = currentCity.productionQueue[0];
    const yields = calculateCityYieldsWithAdjacency(currentCity, state);
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

    // Structured celebration production effects.
    const player = state.players.get(currentCity.owner);
    if (player) {
      const unitCategory = currentItem.type === 'unit'
        ? state.config.units.get(currentItem.id)?.category
        : undefined;
      const buildingDef = currentItem.type === 'building' || currentItem.type === 'wonder'
        ? state.config.buildings.get(currentItem.id)
        : undefined;
      const buildingCategory = buildingDef?.isWonder
        ? 'wonder'
        : buildingDef?.category;
      const celebrationProductionBonus = getProductionPercentBonus(state, currentCity.owner, {
        item: currentItem,
        unitCategory,
        buildingCategory: buildingCategory as BuildingCategory | undefined,
        isOverbuilding: false,
      });
      if (celebrationProductionBonus > 0) {
        productionPerTurn = Math.floor(productionPerTurn * (100 + celebrationProductionBonus) / 100);
      }
    }

    // Legacy save compatibility: old saves may still carry only the scalar
    // celebrationBonus field. New picks store structured activeCelebrationBonus.
    if (player && !isStructuredActiveCelebrationBonus(player.activeCelebrationBonus) && player.celebrationBonus > 0) {
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
          category: 'production' as const,
          panelTarget: 'city' as const,
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
          severity: isWonder ? 'warning' as const : 'info' as const,
          category: 'production' as const,
          panelTarget: 'city' as const,
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
          changed = cancelUnavailableWonderQueues(
            state,
            updatedCities,
            updatedBuiltWonders,
            newLog,
            currentCity.owner,
          ) || changed;
        }

        // KK2 (F-09): Religious wonders (those that generate prophet great-person
        // points) award an unclaimed relic to the builder on completion.
        const isReligiousWonder = isWonder && buildingDef?.greatPersonPoints?.type === 'prophet';
        if (isReligiousWonder && state.config.relics) {
          const ownerId = currentCity.owner;
          const ownerPlayer = (updatedPlayers ?? state.players).get(ownerId);
          if (ownerPlayer) {
            const allRelics = [...state.config.relics.values()];
            const ownedRelicIds = new Set<string>();
            for (const [, p] of (updatedPlayers ?? state.players)) {
              for (const rid of (p.relics ?? [])) ownedRelicIds.add(rid);
            }
            const grantedRelic = allRelics.find((r) => !ownedRelicIds.has(r.id));
            if (grantedRelic) {
              const currentRelics: ReadonlyArray<string> = ownerPlayer.relics ?? [];
              const nextPlayer: PlayerState = { ...ownerPlayer, relics: [...currentRelics, grantedRelic.id] };
              if (updatedPlayers === null) updatedPlayers = new Map(state.players);
              updatedPlayers.set(ownerId, nextPlayer);
              newLog.push({
                turn: state.turn,
                playerId: ownerId,
                message: `${ownerPlayer.name} received a relic (${grantedRelic.name}) for building ${buildingDef?.name ?? currentItem.id}.`,
                type: 'legacy' as const,
              });
            }
          }
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
          category: 'production' as const,
          panelTarget: 'city' as const,
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

  if (!changed && updatedUnits.size === state.units.size && !mapChanged && updatedBuiltWonders === null && updatedPlayers === null) {
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
    // KK2 (F-09): Propagate relic grants from religious wonder builds
    ...(updatedPlayers !== null ? { players: updatedPlayers } : {}),
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
