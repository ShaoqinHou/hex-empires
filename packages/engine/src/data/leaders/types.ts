import type { EffectDef } from '../../types/GameState';

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
}
