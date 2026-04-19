import type { IndependentPowerDef } from '../../types/IndependentPower';

/** Kumbi Saleh — Soninke / Ghana Empire economic city-state (Antiquity) */
export const KUMBI_SALEH: IndependentPowerDef = {
  id: 'kumbi_saleh',
  name: 'Kumbi Saleh',
  type: 'economic',
  age: 'antiquity',
  defaultAttitude: 'neutral',
  bonusPool: [
    'kumbi_saleh:bonus:trade_routes',
    'kumbi_saleh:bonus:gold_per_city',
    'kumbi_saleh:bonus:market_discount',
  ],
  description: 'The great trading hub of the Ghana Empire. Suzerains gain advantages in commerce and trade.',
};
