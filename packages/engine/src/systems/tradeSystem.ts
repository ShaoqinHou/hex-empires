import type { GameState, GameAction, TradeRoute, PlayerState } from '../types/GameState';
import type { CityId, PlayerId } from '../types/Ids';
import { distance } from '../hex/HexMath';
import { getRelationKey, defaultRelation } from '../state/DiplomacyUtils';
import type { ActiveTreaty } from '../types/Treaty';

// ── Age-scaled constants ──

/** Gold paid to destination city owner per resource slot, per turn, per age */
function goldRateForAge(age: 'antiquity' | 'exploration' | 'modern'): number {
  if (age === 'exploration') return 3;
  if (age === 'modern') return 4;
  return 2; // antiquity
}

/**
 * AA2.2 (F-06): Gold multiplier from improve_trade_relations treaty.
 * Active bilateral treaty between the route owner and destination city owner
 * grants +50% gold yield on the destination side.
 */
const IMPROVE_TRADE_GOLD_MULTIPLIER = 1.5;

/**
 * AA2.2 (F-06): Returns true if playerA and playerB have an active treaty of
 * the given treatyId.
 */
function hasActiveTreaty(playerA: string, playerB: string, treatyId: string, state: GameState): boolean {
  const treaties: ReadonlyArray<ActiveTreaty> = state.diplomacy.activeTreaties ?? [];
  for (const t of treaties) {
    if (t.status !== 'active') continue;
    if (t.treatyId !== treatyId) continue;
    const involvesA = t.proposerId === playerA || t.targetId === playerA;
    const involvesB = t.proposerId === playerB || t.targetId === playerB;
    if (involvesA && involvesB) return true;
  }
  return false;
}

/** Maximum land-route distance by age (hexes) */
const LAND_RANGE: Record<'antiquity' | 'exploration' | 'modern', number> = {
  antiquity: 10,
  exploration: 15,
  modern: 20,
};

/** Maximum sea-route distance by age (hexes) */
const SEA_RANGE: Record<'antiquity' | 'exploration' | 'modern', number> = {
  antiquity: 30,
  exploration: 45,
  modern: 60,
};

/** Default maximum active routes between any given civ pair (either direction) */
const CIV_PAIR_ROUTE_CAP = 1;

/**
 * TradeSystem — Civ VII-parity implementation (W2-06).
 *
 * CREATE_TRADE_ROUTE: Merchant on/adjacent to a foreign city is replaced by a
 * stationary Caravan or Trade Ship at the destination.  A permanent trade
 * route is registered.
 *
 * END_TURN: Asymmetric yields.
 *   - Origin player receives the destination city's slotted resources (copied).
 *   - Destination city's owner receives gold: resourceSlots × goldRateForAge ×
 *     isSea-multiplier.
 *
 * DECLARE_WAR (via PROPOSE_DIPLOMACY): All routes between the warring players
 * are cancelled.
 *
 * TRANSITION_AGE: All trade routes are cleared.
 *
 * PLUNDER_TRADE_ROUTE: Scaffolded — marks route cancelled and emits a log event.
 */
export function tradeSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'CREATE_TRADE_ROUTE':
      return handleCreateTradeRoute(state, action.merchantId, action.targetCityId);
    case 'END_TURN':
      return handleEndTurn(state);
    case 'PROPOSE_DIPLOMACY':
      if (action.proposal.type === 'DECLARE_WAR') {
        return handleDeclareWar(state, state.currentPlayerId, action.targetId);
      }
      return state;
    case 'TRANSITION_AGE':
      return handleTransitionAge(state);
    case 'PLUNDER_TRADE_ROUTE':
      return handlePlunderTradeRoute(state, action.caravanUnitId, action.plundererId);
    default:
      return state;
  }
}

// ── CREATE_TRADE_ROUTE ──

