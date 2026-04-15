/**
 * WonderPlacement types — pure data contract.
 *
 * `WonderPlacementConstraint` is a discriminated union describing *what* a
 * wonder requires. The evaluation logic (reading HexMath, GameState) lives in
 * `state/WonderPlacement.ts`.
 *
 * Adding a new constraint type:
 *   1. Add a variant here.
 *   2. Add a matching `case` in `evaluateWonderConstraint()` in
 *      `state/WonderPlacement.ts`.
 */

export type WonderPlacementConstraint =
  /** No geographic restriction — always valid. */
  | { readonly type: 'UNCONSTRAINED' }

  /** Tile terrain must match `terrain` OR tile feature must match `feature`. */
  | { readonly type: 'TERRAIN_OR_FEATURE'; readonly terrain: string; readonly feature: string }

  /** Tile or a neighbour must have at least one river edge. */
  | { readonly type: 'ADJACENT_RIVER' }

  /** Tile must be land and have at least one neighbour with terrain `'coast'`. */
  | { readonly type: 'ADJACENT_COAST' }

  /** At least one neighbour must carry the specified resource id. */
  | { readonly type: 'ADJACENT_RESOURCE'; readonly resourceId: string }

  /** Tile must have the specified terrain feature. */
  | { readonly type: 'HAS_FEATURE'; readonly feature: string }

  /** Tile must be flat land (not water, not mountains feature). */
  | { readonly type: 'FLAT_LAND' }

  /** Tile must be adjacent to a mountain feature. */
  | { readonly type: 'ADJACENT_MOUNTAIN' }

  /**
   * Tile must be land and adjacent to coast, ocean, or reef.
   * More permissive than `ADJACENT_COAST` — accepts ocean + reef neighbours.
   */
  | { readonly type: 'COASTAL_LAND' }

  /**
   * Tile must be adjacent to a Holy Site district.
   * If no Holy Site districts exist in the game, the constraint is relaxed
   * and the tile is treated as valid.
   */
  | { readonly type: 'ADJACENT_HOLY_SITE' }

  /** Tile must be inside any capital city's territory. */
  | { readonly type: 'IN_CAPITAL_TERRITORY' }

  /**
   * Tile must be on the territorial border of a city — i.e. owned by a city
   * but with at least one unclaimed neighbour.
   */
  | { readonly type: 'TERRITORY_BORDER' }

  /**
   * Tile must be land with at least two non-adjacent water neighbours
   * (heuristic approximation of "between two bodies of water").
   */
  | { readonly type: 'BETWEEN_TWO_WATERS' };

/**
 * Pure data record describing a wonder's placement requirement.
 *
 * The `constraint` field is a discriminated union — evaluation happens in
 * `state/WonderPlacement.ts` so that data files stay import-clean.
 */
export interface WonderPlacementRule {
  readonly wonderId: string;
  readonly constraint: WonderPlacementConstraint;
  /** Human-readable description for UI tooltips. */
  readonly description: string;
}
