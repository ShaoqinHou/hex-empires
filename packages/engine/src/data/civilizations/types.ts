import type { EffectDef } from '../../types/GameState';

export interface CivilizationDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly description?: string; // optional civilopedia/flavour text
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
  readonly startingBias?: 'coastal' | 'inland' | 'hills' | 'plains' | 'forest' | 'tundra' | 'desert'; // preferred map start
  /**
   * F-08: List of prior-age civ IDs that unlock this civilization on age
   * transition. When present, players who played one of the listed civs in
   * the prior age can pick this civ even if they have a restricted
   * `unlockedCivIds` list. When absent, no historical-pair unlock applies.
   */
  readonly historicalPair?: ReadonlyArray<string>;
}
