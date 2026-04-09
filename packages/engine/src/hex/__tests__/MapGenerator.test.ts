import { describe, it, expect } from 'vitest';
import { generateMap, createTerrainRegistries } from '../MapGenerator';
import { ALL_BASE_TERRAINS } from '../../data/terrains/base-terrains';
import { ALL_FEATURES } from '../../data/terrains/features';

function makeRegistries() {
  return createTerrainRegistries(ALL_BASE_TERRAINS, ALL_FEATURES);
}

describe('generateMap', () => {
  it('generates a map with correct dimensions', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(terrainRegistry, featureRegistry, { width: 20, height: 15, seed: 42 });
    expect(map.width).toBe(20);
    expect(map.height).toBe(15);
    expect(map.tiles.size).toBe(20 * 15);
  });

  it('every tile has a valid terrain', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(terrainRegistry, featureRegistry, { width: 20, height: 15, seed: 42 });
    for (const tile of map.tiles.values()) {
      expect(terrainRegistry.has(tile.terrain)).toBe(true);
    }
  });

  it('features are either null or valid', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(terrainRegistry, featureRegistry, { width: 20, height: 15, seed: 42 });
    for (const tile of map.tiles.values()) {
      if (tile.feature !== null) {
        expect(featureRegistry.has(tile.feature)).toBe(true);
      }
    }
  });

  it('is deterministic with same seed', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map1 = generateMap(terrainRegistry, featureRegistry, { width: 10, height: 10, seed: 123 });
    const map2 = generateMap(terrainRegistry, featureRegistry, { width: 10, height: 10, seed: 123 });

    for (const [key, tile1] of map1.tiles) {
      const tile2 = map2.tiles.get(key)!;
      expect(tile1.terrain).toBe(tile2.terrain);
      expect(tile1.feature).toBe(tile2.feature);
      expect(tile1.elevation).toBe(tile2.elevation);
    }
  });

  it('different seeds produce different maps', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map1 = generateMap(terrainRegistry, featureRegistry, { width: 20, height: 15, seed: 1 });
    const map2 = generateMap(terrainRegistry, featureRegistry, { width: 20, height: 15, seed: 9999 });

    let differences = 0;
    for (const [key, tile1] of map1.tiles) {
      const tile2 = map2.tiles.get(key)!;
      if (tile1.terrain !== tile2.terrain) differences++;
    }
    expect(differences).toBeGreaterThan(0);
  });

  it('contains both land and water tiles', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(terrainRegistry, featureRegistry, { width: 30, height: 20, seed: 42, waterRatio: 0.4 });

    let land = 0;
    let water = 0;
    for (const tile of map.tiles.values()) {
      const terrain = terrainRegistry.get(tile.terrain)!;
      if (terrain.isWater) water++;
      else land++;
    }
    expect(land).toBeGreaterThan(0);
    expect(water).toBeGreaterThan(0);
  });

  it('contains varied terrain types', () => {
    const { terrainRegistry, featureRegistry } = makeRegistries();
    const map = generateMap(terrainRegistry, featureRegistry, { width: 60, height: 40, seed: 42 });

    const terrainTypes = new Set<string>();
    for (const tile of map.tiles.values()) {
      terrainTypes.add(tile.terrain);
    }
    // Should have at least 4 different terrain types on a large map
    expect(terrainTypes.size).toBeGreaterThanOrEqual(4);
  });
});
