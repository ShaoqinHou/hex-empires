import type { QuarterDef } from '../../types/Quarter';

/** Rome: Temple of Jupiter + Basilica → +2 Gold, +2 Culture */
export const FORUM: QuarterDef = {
  id: 'forum',
  name: 'Forum',
  civId: 'rome',
  requiredBuildings: ['temple_of_jupiter', 'basilica'],
  bonusEffect: { type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: 2 },
} as const;
