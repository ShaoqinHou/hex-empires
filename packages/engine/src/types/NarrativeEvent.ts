import type { EffectDef } from './GameState';
import type { Age } from './GameState';

/**
 * NarrativeEventDef — defines a narrative event (Goody Hut replacement / story moment).
 * Events are evaluated each END_TURN against the current GameState.
 * When triggered, they are added to pendingNarrativeEvents for UI presentation.
 */
export interface NarrativeEventDef {
  readonly id: string;
  readonly title: string;
  readonly vignette: string;
  readonly choices: ReadonlyArray<NarrativeChoice>;
  readonly requirements: NarrativeRequirements;
  readonly ageGate?: Age;
  readonly category: 'discovery' | 'diplomacy' | 'battle' | 'religion' | 'misc';
}

export interface NarrativeChoice {
  readonly label: string;
  readonly effects: ReadonlyArray<EffectDef>;
  /** Tags written to PlayerState.narrativeTags on resolution */
  readonly tagOutput?: ReadonlyArray<string>;
}

export interface NarrativeRequirements {
  /** Event fires only if the player has ALL of these tags */
  readonly requiresTags?: ReadonlyArray<string>;
  /** Event fires only if the player has NONE of these tags */
  readonly excludesTags?: ReadonlyArray<string>;
  /** Restrict to a specific leader id */
  readonly leaderId?: string;
  /** Restrict to a specific civ id */
  readonly civId?: string;
  /**
   * Which engine action triggers evaluation of this event.
   * 'END_TURN' — evaluated once per turn tick (default).
   * 'BATTLE_WON' — evaluated when a combat results in an enemy unit death.
   * 'TECH_RESEARCHED' — evaluated when a tech completes.
   * 'DISCOVERY_EXPLORED' — fired by movementSystem when a unit steps on a discoveryId tile.
   */
  readonly triggerType?: 'END_TURN' | 'BATTLE_WON' | 'TECH_RESEARCHED' | 'DISCOVERY_EXPLORED';
}

/**
 * DiscoveryDef — metadata for a map discovery tile (replaces Goody Huts).
 * When a unit moves onto a tile with discoveryId == this def's id, the
 * movementSystem enqueues the associated narrativeEventId.
 */
export interface DiscoveryDef {
  readonly id: string;
  /** The narrative event to fire when this discovery is explored */
  readonly narrativeEventId: string;
  /** Human-readable label for the discovery tile (shown on map tooltip) */
  readonly label: string;
}
