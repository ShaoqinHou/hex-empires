import type { AttributeNodeDef } from '../../types/Attribute';

export const BATTLE_HARDENED: AttributeNodeDef = {
  id: 'battle_hardened',
  tree: 'militaristic',
  tier: 1,
  cost: 1,
  prerequisites: [],
  effect: { type: 'MODIFY_COMBAT', target: 'all', value: 1 },
  description: '+1 Combat Strength for all units.',
};

export const VETERAN_CORPS: AttributeNodeDef = {
  id: 'veteran_corps',
  tree: 'militaristic',
  tier: 2,
  cost: 2,
  prerequisites: ['battle_hardened'],
  effect: { type: 'MODIFY_COMBAT', target: 'all', value: 2 },
  description: '+2 Combat Strength for all units.',
};

export const IRON_WILL: AttributeNodeDef = {
  id: 'iron_will',
  tree: 'militaristic',
  tier: 3,
  cost: 3,
  prerequisites: ['veteran_corps'],
  effect: { type: 'MODIFY_COMBAT', target: 'all', value: 4 },
  description: '+4 Combat Strength for all units.',
};

export const MILITARISTIC_NODES: ReadonlyArray<AttributeNodeDef> = [
  BATTLE_HARDENED,
  VETERAN_CORPS,
  IRON_WILL,
];
