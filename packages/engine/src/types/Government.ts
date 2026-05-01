/**
 * Government & Social Policy types — parallel to PlayerState.
 *
 * These types describe the Civ VII Government, Social Policy, and Codex
 * mechanics. In Civ VII each player picks one Government per Age
 * (locked for the Age), slots Social Policies into Government-provided
 * slots, and places Codices (earned via Tech/Civic Masteries) into
 * Codex-capable buildings for per-turn Science.
 *
 * These types live in a parallel namespace during cycles A-D so the
 * existing PlayerState and effectSystem continue to work. Wiring into
 * GameState (side-map keyed by PlayerId) lands in cycle C; potential
 * inlining into PlayerState happens in cycle E if safe.
 *
 * Rulebook: .codex/workflow/design/civ7-rulebook.md §14 (Governments
 * and Social Policies) and §4.5 (Celebrations).
 * Plan:     .codex/workflow/design/government-system.md.
 * Rulebook
 * expansion: .codex/workflow/design/rulebook-government-expansion.md.
 */

import type { PlayerId, BuildingId, CityId } from './Ids';
import type { EffectDef } from './GameState';
import type { Age } from './GameState';
import type { YieldSet } from './Yields';

// ── Branded IDs ──

/**
 * Identifier for a Government definition, e.g. `'classical-republic'`.
 * Alias of string today; kept nominal so stale references to civ or
 * leader ids cannot silently leak into Government code.
 */
export type GovernmentId = string;

/**
 * Identifier for a Policy definition, e.g. `'legion-tradition'`.
 */
export type PolicyId = string;

/**
 * Identifier for a Codex definition, e.g. `'codex.tech.writing'`.
 * Canonical format: `codex.<source>.<subject>` where source is
 * `tech` or `civic` and subject is the mastered id.
 */
export type CodexId = string;

// ── Policy category ──

/**
 * Taxonomic category for Policies. Per VII §14.2 all slots are wildcard —
 * any policy may go into any slot. `PolicyCategory` is retained on
 * `PolicyDef` as a display/sorting hint only; it does NOT gate slot
 * placement.
 */
export type PolicyCategory =
  | 'military'
  | 'economic'
  | 'diplomatic'
  | 'wildcard';

/**
 * Slot count for a GovernmentDef. In VII all slots are equivalent wildcards;
 * `total` is the Government's base slot count.
 *
 * @deprecated The old typed-category struct `{ military, economic, diplomatic,
 * wildcard }` was removed in W2-03. Any code that referenced it should use
 * `total` instead.
 */
export interface PolicySlotCounts {
  readonly total: number;
}

// ── Celebration bonus ──

/**
 * One of the two 10-turn Celebration bonus options attached to a
 * Government (per rulebook §4.5 and §14.4).
 *
 * - `id` is a stable identifier used when the player picks between
 *   Option A and Option B at Celebration time.
 * - `effects` is a list of EffectDefs applied for the 10-turn window.
 */
export interface GovernmentCelebrationBonus {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effects: ReadonlyArray<EffectDef>;
}

// ── Government definition ──

/**
 * Definition of a Government.
 *
 * - `age` gates when the Government is selectable.
 * - `unlockCivic` is the civic id prerequisite (per §14.1 tables).
 * - `policySlots` declares the base slot shape; additional slots from
 *   Celebrations / Attributes / Civics stack on top at runtime.
 * - `celebrationBonuses` is a fixed-length 2-tuple — §4.5 mandates
 *   exactly two options per celebration.
 * - `legacyBonus` is the Government's passive while active. It is
 *   removed on Age transition (unlike civ legacy bonuses which
 *   persist). May be `null` if a Government has no passive.
 */
export interface GovernmentDef {
  readonly id: GovernmentId;
  readonly name: string;
  readonly age: Age;
  readonly unlockCivic: string;
  readonly policySlots: PolicySlotCounts;
  readonly celebrationBonuses: readonly [
    GovernmentCelebrationBonus,
    GovernmentCelebrationBonus,
  ];
  readonly legacyBonus: EffectDef | null;
  readonly description: string;
}

