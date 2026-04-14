import type { GameState } from '../../types/GameState';
import type { HexCoord } from '../../types/HexCoord';
import { coordToKey, neighbors } from '../../hex/HexMath';

// Note: this data file deliberately does NOT import from `systems/`. Every
// predicate in this file is a pure `(tile, state) => boolean` function that
// reads only from `state.map`, `state.cities`, `state.districts`, and
// `state.config` — all of which are plain data.

/**
 * A placement rule for a world wonder.
 *
 * Civ VII §19.2 specifies that many wonders require specific terrain, feature,
 * resource, or adjacency conditions. Because `BuildingDef` does not currently
 * carry a structured placement-constraint field, the constraints for existing
 * wonders live in this separate lookup table keyed by wonder id.
 *
 * The validator is a pure function of the candidate tile plus the whole state;
 * it performs no mutation and performs no side effects.
 */
export interface WonderPlacementRule {
  readonly wonderId: string;
  /** Predicate: given a candidate tile + full state, returns true if valid. */
  readonly canPlace: (tile: HexCoord, state: GameState) => boolean;
  /** Human-readable description for UI tooltips (future). */
  readonly description: string;
}

// ── Helper predicates ────────────────────────────────────────────────────────

function tileAt(state: GameState, coord: HexCoord) {
  return state.map.tiles.get(coordToKey(coord));
}

function isDesertOrFloodplains(state: GameState, coord: HexCoord): boolean {
  const tile = tileAt(state, coord);
  if (!tile) return false;
  return tile.terrain === 'desert' || tile.feature === 'floodplains';
}

function hasFeature(state: GameState, coord: HexCoord, feature: string): boolean {
  const tile = tileAt(state, coord);
  if (!tile) return false;
  return tile.feature === feature;
}

function hasAdjacentResource(state: GameState, coord: HexCoord, resourceId: string): boolean {
  for (const n of neighbors(coord)) {
    const tile = tileAt(state, n);
    if (tile && tile.resource === resourceId) return true;
  }
  return false;
}

function isAdjacentToRiver(state: GameState, coord: HexCoord): boolean {
  // A tile counts as "adjacent to a river" if either the tile itself has a
  // river edge or any of its 6 neighbours do.
  const self = tileAt(state, coord);
  if (self && self.river.length > 0) return true;
  for (const n of neighbors(coord)) {
    const tile = tileAt(state, n);
    if (tile && tile.river.length > 0) return true;
  }
  return false;
}

function isAdjacentToCoast(state: GameState, coord: HexCoord): boolean {
  // "Coast" excludes deep ocean — only the shallow 'coast' terrain counts.
  const self = tileAt(state, coord);
  if (!self || self.terrain === 'coast' || self.terrain === 'ocean') {
    // Wonder must sit on land adjacent to coast, not on the water itself.
    return false;
  }
  for (const n of neighbors(coord)) {
    const tile = tileAt(state, n);
    if (tile && tile.terrain === 'coast') return true;
  }
  return false;
}

function isAdjacentToMountain(state: GameState, coord: HexCoord): boolean {
  for (const n of neighbors(coord)) {
    if (hasFeature(state, n, 'mountains')) return true;
  }
  return false;
}

function isWater(state: GameState, coord: HexCoord): boolean {
  const tile = tileAt(state, coord);
  if (!tile) return false;
  return tile.terrain === 'coast' || tile.terrain === 'ocean';
}

/**
 * True if the tile is on land AND at least one of its neighbours is coast/
 * ocean (or has a `reef` feature). Used for "coastal urban" wonders like the
 * Sydney Opera House.
 */
function isCoastalLand(state: GameState, coord: HexCoord): boolean {
  const self = tileAt(state, coord);
  if (!self || isWater(state, coord)) return false;
  for (const n of neighbors(coord)) {
    if (isWater(state, n)) return true;
    if (hasFeature(state, n, 'reef')) return true;
  }
  return false;
}

/**
 * True if any district in `state.districts` has `type === 'holy_site'` and
 * sits on a neighbour of `coord`. If there are NO holy-site districts in the
 * entire state, the predicate falls back to "true" — the rule degrades
 * gracefully so that early-game placement is not blocked by the mere absence
 * of a detectable holy site.
 */
function isAdjacentToHolySite(state: GameState, coord: HexCoord): boolean {
  let anyHolySiteExists = false;
  const neighbourKeys = new Set(neighbors(coord).map(coordToKey));
  for (const slot of state.districts.values()) {
    if (slot.type !== 'holy_site') continue;
    anyHolySiteExists = true;
    if (neighbourKeys.has(coordToKey(slot.position))) return true;
  }
  // Fallback: if holy-site districts are entirely absent from the game state,
  // treat this as unconstrained so the wonder is buildable.
  return !anyHolySiteExists;
}

