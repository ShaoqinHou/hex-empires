import type { GameState, GameAction } from '../types/GameState';
import { coordToKey, neighbors, distance } from '../hex/HexMath';
import { getMovementCost } from '../hex/TerrainCost';
import type { HexCoord } from '../types/HexCoord';

/**
 * AISystem generates actions for non-human players.
 * Called between turns to play out AI turns.
 * Returns a list of actions for the AI player to execute.
 */
export function generateAIActions(state: GameState): ReadonlyArray<GameAction> {
  const player = state.players.get(state.currentPlayerId);
  if (!player || player.isHuman) return [];

  const actions: GameAction[] = [];

  // 1. Set research if not researching
  if (!player.currentResearch) {
    const availableTechs = getAvailableTechs(state);
    if (availableTechs.length > 0) {
      actions.push({ type: 'SET_RESEARCH', techId: availableTechs[0] });
    }
  }

  // 2. Move military units toward enemies or explore
  for (const unit of state.units.values()) {
    if (unit.owner !== state.currentPlayerId) continue;
    if (unit.movementLeft <= 0) continue;

    if (unit.typeId === 'settler') {
      // Try to found a city if we have fewer than 3
      const ourCities = [...state.cities.values()].filter(c => c.owner === unit.owner);
      if (ourCities.length < 3) {
        actions.push({ type: 'FOUND_CITY', unitId: unit.id, name: `AI City ${ourCities.length + 1}` });
        continue;
      }
    }

    // Find nearest enemy unit or explore
    const moveTarget = findMoveTarget(unit.position, unit.owner, state);
    if (moveTarget) {
      // Move one step toward target
      const path = getOneStepToward(unit.position, moveTarget, state);
      if (path) {
        actions.push({ type: 'MOVE_UNIT', unitId: unit.id, path: [path] });

        // Attack if adjacent to enemy
        const enemyAdj = findAdjacentEnemy(path, unit.owner, state);
        if (enemyAdj) {
          actions.push({ type: 'ATTACK_UNIT', attackerId: unit.id, targetId: enemyAdj.id });
        }
      }
    }
  }

  // 3. Set production in cities
  for (const city of state.cities.values()) {
    if (city.owner !== state.currentPlayerId) continue;
    if (city.productionQueue.length === 0) {
      // Produce warriors by default, or settlers if we need cities
      const ourCities = [...state.cities.values()].filter(c => c.owner === city.owner);
      const itemId = ourCities.length < 3 ? 'settler' : 'warrior';
      actions.push({ type: 'SET_PRODUCTION', cityId: city.id, itemId, itemType: 'unit' });
    }
  }

  // 4. End turn
  actions.push({ type: 'END_TURN' });

  return actions;
}

function getAvailableTechs(state: GameState): string[] {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return [];

  // Simple list of antiquity techs in priority order
  const techOrder = [
    'pottery', 'animal_husbandry', 'mining', 'archery',
    'writing', 'bronze_working', 'wheel', 'masonry',
    'currency', 'construction', 'iron_working',
  ];

  return techOrder.filter(t => !player.researchedTechs.includes(t));
}

function findMoveTarget(from: HexCoord, ownerId: string, state: GameState): HexCoord | null {
  // Find nearest enemy unit
  let nearestDist = Infinity;
  let nearest: HexCoord | null = null;

  for (const unit of state.units.values()) {
    if (unit.owner === ownerId) continue;
    const d = distance(from, unit.position);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = unit.position;
    }
  }

  // If no enemy nearby, pick a random unexplored direction
  if (!nearest || nearestDist > 15) {
    const ns = neighbors(from);
    for (const n of ns) {
      const tile = state.map.tiles.get(coordToKey(n));
      if (tile && tile.terrain !== 'ocean' && tile.terrain !== 'coast' && tile.feature !== 'mountains') {
        return n;
      }
    }
  }

  return nearest;
}

function getOneStepToward(from: HexCoord, target: HexCoord, state: GameState): HexCoord | null {
  const ns = neighbors(from);
  let bestDist = distance(from, target);
  let bestHex: HexCoord | null = null;

  for (const n of ns) {
    const tile = state.map.tiles.get(coordToKey(n));
    if (!tile) continue;
    const cost = getMovementCost(tile);
    if (cost === null) continue;

    // Don't move into tiles with friendly units
    let occupied = false;
    for (const unit of state.units.values()) {
      if (coordToKey(unit.position) === coordToKey(n)) {
        occupied = true;
        break;
      }
    }
    if (occupied) continue;

    const d = distance(n, target);
    if (d < bestDist) {
      bestDist = d;
      bestHex = n;
    }
  }

  return bestHex;
}

function findAdjacentEnemy(pos: HexCoord, ownerId: string, state: GameState): { id: string } | null {
  for (const unit of state.units.values()) {
    if (unit.owner === ownerId) continue;
    if (distance(pos, unit.position) === 1) {
      return { id: unit.id };
    }
  }
  return null;
}
