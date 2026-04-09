import type { HexCoord, HexKey } from '../types/HexCoord';
import { coordToKey, neighbors, distance } from './HexMath';

export type CostFn = (from: HexCoord, to: HexCoord) => number | null;

/**
 * A* pathfinding on hex grid.
 * costFn returns the movement cost to enter `to` from `from`, or null if impassable.
 * Returns the path (excluding start) or null if no path exists.
 */
export function findPath(
  start: HexCoord,
  goal: HexCoord,
  costFn: CostFn,
  maxCost: number = Infinity,
): ReadonlyArray<HexCoord> | null {
  const startKey = coordToKey(start);
  const goalKey = coordToKey(goal);

  if (startKey === goalKey) return [];

  const gScore = new Map<HexKey, number>();
  const fScore = new Map<HexKey, number>();
  const cameFrom = new Map<HexKey, HexKey>();
  const coordMap = new Map<HexKey, HexCoord>();
  const open = new Set<HexKey>();
  const closed = new Set<HexKey>();

  gScore.set(startKey, 0);
  fScore.set(startKey, distance(start, goal));
  open.add(startKey);
  coordMap.set(startKey, start);

  while (open.size > 0) {
    // Find node in open set with lowest fScore
    let bestKey: HexKey = '';
    let bestF = Infinity;
    for (const key of open) {
      const f = fScore.get(key) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        bestKey = key;
      }
    }

    if (bestKey === goalKey) {
      // Reconstruct path
      const path: HexCoord[] = [];
      let current = goalKey;
      while (current !== startKey) {
        path.unshift(coordMap.get(current)!);
        current = cameFrom.get(current)!;
      }
      return path;
    }

    open.delete(bestKey);
    closed.add(bestKey);
    const currentCoord = coordMap.get(bestKey)!;
    const currentG = gScore.get(bestKey)!;

    for (const neighbor of neighbors(currentCoord)) {
      const neighborKey = coordToKey(neighbor);
      if (closed.has(neighborKey)) continue;

      const cost = costFn(currentCoord, neighbor);
      if (cost === null) continue; // impassable

      const tentativeG = currentG + cost;
      if (tentativeG > maxCost) continue;

      const existingG = gScore.get(neighborKey);
      if (existingG !== undefined && existingG <= tentativeG) continue;

      gScore.set(neighborKey, tentativeG);
      fScore.set(neighborKey, tentativeG + distance(neighbor, goal));
      cameFrom.set(neighborKey, bestKey);
      coordMap.set(neighborKey, neighbor);
      open.add(neighborKey);
    }
  }

  return null; // no path found
}

/**
 * Get all hexes reachable within a movement budget.
 * Returns a map of HexKey → cost to reach that hex.
 */
export function getReachable(
  start: HexCoord,
  maxCost: number,
  costFn: CostFn,
): ReadonlyMap<HexKey, number> {
  const visited = new Map<HexKey, number>();
  const frontier: Array<{ coord: HexCoord; cost: number }> = [{ coord: start, cost: 0 }];
  visited.set(coordToKey(start), 0);

  while (frontier.length > 0) {
    // Sort by cost (simple priority queue)
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift()!;

    for (const neighbor of neighbors(current.coord)) {
      const cost = costFn(current.coord, neighbor);
      if (cost === null) continue;

      const totalCost = current.cost + cost;
      if (totalCost > maxCost) continue;

      const neighborKey = coordToKey(neighbor);
      const existingCost = visited.get(neighborKey);
      if (existingCost !== undefined && existingCost <= totalCost) continue;

      visited.set(neighborKey, totalCost);
      frontier.push({ coord: neighbor, cost: totalCost });
    }
  }

  return visited;
}
