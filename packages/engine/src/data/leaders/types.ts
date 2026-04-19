import type { EffectDef } from '../../types/GameState';
import type { AttributeType } from '../../types/Attribute';

export interface LeaderDef {
  readonly id: string;
  readonly name: string;
  readonly ability: {
    readonly name: string;
    readonly description: string;
    readonly effects: ReadonlyArray<EffectDef>;
  };
  readonly agendas: ReadonlyArray<string>;
  readonly compatibleAges: ReadonlyArray<'antiquity' | 'exploration' | 'modern'>;
  /**
   * The two attribute trees this leader has an affinity for.
   * Primary attributes represent this leader's historical strengths and
   * are used to guide recommended attribute spending in the UI.
   */
  readonly primaryAttributes: readonly [AttributeType, AttributeType];
}