// ── Policy definition ──

/**
 * Definition of a Social Policy.
 *
 * - `category` is the taxonomic flavor. A policy slots into any slot
 *   whose category matches OR into any wildcard slot.
 * - `age` is the Age in which the policy is introduced, or `'all'`
 *   for ageless policies (kept across Age transitions without the
 *   auto-clear).
 * - `prerequisiteCivic` / `prerequisiteTech` — at least one must be
 *   non-null; the player unlocks the policy on either branch.
 * - `effects` is a list because most policies stack multiple small
 *   effects (+Culture AND +Influence, for example).
 */
export interface PolicyDef {
  readonly id: PolicyId;
  readonly name: string;
  readonly category: PolicyCategory;
  readonly age: Age | 'all';
  readonly prerequisiteCivic: string | null;
  readonly prerequisiteTech: string | null;
  readonly effects: ReadonlyArray<EffectDef>;
  readonly description: string;
}

// ── Codex definition ──

/**
 * Source of a Codex — what Mastery produced it.
 *
 * Discriminated so consumers can display "Codex of Writing (Tech)"
 * vs "Codex of Code of Laws (Civic)" accurately.
 */
export type CodexUnlockSource =
  | { readonly type: 'tech-mastery'; readonly techId: string }
  | { readonly type: 'civic-mastery'; readonly civicId: string };

/**
 * Definition of a Codex. One Codex is emitted per mastery completion.
 *
 * - `yields` is the per-turn yield contribution when the codex is
 *   slotted in a Codex-capable building. Default convention: +1
 *   Science per slotted codex (rulebook §14.3 says "bonus Science
 *   per turn" without a number).
 */
export interface CodexDef {
  readonly id: CodexId;
  readonly name: string;
  readonly unlockSource: CodexUnlockSource;
  readonly yields: YieldSet;
  readonly description: string;
}

/**
 * Runtime placement record for a Codex in a building slot.
 *
 * Uniqueness invariant (validated by the system, not the type): no two
 * placements share the same `(cityId, buildingId, slotIndex)` triple,
 * and `slotIndex < BuildingDef.codexSlots` for the hosting building.
 */
export interface CodexPlacement {
  readonly codexId: CodexId;
  readonly cityId: CityId;
  readonly buildingId: BuildingId;
  readonly slotIndex: number;
}

// ── Runtime state ──

/**
 * A currently-active Celebration bonus window on a player.
 *
 * Captured at grant time:
 *
 * - `governmentId` is frozen when the bonus is granted so a mid-bonus
 *   Age transition (which forces a Government change) does NOT
 *   retroactively cancel or re-key the bonus (per rulebook §14.4).
 * - `bonusId` records which of the two options was picked.
 * - `turnsRemaining` ticks down from 10 to 0; the bonus is removed
 *   at turn-end when it hits 0.
 * - `effects` is captured here too (rather than re-resolved from the
 *   GovernmentDef each turn) so rebalancing a Government's future
 *   bonuses does not mutate an in-flight bonus.
 */
export interface ActiveCelebrationBonus {
  readonly governmentId: GovernmentId;
  readonly bonusId: string;
  readonly turnsRemaining: number;
  readonly effects: ReadonlyArray<EffectDef>;
}

/**
 * Government runtime state, keyed by `PlayerId` on the GameState
 * side-map (landed in cycle C, not cycle A).
 *
 * - `currentGovernmentId` is null on the first turn of an Age until
 *   the player picks.
 * - `slottedPolicies` is a flat array of length `policySlots.total`.
 *   Null entries are empty slots. In VII all slots are wildcard so
 *   there is no per-category keying.
 * - `unlockedPolicies` is monotonic.
 * - `unlockedGovernments` is monotonic and age-filtered by the UI.
 * - `bonusSlotCount` counts additional wildcard slots accumulated
 *   from Celebrations / Attributes / Civics.
 * - `activeCelebrationBonus` is null outside celebration windows.
 */
