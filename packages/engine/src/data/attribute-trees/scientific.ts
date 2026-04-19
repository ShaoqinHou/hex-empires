import type { AttributeNodeDef } from '../../types/Attribute';

export const CURIOUS_MIND: AttributeNodeDef = {
  id: 'curious_mind',
  tree: 'scientific',
  tier: 1,
  cost: 1,
  prerequisites: [],
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 },
  description: '+1 Science empire-wide.',
};

export const RESEARCH_INITIATIVE: AttributeNodeDef = {
  id: 'research_initiative',
  tree: 'scientific',
  tier: 2,
  cost: 2,
  prerequisites: ['curious_mind'],
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 },
  description: '+2 Science empire-wide.',
};

export const ENLIGHTENED_RULE: AttributeNodeDef = {
  id: 'enlightened_rule',
  tree: 'scientific',
  tier: 3,
  cost: 3,
  prerequisites: ['research_initiative'],
  effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 3 },
  description: '+3 Science in every city.',
};

export const SCIENTIFIC_NODES: ReadonlyArray<AttributeNodeDef> = [
  CURIOUS_MIND,
  RESEARCH_INITIATIVE,
  ENLIGHTENED_RULE,
];
