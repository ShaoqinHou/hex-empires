import type { PlayerId } from './Ids';

/**
 * Y5 — Treaty type definitions (diplomacy F-06 scaffold).
 *
 * TreatyDef: static definition registered in GameConfig.
 * ActiveTreaty: runtime state of a treaty pending or in force.
 */

export type TreatyId =
  | 'open_borders'
  | 'improve_trade_relations'
  | 'denounce_military_presence';

export type TreatyStatus = 'pending' | 'active' | 'rejected' | 'expired';

export interface TreatyDef {
  readonly id: TreatyId;
  readonly name: string;
  readonly description: string;
  /** Influence cost for the proposing player. */
  readonly influenceCost: number;
  /** Number of turns the treaty stays in force once accepted. 0 = permanent until cancelled. */
  readonly durationTurns: number;
  /** Stub effect category — effectSystem will resolve the actual benefit. */
  readonly effectCategory: 'border' | 'trade' | 'political';
}

export interface ActiveTreaty {
  /** Unique runtime id for this treaty instance. */
  readonly id: string;
  readonly treatyId: TreatyId;
  readonly proposerId: PlayerId;
  readonly targetId: PlayerId;
  readonly status: TreatyStatus;
  /** Turn on which the treaty was proposed. */
  readonly proposedOnTurn: number;
  /** Turn on which the treaty becomes / became active (null if not yet accepted). */
  readonly activeSinceTurn: number | null;
  /** Turns remaining while active (null = permanent or not yet active). */
  readonly turnsRemaining: number | null;
}
