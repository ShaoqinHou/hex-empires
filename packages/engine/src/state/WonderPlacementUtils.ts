import type { GameState } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import { WONDER_PLACEMENT_RULES } from '../data/wonders/placement-rules';
import { evaluateWonderRule } from './WonderPlacement';

/**
 * Result of validating a wonder placement candidate.
 * `valid: true` means placement is allowed; `valid: false` carries a reason
 * (intended for UI feedback / action-rejection logs).
 */
export interface WonderPlacementValidation {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Pure validation helper for world-wonder placement (Civ VII §19.2).
 *
 * Wonders that have no entry in `WONDER_PLACEMENT_RULES` are considered
 * unconstrained and always return `{ valid: true }`. This is deliberate:
 * the rules table is the single source of truth, and new wonders can be
 * added without tripping this validator until their rule exists.
 *
 * NOTE: This helper does not check whether the tile already has a building,
 * whether the tile is inside the city's territory, etc. — those concerns
 * belong to `urbanBuildingSystem` / `buildingPlacementSystem`. This helper
 * only answers "does this tile satisfy the wonder's geographic constraint?".
 */
export function isWonderPlacementValid(
  wonderId: string,
  tile: HexCoord,
  state: GameState,
): WonderPlacementValidation {
  const rule = WONDER_PLACEMENT_RULES.get(wonderId);
  if (!rule) {
    // Unknown / unconstrained wonder — no geographic rule to enforce.
    return { valid: true };
  }

  if (evaluateWonderRule(rule, tile, state)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Invalid placement for ${wonderId}: ${rule.description}`,
  };
}
