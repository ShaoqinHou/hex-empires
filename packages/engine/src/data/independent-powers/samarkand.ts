import type { IndependentPowerDef } from '../../types/IndependentPower';

/** Samarkand — Timurid scientific city-state (Modern) */
export const SAMARKAND: IndependentPowerDef = {
  id: 'samarkand',
  name: 'Samarkand',
  type: 'scientific',
  age: 'modern',
  defaultAttitude: 'neutral',
  bonusPool: [
    'samarkand:bonus:science_per_city',
    'samarkand:bonus:tech_cost_reduction',
    'samarkand:bonus:observatory_free',
  ],
  description: 'Crossroads of the Silk Road and seat of Timurid learning. Suzerains gain scientific advantages.',
};
