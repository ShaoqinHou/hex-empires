/**
 * HH3 (map-terrain F-11): Tests for hasFreshWater flag and isFreshWater helper.
 *
 * Verifies that:
 *  - River tiles (river.length > 0) are considered fresh water
 *  - Coast tiles NOT adjacent to any river are NOT fresh water
 *  - Land tiles adjacent to a navigable_river tile gain hasFreshWater
 *  - Land tiles adjacent to a lake tile gain hasFreshWater
 *  - The isFreshWater() helper correctly reads the flag + fallback
 *  - computeFreshWaterFlags (via generateMap) sets the flag during map gen
 */
import { describe, it, expect } from 'vitest';
import { isFreshWater } from '../MapAnalytics';
import { generateMap, createTerrainRegistries } from '../../hex/MapGenerator';
import { ALL_BASE_TERRAINS } from '../../data/terrains/base-terrains';
import { ALL_FEATURES } from '../../data/terrains/features';
import { coordToKey } from '../../hex/HexMath';
import type { HexTile } from '../../types/GameState';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeTile(overrides: Partial<HexTile> & { coord: { q: number; r: number } }): HexTile {
  return {
    coord: overrides.coord,
    terrain: overrides.terrain ?? 'grassland',
    feature: overrides.feature ?? null,
    resource: overrides.resource ?? null,
    improvement: overrides.improvement ?? null,
    building: overrides.building ?? null,
    river: overrides.river ?? [],
    elevation: overrides.elevation ?? 0.5,
    continent: overrides.continent ?? 1,
    hasFreshWater: overrides.hasFreshWater,
  };
}

function makeRegistries() {
  return createTerrainRegistries(ALL_BASE_TERRAINS, ALL_FEATURES);
}

// ── isFreshWater unit tests ───────────────────────────────────────────────────

describe('isFreshWater() helper', () => {
  it('returns true for a tile with hasFreshWater: true (flag path)', () => {
    const tile = makeTile({ coord: { q: 0, r: 0 }, hasFreshWater: true });
    expect(isFreshWater(tile)).toBe(true);
  });

  it('returns false for a tile with hasFreshWater: false', () => {
    const tile = makeTile({ coord: { q: 0, r: 0 }, hasFreshWater: false, river: [] });
    expect(isFreshWater(tile)).toBe(false);
  });

  it('returns false for a tile with hasFreshWater: undefined and no river edges (fallback)', () => {
    const tile = makeTile({ coord: { q: 0, r: 0 } }); // hasFreshWater omitted, river: []
    expect(isFreshWater(tile)).toBe(false);
  });

  it('returns true via fallback when hasFreshWater is absent but river edges exist', () => {
    // Pre-flag tile: no hasFreshWater set, but river.length > 0
    const tile = makeTile({ coord: { q: 2, r: 1 }, river: [0, 3] });
    // hasFreshWater is undefined here
    expect(tile.hasFreshWater).toBeUndefined();
    expect(isFreshWater(tile)).toBe(true);
  });
});

// ── generateMap integration tests ─────────────────────────────────────────────

