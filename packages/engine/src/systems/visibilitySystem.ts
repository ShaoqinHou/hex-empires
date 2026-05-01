import type { GameState, GameAction } from '../types/GameState';
import { coordToKey, range, lineDraw } from '../hex/HexMath';
import type { HexCoord } from '../types/HexCoord';

/**
 * VisibilitySystem recalculates fog of war.
 *
 * Triggers:
 *   - START_TURN: full recalc for current player (all units + cities).
 *   - MOVE_UNIT: incremental update for the moved unit's new position so
 *     tiles are revealed immediately on move, not deferred to next turn.
 *   - FOUND_CITY: new city provides sight radius 3 immediately.
 *   - ATTACK_UNIT / ATTACK_CITY: attacker may have advanced; reveal their
 *     current position immediately.
 *
 * Each unit provides sight radius (default 2). Cities provide sight radius 3.
 * Tiles in range are "visible". Previously visible tiles become "explored".
 */
export function visibilitySystem(state: GameState, action: GameAction): GameState {
  if (action.type === 'START_TURN') {
    return recalcFullVisibility(state, state.currentPlayerId);
  }

  if (action.type === 'MOVE_UNIT') {
    const unit = state.units.get(action.unitId);
    if (!unit || unit.owner !== state.currentPlayerId) return state;
    // The unit has already moved in state by the time visibility runs.
    // Recompute full visibility for the current player so tiles can shrink as
    // well as expand immediately.
    return recalcFullVisibility(state, state.currentPlayerId);
  }

  if (action.type === 'FOUND_CITY') {
    return recalcFullVisibility(state, state.currentPlayerId);
  }

  if (action.type === 'ATTACK_UNIT' || action.type === 'ATTACK_CITY') {
    if (state.lastValidation?.valid === false) return state;
    // After combat, the attacker's current position can change the set of
    // currently visible tiles. The attacker may also have died in combat, so
    // this cannot depend on looking the unit up after combat resolves.
    return recalcFullVisibility(state, state.currentPlayerId);
  }

  return state;
}

/**
 * F-09: LOS occlusion check.
 * Returns true if the line of sight from observer to target is clear.
 * Tiles with feature 'mountains' or 'forest' occlude LOS for tiles BEHIND them
 * (i.e. intermediate hex-line tiles that are occluding block the target).
 * Observer tile and target tile themselves never block.
 */
function hasLineOfSight(
  observer: HexCoord,
  target: HexCoord,
  state: GameState,
): boolean {
  const line = lineDraw(observer, target);
  // line[0] = observer, line[line.length-1] = target
  // Only intermediate tiles can block
  for (let i = 1; i < line.length - 1; i++) {
    const key = coordToKey(line[i]);
    const tile = state.map.tiles.get(key);
    if (!tile) continue;
    if (tile.feature === 'mountains' || tile.feature === 'forest') {
      return false; // LOS blocked
    }
  }
  return true;
}

/** Full recalculation: rebuilds visible set from scratch, promotes old visible → explored. */
function recalcFullVisibility(state: GameState, playerId: string): GameState {
  const player = state.players.get(playerId);
  if (!player) return state;

  // Previous visibility becomes explored
  const explored = new Set(player.explored);
  for (const key of player.visibility) {
    explored.add(key);
  }

  const visible = new Set<string>();

  for (const unit of state.units.values()) {
    if (unit.owner !== playerId) continue;
    const sightRange = getSightRange(state, unit.typeId);
    for (const hex of range(unit.position, sightRange)) {
      const key = coordToKey(hex);
      const tile = state.map.tiles.get(key);
      if (!tile) continue;
      // W4-02 (F-04): Skip Distant Lands tiles unless player has unlocked access.
      if (tile.isDistantLands && !player.distantLandsReachable) continue;
      // F-09: LOS occlusion — skip tiles blocked by mountains or forests
      if (!hasLineOfSight(unit.position, hex, state)) continue;
      visible.add(key);
      explored.add(key);
    }
  }

  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    for (const hex of range(city.position, 3)) {
      const key = coordToKey(hex);
      const tile = state.map.tiles.get(key);
      if (!tile) continue;
      // W4-02 (F-04): Skip Distant Lands tiles unless player has unlocked access.
      if (tile.isDistantLands && !player.distantLandsReachable) continue;
      // F-09: LOS occlusion — skip tiles blocked by mountains or forests
      if (!hasLineOfSight(city.position, hex, state)) continue;
      visible.add(key);
      explored.add(key);
    }
  }

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(playerId, { ...player, visibility: visible, explored });
  return { ...state, players: updatedPlayers };
}

function getSightRange(state: GameState, typeId: string): number {
  return state.config.units.get(typeId)?.sightRange ?? 2;
}
