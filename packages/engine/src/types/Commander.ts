/**
 * Commander types — parallel to UnitState.
 *
 * These types describe the Civ VII Commander mechanic. A Commander is a
 * special unit that accrues XP and promotions; ordinary units no longer
 * do. Commanders project aura buffs (AuraEffectDef) to nearby friendly
 * units within a radius, and can pack up to 4 attached units on their
 * hex for joint movement.
 *
 * These types live in a parallel namespace during cycles A-D so the
 * existing per-unit promotion system continues to work. Wiring into
 * GameState lands in cycle C; old fields are retired in cycle E.
 *
 * Rulebook: .claude/workflow/design/civ7-rulebook.md §6.10.
 * Plan:     .claude/workflow/design/commander-system.md.
 */

import type { UnitId } from './Ids';
import type { UnitCategory, UnitState } from './GameState';

// ── Branded IDs ──

/**
 * Identifier for a Commander promotion definition.
 *
 * Alias of string today; kept nominal so references to old
 * `PromotionDef.id` (per-unit promotions) cannot silently leak into
 * Commander code.
 */
export type CommanderPromotionId = string;

// ── Trees ──

/**
 * The five Commander promotion trees from rulebook §6.10.
 *
 * - `bastion`     — Defense and fortification bonuses.
 * - `assault`     — Offensive power and damage bonuses.
 * - `logistics`   — Healing, supply, and movement bonuses.
 * - `maneuver`    — Flanking and repositioning.
 * - `leadership`  — Command radius, stacking, and morale.
 *
 * F-03: Commanders may pick from any tree — no single-tree lock (VII allows
 * cross-tree picks). Whether respec/retraining is allowed is an open question;
 * see commander-system.md §9.
 */
export type CommanderTree =
  | 'bastion'
  | 'assault'
  | 'logistics'
  | 'maneuver'
  | 'leadership';

// ── Aura effects ──

/**
 * Target selector for an aura effect.
 *
 * Reuses `UnitCategory` plus the wildcard `'all'` so a Leadership aura
 * can hit every friendly unit in radius regardless of category, while
 * tree-specific auras can target e.g. only cavalry.
 */
export type AuraTarget = UnitCategory | 'all';

/**
 * Aura effects projected by a Commander onto nearby friendly units.
 *
 * Distinct from engine `EffectDef` because auras are spatially scoped
 * (have `radius`) and some variants act on the commander's own
 * capabilities (AURA_EXPAND_RADIUS, AURA_EXPAND_STACK) rather than on
 * other units.
 */
export type AuraEffectDef =
  /** Flat combat-strength bonus to friendly units in range. */
  | {
      readonly type: 'AURA_MODIFY_CS';
      readonly target: AuraTarget;
      readonly value: number;
      readonly radius: number;
    }
  /** Flat ranged-strength bonus to friendly units in range. */
  | {
      readonly type: 'AURA_MODIFY_RS';
      readonly target: AuraTarget;
      readonly value: number;
      readonly radius: number;
    }
  /** HP healed per turn to friendly units in range. */
  | {
      readonly type: 'AURA_HEAL_PER_TURN';
      readonly target: AuraTarget;
      readonly amount: number;
      readonly radius: number;
    }
  /** Extra movement points to friendly units in range. */
  | {
      readonly type: 'AURA_EXTRA_MOVEMENT';
      readonly target: AuraTarget;
      readonly value: number;
      readonly radius: number;
    }
  /**
   * Leadership tree: grows this commander's own aura radius.
   * Modifies the commander, not projected units.
   */
  | {
      readonly type: 'AURA_EXPAND_RADIUS';
      readonly delta: number;
    }
  /**
   * Leadership tree: raises this commander's max attached-units cap.
   * Modifies the commander, not projected units.
   */
  | {
      readonly type: 'AURA_EXPAND_STACK';
      readonly delta: number;
    }
  /** Fortification bonus to friendly units in range. */
  | {
      readonly type: 'AURA_FORTIFY_BONUS';
      readonly target: AuraTarget;
      readonly value: number;
      readonly radius: number;
    };

// ── Promotion definitions ──

