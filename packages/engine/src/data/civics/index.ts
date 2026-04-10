export type { CivicDef } from './types';
export { ALL_ANTIQUITY_CIVICS } from './antiquity/index';
export {
  CODE_OF_LAWS, CRAFTSMANSHIP, FOREIGN_TRADE, EARLY_EMPIRE,
  MYSTICISM, STATE_WORKFORCE, MILITARY_TRADITION, RECORDED_HISTORY,
  ROMAN_SENATE, DIVINE_KINGSHIP, ATHENIAN_DEMOCRACY,
} from './antiquity/index';

export { ALL_EXPLORATION_CIVICS } from './exploration/index';
export {
  HUMANISM, MERCANTILISM, DIVINE_RIGHT, EXPLORATION_CIVIC,
  REFORMED_CHURCH, COLONIALISM, CIVIL_ENGINEERING, NATIONALISM,
} from './exploration/index';

export { ALL_MODERN_CIVICS } from './modern/index';
export {
  IDEOLOGY, SUFFRAGE, TOTALITARIANISM,
  ENVIRONMENTALISM, GLOBALIZATION, FUTURE_CIVIC,
} from './modern/index';

import type { CivicDef } from './types';
import { ALL_ANTIQUITY_CIVICS } from './antiquity/index';
import { ALL_EXPLORATION_CIVICS } from './exploration/index';
import { ALL_MODERN_CIVICS } from './modern/index';

export const ALL_CIVICS: ReadonlyArray<CivicDef> = [
  ...ALL_ANTIQUITY_CIVICS,
  ...ALL_EXPLORATION_CIVICS,
  ...ALL_MODERN_CIVICS,
];
