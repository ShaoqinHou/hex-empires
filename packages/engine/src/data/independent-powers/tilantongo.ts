import type { IndependentPowerDef } from '../../types/IndependentPower';

/** Tilantongo — Mixtec cultural city-state (Exploration) */
export const TILANTONGO: IndependentPowerDef = {
  id: 'tilantongo',
  name: 'Tilantongo',
  type: 'cultural',
  age: 'exploration',
  defaultAttitude: 'neutral',
  bonusPool: [
    'tilantongo:bonus:great_works',
    'tilantongo:bonus:culture_per_wonder',
    'tilantongo:bonus:artist_specialist',
  ],
  description: 'The royal seat of the Mixtec Eight Deer dynasty. Suzerains inherit their mastery of arts and writing.',
};
