import type { IndependentPowerDef } from '../../types/IndependentPower';

/** Etelkoz — Magyar militaristic city-state (Exploration) */
export const ETELKOZ: IndependentPowerDef = {
  id: 'etelkoz',
  name: 'Etelkoz',
  type: 'militaristic',
  age: 'exploration',
  defaultAttitude: 'hostile',
  bonusPool: [
    'etelkoz:bonus:cavalry_strength',
    'etelkoz:bonus:raid_gold',
    'etelkoz:bonus:movement_bonus',
  ],
  description: 'Nomadic Magyar homeland between the Dnieper and Danube. Their horsemen are unmatched on open terrain.',
};