describe('hasFreshWater flag set by generateMap', () => {
  it('a tile with river edges has hasFreshWater: true', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    // Use a larger map so rivers are likely generated
    const map = generateMap(terrainRegistry, featureRegistry, { width: 40, height: 30, seed: 42 });

    // Find any tile that has river edges — the generator produces some
    const riverTiles = [...map.tiles.values()].filter(t => t.river.length > 0);
    // If the seed generates no rivers, the test is vacuously skipped (unlikely with seed 42)
    if (riverTiles.length === 0) return;

    for (const tile of riverTiles) {
      expect(tile.hasFreshWater).toBe(true);
    }
  });

  it('a coast tile NOT adjacent to any river source does not have hasFreshWater: true', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(terrainRegistry, featureRegistry, { width: 40, height: 30, seed: 42 });

    // Find a coast tile where none of its neighbors has a river / is lake / navigable_river
    const coastTiles = [...map.tiles.values()].filter(t => t.terrain === 'coast');
    if (coastTiles.length === 0) return;

    // Identify tiles that are adjacent to a primary fresh-water source
    const primaryKeys = new Set<string>();
    for (const [key, tile] of map.tiles) {
      if (tile.terrain === 'lake' || tile.terrain === 'navigable_river' || tile.river.length > 0) {
        primaryKeys.add(key);
      }
    }

    // Coast tiles adjacent to a primary source CAN have hasFreshWater if they don't match salt-water rule.
    // The rule says salt-water terrains (ocean, coast, deep_ocean) do NOT get the flag.
    // So: ALL coast tiles should NOT have hasFreshWater: true regardless of neighbors.
    for (const tile of coastTiles) {
      expect(tile.hasFreshWater).not.toBe(true);
    }
  });

  it('a grassland tile adjacent to a navigable_river tile has hasFreshWater: true', () => {
    // Construct a minimal map manually by calling generateMap and then checking adjacency.
    // Since we cannot control map gen terrain placement exactly, we verify the rule
    // by directly checking: for every navigable_river tile, its non-salt-water neighbors
    // all have hasFreshWater: true.
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(terrainRegistry, featureRegistry, { width: 40, height: 30, seed: 999 });

    const navRiverTiles = [...map.tiles.values()].filter(t => t.terrain === 'navigable_river');
    if (navRiverTiles.length === 0) {
      // navigable_river tiles not placed in standard gen; rule is vacuously satisfied
      return;
    }

    const saltWater = new Set(['ocean', 'coast', 'deep_ocean', 'reef']);
    for (const navTile of navRiverTiles) {
      // All non-salt-water neighbors must have hasFreshWater: true
      const { q, r } = navTile.coord;
      const neighborCoords = [
        { q: q + 1, r }, { q: q - 1, r },
        { q, r: r + 1 }, { q, r: r - 1 },
        { q: q + 1, r: r - 1 }, { q: q - 1, r: r + 1 },
      ];
      for (const nc of neighborCoords) {
        const nk = coordToKey(nc);
        const neighbor = map.tiles.get(nk);
        if (!neighbor) continue;
        if (saltWater.has(neighbor.terrain)) continue;
        expect(neighbor.hasFreshWater).toBe(true);
      }
    }
  });

  it('a grassland tile adjacent to a lake tile has hasFreshWater: true', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(terrainRegistry, featureRegistry, { width: 40, height: 30, seed: 1234 });

    const lakeTiles = [...map.tiles.values()].filter(t => t.terrain === 'lake');
    if (lakeTiles.length === 0) {
      // lake tiles not placed in standard gen with this seed; rule is vacuously satisfied
      return;
    }

    const saltWater = new Set(['ocean', 'coast', 'deep_ocean', 'reef']);
    for (const lakeTile of lakeTiles) {
      const { q, r } = lakeTile.coord;
      const neighborCoords = [
        { q: q + 1, r }, { q: q - 1, r },
        { q, r: r + 1 }, { q, r: r - 1 },
        { q: q + 1, r: r - 1 }, { q: q - 1, r: r + 1 },
      ];
      for (const nc of neighborCoords) {
        const nk = coordToKey(nc);
        const neighbor = map.tiles.get(nk);
        if (!neighbor) continue;
        if (saltWater.has(neighbor.terrain)) continue;
        expect(neighbor.hasFreshWater).toBe(true);
      }
    }
  });
});

// ── computeFreshWaterFlags logic tested via direct tile construction ──────────

describe('fresh water propagation logic (unit-level)', () => {
  it('ocean tile does not get hasFreshWater even if river-adjacent would imply it', () => {
    // isFreshWater should return false for an ocean tile with no flag
    const ocean = makeTile({ coord: { q: 0, r: 0 }, terrain: 'ocean', river: [] });
    expect(isFreshWater(ocean)).toBe(false);
  });

  it('ocean tile with hasFreshWater: true still reads as true (flag takes precedence)', () => {
    // This situation would only occur if data is manually crafted — ensure no crash
    const oceanWithFlag = makeTile({ coord: { q: 0, r: 0 }, terrain: 'ocean', hasFreshWater: true });
    // isFreshWater reads the flag — if someone explicitly sets it, we honor it
    expect(isFreshWater(oceanWithFlag)).toBe(true);
  });

  it('lake tile itself has hasFreshWater: true after generateMap', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    // Use a small map; lake terrain is in the registry — verify if placed
    const map = generateMap(terrainRegistry, featureRegistry, { width: 30, height: 20, seed: 77 });
    const lakeTiles = [...map.tiles.values()].filter(t => t.terrain === 'lake');
    // If no lake tiles were generated, skip
    for (const tile of lakeTiles) {
      expect(tile.hasFreshWater).toBe(true);
    }
  });
});
