import type { GameState, GameAction } from '../types/GameState';
import { coordToKey } from '../hex/HexMath';

/**
 * artifactsSystem — handles Explorer excavation of artifact sites.
 *
 * W5-02: Explorers can excavate artifact sites on map tiles.
 * Each successful excavation increments player.artifactsCollected and
 * removes the artifact site from the tile. Collecting 15 artifacts +
 * building the World's Fair wonder enables the cultural victory.
 */
export function artifactsSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'EXCAVATE_ARTIFACT') return state;

  const { unitId, tile } = action;

  // Validate: unit exists
  const unit = state.units.get(unitId);
  if (!unit) return state;

  // Validate: unit is an Explorer
  if (unit.typeId !== 'explorer') return state;

  // Validate: unit belongs to current player
  if (unit.owner !== state.currentPlayerId) return state;

  // Validate: unit has movement remaining
  if (unit.movementLeft <= 0) return state;

  // Validate: tile has an artifact site
  const tileKey = coordToKey(tile);
  const mapTile = state.map.tiles.get(tileKey);
  if (!mapTile || !mapTile.hasArtifactSite) return state;

  // Get current player
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Update tile: remove artifact site
  const updatedTile = { ...mapTile, hasArtifactSite: false };
  const nextTiles = new Map(state.map.tiles);
  nextTiles.set(tileKey, updatedTile);

  // Update player: increment artifactsCollected
  const nextArtifacts = (player.artifactsCollected ?? 0) + 1;
  const updatedPlayer = { ...player, artifactsCollected: nextArtifacts };
  const nextPlayers = new Map(state.players);
  nextPlayers.set(state.currentPlayerId, updatedPlayer);

  // Update unit: consume movement
  const updatedUnit = { ...unit, movementLeft: 0 };
  const nextUnits = new Map(state.units);
  nextUnits.set(unitId, updatedUnit);

  return {
    ...state,
    map: { ...state.map, tiles: nextTiles },
    players: nextPlayers,
    units: nextUnits,
    log: [
      ...state.log,
      {
        turn: state.turn,
        playerId: state.currentPlayerId,
        message: `${player.name} excavated an artifact (${nextArtifacts} total).`,
        type: 'legacy',
      },
    ],
  };
}
