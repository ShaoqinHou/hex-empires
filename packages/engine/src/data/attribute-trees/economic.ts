import type { AttributeNodeDef } from '../../types/Attribute';

export const MERCANTILE: AttributeNodeDef = {
  id: 'mercantile',
  tree: 'economic',
  tier: 1,
  cost: 1,
  prerequisites: [],
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 1 },
  description: '+1 Gold empire-wide.',
};

export const TRADE_NETWORKS: AttributeNodeDef = {
  id: 'trade_networks',
  tree: 'economic',
  tier: 2,
  cost: 2,
  prerequisites: ['mercantile'],
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 },
  description: '+2 Gold empire-wide.',
};

export const GRAND_BAZAAR: AttributeNodeDef = {
  id: 'grand_bazaar',
  tree: 'economic',
  tier: 3,
  cost: 3,
  prerequisites: ['trade_networks'],
  effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: 3 },
  description: '+3 Gold in every city.',
};

export const ECONOMIC_NODES: ReadonlyArray<AttributeNodeDef> = [
  MERCANTILE,
  TRADE_NETWORKS,
  GRAND_BAZAAR,
];
