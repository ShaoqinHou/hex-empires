import type { GameState, GameAction, PlayerState } from '../types/GameState';
import { coordToKey } from '../hex/HexMath';
import { applyImprovementToTile, deriveImprovementType } from '../state/ImprovementRules';
import { removeOnePendingGrowthChoice } from '../state/PendingGrowthChoices';

/**
 * ImprovementSystem handles tile improvement construction.
 *
 * PLACE_IMPROVEMENT (W2-01): Civ VII flagship — player picks the tile,
 * game derives the improvement type from terrain + resource via
 * `deriveImprovementType`. Clears the corresponding pendingGrowthChoice.
 *
 * The legacy BUILD_IMPROVEMENT (Builder-unit) path was removed in W1-C-rework.
 */
export function improvementSystem(state: GameState, action: GameAction): GameState {
  if (action.type === 'PLACE_IMPROVEMENT') {
    return handlePlaceImprovement(state, action.cityId, action.tile);
  }
  return state;
}

/**
 * Handle PLACE_IMPROVEMENT (W2-01 flagship).
 * Player picks the tile; game derives the improvement type.
 * Clears the pendingGrowthChoice for the named city.
 */
function handlePlaceImprovement(
  state: GameState,
  cityId: string,
  tile: { readonly q: number; readonly r: number },
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  const tileKey = coordToKey(tile);
  const currentTile = state.map.tiles.get(tileKey);
  if (!currentTile) return state;
  if (!city.territory.includes(tileKey)) return state;
  if (tileKey === coordToKey(city.position)) return state;

  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;
  const hasPendingGrowthChoice = (player.pendingGrowthChoices ?? []).some(
    c => c.cityId === cityId,
  );
  if (!hasPendingGrowthChoice) return state;

  // Tile already improved — no-op
  if (currentTile.improvement) return state;
  // Urban/building tiles cannot also receive rural improvements.
  if (currentTile.building || city.urbanTiles?.has(tileKey)) return state;

  // Game derives the improvement type (player does NOT specify it)
  const improvementId = deriveImprovementType(currentTile, state);
  if (!improvementId) return state;

  // Apply improvement to tile
  const updatedTile = applyImprovementToTile(currentTile, improvementId);
  const updatedTiles = new Map(state.map.tiles);
  updatedTiles.set(tileKey, updatedTile);

  // Clear the pending growth choice for this city
  const newPending = removeOnePendingGrowthChoice(player.pendingGrowthChoices, cityId);
  const updatedPlayer: PlayerState = { ...player, pendingGrowthChoices: newPending };
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(state.currentPlayerId, updatedPlayer);

  const improvementDef = state.config.improvements.get(improvementId);
  const improvementName = improvementDef?.name ?? improvementId;

  return {
    ...state,
    map: { ...state.map, tiles: updatedTiles },
    players: updatedPlayers,
    lastValidation: null,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${city.name}: placed ${improvementName} at (${tile.q}, ${tile.r})`,
      type: 'production',
    }],
  };
}