/**
 * Definition of a single Commander promotion node.
 *
 * Separate from `PromotionDef` in `data/units/promotions.ts`: Commander
 * promotions have no `category` field (commanders are not category-
 * bound) and carry exactly one `aura`. Prerequisites form a DAG inside
 * their tree; cross-tree prereqs are disallowed by convention.
 */
export interface CommanderPromotionDef {
  readonly id: CommanderPromotionId;
  readonly name: string;
  readonly description: string;
  readonly tree: CommanderTree;
  readonly tier: 1 | 2 | 3;
  readonly prerequisites: ReadonlyArray<CommanderPromotionId>;
  readonly aura: AuraEffectDef;
}

// ── Runtime state ──

/**
 * Runtime Commander state, keyed by the decorated `UnitId`.
 *
 * A unit is "a commander" iff `GameState.commanders.has(unit.id)`.
 * This decorator pattern avoids widening `UnitState` during the
 * transition cycles A-D.
 *
 * - `xp` is monotonic (never decremented, unlike per-unit XP today).
 * - `commanderLevel` is derivable from `xp` but stored for save
 *   stability across curve re-balancing.
 * - `unspentPromotionPicks` is the currency spent on promotions.
 * - `tree` is null until the first pick; commanders may pick from any tree.
 * - `attachedUnits` enforces the pack cap (4 for ASSEMBLE_ARMY, 6 for PACK_ARMY).
 * - `packed` means the pack moves as one unit this turn.
 * - `packedUnitStates` stores full UnitState snapshots for units removed from
 *   state.units by PACK_ARMY. Optional: absent when using ASSEMBLE_ARMY which
 *   keeps units in state.units with packedInCommanderId set instead.
 */
export interface CommanderState {
  readonly unitId: UnitId;
  readonly xp: number;
  readonly commanderLevel: number;
  readonly unspentPromotionPicks: number;
  readonly promotions: ReadonlyArray<CommanderPromotionId>;
  readonly tree: CommanderTree | null;
  readonly attachedUnits: ReadonlyArray<UnitId>;
  readonly packed: boolean;
  /**
   * X4.1: Full unit snapshots for units physically removed from state.units
   * by PACK_ARMY. Restored on UNPACK_ARMY. Absent when army was assembled via
   * ASSEMBLE_ARMY (which leaves units in state.units).
   */
  readonly packedUnitStates?: ReadonlyArray<UnitState>;
}

// ── Aura evaluation output ──

/**
 * A single aura contribution active on a unit.
 *
 * The aura resolver (`state/CommanderAura.ts`, landed in cycle D)
 * returns a `ReadonlyArray<AuraBonus>` per queried unit; consumers
 * (combat, healing, movement) sum the relevant entries themselves.
 * This keeps the resolver pure and target-agnostic.
 */
export interface AuraBonus {
  readonly source: UnitId;
  readonly promotionId: CommanderPromotionId;
  readonly type: AuraEffectDef['type'];
  readonly value: number;
}

// ── Commander-scoped actions (not yet in GameAction; wired cycle C) ──

/**
 * Action payload shapes for Commander-scoped actions. These are not
 * added to `GameAction` in cycle A — they live here as types for
 * reference and tests, and are merged into the discriminated union in
 * cycle C when the system file exists.
 */
export type CommanderAction =
  | {
      readonly type: 'PROMOTE_COMMANDER';
      readonly commanderId: UnitId;
      readonly promotionId: CommanderPromotionId;
    }
  | {
      readonly type: 'ATTACH_UNIT_TO_COMMANDER';
      readonly commanderId: UnitId;
      readonly unitId: UnitId;
    }
  | {
      readonly type: 'DETACH_UNIT_FROM_COMMANDER';
      readonly commanderId: UnitId;
      readonly unitId: UnitId;
    }
  | { readonly type: 'PACK_COMMANDER'; readonly commanderId: UnitId }
  | { readonly type: 'UNPACK_COMMANDER'; readonly commanderId: UnitId };

// ── Constants ──

/**
 * Base command radius (hex rings) before `AURA_EXPAND_RADIUS` picks.
 * Per rulebook §6.10.
 */
export const COMMANDER_BASE_RADIUS = 1 as const;

/**
 * Base max attached units on a Commander's tile before
 * `AURA_EXPAND_STACK` picks. Per rulebook §6.10.
 */
export const COMMANDER_BASE_STACK_CAP = 4 as const;
