import type { IndependentPowerDef } from '../../types/IndependentPower';

/** Carantania — Slavic militaristic city-state (Antiquity) */
export const CARANTANIA: IndependentPowerDef = {
  id: 'carantania',
  name: 'Carantania',
  type: 'militaristic',
  age: 'antiquity',
  defaultAttitude: 'hostile',
  bonusPool: [
    'carantania:bonus:unit_strength',
    'carantania:bonus:levy_discount',
    'carantania:bonus:defense_bonus',
  ],
  description: 'The warrior-princes of the Alpine Slavs. Their levies are fierce and reliable.',
};