export interface GovernmentState {
  readonly playerId: PlayerId;
  readonly currentGovernmentId: GovernmentId | null;
  readonly slottedPolicies: ReadonlyArray<PolicyId | null>;
  readonly unlockedPolicies: ReadonlyArray<PolicyId>;
  readonly unlockedGovernments: ReadonlyArray<GovernmentId>;
  readonly bonusSlotCount: number;
  readonly activeCelebrationBonus: ActiveCelebrationBonus | null;
}

/**
 * Codex reservoir + placements for a single player.
 *
 * Invariant (enforced by codexSystem): `unplacedCodices` is exactly
 * `ownedCodices` minus every `codexId` referenced in `placements`.
 */
export interface CodexInventoryState {
  readonly playerId: PlayerId;
  readonly ownedCodices: ReadonlyArray<CodexId>;
  readonly placements: ReadonlyArray<CodexPlacement>;
  readonly unplacedCodices: ReadonlyArray<CodexId>;
}

// ── Government-scoped actions (not yet in GameAction; wired cycle C) ──

/**
 * Action payload shapes for Government- and Codex-scoped actions.
 * These are not added to `GameAction` in cycle A — they live here as
 * types for reference and tests, and are merged into the discriminated
 * union in cycle C when the system files exist.
 */
export type GovernmentAction =
  | {
      readonly type: 'SET_GOVERNMENT';
      readonly playerId: PlayerId;
      readonly governmentId: GovernmentId;
    }
  | {
      /**
       * Slot a policy into a flat wildcard slot by index.
       * `category` was removed in W2-03; all slots are wildcard (VII §14.2).
       */
      readonly type: 'SLOT_POLICY';
      readonly playerId: PlayerId;
      readonly slotIndex: number;
      readonly policyId: PolicyId;
    }
  | {
      /**
       * Clear a flat wildcard slot by index.
       * `category` was removed in W2-03; all slots are wildcard (VII §14.2).
       */
      readonly type: 'UNSLOT_POLICY';
      readonly playerId: PlayerId;
      readonly slotIndex: number;
    }
  | {
      readonly type: 'PICK_CELEBRATION_BONUS';
      readonly playerId: PlayerId;
      readonly bonusId: string;
    }
  | {
      readonly type: 'PLACE_CODEX';
      readonly playerId: PlayerId;
      readonly codexId: CodexId;
      readonly cityId: CityId;
      readonly buildingId: BuildingId;
      readonly slotIndex: number;
    }
  | {
      readonly type: 'UNPLACE_CODEX';
      readonly playerId: PlayerId;
      readonly codexId: CodexId;
    }
  | {
      /**
       * Select an ideology branch for the Modern age. Requires
       * `political_theory` civic to be researched. One-time lock per age.
       */
      readonly type: 'SELECT_IDEOLOGY';
      readonly playerId: PlayerId;
      readonly ideology: 'democracy' | 'fascism' | 'communism';
    };

// ── Constants ──

/**
 * Duration in turns of a Celebration government bonus (§4.5, §14.4).
 */
export const CELEBRATION_BONUS_DURATION_TURNS = 10 as const;

/**
 * Base Policy slot count implied by any Government. Individual
 * Governments may expose more via `PolicySlotCounts`; this constant
 * records the rulebook floor from §14.2 ("Base slots: 1 per Age").
 */
export const BASE_POLICY_SLOTS_PER_AGE = 1 as const;

/**
 * Default per-turn Science yield granted by one slotted Codex
 * (§14.3; our convention since the rulebook is silent on the number).
 */
export const DEFAULT_CODEX_SCIENCE_YIELD = 1 as const;

/**
 * Codex slot counts for the canonical Codex-capable buildings
 * (rulebook §14.3 and §14.3 expansion). Authoritative for type
 * tests; data files may extend this set.
 */
export const CANONICAL_CODEX_SLOT_COUNTS = {
  library: 2,
  academy: 3,
  palace: 4,
} as const;
