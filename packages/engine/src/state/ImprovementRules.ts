import type { HexTile, GameState } from '../types/GameState';
import type { ImprovementId } from '../types/Ids';

/**
 * Derive the unique improvement type that belongs on a tile based on its
 * terrain + resource combination.
 *
 * Civ VII design (F-03, F-04): the PLAYER picks the tile; the GAME picks the
 * improvement type. This function implements that derivation logic so that
 * `PLACE_IMPROVEMENT` in `improvementSystem.ts` can apply the correct type
 * without the player having to specify it.
 *
 * Priority order:
 *   1. Resource-driven (resource determines the improvement family)
 *   2. Feature-driven (forest / rainforest without a resource)
 *   3. Terrain-driven fallback (grassland/plains → farm, hills → mine)
 *
 * Returns `null` when the tile is not improvable (water, desert without
 * resource, forest with no woodcutter in data, etc.).
 *
 * Deferred improvements (not yet in engine data):
 *   - Fishing Boats (aquatic resources)
 *   - Oil Rig (oil resource, Modern-age only)
 *   - Woodcutter / Lumber Mill (forest/rainforest without resource)
 *
 * This function is a pure state utility — no side effects, no mutations.
 */
export function deriveImprovementType(
  tile: HexTile,
  _state: GameState,
): ImprovementId | null {
  // ── 1. Resource-driven (highest priority) ──
  if (tile.resource) {
    // Mineral resources → Mine
    if (['iron', 'copper', 'gold_ore', 'silver', 'gems'].includes(tile.resource)) {
      return 'mine';
    }
    // Stone/marble → Quarry
    if (['marble', 'stone'].includes(tile.resource)) {
      return 'quarry';
    }
    // Livestock → Pasture
    if (['cattle', 'horses', 'sheep'].includes(tile.resource)) {
      return 'pasture';
    }
    // Agricultural luxuries → Plantation
    if (['cotton', 'sugar', 'spices', 'coffee', 'tea', 'tobacco'].includes(tile.resource)) {
      return 'plantation';
    }
    // Hunting resources → Camp
    if (['deer', 'furs', 'ivory', 'truffles'].includes(tile.resource)) {
      return 'camp';
    }
    // Aquatic resources (fishing_boats improvement not yet in data — defer)
    // Oil (oil_rig, Modern only — defer)
    // Unknown resource with no matched category → fall through to terrain-driven
  }

  // ── 2. Feature-driven ──
  // Forest / Rainforest without a matched resource: woodcutter not yet in data.
  // Return null so callers know the tile is currently un-improvable by this system.
  if (tile.feature === 'forest' || tile.feature === 'rainforest') {
    return null;
  }

  // ── 3. Feature-driven fallback (hills/mountains) ──
  if (tile.feature === 'hills') {
    return 'mine';
  }
  if (tile.feature === 'mountains') {
    // Mountains are rarely worked; treat as non-improvable for now.
    return null;
  }

  // ── 4. Terrain-driven fallback ──
  switch (tile.terrain) {
    case 'grassland':
    case 'plains':
      return 'farm';
    default:
      // Desert, tundra, snow, ocean, coast without a resource → not improvable.
      return null;
  }
}
