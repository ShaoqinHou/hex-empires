import type { AttributeNodeDef } from '../../types/Attribute';

export const PATRON_OF_ARTS: AttributeNodeDef = {
  id: 'patron_of_arts',
  tree: 'cultural',
  tier: 1,
  cost: 1,
  prerequisites: [],
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 1 },
  description: '+1 Culture empire-wide.',
};

export const CULTURAL_AMBASSADOR: AttributeNodeDef = {
  id: 'cultural_ambassador',
  tree: 'cultural',
  tier: 2,
  cost: 2,
  prerequisites: ['patron_of_arts'],
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
  description: '+2 Culture empire-wide.',
};

export const GOLDEN_AGE_PATRON: AttributeNodeDef = {
  id: 'golden_age_patron',
  tree: 'cultural',
  tier: 3,
  cost: 3,
  prerequisites: ['cultural_ambassador'],
  effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 3 },
  description: '+3 Culture in every city.',
};

export const CULTURAL_NODES: ReadonlyArray<AttributeNodeDef> = [
  PATRON_OF_ARTS,
  CULTURAL_AMBASSADOR,
  GOLDEN_AGE_PATRON,
];
