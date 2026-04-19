import type { EffectDef } from './GameState';

/**
 * The six leader attribute trees.
 * Primary attributes are assigned per-leader and grant a 1-cost discount
 * on that tree's tier-1 node (future feature — tracked here for completeness).
 */
export type AttributeType =
  | 'economic'
  | 'militaristic'
  | 'diplomatic'
  | 'expansionist'
  | 'cultural'
  | 'scientific';

/**
 * A single node within an attribute tree.
 * Nodes are unlocked by spending attribute points earned across ages.
 * Attribute points (and unlocked nodes) NEVER reset on TRANSITION_AGE —
 * they are the only permanently-persisting in-game upgrade system.
 */
export interface AttributeNodeDef {
  readonly id: string;
  readonly tree: AttributeType;
  readonly tier: 1 | 2 | 3;
  readonly cost: number; // attribute points required to unlock
  readonly prerequisites: ReadonlyArray<string>; // node ids that must be unlocked first
  readonly effect: EffectDef;
  readonly description: string;
}
