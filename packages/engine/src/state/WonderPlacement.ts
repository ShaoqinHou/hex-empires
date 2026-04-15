/**
 * WonderPlacement — predicate evaluation for wonder placement constraints.
 *
 * This module owns the runtime logic that evaluates whether a candidate tile
 * satisfies a `WonderPlacementConstraint`. Data files (data/wonders/) hold
 * only the constraint descriptors; this module is the only place that imports
 * from `hex/` to resolve them.
 *
 * Public API:
 *   evaluateWonderConstraint(constraint, tile, state)  — evaluate one rule
 *   evaluateWonderRule(rule, tile, state)               — convenience wrapper
 */

import type { GameState } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import type { WonderPlacementConstraint, WonderPlacementRule } from '../types/WonderPlacement';
import { coordToKey, neighbors } from '../hex/HexMath';

// ── Private tile-access helpers ──────────────────────────────────────────────

function tileAt(state: GameState, coord: HexCoord) {
  return state.map.tiles.get(coordToKey(coord));
}

function isWaterTile(state: GameState, coord: HexCoord): boolean {
  const tile = tileAt(state, coord);
  if (!tile) return false;
  return tile.terrain === 'coast' || tile.terrain === 'ocean';
}

function hasFeaturePred(state: GameState, coord: HexCoord, feature: string): boolean {
  const tile = tileAt(state, coord);
  if (!tile) return false;
  return tile.feature === feature;
}

function isDesertOrFloodplains(state: GameState, coord: HexCoord, terrain: string, feature: string): boolean {
  const tile = tileAt(state, coord);
  if (!tile) return false;
  return tile.terrain === terrain || tile.feature === feature;
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
  // Wonder must sit on land adjacent to coast, not on the water itself.
  const self = tileAt(state, coord);
  if (!self || self.terrain === 'coast' || self.terrain === 'ocean') {
    return false;
  }
  for (const n of neighbors(coord)) {
    const tile = tileAt(state, n);
    if (tile && tile.terrain === 'coast') return true;
  }
  return false;
}

function hasAdjacentResource(state: GameState, coord: HexCoord, resourceId: string): boolean {
  for (const n of neighbors(coord)) {
    const tile = tileAt(state, n);
    if (tile && tile.resource === resourceId) return true;
  }
  return false;
}

function isFlatLand(state: GameState, coord: HexCoord): boolean {
  const tile = tileAt(state, coord);
  if (!tile) return false;
  return tile.terrain !== 'coast' && tile.terrain !== 'ocean' && tile.feature !== 'mountains';
}

function isAdjacentToMountain(state: GameState, coord: HexCoord): boolean {
  for (const n of neighbors(coord)) {
    if (hasFeaturePred(state, n, 'mountains')) return true;
  }
  return false;
}

/**
 * True if the tile is on land AND at least one of its neighbours is coast/
 * ocean (or has a `reef` feature). Used for "coastal urban" wonders like the
 * Sydney Opera House.
 */
function isCoastalLand(state: GameState, coord: HexCoord): boolean {
  const self = tileAt(state, coord);
  if (!self || isWaterTile(state, coord)) return false;
  for (const n of neighbors(coord)) {
    if (isWaterTile(state, n)) return true;
    if (hasFeaturePred(state, n, 'reef')) return true;
  }
  return false;
}

/**
 * True if the tile is adjacent to a Holy Site district.
 * If there are NO holy-site districts in the entire state, the predicate falls
 * back to "true" — the rule degrades gracefully so that early-game placement
 * is not blocked by the mere absence of a detectable holy site.
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
 * owned by any player.
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
  if (isWaterTile(state, coord)) return false;
  const waterNeighbours: HexCoord[] = [];
  for (const n of neighbors(coord)) {
    if (isWaterTile(state, n)) waterNeighbours.push(n);
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

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Evaluate a single `WonderPlacementConstraint` against `tile` in `state`.
 *
 * Returns `true` if the tile satisfies the constraint, `false` otherwise.
 * All helpers are pure: same input → same output, no mutation.
 */
export function evaluateWonderConstraint(
  constraint: WonderPlacementConstraint,
  tile: HexCoord,
  state: GameState,
): boolean {
  switch (constraint.type) {
    case 'UNCONSTRAINED':
      return true;

    case 'TERRAIN_OR_FEATURE':
      return isDesertOrFloodplains(state, tile, constraint.terrain, constraint.feature);

    case 'ADJACENT_RIVER':
      return isAdjacentToRiver(state, tile);

    case 'ADJACENT_COAST':
      return isAdjacentToCoast(state, tile);

    case 'ADJACENT_RESOURCE':
      return hasAdjacentResource(state, tile, constraint.resourceId);

    case 'HAS_FEATURE':
      return hasFeaturePred(state, tile, constraint.feature);

    case 'FLAT_LAND':
      return isFlatLand(state, tile);

    case 'ADJACENT_MOUNTAIN':
      return isAdjacentToMountain(state, tile);

    case 'COASTAL_LAND':
      return isCoastalLand(state, tile);

    case 'ADJACENT_HOLY_SITE':
      return isAdjacentToHolySite(state, tile);

    case 'IN_CAPITAL_TERRITORY':
      return isInCapitalTerritory(state, tile);

    case 'TERRITORY_BORDER':
      return isOnTerritoryBorder(state, tile);

    case 'BETWEEN_TWO_WATERS':
      return isBetweenTwoWaters(state, tile);
  }
}

/**
 * Convenience wrapper: evaluate a full `WonderPlacementRule` record.
 * Delegates to `evaluateWonderConstraint` with the rule's constraint.
 */
export function evaluateWonderRule(
  rule: WonderPlacementRule,
  tile: HexCoord,
  state: GameState,
): boolean {
  return evaluateWonderConstraint(rule.constraint, tile, state);
}
