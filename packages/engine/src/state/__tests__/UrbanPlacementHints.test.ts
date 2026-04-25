import { describe, it, expect } from 'vitest';
import {
  scoreBuildingPlacement,
  rankBestPlacements,
} from '../UrbanPlacementHints';
import { createTestState } from '../../systems/__tests__/helpers';
import type { GameState, CityState, HexTile } from '../../types/GameState';
import type { TerrainId } from '../../types/Terrain';
import type { HexCoord } from '../../types/HexCoord';
import { coordToKey } from '../../hex/HexMath';

/**
 * Tests for UrbanPlacementHints — pure heuristic scoring helpers that
 * combine DistrictAdjacency + BuildingDef.yields + BuildingPlacementValidator
 * for AI urban building placement.
 *
 * The validator, adjacency helper, and yield types are assumed correct
 * (they have their own tests). These tests assert only the composition.
 */

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 5,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
      coordToKey({ q: 2, r: 4 }),
      coordToKey({ q: 2, r: 3 }),
      coordToKey({ q: 3, r: 2 }),
      coordToKey({ q: 4, r: 2 }),
    ],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
    ...overrides,
  };
}

function withTerrain(
  state: GameState,
  coord: HexCoord,
  terrain: TerrainId,
): GameState {
  const tiles = new Map(state.map.tiles);
  const key = coordToKey(coord);
  const existing = tiles.get(key);
  if (!existing) return state;
  const next: HexTile = { ...existing, terrain };
  tiles.set(key, next);
  return { ...state, map: { ...state.map, tiles } };
}

function withFeature(
  state: GameState,
  coord: HexCoord,
  feature: import('../../types/Terrain').FeatureId | null,
): GameState {
  const tiles = new Map(state.map.tiles);
  const key = coordToKey(coord);
  const existing = tiles.get(key);
  if (!existing) return state;
  const next: HexTile = { ...existing, feature };
  tiles.set(key, next);
  return { ...state, map: { ...state.map, tiles } };
}

describe('scoreBuildingPlacement', () => {
  it('returns valid:false / scoreTotal 0 for an unknown city', () => {
    const state = createTestState();
    const score = scoreBuildingPlacement(
      'c-missing',
      { q: 3, r: 3 },
      'granary',
      state,
    );
    expect(score.valid).toBe(false);
    expect(score.scoreTotal).toBe(0);
    expect(score.scoreFood).toBe(0);
    expect(score.scoreProduction).toBe(0);
    expect(score.buildingId).toBe('granary');
    expect(score.tile).toEqual({ q: 3, r: 3 });
  });

  it('returns valid:false / scoreTotal 0 for an out-of-territory tile', () => {
    const city = makeCity({ territory: [coordToKey({ q: 3, r: 3 })] });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const score = scoreBuildingPlacement('c1', { q: 9, r: 9 }, 'granary', state);
    expect(score.valid).toBe(false);
    expect(score.scoreTotal).toBe(0);
    expect(score.scoreFood).toBe(0);
  });

  it('scores a no-adjacency tile at the building\'s base yield sum', () => {
    // Library: { science: 3 }, flat grassland, no mountain/river/urban
    // neighbours → adjacency contributes 0. scoreScience = 3, total = 3.
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const score = scoreBuildingPlacement('c1', { q: 4, r: 3 }, 'library', state);
    expect(score.valid).toBe(true);
    expect(score.scoreScience).toBe(3);
    expect(score.scoreFood).toBe(0);
    expect(score.scoreProduction).toBe(0);
    expect(score.scoreCulture).toBe(0);
    expect(score.scoreGold).toBe(0);
    expect(score.scoreTotal).toBe(3);
  });

  it('adds +1 production when placed adjacent to a mountain tile', () => {
    // (4,3) has (4,2) as a neighbour in axial coords. Set (4,2) = mountain feature.
    const city = makeCity();
    let state = createTestState({ cities: new Map([['c1', city]]) });
    state = withFeature(state, { q: 4, r: 2 }, 'mountains');

    const base = scoreBuildingPlacement('c1', { q: 4, r: 3 }, 'barracks', state);
    // Barracks base yields = { production: 2 }. With +1 mountain adjacency,
    // scoreProduction should be 3, scoreTotal should be 3.
    expect(base.valid).toBe(true);
    expect(base.scoreProduction).toBe(3);
    expect(base.scoreTotal).toBe(3);
  });

  it('scoreTotal equals the sum of the five per-yield components', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const score = scoreBuildingPlacement('c1', { q: 4, r: 3 }, 'monument', state);
    expect(score.valid).toBe(true);
    expect(score.scoreTotal).toBe(
      score.scoreFood +
        score.scoreProduction +
        score.scoreScience +
        score.scoreCulture +
        score.scoreGold,
    );
    // Monument yields culture: 2, no adjacency → total 2.
    expect(score.scoreCulture).toBe(2);
    expect(score.scoreTotal).toBe(2);
  });

  it('is pure: identical inputs produce identical outputs', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const a = scoreBuildingPlacement('c1', { q: 4, r: 3 }, 'library', state);
    const b = scoreBuildingPlacement('c1', { q: 4, r: 3 }, 'library', state);
    expect(a).toEqual(b);
  });
});

