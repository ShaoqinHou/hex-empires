import type { GameState, GameAction } from '../types/GameState';
import { coordToKey, range } from '../hex/HexMath';

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
    // The unit has already moved in state by the time visibility runs
    // (movementSystem is earlier in the pipeline). Reveal around its current position.
    return revealAroundCoord(state, unit.owner, unit.position, getSightRange(state, unit.typeId));
  }

  if (action.type === 'FOUND_CITY') {
    // citySystem runs before visibilitySystem; find the newly-founded city
    // by looking up where the settler was (unit is gone, city exists there now).
    // Find the most recently added city owned by the current player.
    // Fall back to revealing around ANY new city position if we can't pinpoint it.
    for (const city of state.cities.values()) {
      if (city.owner === state.currentPlayerId) {
        // All owned cities: re-reveal. Not expensive — cities are few.
        revealAroundCoord(state, city.owner, city.position, 3);
      }
    }
    // Run a full incremental reveal across all current-player cities.
    return revealAllCities(state, state.currentPlayerId);
  }

  if (action.type === 'ATTACK_UNIT' || action.type === 'ATTACK_CITY') {
    // After combat, the attacker's position (and surrounding tiles) should be visible.
    const attacker = state.units.get(action.attackerId);
    if (!attacker || attacker.owner !== state.currentPlayerId) return state;
    return revealAroundCoord(state, attacker.owner, attacker.position, getSightRange(state, attacker.typeId));
  }

  return state;
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
      if (state.map.tiles.has(key)) {
        visible.add(key);
        explored.add(key);
      }
    }
  }

  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    for (const hex of range(city.position, 3)) {
      const key = coordToKey(hex);
      if (state.map.tiles.has(key)) {
        visible.add(key);
        explored.add(key);
      }
    }
  }

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(playerId, { ...player, visibility: visible, explored });
  return { ...state, players: updatedPlayers };
}

/** Incrementally reveal tiles around all of a player's cities. */
function revealAllCities(state: GameState, playerId: string): GameState {
  let current = state;
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    current = revealAroundCoord(current, playerId, city.position, 3);
  }
  return current;
}

/** Incrementally reveal tiles around a coordinate without shrinking existing visibility. */
function revealAroundCoord(
  state: GameState,
  playerId: string,
  position: { q: number; r: number },
  sightRange: number
): GameState {
  const player = state.players.get(playerId);
  if (!player) return state;

  const visible = new Set(player.visibility);
  const explored = new Set(player.explored);
  let changed = false;

  for (const hex of range(position, sightRange)) {
    const key = coordToKey(hex);
    if (state.map.tiles.has(key)) {
      if (!visible.has(key)) { visible.add(key); changed = true; }
      if (!explored.has(key)) { explored.add(key); changed = true; }
    }
  }

  if (!changed) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(playerId, { ...player, visibility: visible, explored });
  return { ...state, players: updatedPlayers };
}

function getSightRange(state: GameState, typeId: string): number {
  return state.config.units.get(typeId)?.sightRange ?? 2;
}
