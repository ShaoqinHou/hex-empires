import type { QuarterDef } from '../../types/Quarter';

/** Meiji Japan: Ginko + Jukogyo → +3 Production, +2 Gold */
export const ZAIBATSU: QuarterDef = {
  id: 'zaibatsu',
  name: 'Zaibatsu',
  civId: 'meiji_japan',
  requiredBuildings: ['ginko', 'jukogyo'],
  bonusEffect: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 3 },
} as const;
