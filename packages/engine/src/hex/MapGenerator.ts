import type { HexCoord, HexKey } from '../types/HexCoord';
import type { HexMap, HexTile, RngState } from '../types/GameState';
import type { TerrainDef, TerrainFeatureDef, TerrainId, FeatureId } from '../types/Terrain';
import type { ResourceDef } from '../data/resources';
import { coordToKey, neighbors } from './HexMath';
import { fractalNoise2D, nextRandom, createRng } from '../state/SeededRng';
import { Registry } from '../registry/Registry';

export interface MapGenOptions {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly waterRatio: number; // 0-1, fraction of map that's water
  readonly wrapX: boolean;
}

const DEFAULT_OPTIONS: MapGenOptions = {
  width: 60,
  height: 40,
  seed: 12345,
  waterRatio: 0.4,
  wrapX: true,
};

/**
 * Generate a hex map with terrain using multi-octave noise.
 * Uses offset coordinates internally, converts to axial for output.
 */
export function generateMap(
  terrainRegistry: Registry<TerrainDef>,
  featureRegistry: Registry<TerrainFeatureDef>,
  options: Partial<MapGenOptions> = {},
  resources: ReadonlyArray<ResourceDef> = [],
): HexMap {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tiles = new Map<HexKey, HexTile>();

  for (let row = 0; row < opts.height; row++) {
    for (let col = 0; col < opts.width; col++) {
      // Convert offset to axial: pointy-top, odd-r offset
      const q = col - Math.floor(row / 2);
      const r = row;
      const coord: HexCoord = { q, r };
      const key = coordToKey(coord);

      // Generate elevation using fractal noise
      const elevation = fractalNoise2D(opts.seed, col, row, 4, 12);

      // Generate moisture for biome selection
      const moisture = fractalNoise2D(opts.seed + 5000, col, row, 4, 10);

      // Generate temperature (latitude-based + noise)
      const latNorm = row / opts.height; // 0 = north, 1 = south
      const latTemp = 1 - Math.abs(latNorm - 0.5) * 2; // 0 at poles, 1 at equator
      const tempNoise = fractalNoise2D(opts.seed + 10000, col, row, 3, 15);
      const temperature = latTemp * 0.7 + tempNoise * 0.3;

      // Determine continent (simple: higher elevation = land)
      const continent = elevation > opts.waterRatio ? 1 : 0;

      // Determine terrain and feature
      const { terrain, feature } = pickTerrain(
        elevation,
        moisture,
        temperature,
        opts.waterRatio,
        terrainRegistry,
        featureRegistry,
      );

      // Generate rivers on some tile edges (simplified)
      const river = generateRiverEdges(opts.seed, col, row, elevation, opts.waterRatio);

      tiles.set(key, {
        coord,
        terrain,
        feature,
        resource: null, // resources assigned in the spawning pass below
        improvement: null,
        building: null,
        river,
        elevation,
        continent,
      });
    }
  }

  // Resource spawning pass: ~15% chance per valid terrain, using seeded RNG
  if (resources.length > 0) {
    let rng = createRng(opts.seed + 30000);
    for (const [key, tile] of tiles) {
      // Roll for resource spawn chance
      const { value: spawnRoll, rng: rng1 } = nextRandom(rng);
      rng = rng1;

      if (spawnRoll < 0.15) {
        // Find resources valid for this terrain
        const validResources = resources.filter(r => r.validTerrains.includes(tile.terrain));
        if (validResources.length > 0) {
          const { value: pickRoll, rng: rng2 } = nextRandom(rng);
          rng = rng2;
          const picked = validResources[Math.floor(pickRoll * validResources.length)];
          tiles.set(key, { ...tile, resource: picked.id });
        }
      }
    }
  }

  // HH3 (map-terrain F-11): Fresh-water flag pass.
  // A tile has fresh water when it is:
  //   (a) a lake tile                 — freshwater body by definition
  //   (b) a navigable_river tile      — traversable river = fresh water
  //   (c) a tile with river edges     — border of a river
  //   (d) adjacent to a tile that satisfies (a), (b), or (c)
  // Ocean and coast tiles are NOT considered fresh water even if river-adjacent.
  // The flag is optional; tiles that do not qualify simply omit it.
  computeFreshWaterFlags(tiles);

  return {
    width: opts.width,
    height: opts.height,
    tiles,
    wrapX: opts.wrapX,
  };
}

/**
 * Terrain types that are themselves fresh-water sources.
 * A tile with one of these terrains directly has fresh water.
 * Ocean and coast are salt water and do NOT count.
 */
const FRESH_WATER_TERRAINS: ReadonlySet<string> = new Set<string>(['lake', 'navigable_river']);

/**
 * Terrain types that are NOT fresh water and cannot inherit fresh water from
 * river-adjacency (salt water). These may still be river-adjacent in the data
 * model but fresh water does not apply to them for game purposes.
 */
const SALT_WATER_TERRAINS: ReadonlySet<string> = new Set<string>(['ocean', 'coast', 'deep_ocean', 'reef']);

/**
 * HH3 (map-terrain F-11): Mutate the tiles map in-place to set `hasFreshWater`
 * on tiles that qualify. Called once after tile generation; tiles are not yet
 * frozen at this point (they're plain objects in a mutable Map).
 *
 * A tile is a "primary" fresh-water source when:
 *  - Its terrain is 'lake' or 'navigable_river', OR
 *  - It has at least one river edge (river.length > 0)
 *
 * A tile inherits fresh water when it is adjacent to a primary source AND its
 * own terrain is not salt water (ocean / coast / deep_ocean / reef).
 *
 * The flag is never set on salt-water tiles (the map key simply won't have it).
 */
