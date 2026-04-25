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
 *
 * EE5.2: Discoveries may optionally carry a direct `reward` field.
 * When reward is present, EXPLORE_DISCOVERY applies the reward immediately
 * and clears the tile's discoveryId (one-shot). Discoveries without a reward
 * continue to fire the narrative event via movementSystem.
 */
export interface DiscoveryDef {
  readonly id: string;
  /** The narrative event to fire when this discovery is explored */
  readonly narrativeEventId: string;
  /** Human-readable label for the discovery tile (shown on map tooltip) */
  readonly label: string;
  /**
   * EE5.2: Optional direct reward applied by discoverySystem on EXPLORE_DISCOVERY.
   * type 'gold' | 'science' | 'culture': adds `amount` to the exploring player.
   * type 'unit': grants a unit of `unitId` type at the explored tile.
   * When present, the tile's discoveryId is cleared after exploration.
   */
  readonly reward?: {
    readonly type: 'gold' | 'science' | 'culture' | 'unit';
    readonly amount?: number;
    readonly unitId?: string;
  };
}