/**
 * True if the candidate tile sits within the territory of a capital city
 * owned by any player. Used to gate "capital-only" wonders like the
 * Terracotta Army.
 */
function isInCapitalTerritory(state: GameState, coord: HexCoord): boolean {
  const key = coordToKey(coord);
  for (const city of state.cities.values()) {
    if (!city.isCapital) continue;
    if (city.territory.includes(key)) return true;
  }
  return false;
}

/**
 * True if the candidate tile is owned by some city AND at least one of its
 * neighbours is NOT owned by the same city — i.e. the tile sits on the edge
 * of that city's territory. If no city owns the tile, returns false.
 */
function isOnTerritoryBorder(state: GameState, coord: HexCoord): boolean {
  const key = coordToKey(coord);
  for (const city of state.cities.values()) {
    if (!city.territory.includes(key)) continue;
    const territorySet = new Set(city.territory);
    for (const n of neighbors(coord)) {
      if (!territorySet.has(coordToKey(n))) return true;
    }
    return false; // owned tile, but surrounded by own territory — interior
  }
  return false;
}

/**
 * Heuristic "between two oceans": the candidate tile is land, and has water
 * neighbours on at least two **non-adjacent** sides (i.e. the two water
 * neighbours are not neighbours of each other, which would indicate a single
 * contiguous coastline rather than two separate bodies of water). This is a
 * crude but pure check — it does not run a connected-components analysis on
 * the whole map; it is meant to approximate Panama Canal placement.
 */
function isBetweenTwoWaters(state: GameState, coord: HexCoord): boolean {
  if (isWater(state, coord)) return false;
  const waterNeighbours: HexCoord[] = [];
  for (const n of neighbors(coord)) {
    if (isWater(state, n)) waterNeighbours.push(n);
  }
  if (waterNeighbours.length < 2) return false;
  // Find a pair of water neighbours that are NOT themselves adjacent.
  for (let i = 0; i < waterNeighbours.length; i++) {
    for (let j = i + 1; j < waterNeighbours.length; j++) {
      const aNeighbourKeys = new Set(neighbors(waterNeighbours[i]).map(coordToKey));
      if (!aNeighbourKeys.has(coordToKey(waterNeighbours[j]))) {
        return true;
      }
    }
  }
  return false;
}

// ── Rules table ──────────────────────────────────────────────────────────────

const PYRAMIDS_RULE: WonderPlacementRule = {
  wonderId: 'pyramids',
  canPlace: (tile, state) => isDesertOrFloodplains(state, tile),
  description: 'Must be placed on flat Desert or Floodplains terrain.',
};

const HANGING_GARDENS_RULE: WonderPlacementRule = {
  wonderId: 'hanging_gardens',
  canPlace: (tile, state) => isAdjacentToRiver(state, tile),
  description: 'Must be placed adjacent to a river.',
};

const COLOSSUS_RULE: WonderPlacementRule = {
  wonderId: 'colossus',
  canPlace: (tile, state) => isAdjacentToCoast(state, tile),
  description: 'Must be placed on a land tile adjacent to Coast (not Ocean).',
};

const STONEHENGE_RULE: WonderPlacementRule = {
  wonderId: 'stonehenge',
  canPlace: (tile, state) => hasAdjacentResource(state, tile, 'stone'),
  description: 'Must be placed next to a Stone resource.',
};

const ORACLE_RULE: WonderPlacementRule = {
  wonderId: 'oracle',
  canPlace: (tile, state) => hasFeature(state, tile, 'hills'),
  description: 'Must be placed on Hills.',
};

const MACHU_PICCHU_RULE: WonderPlacementRule = {
  wonderId: 'machu_picchu',
  canPlace: (tile, state) => {
    const t = tileAt(state, tile);
    if (!t) return false;
    return t.terrain === 'plains' && isAdjacentToMountain(state, tile);
  },
  description: 'Must be placed on Plains adjacent to a Mountain.',
};

const VENETIAN_ARSENAL_RULE: WonderPlacementRule = {
  wonderId: 'venetian_arsenal',
  canPlace: (tile, state) => isAdjacentToCoast(state, tile),
  description: 'Must be placed on a coastal land tile.',
};

const NOTRE_DAME_RULE: WonderPlacementRule = {
  wonderId: 'notre_dame',
  canPlace: (tile, state) => isAdjacentToRiver(state, tile),
  description: 'Must be placed adjacent to a river.',
};

const EIFFEL_TOWER_RULE: WonderPlacementRule = {
  wonderId: 'eiffel_tower',
  canPlace: (tile, state) => {
    const t = tileAt(state, tile);
    if (!t) return false;
    return t.terrain !== 'coast' && t.terrain !== 'ocean' && t.feature !== 'mountains';
  },
  description: 'Must be placed on flat land (not water, not mountains).',
};

