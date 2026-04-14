import type { GameState, HexTile, UnitState, CityState } from '../types/GameState';
import type { DistrictSlot } from '../types/District';
import type { HexCoord } from '../types/HexCoord';
import type { ImprovementId, PlayerId } from '../types/Ids';
import { coordToKey } from '../hex/HexMath';

/**
 * Unified snapshot of "what's on this tile" — the single source of truth for
 * tile-content queries across the web layer (hover tooltips, click handlers,
 * combat previews, stack pickers).
 *
 * Replaces scattered ad-hoc lookups that previously appeared in 5+ files.
 */
export interface TileContents {
  /** The hex coord this snapshot is for. */
  readonly hex: HexCoord;
  /** Base tile data (terrain, feature, resource, improvement, river, building). Null if hex is off-map. */
  readonly tile: HexTile | null;
  /**
   * Units owned by the viewing player on this tile.
   * Sorted: military (non-civilian, non-religious) first, then civilian/religious.
   * Within each group, order is stable insertion order.
   */
  readonly ownUnits: ReadonlyArray<UnitState>;
  /**
   * Enemy units on this tile that are visible to the viewer.
   * Respects fog of war — if the hex is not in the viewer's visibility, this is empty.
   * Sorted: military first, then civilian.
   */
  readonly enemyUnits: ReadonlyArray<UnitState>;
  /**
   * City occupying this tile (any owner). Null if no city.
   * Callers must check `city.owner === viewerPlayerId` to determine if it's theirs.
   */
  readonly city: CityState | null;
  /** District placed on this tile (if any). */
  readonly district: DistrictSlot | null;
  /** Improvement placed on this tile (from tile.improvement). */
  readonly improvement: ImprovementId | null;
}

/**
 * Compute TileContents for a single hex. Pure function — safe to call from anywhere.
 * The `viewerPlayerId` determines own vs enemy unit classification and fog of war filtering.
 */
export function getTileContents(
  state: GameState,
  hex: HexCoord,
  viewerPlayerId: PlayerId,
): TileContents {
  const hexKey = coordToKey(hex);
  const tile = state.map.tiles.get(hexKey) ?? null;

  // Fog of war: check if viewer can see this hex
  const viewer = state.players.get(viewerPlayerId);
  const visibility = viewer?.visibility;
  const isVisible = visibility ? visibility.has(hexKey) : true;

  // Collect units on this tile, split by owner
  const ownUnits: UnitState[] = [];
  const enemyUnits: UnitState[] = [];
  for (const unit of state.units.values()) {
    if (coordToKey(unit.position) !== hexKey) continue;
    if (unit.owner === viewerPlayerId) {
      ownUnits.push(unit);
    } else if (isVisible) {
      // Only report enemy units on visible tiles (fog of war)
      enemyUnits.push(unit);
    }
  }

  // Sort: military first, then civilian. Stable within groups.
  const sortUnits = (units: UnitState[]) => {
    const isCivilian = (u: UnitState) => {
      const def = state.config.units.get(u.typeId);
      return def?.category === 'civilian' || def?.category === 'religious';
    };
    // Partition preserving order: military first, then civilians.
    const military = units.filter(u => !isCivilian(u));
    const civilian = units.filter(u => isCivilian(u));
    return [...military, ...civilian];
  };

  // Find city on this tile (at most one — game rule)
  let city: CityState | null = null;
  for (const c of state.cities.values()) {
    if (coordToKey(c.position) === hexKey) {
      city = c;
      break;
    }
  }

  // Find district on this tile (at most one)
  let district: DistrictSlot | null = null;
  for (const d of state.districts.values()) {
    if (coordToKey(d.position) === hexKey) {
      district = d;
      break;
    }
  }

  const improvement = tile?.improvement ?? null;

  return {
    hex,
    tile,
    ownUnits: sortUnits(ownUnits),
    enemyUnits: sortUnits(enemyUnits),
    city,
    district,
    improvement,
  };
}

/**
 * Ordered list of selectable entities on this tile for the viewer.
 * Used by click cycling: first click selects index 0, subsequent clicks advance.
 *
 * Order: own military units → own civilian units → own city.
 * Enemy entities are never in the cycle (they're targets, not selections).
 */
export function getSelectionCycle(
  contents: TileContents,
  viewerPlayerId: PlayerId,
): ReadonlyArray<{ readonly type: 'unit' | 'city'; readonly id: string }> {
  const cycle: Array<{ type: 'unit' | 'city'; id: string }> = [];
  for (const u of contents.ownUnits) {
    cycle.push({ type: 'unit', id: u.id });
  }
  if (contents.city && contents.city.owner === viewerPlayerId) {
    cycle.push({ type: 'city', id: contents.city.id });
  }
  return cycle;
}

/**
 * True if the tile has multiple selectable entities (unit+unit, unit+city, etc.)
 * and thus benefits from a stack picker UI.
 */
export function hasStackedEntities(contents: TileContents, viewerPlayerId: PlayerId): boolean {
  return getSelectionCycle(contents, viewerPlayerId).length > 1;
}
