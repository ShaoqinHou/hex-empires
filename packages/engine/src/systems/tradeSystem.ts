import type { GameState, GameAction, TradeRoute } from '../types/GameState';
import type { CityId, PlayerId } from '../types/Ids';
import { distance } from '../hex/HexMath';

/** Gold earned per turn by each party in a trade route */
const TRADE_GOLD_PER_TURN = 3;

/** Number of turns a trade route lasts before expiring */
const TRADE_ROUTE_DURATION = 20;

/**
 * TradeSystem handles trade route creation and maintenance.
 *
 * CREATE_TRADE_ROUTE — merchant adjacent to/on a foreign city tile is consumed
 * and a trade route is created between the merchant's nearest home city and the
 * target. Both the route owner and the target city's owner earn gold each turn.
 *
 * END_TURN — decrement turnsRemaining on all active routes and add gold yields
 * to both parties. Routes with turnsRemaining === 0 are removed.
 */
export function tradeSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'CREATE_TRADE_ROUTE':
      return handleCreateTradeRoute(state, action.merchantId, action.targetCityId);
    case 'END_TURN':
      return handleEndTurn(state);
    default:
      return state;
  }
}

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
  if (!homeCity) return state; // no home cities to trade from

  // Can't create a duplicate route between the same two cities
  for (const route of state.tradeRoutes.values()) {
    if (route.owner === merchant.owner && route.from === homeCity && route.to === targetCityId) {
      return state;
    }
  }

  const routeId = `trade_${state.turn}_${merchantId}`;
  const newRoute: TradeRoute = {
    id: routeId,
    from: homeCity,
    to: targetCityId,
    owner: merchant.owner,
    turnsRemaining: TRADE_ROUTE_DURATION,
    goldPerTurn: TRADE_GOLD_PER_TURN,
  };

  // Consume the merchant
  const updatedUnits = new Map(state.units);
  updatedUnits.delete(merchantId);

  const updatedRoutes = new Map(state.tradeRoutes);
  updatedRoutes.set(routeId, newRoute);

  return {
    ...state,
    units: updatedUnits,
    tradeRoutes: updatedRoutes,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Trade route established from ${homeCity} to ${targetCityId} (${TRADE_GOLD_PER_TURN} gold/turn, ${TRADE_ROUTE_DURATION} turns)`,
      type: 'production',
    }],
  };
}

function handleEndTurn(state: GameState): GameState {
  if (state.tradeRoutes.size === 0) return state;

  const updatedRoutes = new Map<string, TradeRoute>();
  const updatedPlayers = new Map(state.players);

  for (const [id, route] of state.tradeRoutes) {
    const newTurns = route.turnsRemaining - 1;

    // Pay gold to the route owner
    addGold(updatedPlayers, route.owner, route.goldPerTurn);

    // Pay gold to the foreign city's owner
    const targetCity = state.cities.get(route.to);
    if (targetCity && targetCity.owner !== route.owner) {
      addGold(updatedPlayers, targetCity.owner, route.goldPerTurn);
    }

    if (newTurns > 0) {
      updatedRoutes.set(id, { ...route, turnsRemaining: newTurns });
    }
    // Route with newTurns === 0 is not added back — it expires
  }

  return {
    ...state,
    tradeRoutes: updatedRoutes,
    players: updatedPlayers,
  };
}

/** Find the nearest city owned by the given player relative to a position */
function findNearestCity(state: GameState, owner: PlayerId, position: { readonly q: number; readonly r: number }): CityId | null {
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

/** Mutate updatedPlayers map to add gold to a player (helper for immutable pattern) */
function addGold(players: Map<string, import('../types/GameState').PlayerState>, playerId: string, amount: number): void {
  const player = players.get(playerId);
  if (!player) return;
  players.set(playerId, {
    ...player,
    gold: player.gold + amount,
    totalGoldEarned: player.totalGoldEarned + amount,
  });
}