const STATUE_OF_LIBERTY_RULE: WonderPlacementRule = {
  wonderId: 'statue_of_liberty',
  canPlace: (tile, state) => isAdjacentToCoast(state, tile),
  description: 'Must be placed on a coastal land tile.',
};

// ── M13 additions ────────────────────────────────────────────────────────────

const ANGKOR_WAT_RULE: WonderPlacementRule = {
  wonderId: 'angkor_wat',
  canPlace: (tile, state) => isAdjacentToRiver(state, tile),
  description: 'Must be placed adjacent to a River.',
};

const CRISTO_REDENTOR_RULE: WonderPlacementRule = {
  wonderId: 'cristo_redentor',
  canPlace: (tile, state) => isAdjacentToMountain(state, tile),
  description: 'Must be placed adjacent to a Mountain.',
};

const SYDNEY_OPERA_HOUSE_RULE: WonderPlacementRule = {
  wonderId: 'sydney_opera_house',
  canPlace: (tile, state) => isCoastalLand(state, tile),
  description: 'Must be placed on a Coastal land tile (adjacent to Coast, Ocean or Reef).',
};

const HAGIA_SOPHIA_RULE: WonderPlacementRule = {
  wonderId: 'hagia_sophia',
  // If the game state contains any Holy Site district, require adjacency.
  // Otherwise (no holy sites exist yet), the rule is unconstrained — see
  // `isAdjacentToHolySite` for the graceful-degradation fallback.
  canPlace: (tile, state) => isAdjacentToHolySite(state, tile),
  description: 'Must be placed adjacent to a Holy Site district (if any exist).',
};

const TERRACOTTA_ARMY_RULE: WonderPlacementRule = {
  wonderId: 'terracotta_army',
  canPlace: (tile, state) => isInCapitalTerritory(state, tile),
  description: 'Must be placed within the capital city\u2019s territory.',
};

const GREAT_WALL_RULE: WonderPlacementRule = {
  wonderId: 'great_wall',
  canPlace: (tile, state) => isOnTerritoryBorder(state, tile),
  description: 'Must be placed on a tile at the edge of your own territory.',
};

const BRANDENBURG_GATE_RULE: WonderPlacementRule = {
  wonderId: 'brandenburg_gate',
  // No geographic constraint in source text — pure documentation rule so the
  // UI can surface a non-empty description even though the predicate is a no-op.
  canPlace: () => true,
  description: 'May be placed on any land tile within a city.',
};

const PANAMA_CANAL_RULE: WonderPlacementRule = {
  wonderId: 'panama_canal',
  canPlace: (tile, state) => isBetweenTwoWaters(state, tile),
  description: 'Must be placed on a land tile between two separate bodies of water.',
};

export const WONDER_PLACEMENT_RULES: ReadonlyMap<string, WonderPlacementRule> = new Map<string, WonderPlacementRule>([
  [PYRAMIDS_RULE.wonderId, PYRAMIDS_RULE],
  [HANGING_GARDENS_RULE.wonderId, HANGING_GARDENS_RULE],
  [COLOSSUS_RULE.wonderId, COLOSSUS_RULE],
  [STONEHENGE_RULE.wonderId, STONEHENGE_RULE],
  [ORACLE_RULE.wonderId, ORACLE_RULE],
  [MACHU_PICCHU_RULE.wonderId, MACHU_PICCHU_RULE],
  [VENETIAN_ARSENAL_RULE.wonderId, VENETIAN_ARSENAL_RULE],
  [NOTRE_DAME_RULE.wonderId, NOTRE_DAME_RULE],
  [EIFFEL_TOWER_RULE.wonderId, EIFFEL_TOWER_RULE],
  [STATUE_OF_LIBERTY_RULE.wonderId, STATUE_OF_LIBERTY_RULE],
  // M13 additions
  [ANGKOR_WAT_RULE.wonderId, ANGKOR_WAT_RULE],
  [CRISTO_REDENTOR_RULE.wonderId, CRISTO_REDENTOR_RULE],
  [SYDNEY_OPERA_HOUSE_RULE.wonderId, SYDNEY_OPERA_HOUSE_RULE],
  [HAGIA_SOPHIA_RULE.wonderId, HAGIA_SOPHIA_RULE],
  [TERRACOTTA_ARMY_RULE.wonderId, TERRACOTTA_ARMY_RULE],
  [GREAT_WALL_RULE.wonderId, GREAT_WALL_RULE],
  [BRANDENBURG_GATE_RULE.wonderId, BRANDENBURG_GATE_RULE],
  [PANAMA_CANAL_RULE.wonderId, PANAMA_CANAL_RULE],
]);
