import type { HexTile, GameState } from '../types/GameState';
import type { ImprovementId } from '../types/Ids';

const DEFAULT_RESOURCE_USES = 5;

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
 *   2. Feature/terrain-driven (vegetation/wet fallback)
 *   3. Terrain-driven fallback (plains/grassland/tropical → farm, hills → mine)
 *
 * Returns `null` when the tile is not improvable (water, desert without a
 * mapped family, etc.).
 */
export function deriveImprovementType(
  tile: HexTile,
  _state: GameState,
): ImprovementId | null {
  // ── 1. Resource-driven (highest priority) ──
  if (tile.resource) {
    if (tile.resource === 'wheat') {
      return 'farm';
    }

    if (['cattle', 'horses'].includes(tile.resource)) {
      return 'pasture';
    }

    if (tile.resource === 'stone') {
      return 'quarry';
    }

    if (['iron', 'niter', 'coal', 'gems'].includes(tile.resource)) {
      return 'mine';
    }

    if (['silk', 'spices', 'wine'].includes(tile.resource)) {
      return 'plantation';
    }

    if (tile.resource === 'ivory') {
      return 'camp';
    }

    if (tile.resource === 'whales') {
      return 'fishing_boats';
    }

    if (tile.resource === 'oil') {
      return 'oil_rig';
    }
  }

  // ── 2. Feature/terrain-driven fallback ──
  if (
    tile.feature === 'forest' ||
    tile.feature === 'jungle' ||
    tile.terrain === 'rainforest'
  ) {
    return 'woodcutter';
  }

  if (tile.feature === 'marsh' || tile.terrain === 'mangrove') {
    return 'clay_pit';
  }

  // ── 3. Terrain feature-driven fallback ──
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
    case 'tropical':
      return 'farm';
    default:
      // Desert, tundra, snow, ocean, coast without a mapped family → not improvable.
      return null;
  }
}

/**
 * Apply an improvement and perform the one-time bonus-resource depletion that
 * Civ VII ties to improving a resource tile.
 */
export function applyImprovementToTile(
  tile: HexTile,
  improvementId: ImprovementId,
): HexTile {
  let updatedTile: HexTile = { ...tile, improvement: improvementId };

  if (tile.resource !== null) {
    const usesLeft = tile.resourceUsesRemaining ?? DEFAULT_RESOURCE_USES;
    const newUses = usesLeft - 1;
    updatedTile = newUses <= 0
      ? { ...updatedTile, resource: null, resourceUsesRemaining: 0 }
      : { ...updatedTile, resourceUsesRemaining: newUses };
  }

  return updatedTile;
}
