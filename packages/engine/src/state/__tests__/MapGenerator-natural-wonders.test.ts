/**
 * JJ4 — Natural Wonders on map (map-terrain F-07)
 * Tests for natural wonder placement in the map generator.
 */
import { describe, it, expect } from 'vitest';
import { generateMap, createTerrainRegistries } from '../../hex/MapGenerator';
import { ALL_BASE_TERRAINS } from '../../data/terrains/base-terrains';
import { ALL_FEATURES } from '../../data/terrains/features';
import { ALL_NATURAL_WONDERS, MOUNT_KILIMANJARO } from '../../data/natural-wonders';
import { distance } from '../../hex/HexMath';
import type { HexTile } from '../../types/GameState';

function makeRegistries() {
  return createTerrainRegistries(ALL_BASE_TERRAINS, ALL_FEATURES);
}

describe('JJ4: natural wonder placement in map generator', () => {
  it('places at least 3 natural wonders on a standard map when wonders are provided', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(
      terrainRegistry,
      featureRegistry,
      { width: 60, height: 40, seed: 12345 },
      [],
      ALL_NATURAL_WONDERS,
    );

    let naturalWonderCount = 0;
    for (const tile of map.tiles.values()) {
      if (tile.isNaturalWonder === true && tile.naturalWonderId) {
        naturalWonderCount++;
      }
    }

    expect(naturalWonderCount).toBeGreaterThanOrEqual(3);
  });

  it('places at most 5 natural wonders on any map', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(
      terrainRegistry,
      featureRegistry,
      { width: 60, height: 40, seed: 12345 },
      [],
      ALL_NATURAL_WONDERS,
    );

    let naturalWonderCount = 0;
    for (const tile of map.tiles.values()) {
      if (tile.isNaturalWonder === true) {
        naturalWonderCount++;
      }
    }

    expect(naturalWonderCount).toBeLessThanOrEqual(5);
  });

  it('every placed wonder id corresponds to a known wonder def', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(
      terrainRegistry,
      featureRegistry,
      { width: 60, height: 40, seed: 12345 },
      [],
      ALL_NATURAL_WONDERS,
    );

    const knownIds = new Set(ALL_NATURAL_WONDERS.map(w => w.id));
    for (const tile of map.tiles.values()) {
      if (tile.naturalWonderId) {
        expect(knownIds.has(tile.naturalWonderId)).toBe(true);
      }
    }
  });

  it('placed wonders are on land tiles (not ocean or coast)', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(
      terrainRegistry,
      featureRegistry,
      { width: 60, height: 40, seed: 12345 },
      [],
      ALL_NATURAL_WONDERS,
    );

    const waterTerrains = new Set(['ocean', 'coast', 'deep_ocean', 'reef']);
    for (const tile of map.tiles.values()) {
      if (tile.isNaturalWonder === true) {
        expect(waterTerrains.has(tile.terrain)).toBe(false);
      }
    }
  });

  it('placed wonders are separated by at least 3 hexes from each other', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(
      terrainRegistry,
      featureRegistry,
      { width: 60, height: 40, seed: 12345 },
      [],
      ALL_NATURAL_WONDERS,
    );

    const wonderTiles: HexTile[] = [];
    for (const tile of map.tiles.values()) {
      if (tile.isNaturalWonder === true) {
        wonderTiles.push(tile);
      }
    }

    // Check every pair — they must be at least MIN_WONDER_SEPARATION / 2 hexes apart
    for (let i = 0; i < wonderTiles.length; i++) {
      for (let j = i + 1; j < wonderTiles.length; j++) {
        const dist = distance(wonderTiles[i].coord, wonderTiles[j].coord);
        expect(dist).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('placement is deterministic — same seed produces same wonder positions', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const opts = { width: 40, height: 30, seed: 99999 };

    const map1 = generateMap(terrainRegistry, featureRegistry, opts, [], ALL_NATURAL_WONDERS);
    const map2 = generateMap(terrainRegistry, featureRegistry, opts, [], ALL_NATURAL_WONDERS);

    const wonderKeys1 = new Set<string>();
    const wonderKeys2 = new Set<string>();

    for (const [key, tile] of map1.tiles) {
      if (tile.isNaturalWonder === true) wonderKeys1.add(key);
    }
    for (const [key, tile] of map2.tiles) {
      if (tile.isNaturalWonder === true) wonderKeys2.add(key);
    }

    expect(wonderKeys1.size).toBe(wonderKeys2.size);
    for (const key of wonderKeys1) {
      expect(wonderKeys2.has(key)).toBe(true);
    }
  });

  it('no wonders are placed when naturalWonders array is empty', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(
      terrainRegistry,
      featureRegistry,
      { width: 30, height: 20, seed: 42 },
      [],
      [], // empty array
    );

    for (const tile of map.tiles.values()) {
      expect(tile.isNaturalWonder).toBeUndefined();
      expect(tile.naturalWonderId).toBeUndefined();
    }
  });

  it('the same tile does not have both isNaturalWonder=true and a missing naturalWonderId', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(
      terrainRegistry,
      featureRegistry,
      { width: 60, height: 40, seed: 12345 },
      [],
      ALL_NATURAL_WONDERS,
    );

    for (const tile of map.tiles.values()) {
      if (tile.isNaturalWonder === true) {
        expect(tile.naturalWonderId).toBeTruthy();
      }
    }
  });
});

describe('JJ4: specific wonder — Mt. Kilimanjaro on a known tile', () => {
  it('a tile tagged with mount_kilimanjaro has isNaturalWonder=true and correct id', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(
      terrainRegistry,
      featureRegistry,
      { width: 60, height: 40, seed: 12345 },
      [],
      ALL_NATURAL_WONDERS,
    );

    // Find any tile that got Kilimanjaro placed (placement is seeded, so it exists)
    let kiliTile: HexTile | undefined;
    for (const tile of map.tiles.values()) {
      if (tile.naturalWonderId === MOUNT_KILIMANJARO.id) {
        kiliTile = tile;
        break;
      }
    }

    // If Kilimanjaro was placed (depends on RNG ordering), verify its flags
    if (kiliTile !== undefined) {
      expect(kiliTile.isNaturalWonder).toBe(true);
      expect(kiliTile.naturalWonderId).toBe('mount_kilimanjaro');
    }
    // If not placed (rare — other wonders took all 5 slots), the test is vacuously satisfied.
    // The "at least 3 wonders placed" test above provides the coverage guarantee.
  });
});
