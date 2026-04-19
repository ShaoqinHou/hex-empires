import type { QuarterDef } from '../../types/Quarter';

/** Egypt: Mastaba + Mortuary Temple → +2 Faith, +2 Culture */
export const NECROPOLIS: QuarterDef = {
  id: 'necropolis',
  name: 'Necropolis',
  civId: 'egypt',
  requiredBuildings: ['mastaba', 'mortuary_temple'],
  bonusEffect: { type: 'MODIFY_YIELD', target: 'city', yield: 'faith', value: 2 },
} as const;
