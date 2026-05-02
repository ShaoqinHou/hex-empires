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
 * Rulebook: .codex/workflow/design/civ7-rulebook.md §6.10.
 * Plan:     .codex/workflow/design/commander-system.md.
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
      readonly target: AuraTarget | ReadonlyArray<AuraTarget>;
      readonly value: number;
      readonly radius: number;
      readonly condition?: 'attacking' | 'defending';
      readonly requiresDistrict?: boolean;
      readonly requiresFortified?: boolean;
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
      readonly target: AuraTarget | ReadonlyArray<AuraTarget>;
      readonly amount: number;
      readonly radius: number;
      readonly territoryScope?: 'enemy_territory' | 'neutral_territory' | 'enemy_or_neutral_territory';
    }
  /** Gold granted to the commander owner per packed unit. */
  | {
      readonly type: 'AURA_GOLD_PER_PACKED_UNIT';
      readonly value: number;
    }
  /** Production bonus for land units while stationed in a District. */
  | {
      readonly type: 'AURA_LAND_PRODUCTION_BONUS_WHILE_STATIONED';
      readonly value: number;
    }
  /** Reduces Fortify action completion time for friendly units in range. */
  | {
      readonly type: 'AURA_FORTIFY_ACTION_TURN_REDUCTION';
      readonly target: AuraTarget | ReadonlyArray<AuraTarget>;
      readonly value: number;
      readonly radius: number;
    }
  /** Adds HP to fortified districts when the commander meets a city condition. */
  | {
      readonly type: 'AURA_DISTRICT_HP_BONUS';
      readonly value: number;
      readonly requiresCommanderOnCityCenter: true;
    }
  /** Healing applied to matching units after they attack. */
  | {
      readonly type: 'AURA_HEAL_AFTER_ATTACK';
      readonly target: AuraTarget | ReadonlyArray<AuraTarget>;
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
      /** Optional metadata carrying reinforcement pace for consumers that
       * parse Regiments data. */
      readonly reinforcementSpeed?: number;
    }
  /** Fortification bonus to friendly units in range. */
  | {
      readonly type: 'AURA_FORTIFY_BONUS';
      readonly target: AuraTarget;
      readonly value: number;
      readonly radius: number;
    }
  /** Grants a named unit ability to matching friendly units in range. */
  | {
      readonly type: 'AURA_GRANT_ABILITY';
      readonly target: AuraTarget | ReadonlyArray<AuraTarget>;
      readonly abilityId: string;
      readonly radius: number;
    }
  /** Pillage bonus while near the commander (yield and health recovery). */
  | {
      readonly type: 'AURA_PILLAGE_BONUS';
      readonly target: AuraTarget | ReadonlyArray<AuraTarget>;
      readonly radius: number;
      readonly yieldBonusPercent: number;
      readonly hpBonusPercent: number;
    }
  /** Lets units deploy from this commander without losing remaining movement. */
  | {
      readonly type: 'AURA_DEPLOY_WITH_MOVEMENT';
    }
  /** Movement and terrain exceptions for the commander unit while on land. */
  | {
      readonly type: 'AURA_COMMANDER_MOBILITY';
      readonly value: number;
      readonly terrainRestrictionScope: 'packed_land';
    }
  /** Flanking bonus/penalty applied during combat. */
  | {
      readonly type: 'AURA_FLANKING_BONUS';
      readonly target: ReadonlyArray<AuraTarget>;
      readonly value: number;
      readonly radius: number;
      readonly appliesTo: 'friendly_attacking' | 'enemy_attacking';
    }
  /** Amphibious combat and movement behavior while in command radius. */
  | {
      readonly type: 'AURA_AMPHIBIOUS_OPERATIONS';
      readonly target: ReadonlyArray<AuraTarget>;
      readonly radius: number;
      readonly embarkDisembarkMovementCost: number;
      readonly ignoresEmbarkedAttackPenalty: boolean;
    }
  /** Removes terrain movement restrictions for matching units in radius. */
  | {
      readonly type: 'AURA_IGNORE_TERRAIN_MOVEMENT_RESTRICTIONS';
      readonly target: ReadonlyArray<AuraTarget>;
      readonly radius: number;
    }
  /** Zone of control effect from commander command radius. */
  | {
      readonly type: 'AURA_ZONE_OF_CONTROL';
      readonly target: ReadonlyArray<AuraTarget>;
      readonly radius: number;
      readonly appliesTo: 'enemy';
    }
  /** Yield bonus while this commander is stationed in a district. */
  | {
      readonly type: 'AURA_SETTLEMENT_YIELD_BONUS_WHILE_STATIONED';
      readonly value: number;
      readonly yieldScope: 'all';
      readonly requiresDistrict: true;
      readonly stackable?: boolean;
    }
  /** Unit upgrades gain repair and friendly-territory exemption. */
  | {
      readonly type: 'AURA_UPGRADE_SUPPORT';
      readonly target: ReadonlyArray<AuraTarget>;
      readonly radius: number;
      readonly healOnUpgrade: number;
      readonly allowsUpgradeOutsideFriendlyTerritory: true;
    }
  /** Flat combat-strength modifier applied only to this commander. */
  | {
      readonly type: 'AURA_COMMANDER_SELF_CS';
      readonly value: number;
      readonly condition: 'defending';
    }
  /** Commander recovery-time reduction as a percent. */
  | {
      readonly type: 'AURA_COMMANDER_RECOVERY_TIME_REDUCTION_PERCENT';
      readonly value: number;
    }
  /** Bonus combat strength from command actions (Focus Fire / Coordinated Attack). */
  | {
      readonly type: 'AURA_COMMAND_ACTION_COMBAT_BONUS';
      readonly command: 'focus_fire' | 'coordinated_attack';
      readonly value: number;
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
  readonly tier: 1 | 2 | 3 | 4;
  readonly prerequisites: ReadonlyArray<CommanderPromotionId>;
  /**
   * Optional prereq mode:
   * - `all` (default): every listed prerequisite is required.
   * - `any`: at least one listed prerequisite is required.
   */
  readonly prerequisiteMode?: 'all' | 'any';
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
 *   state.units by ASSEMBLE_ARMY/PACK_ARMY. Optional only for old saves that
 *   still use live units marked with packedInCommanderId.
 * - `respawnTurnsRemaining` / `respawnUnitState` model VII commander recovery:
 *   the commander record persists while the map unit is temporarily absent.
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
   * by ASSEMBLE_ARMY/PACK_ARMY. Restored on DEPLOY_ARMY/UNPACK_ARMY.
   * Old saves may omit this and keep packed live units marked with
   * packedInCommanderId instead.
   */
  readonly packedUnitStates?: ReadonlyArray<UnitState>;
  /** Turns remaining before a defeated commander can re-enter the map. */
  readonly respawnTurnsRemaining?: number | null;
  /** Snapshot used to restore the defeated commander unit after recovery. */
  readonly respawnUnitState?: UnitState;
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
