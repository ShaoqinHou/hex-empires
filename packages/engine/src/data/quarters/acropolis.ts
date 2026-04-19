import type { QuarterDef } from '../../types/Quarter';

/** Greece: Parthenon + Odeon → +2 Culture to city */
export const ACROPOLIS: QuarterDef = {
  id: 'acropolis',
  name: 'Acropolis',
  civId: 'greece',
  requiredBuildings: ['parthenon', 'odeon'],
  bonusEffect: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 2 },
} as const;