function handleCreateTradeRoute(
  state: GameState,
  merchantId: string,
  targetCityId: CityId,
): GameState {
  const merchant = state.units.get(merchantId);
  if (!merchant) return state;
  if (merchant.owner !== state.currentPlayerId) return state;

  // Only units with 'create_trade_route' ability can create routes
  const unitDef = state.config.units.get(merchant.typeId);
  if (!unitDef || !unitDef.abilities.includes('create_trade_route')) return state;

  const targetCity = state.cities.get(targetCityId);
  if (!targetCity) return state;

  // Can't trade with own city
  if (targetCity.owner === merchant.owner) return state;

  // Merchant must be adjacent to or on the target city tile
  const dist = distance(merchant.position, targetCity.position);
  if (dist > 1) return state;

  // Find the nearest home city owned by this player
  const homeCity = findNearestCity(state, merchant.owner, merchant.position);
  if (!homeCity) return state;

  const homeCityState = state.cities.get(homeCity);
  if (!homeCityState) return state;

  // F-04: age-scaled distance check
  const routeDist = distance(homeCityState.position, targetCity.position);
  const age = state.age.currentAge;

  // Determine if this is a sea route — for now, treat as land route unless we
  // detect water (we don't have per-tile water info in the map in this impl;
  // isSea detection is deferred to the tile-feature layer; default to land).
  // The isSea=true path is fully supported once the caller sets isSea on the
  // action. For now we derive it by checking if the unit is a naval-category
  // merchant (or later via tile feature). Default: land.
  const isSea = unitDef.category === 'naval';

  const maxRange = isSea ? SEA_RANGE[age] : LAND_RANGE[age];
  if (routeDist > maxRange) return state;

  // F-05: diplomatic gate — block at Hostile or War
  const relKey = getRelationKey(merchant.owner, targetCity.owner);
  const relation = state.diplomacy.relations.get(relKey) ?? defaultRelation();
  if (relation.status === 'hostile' || relation.status === 'war') return state;

  // F-06: civ-pair route cap
  const existingPairRoutes = countRoutesBetween(state, merchant.owner, targetCity.owner);
  if (existingPairRoutes >= CIV_PAIR_ROUTE_CAP) return state;

  // Legacy duplicate-route guard (same exact city pair)
  for (const route of state.tradeRoutes.values()) {
    if (route.owner === merchant.owner && route.from === homeCity && route.to === targetCityId) {
      return state;
    }
  }

  const routeId = `trade_${state.turn}_${merchantId}`;
  const caravanUnitId = `caravan_${routeId}`;

  // Snapshot the destination's assigned resources (F-01)
  const resources = targetCity.assignedResources
    ? [...targetCity.assignedResources]
    : [];

  const newRoute: TradeRoute = {
    id: routeId,
    from: homeCity,
    to: targetCityId,
    owner: merchant.owner,
    resources,
    isSea,
    caravanUnitId,
  };

  // F-03: replace merchant with stationary caravan/trade-ship at destination
  const caravanTypeId = isSea ? 'trade_ship' : 'caravan';
  const caravanUnit = {
    id: caravanUnitId,
    typeId: caravanTypeId,
    owner: merchant.owner,
    position: targetCity.position,
    movementLeft: 0,
    health: 100,
    experience: 0,
    promotions: [] as ReadonlyArray<string>,
    fortified: false,
  };

  const updatedUnits = new Map(state.units);
  updatedUnits.delete(merchantId);
  updatedUnits.set(caravanUnitId, caravanUnit);

  const updatedRoutes = new Map(state.tradeRoutes);
  updatedRoutes.set(routeId, newRoute);

  return {
    ...state,
    units: updatedUnits,
    tradeRoutes: updatedRoutes,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Trade route established from ${homeCity} to ${targetCityId} (${isSea ? 'sea' : 'land'}, permanent)`,
      type: 'production',
    }],
  };
}

// ── END_TURN ──

function handleEndTurn(state: GameState): GameState {
  if (state.tradeRoutes.size === 0) return state;

  const updatedPlayers = new Map(state.players);
  const updatedCities = new Map(state.cities);

  for (const route of state.tradeRoutes.values()) {
    const targetCity = state.cities.get(route.to);
    if (!targetCity) continue;

    const age = state.age.currentAge;
    const goldRate = goldRateForAge(age);
    const seaMultiplier = route.isSea ? 2 : 1;

    // U2: Origin player receives destination's slotted resources (copied into ownedResources)
    const originPlayer = updatedPlayers.get(route.owner);
    if (route.resources.length > 0 && originPlayer) {
      const existing = originPlayer.ownedResources ?? [];
      const merged = [...new Set([...existing, ...route.resources])];
      updatedPlayers.set(originPlayer.id, { ...originPlayer, ownedResources: merged });
    }

    // F-01 (asymmetric yields — Y1.3):
    //   - Destination city owner earns gold per resource slot × rate × sea multiplier
    //   - Origin city gets +1 food per resource slot from destination (VII: origin gets
    //     yield-equivalent of destination's resources, not flat food)
    const resourceSlots = targetCity.assignedResources
      ? targetCity.assignedResources.length
      : 0;
    // AA2.2 (F-06): improve_trade_relations treaty adds +50% gold yield.
    const tradeMultiplier = hasActiveTreaty(route.owner, targetCity.owner, 'improve_trade_relations', state)
      ? IMPROVE_TRADE_GOLD_MULTIPLIER
      : 1;
    // Guarantee at least 1 gold per turn even when no resources are slotted
    const goldToDestination = Math.round(Math.max(1, resourceSlots) * goldRate * seaMultiplier * tradeMultiplier);
    addGold(updatedPlayers, targetCity.owner, goldToDestination);

    // F-01 origin yield: +1 food per resource slot (at minimum 1) — replaces flat +2 placeholder
    const originCity = updatedCities.get(route.from);
    if (originCity) {
      const FOOD_PER_RESOURCE_SLOT = 1;
      const foodYield = Math.max(1, resourceSlots) * FOOD_PER_RESOURCE_SLOT;
      updatedCities.set(route.from, {
        ...originCity,
        food: originCity.food + foodYield,
      });
    }

    // Y1.2: railroadTycoonPoints — 1 per route per turn, +2 bonus for age-crossing routes
    // Age-crossing: origin player is Modern while destination city's owner is in an earlier age
    const latestOriginPlayer = updatedPlayers.get(route.owner);
    if (latestOriginPlayer) {
      const destPlayer = state.players.get(targetCity.owner);
      const isAgeCrossing =
        latestOriginPlayer.age === 'modern' &&
        destPlayer != null &&
        destPlayer.age !== 'modern';
      const points = isAgeCrossing ? 3 : 1; // base 1 + bonus 2 = 3 for cross-age
      updatedPlayers.set(route.owner, {
        ...latestOriginPlayer,
        railroadTycoonPoints: (latestOriginPlayer.railroadTycoonPoints ?? 0) + points,
      });
    }
  }

  return {
    ...state,
    players: updatedPlayers,
    cities: updatedCities,
  };
}

// ── DECLARE_WAR ──

function handleDeclareWar(state: GameState, declarerId: PlayerId, targetId: PlayerId): GameState {
  // Remove all trade routes between the two players (either direction)
  const updatedRoutes = new Map(state.tradeRoutes);
  const updatedUnits = new Map(state.units);
  let routesRemoved = 0;

  for (const [routeId, route] of state.tradeRoutes) {
    const targetCity = state.cities.get(route.to);
    if (!targetCity) continue;
    const involvesBoth =
      (route.owner === declarerId && targetCity.owner === targetId) ||
      (route.owner === targetId && targetCity.owner === declarerId);

    if (involvesBoth) {
      // Remove the stationary caravan unit as well
      updatedUnits.delete(route.caravanUnitId);
      updatedRoutes.delete(routeId);
      routesRemoved++;
    }
  }

  if (routesRemoved === 0) return state;

  return {
    ...state,
    tradeRoutes: updatedRoutes,
    units: updatedUnits,
    log: [...state.log, {
      turn: state.turn,
      playerId: declarerId,
      message: `${routesRemoved} trade route(s) cancelled due to war between ${declarerId} and ${targetId}`,
      type: 'diplomacy',
    }],
  };
}

// ── TRANSITION_AGE ──

function handleTransitionAge(state: GameState): GameState {
  if (state.tradeRoutes.size === 0) return state;

  // Remove all caravan units that were anchoring trade routes
  const updatedUnits = new Map(state.units);
  for (const route of state.tradeRoutes.values()) {
    updatedUnits.delete(route.caravanUnitId);
  }

  return {
    ...state,
    tradeRoutes: new Map(),
    units: updatedUnits,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: 'All trade routes cancelled due to age transition',
      type: 'age',
    }],
  };
}

// ── PLUNDER_TRADE_ROUTE ──

function handlePlunderTradeRoute(
  state: GameState,
  caravanUnitId: string,
  plundererId: string,
): GameState {
  // Find the route linked to this caravan
  let routeId: string | null = null;
  for (const [id, route] of state.tradeRoutes) {
    if (route.caravanUnitId === caravanUnitId) {
      routeId = id;
      break;
    }
  }
  if (!routeId) return state;

  const route = state.tradeRoutes.get(routeId)!;
  const plunderer = state.units.get(plundererId);

  // Remove the route and the caravan unit
  const updatedRoutes = new Map(state.tradeRoutes);
  updatedRoutes.delete(routeId);
  const updatedUnits = new Map(state.units);
  updatedUnits.delete(caravanUnitId);

  // F-10 (W8): Plunderer earns 50 gold + half the destination's per-turn yield.
  // Per-turn yield = resourceSlots x goldRateForAge x seaMultiplier (same formula as END_TURN).
  const updatedPlayers = new Map(state.players);
  if (plunderer) {
    const targetCity = state.cities.get(route.to);
    const age = state.age.currentAge;
    const goldRate = goldRateForAge(age);
    const seaMultiplier = route.isSea ? 2 : 1;
    const resourceSlots = targetCity?.assignedResources?.length ?? 0;
    const perTurnYield = Math.max(1, resourceSlots) * goldRate * seaMultiplier;
    const loot = 50 + Math.floor(perTurnYield / 2);
    addGold(updatedPlayers, plunderer.owner, loot);
  }

  return {
    ...state,
    tradeRoutes: updatedRoutes,
    units: updatedUnits,
    players: updatedPlayers,
    log: [...state.log, {
      turn: state.turn,
      playerId: plunderer?.owner ?? route.owner,
      message: `Trade route ${routeId} plundered by ${plundererId}`,
      type: 'combat',
    }],
  };
}

// ── Utilities ──

/** Find the nearest city owned by the given player relative to a position */
function findNearestCity(
  state: GameState,
  owner: PlayerId,
  position: { readonly q: number; readonly r: number },
): CityId | null {
  let best: CityId | null = null;
  let bestDist = Infinity;

  for (const city of state.cities.values()) {
    if (city.owner !== owner) continue;
    const d = distance(city.position, position);
    if (d < bestDist) {
      bestDist = d;
      best = city.id;
    }
  }

  return best;
}

/** Count total active routes between two players (either direction) */
function countRoutesBetween(
  state: GameState,
  playerA: PlayerId,
  playerB: PlayerId,
): number {
  let count = 0;
  for (const route of state.tradeRoutes.values()) {
    const targetCity = state.cities.get(route.to);
    if (!targetCity) continue;
    if (
      (route.owner === playerA && targetCity.owner === playerB) ||
      (route.owner === playerB && targetCity.owner === playerA)
    ) {
      count++;
    }
  }
  return count;
}

/** Mutate updatedPlayers map to add gold to a player (helper for immutable pattern) */
function addGold(
  players: Map<string, PlayerState>,
  playerId: string,
  amount: number,
): void {
  const player = players.get(playerId);
  if (!player) return;
  players.set(playerId, {
    ...player,
    gold: player.gold + amount,
    totalGoldEarned: player.totalGoldEarned + amount,
  });
}
