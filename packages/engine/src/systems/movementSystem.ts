import type { GameState, GameAction, HexTile } from '../types/GameState';
import type { TerrainDef, TerrainFeatureDef } from '../types/Terrain';
import { coordToKey, distance } from '../hex/HexMath';
import { Registry } from '../registry/Registry';

/**
 * MovementSystem handles unit movement actions.
 * Validates movement paths and deducts movement points.
 */
export function movementSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'MOVE_UNIT') return state;

  const unit = state.units.get(action.unitId);
  if (!unit) return state;
  if (unit.owner !== state.currentPlayerId) return state;
  if (action.path.length === 0) return state;

  // Validate and calculate total movement cost
  let totalCost = 0;
  let prevCoord = unit.position;

  for (const nextCoord of action.path) {
    // Each step must be adjacent
    if (distance(prevCoord, nextCoord) !== 1) return state;

    // Check target tile exists and is passable
    const tile = state.map.tiles.get(coordToKey(nextCoord));
    if (!tile) return state;

    const cost = getMovementCost(tile);
    if (cost === null) return state; // impassable

    totalCost += cost;
    prevCoord = nextCoord;
  }

  // Check unit has enough movement
  if (totalCost > unit.movementLeft) return state;

  // Check destination isn't occupied by another unit of the same player
  const destination = action.path[action.path.length - 1];
  const destKey = coordToKey(destination);
  for (const [id, other] of state.units) {
    if (id !== unit.id && other.owner === unit.owner && coordToKey(other.position) === destKey) {
      return state; // can't stack friendly units
    }
  }

  // Apply movement
  const updatedUnits = new Map(state.units);
  updatedUnits.set(unit.id, {
    ...unit,
    position: destination,
    movementLeft: unit.movementLeft - totalCost,
    fortified: false, // moving breaks fortification
  });

  return {
    ...state,
    units: updatedUnits,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${unit.typeId} moved to (${destination.q}, ${destination.r})`,
      type: 'move',
    }],
  };
}

/** Get movement cost to enter a tile. Returns null if impassable. */
export function getMovementCost(tile: HexTile): number | null {
  // Base terrain costs — using hardcoded values for now
  // Will be replaced by registry lookups
  const terrainCosts: Record<string, number | null> = {
    grassland: 1,
    plains: 1,
    desert: 1,
    tundra: 1,
    snow: 1,
    coast: null, // impassable for land units
    ocean: null,
  };

  const featureCosts: Record<string, number | null> = {
    hills: 1,      // +1 movement cost
    mountains: null, // impassable
    forest: 1,     // +1 movement cost
    jungle: 1,     // +1 movement cost
    marsh: 1,      // +1 movement cost
    floodplains: 0,
    oasis: 0,
    reef: 0,
  };

  const baseCost = terrainCosts[tile.terrain];
  if (baseCost === null || baseCost === undefined) return null;

  if (tile.feature) {
    const featureCost = featureCosts[tile.feature];
    if (featureCost === null) return null; // impassable feature
    return baseCost + (featureCost ?? 0);
  }

  return baseCost;
}
