export { ACROPOLIS } from './acropolis';
export { FORUM } from './forum';
export { NECROPOLIS } from './necropolis';
export { UWAYBIL_KUH } from './uwaybil-kuh';
export { ZAIBATSU } from './zaibatsu';
export { INDUSTRIAL_PARK } from './industrial-park';

import { ACROPOLIS } from './acropolis';
import { FORUM } from './forum';
import { NECROPOLIS } from './necropolis';
import { UWAYBIL_KUH } from './uwaybil-kuh';
import { ZAIBATSU } from './zaibatsu';
import { INDUSTRIAL_PARK } from './industrial-park';

export const ALL_QUARTERS = [
  ACROPOLIS,
  FORUM,
  NECROPOLIS,
  UWAYBIL_KUH,
  ZAIBATSU,
  INDUSTRIAL_PARK,
] as const;
