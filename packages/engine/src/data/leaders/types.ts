import type { EffectDef } from '../../types/GameState';
import type { AttributeType } from '../../types/Attribute';

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
  readonly agendaOverride?: ReadonlyArray<string>;
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
  readonly agendas: ReadonlyArray<string>;
  /**
   * The two attribute trees this leader has an affinity for.
   * Primary attributes represent this leader's historical strengths and
   * are used to guide recommended attribute spending in the UI.
   */
  readonly primaryAttributes: readonly [AttributeType, AttributeType];
  /**
   * F-05: Alternative personas for this leader. When absent the leader has
   * only the base persona. When present, the player may choose one at game
   * start; the chosen persona id is stored in `PlayerState.personaId`.
   */
  readonly personas?: ReadonlyArray<PersonaDef>;
}
