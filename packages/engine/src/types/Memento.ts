/**
 * MementoDef — a keepsake item from a previous game run.
 *
 * Mementos are equipped before a game starts. Each memento applies its
 * EffectDef at game-start via MementoApply. The number of equippable
 * mementos is determined by the player's Foundation Level.
 */

import type { Age, EffectDef } from './GameState';
import type { AchievementCondition } from '../data/achievements';

export interface MementoDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Age restriction: if set, this memento only applies in the specified age and later. */
  readonly age?: Age;
  /** The effect applied to the human player at game start. */
  readonly effect: EffectDef;
  /** How this memento is unlocked (used by legendsSystem). */
  readonly unlockCondition?: MementoUnlockCondition;
}

/** How a memento is unlocked. Either via an achievement condition or a fixed challenge ID. */
export type MementoUnlockCondition =
  | { readonly type: 'achievement'; readonly condition: AchievementCondition }
  | { readonly type: 'challenge'; readonly challengeId: string }
  | { readonly type: 'foundation_level'; readonly level: number };
