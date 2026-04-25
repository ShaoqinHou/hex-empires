import type { GameState, GameAction, UnitState } from '../types/GameState';
import { coordToKey } from '../hex/HexMath';

/**
 * discoverySystem — handles EXPLORE_DISCOVERY (EE5.2).
 *
 * When a unit on a discovery tile triggers EXPLORE_DISCOVERY:
 *   1. Validates: unit exists, owned by current player, tile has discoveryId,
 *      discoveryDef exists in config.discoveries, discoveryDef has a reward.
 *   2. Applies the reward:
 *      - 'gold'    → increments player.gold by reward.amount
 *      - 'science' → increments player.science by reward.amount
 *      - 'culture' → increments player.culture by reward.amount
 *      - 'unit'    → spawns a unit of reward.unitId at the explored tile
 *   3. Clears tile.discoveryId (set to null) so the tile cannot be re-explored.
 *
 * No-op for all other actions.
 */
export function discoverySystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'EXPLORE_DISCOVERY') return state;

  const { unitId, tileQ, tileR } = action;

  // Validate unit ownership
  const unit = state.units.get(unitId);
  if (!unit || unit.owner !== state.currentPlayerId) return state;

  // Validate tile and discoveryId
  const tileKey = coordToKey({ q: tileQ, r: tileR });
  const tile = state.map.tiles.get(tileKey);
  if (!tile?.discoveryId) return state;

  // Validate discovery def
  const discoveryDef = state.config.discoveries?.get(tile.discoveryId);
  if (!discoveryDef?.reward) return state;

  const { reward } = discoveryDef;
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Clear the tile's discoveryId (immutable update)
  const nextTiles = new Map(state.map.tiles);
  nextTiles.set(tileKey, { ...tile, discoveryId: null });
  const nextMap = { ...state.map, tiles: nextTiles };

  // Apply reward
  const nextPlayers = new Map(state.players);

  if (reward.type === 'gold' && reward.amount !== undefined) {
    nextPlayers.set(player.id, {
      ...player,
      gold: player.gold + reward.amount,
    });
  } else if (reward.type === 'science' && reward.amount !== undefined) {
    nextPlayers.set(player.id, {
      ...player,
      science: player.science + reward.amount,
    });
  } else if (reward.type === 'culture' && reward.amount !== undefined) {
    nextPlayers.set(player.id, {
      ...player,
      culture: player.culture + reward.amount,
    });
  } else if (reward.type === 'unit' && reward.unitId) {
    const grantedUnitId = `unit_disc_${unitId}_${tileKey}_t${state.turn}`;
    const grantedUnit: UnitState = {
      id: grantedUnitId,
      typeId: reward.unitId,
      owner: state.currentPlayerId,
      position: { q: tileQ, r: tileR },
      movementLeft: 0,
      health: 100,
      experience: 0,
      promotions: [],
      fortified: false,
    };
    const nextUnits = new Map(state.units);
    nextUnits.set(grantedUnitId, grantedUnit);
    return {
      ...state,
      map: nextMap,
      units: nextUnits,
      log: [
        ...state.log,
        {
          turn: state.turn,
          playerId: state.currentPlayerId,
          message: `Explored ${discoveryDef.label}: received a ${reward.unitId}`,
          type: 'move' as const,
        },
      ],
    };
  } else {
    // reward.type === 'unit' with missing unitId, or unrecognised reward type:
    // do not clear the tile and grant nothing
    return state;
  }

  return {
    ...state,
    map: nextMap,
    players: nextPlayers,
    log: [
      ...state.log,
      {
        turn: state.turn,
        playerId: state.currentPlayerId,
        message: `Explored ${discoveryDef.label}: received ${reward.amount} ${reward.type}`,
        type: 'move' as const,
      },
    ],
  };
}
