/**
 * Founder Belief catalogue — second-tier religion content (above
 * Pantheons, alongside Follower Beliefs).
 *
 * A Founder Belief is selected by the civ that founds a full Religion
 * and applies globally to that founding civ's empire. Exactly one per
 * religion. Unlike Follower Beliefs (which affect every city following
 * the religion regardless of owner), Founder Beliefs reward the
 * founder specifically — producing the missionary-and-money loop that
 * rewards spreading the faith.
 *
 * `Religion.ts` exposes a single `BeliefDef` shape with a `category`
 * discriminator; this file intentionally introduces a narrower
 * `FounderBeliefDef` type so founder bonuses cannot silently be slotted
 * into follower slots at content-authoring time. The `bonus` field
 * reuses the existing `EffectDef` union — no new effect variants are
 * introduced by this cycle.
 */

import type { EffectDef } from '../../types/GameState';

/**
 * A Founder Belief — picked by the civ that founds a Religion, applies
 * empire-wide to the founder. One per religion.
 *
 * The `faithCost` is the Faith surcharge paid on top of the base
 * religion-founding cost to slot this belief. All bonuses use existing
 * `EffectDef` variants only.
 */
export interface FounderBeliefDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly bonus: EffectDef;
  readonly faithCost: number;
}

export const WORLD_CHURCH: FounderBeliefDef = {
  id: 'world_church',
  name: 'World Church',
  description:
    'Missionary envoys from your holy city carry soft power abroad. Every city in your empire gains Influence, compounding the diplomatic reach of the faith.',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'influence', value: 2 },
  faithCost: 100,
};

export const LAY_MINISTRY: FounderBeliefDef = {
  id: 'lay_ministry',
  name: 'Lay Ministry',
  description:
    'Ordained citizens lead congregations in their own cities. Every settlement in your empire generates additional Faith, accelerating the founding of further religious works.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'faith', value: 1 },
  faithCost: 90,
};

export const TITHE: FounderBeliefDef = {
  id: 'tithe',
  name: 'Tithe',
  description:
    'Every faithful settlement returns a tenth of its earnings to the chancery. Your empire enjoys a steady stream of Gold drawn from the religious infrastructure.',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 },
  faithCost: 100,
};

export const PAPAL_PRIMACY: FounderBeliefDef = {
  id: 'papal_primacy',
  name: 'Papal Primacy',
  description:
    'Your holy city is recognised as the spiritual capital of the known world. The Culture yield of every city under your rule rises as cathedrals and basilicas multiply.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 1 },
  faithCost: 110,
};

export const PILGRIMAGE: FounderBeliefDef = {
  id: 'pilgrimage',
  name: 'Pilgrimage',
  description:
    'Faithful travellers descend on your holy sites from every corner of the map. Your empire gains additional Food from the trades and alms that follow them.',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 2 },
  faithCost: 90,
};

export const STEWARDSHIP: FounderBeliefDef = {
  id: 'stewardship',
  name: 'Stewardship',
  description:
    'Monastic orders keep meticulous ledgers and oversee shared granaries. Every city in your empire produces additional Production, easing construction of sacred works.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 1 },
  faithCost: 110,
};

export const SCRIPTORIUM: FounderBeliefDef = {
  id: 'scriptorium',
  name: 'Scriptorium',
  description:
    'Illuminated manuscripts flow from your monasteries into every library of the realm. Every city under your rule generates additional Science from the copyists at work.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 1 },
  faithCost: 120,
};

/**
 * Full catalogue of founder beliefs. Not yet registered in the engine
 * index; consumed by the Religion system wiring cycle.
 */
export const ALL_FOUNDER_BELIEFS: ReadonlyArray<FounderBeliefDef> = [
  WORLD_CHURCH,
  LAY_MINISTRY,
  TITHE,
  PAPAL_PRIMACY,
  PILGRIMAGE,
  STEWARDSHIP,
  SCRIPTORIUM,
];
