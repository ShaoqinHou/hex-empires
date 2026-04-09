import type { EffectDef } from '../../types/GameState';

export interface CivilizationDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly uniqueAbility: {
    readonly name: string;
    readonly description: string;
    readonly effects: ReadonlyArray<EffectDef>;
  };
  readonly uniqueUnit: string | null;
  readonly uniqueBuilding: string | null;
  readonly legacyBonus: {
    readonly name: string;
    readonly description: string;
    readonly effect: EffectDef;
  };
  readonly color: string; // primary player color
}