describe('rankBestPlacements', () => {
  it('returns [] when the city is unknown', () => {
    const state = createTestState();
    const ranked = rankBestPlacements('c-missing', state, 5);
    expect(ranked).toEqual([]);
  });

  it('returns [] when n <= 0', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    expect(rankBestPlacements('c1', state, 0)).toEqual([]);
    expect(rankBestPlacements('c1', state, -3)).toEqual([]);
  });

  it('respects n=3 (returns at most 3 results)', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const ranked = rankBestPlacements('c1', state, 3);
    expect(ranked.length).toBeLessThanOrEqual(3);
    expect(ranked.length).toBeGreaterThan(0);
  });

  it('returns results sorted descending by scoreTotal', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const ranked = rankBestPlacements('c1', state, 20);
    expect(ranked.length).toBeGreaterThan(1);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].scoreTotal).toBeGreaterThanOrEqual(
        ranked[i].scoreTotal,
      );
    }
  });

  it('every ranked placement is valid and its score matches scoreBuildingPlacement', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const ranked = rankBestPlacements('c1', state, 10);
    expect(ranked.length).toBeGreaterThan(0);
    for (const entry of ranked) {
      expect(entry.valid).toBe(true);
      const recomputed = scoreBuildingPlacement(
        'c1',
        entry.tile,
        entry.buildingId,
        state,
      );
      expect(recomputed).toEqual(entry);
    }
  });

  it('prefers mountain-adjacent tiles for production buildings', () => {
    // Put a mountain feature next to (4,3). A barracks on (4,3) (base 2 +
    // mountain +1 = 3) should score strictly higher than the same
    // barracks on a flat tile (base 2 + 0 = 2) — and the ranker should
    // order them accordingly when both are surfaced.
    const city = makeCity();
    let state = createTestState({ cities: new Map([['c1', city]]) });
    state = withFeature(state, { q: 4, r: 2 }, 'mountains');

    const adjScore = scoreBuildingPlacement(
      'c1',
      { q: 4, r: 3 },
      'barracks',
      state,
    );
    const flatScore = scoreBuildingPlacement(
      'c1',
      { q: 2, r: 4 },
      'barracks',
      state,
    );
    expect(adjScore.valid).toBe(true);
    expect(flatScore.valid).toBe(true);
    expect(adjScore.scoreTotal).toBe(3);
    expect(flatScore.scoreTotal).toBe(2);
    expect(adjScore.scoreTotal).toBeGreaterThan(flatScore.scoreTotal);

    // Large n → both barracks placements appear; mountain-adjacent
    // ranks ahead of flat.
    const ranked = rankBestPlacements('c1', state, 500);
    const adjIdx = ranked.findIndex(
      (p) => p.buildingId === 'barracks' && p.tile.q === 4 && p.tile.r === 3,
    );
    const flatIdx = ranked.findIndex(
      (p) => p.buildingId === 'barracks' && p.tile.q === 2 && p.tile.r === 4,
    );
    expect(adjIdx).toBeGreaterThanOrEqual(0);
    expect(flatIdx).toBeGreaterThanOrEqual(0);
    expect(adjIdx).toBeLessThan(flatIdx);
  });

  it('is pure: identical inputs produce identical outputs', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const a = rankBestPlacements('c1', state, 5);
    const b = rankBestPlacements('c1', state, 5);
    expect(a).toEqual(b);
  });
});
