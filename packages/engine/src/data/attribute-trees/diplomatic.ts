import type { AttributeNodeDef } from '../../types/Attribute';

export const SILVER_TONGUE: AttributeNodeDef = {
  id: 'silver_tongue',
  tree: 'diplomatic',
  tier: 1,
  cost: 1,
  prerequisites: [],
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'influence', value: 1 },
  description: '+1 Influence empire-wide.',
};

export const ALLIANCE_BUILDER: AttributeNodeDef = {
  id: 'alliance_builder',
  tree: 'diplomatic',
  tier: 2,
  cost: 2,
  prerequisites: ['silver_tongue'],
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'influence', value: 2 },
  description: '+2 Influence empire-wide.',
};

export const GRAND_DIPLOMAT: AttributeNodeDef = {
  id: 'grand_diplomat',
  tree: 'diplomatic',
  tier: 3,
  cost: 3,
  prerequisites: ['alliance_builder'],
  effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
  description: '+3 Gold empire-wide from diplomatic prestige.',
};

export const DIPLOMATIC_NODES: ReadonlyArray<AttributeNodeDef> = [
  SILVER_TONGUE,
  ALLIANCE_BUILDER,
  GRAND_DIPLOMAT,
];
