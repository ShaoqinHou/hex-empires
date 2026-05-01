import type { GameState, UnitState, GameAction } from '../types/GameState';
import type { UnitId } from '../types/Ids';
import type { CommanderPromotionId } from '../types/Commander';

/**
 * Commander XP + promotion system — Cycle C of the Commander pipeline.
 *
 * Pure function in the same shape as every other engine system. Handles
 * two new action types (`GAIN_COMMANDER_XP`, `PROMOTE_COMMANDER`) that
 * are NOT yet part of the main `GameAction` discriminated union — they
 * are kept local here and consumed via a guarded structural test so the
 * existing per-unit promotionSystem continues to work side-by-side.
 *
 * Commanders are modelled as ordinary `UnitState` entries whose
 * `typeId` matches an id in `state.config.commanders`. This avoids any edit to
 * `GameState`, `GameEngine`, or the engine barrel during cycle C; the
 * separate `CommanderState` decorator lands in cycle D.
 *
 * Per-unit mapping (cycle-C compatibility):
 * - `experience`         -> commander XP (monotonic within a level)
 * - `promotions`         -> picked aura promotion ids
 * - derived `commanderLevel` via `LEVEL_THRESHOLDS`
 * - unspent picks        -> `commanderLevel - promotions.length`
 *
 * Design doc: .codex/workflow/design/commander-system.md §3–§5.
 */

// ── Commander-scoped action payloads (local — not part of GameAction yet) ──

export interface GainCommanderXpAction {
  readonly type: 'GAIN_COMMANDER_XP';
  readonly commanderId: UnitId;
  readonly amount: number;
}

export interface PromoteCommanderAction {
  readonly type: 'PROMOTE_COMMANDER';
  readonly commanderId: UnitId;
  readonly promotionId: CommanderPromotionId;
}

export type CommanderSystemAction =
  | GameAction
  | GainCommanderXpAction
  | PromoteCommanderAction;

// ── XP curve ──

/**
 * Cumulative XP required to reach level N.
 *
 * Index = level (1..5). Level 1 is the starting level, reached at 0 XP.
 * Published cap is level 5 — F-04 removed the spurious level-6 threshold.
 */
export const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500] as const;

/** Commander level for a given cumulative XP total. Hard-capped at 5. */
export function commanderLevelForXp(xp: number): number {
  const MAX_LEVEL = 5;
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, MAX_LEVEL);
}

// ── Commander lookup ──

/**
 * Y3.2: Compile-time fallback set of well-known commander type ids.
 * Used when `isCommander` is called without a GameState (existing test API).
 * Does NOT import from data files — avoids the ALL_X-import-in-system trap.
 */
const KNOWN_COMMANDER_IDS: ReadonlySet<string> = new Set([
  'air_general', 'captain', 'general', 'admiral', 'marshal', 'fleet_admiral', 'partisan_leader',
]);

/**
 * True iff `unit.typeId` is a registered Commander archetype.
 *
 * When called with a `GameState`, uses `state.config.commanders` — the
 * injection seam that allows tests to supply a fixture with a restricted
 * commander set. Falls back to `KNOWN_COMMANDER_IDS` when no state is
 * provided, to preserve the existing call API used in isolated unit tests.
 *
 * Y3.2: The previous implementation built module-level constants from
 * ALL_COMMANDERS / ALL_COMMANDER_PROMOTIONS imported directly from data
 * files — the ALL_X-import-in-system trap. This version uses state.config
 * as the primary lookup.
 */
export function isCommander(unit: UnitState, state?: GameState): boolean {
  if (state?.config.commanders !== undefined) {
    return state.config.commanders.has(unit.typeId);
  }
  return KNOWN_COMMANDER_IDS.has(unit.typeId);
}

// ── Type guards ──

function isCommanderAction(
  action: CommanderSystemAction,
): action is GainCommanderXpAction | PromoteCommanderAction {
  return (
    action.type === 'GAIN_COMMANDER_XP' || action.type === 'PROMOTE_COMMANDER'
  );
}

// ── System ──

export function commanderPromotionSystem(
  state: GameState,
  action: CommanderSystemAction,
): GameState {
  if (!isCommanderAction(action)) return state;

  const unit = state.units.get(action.commanderId);
  if (!unit) return state;
  if (!isCommander(unit, state)) return state;

  if (action.type === 'GAIN_COMMANDER_XP') {
    return applyXpGain(state, unit, action.amount);
  }

  return applyPromotion(state, unit, action.promotionId);
}

function applyXpGain(
  state: GameState,
  unit: UnitState,
  amount: number,
): GameState {
  if (!Number.isFinite(amount) || amount <= 0) return state;

  const nextXp = unit.experience + amount;
  const updatedUnit: UnitState = { ...unit, experience: nextXp };

  const updatedUnits = new Map(state.units);
  updatedUnits.set(unit.id, updatedUnit);

  return { ...state, units: updatedUnits };
}

function applyPromotion(
  state: GameState,
  unit: UnitState,
  promotionId: CommanderPromotionId,
): GameState {
  // Y3.2: look up via state.config.commanderPromotions (injection seam).
  const promotion = state.config.commanderPromotions?.get(promotionId);
  if (!promotion) return state;

  // Already picked.
  if (unit.promotions.includes(promotionId)) return state;

  // Prerequisite check — every listed prereq must already be in picks.
  for (const prereq of promotion.prerequisites) {
    if (!unit.promotions.includes(prereq)) return state;
  }

  // Must have an unspent pick: level > picks-so-far.
  const level = commanderLevelForXp(unit.experience);
  const unspent = level - unit.promotions.length;
  if (unspent <= 0) return state;

  const updatedUnit: UnitState = {
    ...unit,
    promotions: [...unit.promotions, promotionId],
  };

  const updatedUnits = new Map(state.units);
  updatedUnits.set(unit.id, updatedUnit);

  return { ...state, units: updatedUnits };
}
