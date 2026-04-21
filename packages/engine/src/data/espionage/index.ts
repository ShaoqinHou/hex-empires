export type { EspionageActionDef, EspionageActionId } from '../../types/Espionage';

export {
  STEAL_TECH,
  STEAL_CIVICS,
  INCITE_REVOLT,
  SABOTAGE_PRODUCTION,
  ASSASSINATE_GOVERNOR,
  FABRICATE_SCANDAL,
  EXTRACT_INTEL,
  POISON_SUPPLY,
} from './actions';

import {
  STEAL_TECH,
  STEAL_CIVICS,
  INCITE_REVOLT,
  SABOTAGE_PRODUCTION,
  ASSASSINATE_GOVERNOR,
  FABRICATE_SCANDAL,
  EXTRACT_INTEL,
  POISON_SUPPLY,
} from './actions';
import type { EspionageActionDef } from '../../types/Espionage';

export const ALL_ESPIONAGE_ACTIONS: ReadonlyArray<EspionageActionDef> = [
  STEAL_TECH,
  STEAL_CIVICS,
  INCITE_REVOLT,
  SABOTAGE_PRODUCTION,
  ASSASSINATE_GOVERNOR,
  FABRICATE_SCANDAL,
  EXTRACT_INTEL,
  POISON_SUPPLY,
];
