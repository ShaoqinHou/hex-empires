import type { QuarterDef } from '../../types/Quarter';

/** Maya: Jalaw + K_uh Nah → +2 Science, +2 Culture */
export const UWAYBIL_KUH: QuarterDef = {
  id: 'uwaybil_kuh',
  name: 'Uwaybil Kuh',
  civId: 'maya',
  requiredBuildings: ['jalaw', 'kuh_nah'],
  bonusEffect: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 2 },
} as const;
