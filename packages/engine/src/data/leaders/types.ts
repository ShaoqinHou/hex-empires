import type { EffectDef } from '../../types/GameState';
import type { AttributeType } from '../../types/Attribute';
import type { CivilizationId } from '../../types/Ids';

/**
 * F-09: Union of terrain and feature identifiers that are meaningful as
 * starting-location biases. Kept as a named type so the UI and map generator
 * can reference it without depending on the full TerrainId / FeatureId unions.
 */
export type TerrainBiomeBias =
  | 'coast'
  | 'plains'
  | 'grassland'
  | 'desert'
  | 'tundra'
  | 'forest'
  | 'mountains'
  | 'navigable_river'
  | 'floodplains'
  | 'hills'
  | 'tropical';

/**
 * F-04: A leader's agenda drives AI diplomatic behaviour. Each agenda has a
 * typed trigger action and a relationship delta so diplomacySystem can
 * evaluate leader opinions without string parsing.
 */
export interface AgendaDef {
  readonly id: string;
  readonly name: string;
  /** Engine action that activates this agenda's relationship effect. */
  readonly triggerAction?: string;
  /** Diplomatic relationship change when triggered. Positive = friendly. */
  readonly relationshipDelta?: number;
  /** Human-readable description of when this agenda fires. */
  readonly condition?: string;
}

/**
 * F-05: A persona is an alternative variant of a leader. The player selects
 * a persona at game start (or it defaults to the base leader). Each persona
 * can override the leader's ability, agenda, or primary attributes.
 */
export interface PersonaDef {
  readonly id: string;
  readonly name: string;
  readonly abilityOverride?: {
    readonly name: string;
    readonly description: string;
    readonly effects: ReadonlyArray<EffectDef>;
  };
  readonly agendaOverride?: ReadonlyArray<AgendaDef>;
  readonly primaryAttributesOverride?: readonly [AttributeType, AttributeType];
}

export interface LeaderDef {
  readonly id: string;
  readonly name: string;
  readonly ability: {
    readonly name: string;
    readonly description: string;
    readonly effects: ReadonlyArray<EffectDef>;
  };
  readonly agendas: ReadonlyArray<AgendaDef>;
  /**
   * The two attribute trees this leader has an affinity for.
   * Primary attributes represent this leader's historical strengths and
   * are used to guide recommended attribute spending in the UI.
   */
  readonly primaryAttributes: readonly [AttributeType, AttributeType];
  /**
   * F-09: Preferred starting terrain or feature types. Used by map generator to
   * place the leader's starting settlement near tiles matching any of these
   * biome/feature types. Multiple entries are checked in order (first match wins).
   */
  readonly startingBias?: ReadonlyArray<TerrainBiomeBias>;
  /**
   * F-09: The civilization this leader is historically associated with.
   * Used by the UI to show historical pairings and by the random leader
   * assignment to suggest historically accurate combos.
   */
  readonly historicalCivId?: CivilizationId;
  /**
   * F-05: Alternative personas for this leader. When absent the leader has
   * only the base persona. When present, the player may choose one at game
   * start; the chosen persona id is stored in `PlayerState.personaId`.
   */
  readonly personas?: ReadonlyArray<PersonaDef>;
}
