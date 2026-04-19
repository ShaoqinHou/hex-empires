import type { QuarterDef } from '../../types/Quarter';

/** America: Steel Mill + Railyard → +3 Production, +1 Science */
export const INDUSTRIAL_PARK: QuarterDef = {
  id: 'industrial_park',
  name: 'Industrial Park',
  civId: 'america',
  requiredBuildings: ['steel_mill', 'railyard'],
  bonusEffect: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 3 },
} as const;
