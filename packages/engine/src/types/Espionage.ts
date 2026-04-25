import type { PlayerId } from './Ids';

/**
 * Y5 — Espionage type definitions (diplomacy F-05 scaffold).
 *
 * EspionageActionDef: static definition of a spy operation (registered in GameConfig).
 * EspionageOperation: runtime state of an in-progress operation (Y5 scaffold style).
 *
 * Z4 — Extended types for active operation state machine:
 * EspionageOpType: discriminant union of all operation types.
 * EspionageOpState: per-operation runtime state stored in GameState.espionageOps map.
 */

// ── Z4: Active operation type union ──

export type EspionageOpType =
  | 'steal_tech'          // Antiquity
  | 'steal_civic'         // Antiquity
  | 'sabotage_district'   // Exploration
  | 'incite_rebellion'    // Exploration
  | 'steal_great_work'    // Modern
  | 'plant_evidence'      // Modern
  | 'spread_propaganda'   // Modern
  | 'monitor_treaties';   // any age (counterespionage)

/**
 * Z4: Per-operation runtime state for the new espionage state machine.
 * Stored in GameState.espionageOps (ReadonlyMap<string, EspionageOpState>).
 */
export interface EspionageOpState {
  /** Unique id per active op (UUID-style, e.g. "eop-p1-p2-1-0"). */
  readonly id: string;
  readonly type: EspionageOpType;
  readonly attackerPlayerId: string;
  readonly targetPlayerId: string;
  /** Optional target city for ops that require a city (sabotage_district, incite_rebellion, etc.). */
  readonly targetCityId?: string;
  /** Op completes when this reaches 0. Starts at 5. */
  readonly turnsRemaining: number;
  /** Base success probability 0-1 (modified by detection). */
  readonly successProbability: number;
  /** True if this op has been detected by the target. */
  readonly detected: boolean;
}

// ── Y5 scaffold types (existing) ──

export type EspionageActionId =
  | 'steal_tech'
  | 'steal_civics'
  | 'incite_revolt'
  | 'sabotage_production'
  | 'assassinate_governor'
  | 'fabricate_scandal'
  | 'extract_intel'
  | 'poison_supply';

export type EspionageAge = 'antiquity' | 'exploration' | 'modern';

export interface EspionageActionDef {
  readonly id: EspionageActionId;
  readonly name: string;
  readonly description: string;
  /** Age this operation becomes available. */
  readonly availableAge: EspionageAge;
  /** Influence cost per turn while operation is active. */
  readonly influenceCostPerTurn: number;
  /** Base detection chance per turn (0–1). */
  readonly detectionChance: number;
  /** Effect category — used by effectSystem to resolve the outcome. */
  readonly effectCategory: 'steal' | 'sabotage' | 'political' | 'intel';
}

export interface EspionageOperation {
  /** Unique runtime id for this active operation. */
  readonly id: string;
  readonly actionId: EspionageActionId;
  readonly ownerId: PlayerId;
  readonly targetPlayerId: PlayerId;
  /** Turn on which the operation was initiated. */
  readonly startedOnTurn: number;
  /** Turns remaining until the operation completes (counts down from 4). */
  readonly turnsRemaining: number;
  /** Influence already spent (diagnostic, not used for deduction). */
  readonly totalInfluenceSpent: number;
  /** True if the target has committed counter-espionage influence. */
  readonly isCountered: boolean;
  /** Extra influence the target has committed to counter this op. */
  readonly counterInfluence: number;
  /** True when operation completed successfully. */
  readonly completed: boolean;
  /** True when operation was detected/cancelled. */
  readonly cancelled: boolean;
}
