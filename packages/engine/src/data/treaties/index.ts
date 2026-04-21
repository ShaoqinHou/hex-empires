export type { TreatyDef, TreatyId } from '../../types/Treaty';

export {
  OPEN_BORDERS,
  IMPROVE_TRADE_RELATIONS,
  DENOUNCE_MILITARY_PRESENCE,
} from './treaties';

import {
  OPEN_BORDERS,
  IMPROVE_TRADE_RELATIONS,
  DENOUNCE_MILITARY_PRESENCE,
} from './treaties';
import type { TreatyDef } from '../../types/Treaty';

export const ALL_TREATIES: ReadonlyArray<TreatyDef> = [
  OPEN_BORDERS,
  IMPROVE_TRADE_RELATIONS,
  DENOUNCE_MILITARY_PRESENCE,
];
