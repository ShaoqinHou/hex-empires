export type { TechnologyDef } from './types';
export { ALL_ANTIQUITY_TECHS } from './antiquity/index';
export { ALL_EXPLORATION_TECHS } from './exploration/index';
export { ALL_MODERN_TECHS } from './modern/index';

import type { TechnologyDef } from './types';
import { ALL_ANTIQUITY_TECHS } from './antiquity/index';
import { ALL_EXPLORATION_TECHS } from './exploration/index';
import { ALL_MODERN_TECHS } from './modern/index';

export const ALL_TECHNOLOGIES: ReadonlyArray<TechnologyDef> = [
  ...ALL_ANTIQUITY_TECHS,
  ...ALL_EXPLORATION_TECHS,
  ...ALL_MODERN_TECHS,
];
