export type { CivicDef } from './types';
export { ALL_ANTIQUITY_CIVICS } from './antiquity/index';
export {
  CODE_OF_LAWS, CRAFTSMANSHIP, FOREIGN_TRADE, EARLY_EMPIRE,
  MYSTICISM, STATE_WORKFORCE, MILITARY_TRADITION, RECORDED_HISTORY,
} from './antiquity/index';

import type { CivicDef } from './types';
import { ALL_ANTIQUITY_CIVICS } from './antiquity/index';

// Future: import ALL_EXPLORATION_CIVICS, ALL_MODERN_CIVICS

export const ALL_CIVICS: ReadonlyArray<CivicDef> = [
  ...ALL_ANTIQUITY_CIVICS,
  // ...ALL_EXPLORATION_CIVICS,
  // ...ALL_MODERN_CIVICS,
];
