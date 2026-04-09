import { describe, it, expect } from 'vitest';
import { findPath, getReachable } from '../Pathfinding';
import { coordToKey, distance } from '../HexMath';
import type { HexCoord } from '../../types/HexCoord';

// Cost function for an open grid (cost 1 everywhere)
const openCost = (_from: HexCoord, _to: HexCoord): number | null => 1;

// Cost function with a wall at q=2
const wallCost = (_from: HexCoord, to: HexCoord): number | null => {
  if (to.q === 2 && to.r >= -1 && to.r <= 1) return null; // wall
  return 1;
};

describe('findPath', () => {
  it('returns empty array for same start and goal', () => {
    const path = findPath({ q: 0, r: 0 }, { q: 0, r: 0 }, openCost);
    expect(path).toEqual([]);
  });

  it('finds direct path to adjacent hex', () => {
    const path = findPath({ q: 0, r: 0 }, { q: 1, r: 0 }, openCost);
    expect(path).toEqual([{ q: 1, r: 0 }]);
  });

  it('finds shortest path on open grid', () => {
    const start = { q: 0, r: 0 };
    const goal = { q: 3, r: 0 };
    const path = findPath(start, goal, openCost);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(distance(start, goal));
  });

  it('path is contiguous (each step is adjacent)', () => {
    const path = findPath({ q: 0, r: 0 }, { q: 3, r: -2 }, openCost)!;
    expect(path).not.toBeNull();
    let prev = { q: 0, r: 0 };
    for (const step of path) {
      expect(distance(prev, step)).toBe(1);
      prev = step;
    }
  });

  it('routes around obstacles', () => {
    const path = findPath({ q: 0, r: 0 }, { q: 4, r: 0 }, wallCost);
    expect(path).not.toBeNull();
    // Path should not pass through the wall
    for (const step of path!) {
      expect(step.q === 2 && step.r >= -1 && step.r <= 1).toBe(false);
    }
  });

  it('returns null when no path exists', () => {
    // Completely surrounded by walls
    const surrounded = (_from: HexCoord, to: HexCoord): number | null => {
      if (distance({ q: 0, r: 0 }, to) === 1) return null;
      return 1;
    };
    const path = findPath({ q: 0, r: 0 }, { q: 5, r: 0 }, surrounded);
    expect(path).toBeNull();
  });

  it('respects maxCost limit', () => {
    const path = findPath({ q: 0, r: 0 }, { q: 10, r: 0 }, openCost, 3);
    // Goal is 10 away, but max cost is 3 — should be unreachable
    expect(path).toBeNull();
  });

  it('handles varied terrain costs', () => {
    const variedCost = (_from: HexCoord, to: HexCoord): number | null => {
      // Expensive to go through q=1
      if (to.q === 1) return 5;
      return 1;
    };
    const path = findPath({ q: 0, r: 0 }, { q: 2, r: 0 }, variedCost);
    expect(path).not.toBeNull();
    // Should prefer going around q=1 if cheaper
  });
});

describe('getReachable', () => {
  it('returns start hex with cost 0', () => {
    const reachable = getReachable({ q: 0, r: 0 }, 0, openCost);
    expect(reachable.get(coordToKey({ q: 0, r: 0 }))).toBe(0);
    expect(reachable.size).toBe(1);
  });

  it('with budget 1, returns 7 hexes (center + 6 neighbors)', () => {
    const reachable = getReachable({ q: 0, r: 0 }, 1, openCost);
    expect(reachable.size).toBe(7);
  });

  it('with budget 2, returns 19 hexes', () => {
    const reachable = getReachable({ q: 0, r: 0 }, 2, openCost);
    expect(reachable.size).toBe(19);
  });

  it('respects impassable terrain', () => {
    const reachable = getReachable({ q: 0, r: 0 }, 5, wallCost);
    // Should not include wall hexes
    expect(reachable.has(coordToKey({ q: 2, r: 0 }))).toBe(false);
  });
});
