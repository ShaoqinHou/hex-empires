import type { GameState } from '../../types/GameState';
import type { HexCoord } from '../../types/HexCoord';
import { coordToKey, neighbors } from '../../hex/HexMath';

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
]);
