/**
 * Follower Belief catalogue — second-tier religion content (above
 * Pantheons, alongside Founder Beliefs).
 *
 * A Follower Belief applies to every city that follows the religion,
 * regardless of which civ owns that city. Exactly one per religion.
 * Follower Beliefs are the pressure that makes spreading a religion
 * worthwhile for the target civ as well as the founder.
 *
 * `Religion.ts` exposes a single `BeliefDef` shape with a `category`
 * discriminator; this file intentionally introduces a narrower
 * `FollowerBeliefDef` type so follower bonuses cannot silently be
 * slotted into founder slots at content-authoring time. The `bonus`
 * field reuses the existing `EffectDef` union — no new effect variants
 * are introduced by this cycle.
 */

import type { EffectDef } from '../../types/GameState';

/**
 * A Follower Belief — picked when a Religion is founded. Applies to
 * every city that has the religion as its dominant faith, regardless
 * of owner. One per religion.
 *
 * The `faithCost` is the Faith surcharge paid on top of the base
 * religion-founding cost to slot this belief. All bonuses use existing
 * `EffectDef` variants only.
 */
export interface FollowerBeliefDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly bonus: EffectDef;
  readonly faithCost: number;
}

export const JESUIT_EDUCATION: FollowerBeliefDef = {
  id: 'jesuit_education',
  name: 'Jesuit Education',
  description:
    'Temples and shrines double as teaching cloisters. Follower cities gain Science each turn as monks tutor the next generation of scholars.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 1 },
  faithCost: 80,
};

export const CHORAL_MUSIC: FollowerBeliefDef = {
  id: 'choral_music',
  name: 'Choral Music',
  description:
    'Choirs and hymnals enrich every service, filling streets with song on feast days. Follower cities gain Culture as sacred polyphony inspires the populace.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 2 },
  faithCost: 80,
};

export const RELIGIOUS_SETTLEMENTS: FollowerBeliefDef = {
  id: 'religious_settlements',
  name: 'Religious Settlements',
  description:
    'Pilgrims found new quarters around every shrine. Follower cities gain additional Food as congregations cluster around their places of worship.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 2 },
  faithCost: 80,
};

export const FEED_THE_WORLD: FollowerBeliefDef = {
  id: 'feed_the_world',
  name: 'Feed the World',
  description:
    'Alms-kitchens attached to every temple redistribute surplus grain. Follower cities gain Food each turn regardless of crop or terrain.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 1 },
  faithCost: 70,
};

export const WARRIOR_MONKS: FollowerBeliefDef = {
  id: 'warrior_monks',
  name: 'Warrior Monks',
  description:
    'Martial orders drill in the cloister courtyards. Melee units of follower cities fight with greater zeal, adding combat strength in defence of the faithful.',
  bonus: { type: 'MODIFY_COMBAT', target: 'melee', value: 2 },
  faithCost: 90,
};

export const HOLY_COMMERCE: FollowerBeliefDef = {
  id: 'holy_commerce',
  name: 'Holy Commerce',
  description:
    'Consecrated marketplaces anchor every bazaar. Follower cities gain Gold from religious fairs and the constant tithing of visiting pilgrims.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: 2 },
  faithCost: 80,
};

export const ASCETICISM: FollowerBeliefDef = {
  id: 'asceticism',
  name: 'Asceticism',
  description:
    'Meditative disciplines steady the hand and the mind. Follower cities gain Production each turn as craftsmen work the long hours of the monastic rule.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 1 },
  faithCost: 80,
};

export const GURUS_BLESSING: FollowerBeliefDef = {
  id: 'gurus_blessing',
  name: "Guru's Blessing",
  description:
    'Wandering teachers return with insights for every community they pass through. Follower cities gain Faith each turn as their sages carry the word home.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'faith', value: 1 },
  faithCost: 70,
};

export const DIVINE_INSPIRATION: FollowerBeliefDef = {
  id: 'divine_inspiration',
  name: 'Divine Inspiration',
  description:
    'Ranged infantry drawn from follower cities fire with a preacher\'s certainty. Archers and crossbowmen of the faithful gain combat strength in every engagement.',
  bonus: { type: 'MODIFY_COMBAT', target: 'ranged', value: 2 },
  faithCost: 90,
};

export const DIPLOMATIC_LEAGUE: FollowerBeliefDef = {
  id: 'diplomatic_league',
  name: 'Diplomatic League',
  description:
    'The faithful act as a coalition on the stage of nations. Follower cities produce Influence each turn as co-religionists broker accords across borders.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'influence', value: 1 },
  faithCost: 85,
};

/**
 * Full catalogue of follower beliefs. Not yet registered in the engine
 * index; consumed by the Religion system wiring cycle.
 */
export const ALL_FOLLOWER_BELIEFS: ReadonlyArray<FollowerBeliefDef> = [
  JESUIT_EDUCATION,
  CHORAL_MUSIC,
  RELIGIOUS_SETTLEMENTS,
  FEED_THE_WORLD,
  WARRIOR_MONKS,
  HOLY_COMMERCE,
  ASCETICISM,
  GURUS_BLESSING,
  DIVINE_INSPIRATION,
  DIPLOMATIC_LEAGUE,
];