function computeFreshWaterFlags(tiles: Map<HexKey, HexTile>): void {
  // First pass: identify all primary fresh-water tile keys
  const primaryFreshWaterKeys = new Set<HexKey>();
  for (const [key, tile] of tiles) {
    if (FRESH_WATER_TERRAINS.has(tile.terrain) || tile.river.length > 0) {
      primaryFreshWaterKeys.add(key);
    }
  }

  // Second pass: set hasFreshWater on primaries and their non-salt-water neighbors
  const toFlag = new Set<HexKey>();

  for (const primaryKey of primaryFreshWaterKeys) {
    const primaryTile = tiles.get(primaryKey);
    if (!primaryTile) continue;

    // The primary source tile itself gets the flag (unless it's salt water)
    if (!SALT_WATER_TERRAINS.has(primaryTile.terrain)) {
      toFlag.add(primaryKey);
    }

    // Neighbors of the primary source inherit fresh water
    for (const neighborCoord of neighbors(primaryTile.coord)) {
      const neighborKey = coordToKey(neighborCoord);
      const neighborTile = tiles.get(neighborKey);
      if (!neighborTile) continue;
      if (SALT_WATER_TERRAINS.has(neighborTile.terrain)) continue;
      toFlag.add(neighborKey);
    }
  }

  // Apply flags — replace the tile objects with updated copies (immutable pattern)
  for (const key of toFlag) {
    const tile = tiles.get(key);
    if (tile && tile.hasFreshWater !== true) {
      tiles.set(key, { ...tile, hasFreshWater: true });
    }
  }
}

function pickTerrain(
  elevation: number,
  moisture: number,
  temperature: number,
  waterRatio: number,
  terrainReg: Registry<TerrainDef>,
  featureReg: Registry<TerrainFeatureDef>,
): { terrain: TerrainId; feature: FeatureId | null } {
  // Water
  if (elevation < waterRatio - 0.1) {
    return { terrain: 'ocean', feature: elevation > waterRatio - 0.15 ? 'reef' : null };
  }
  if (elevation < waterRatio) {
    return { terrain: 'coast', feature: null };
  }

  // Mountains (very high elevation)
  if (elevation > 0.85) {
    return { terrain: 'plains', feature: 'mountains' };
  }

  // Hills (high elevation)
  const isHills = elevation > 0.7;

  // Snow (very cold)
  if (temperature < 0.15) {
    return { terrain: 'snow', feature: isHills ? 'hills' : null };
  }

  // Tundra (cold)
  if (temperature < 0.3) {
    return { terrain: 'tundra', feature: isHills ? 'hills' : (moisture > 0.6 ? 'forest' : null) };
  }

  // Desert (hot + dry)
  if (temperature > 0.7 && moisture < 0.3) {
    if (moisture < 0.1 && elevation < waterRatio + 0.05) {
      return { terrain: 'desert', feature: 'oasis' };
    }
    if (elevation > 0.5 && elevation < waterRatio + 0.08) {
      return { terrain: 'desert', feature: 'floodplains' };
    }
    return { terrain: 'desert', feature: isHills ? 'hills' : null };
  }

  // Tropical (very hot + very wet) — uses tropical biome terrain
  if (temperature > 0.7 && moisture > 0.6) {
    if (moisture > 0.8) {
      return { terrain: 'rainforest', feature: isHills ? 'hills' : null };
    }
    return { terrain: 'tropical', feature: isHills ? 'hills' : (moisture > 0.7 ? 'jungle' : null) };
  }

  // Grassland vs plains based on moisture
  const baseTerrain = moisture > 0.5 ? 'grassland' : 'plains';

  // Feature selection
  let feature: string | null = null;
  if (isHills) {
    feature = 'hills';
  } else if (temperature > 0.65 && moisture > 0.65) {
    feature = 'jungle';
  } else if (moisture > 0.55 && temperature > 0.3) {
    feature = 'forest';
  } else if (moisture > 0.7 && temperature > 0.4) {
    feature = 'marsh';
  }

  return { terrain: baseTerrain, feature };
}

function generateRiverEdges(
  seed: number,
  col: number,
  row: number,
  elevation: number,
  waterRatio: number,
): ReadonlyArray<number> {
  // Only generate rivers on land near medium elevation
  if (elevation < waterRatio || elevation > 0.8) return [];

  const rivers: number[] = [];
  // Use noise to determine river edges — rivers flow from high to low elevation
  for (let edge = 0; edge < 6; edge++) {
    const riverNoise = fractalNoise2D(seed + 20000 + edge * 1000, col, row, 2, 8);
    // Rivers are rare — only place them when noise is very high
    if (riverNoise > 0.82 && elevation > waterRatio + 0.1) {
      rivers.push(edge);
    }
  }
  return rivers;
}

/** Create and populate terrain registries from data arrays */
export function createTerrainRegistries(
  terrains: ReadonlyArray<TerrainDef>,
  features: ReadonlyArray<TerrainFeatureDef>,
): {
  terrainRegistry: Registry<TerrainDef>;
  featureRegistry: Registry<TerrainFeatureDef>;
} {
  const terrainRegistry = new Registry<TerrainDef>();
  for (const t of terrains) {
    terrainRegistry.register(t);
  }

  const featureRegistry = new Registry<TerrainFeatureDef>();
  for (const f of features) {
    featureRegistry.register(f);
  }

  return { terrainRegistry, featureRegistry };
}
