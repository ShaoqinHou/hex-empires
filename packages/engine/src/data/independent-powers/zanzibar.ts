import type { IndependentPowerDef } from '../../types/IndependentPower';

/** Zanzibar — Swahili diplomatic city-state (Modern) */
export const ZANZIBAR: IndependentPowerDef = {
  id: 'zanzibar',
  name: 'Zanzibar',
  type: 'diplomatic',
  age: 'modern',
  defaultAttitude: 'friendly',
  bonusPool: [
    'zanzibar:bonus:influence_per_turn',
    'zanzibar:bonus:extra_endeavor_slot',
    'zanzibar:bonus:relation_bonus',
  ],
  description: 'The great Swahili port-state whose merchants built networks across the Indian Ocean world.',
};
