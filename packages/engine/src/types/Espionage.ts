import type { PlayerId } from './Ids';

/**
 * Y5 — Espionage type definitions (diplomacy F-05 scaffold).
 *
 * EspionageActionDef: static definition of a spy operation (registered in GameConfig).
 * EspionageOperation: runtime state of an in-progress operation.
 */

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
