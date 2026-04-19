import type { AttributeNodeDef } from '../../types/Attribute';

export const PIONEER: AttributeNodeDef = {
  id: 'pioneer',
  tree: 'expansionist',
  tier: 1,
  cost: 1,
  prerequisites: [],
  effect: { type: 'MODIFY_MOVEMENT', target: 'all', value: 1 },
  description: '+1 Movement for all units.',
};

export const FRONTIER_SPIRIT: AttributeNodeDef = {
  id: 'frontier_spirit',
  tree: 'expansionist',
  tier: 2,
  cost: 2,
  prerequisites: ['pioneer'],
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
  description: '+2 Production empire-wide.',
};

export const MANIFEST_DESTINY: AttributeNodeDef = {
  id: 'manifest_destiny',
  tree: 'expansionist',
  tier: 3,
  cost: 3,
  prerequisites: ['frontier_spirit'],
  effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 3 },
  description: '+3 Production in every city.',
};

export const EXPANSIONIST_NODES: ReadonlyArray<AttributeNodeDef> = [
  PIONEER,
  FRONTIER_SPIRIT,
  MANIFEST_DESTINY,
];
