/**
 * Pantheon catalog — first-tier religious bonuses.
 *
 * Each `PantheonDef` grants a single empire-wide `EffectDef` bonus once
 * the player crosses the `faithCost` threshold. Picks are first-come-
 * first-served and persist through age transitions.
 *
 * Bonuses here only use `EffectDef` variants that already exist on
 * `packages/engine/src/types/GameState.ts` — no new effect variants are
 * introduced by this cycle. System wiring lands in cycle C.
 */

import type { PantheonDef } from '../../types/Religion';

export const GOD_OF_HEALING: PantheonDef = {
  id: 'god_of_healing',
  name: 'God of Healing',
  description:
    'Temples of restoration spring up across your empire. Cities gain bonus Faith, speeding the recovery of war-weary citizens.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'faith', value: 1 },
  faithCost: 25,
};

export const GOD_OF_WAR: PantheonDef = {
  id: 'god_of_war',
  name: 'God of War',
  description:
    'Battle-priests accompany your legions into the field, emboldening melee warriors and front-line shock troops.',
  bonus: { type: 'MODIFY_COMBAT', target: 'melee', value: 3 },
  faithCost: 25,
};

export const GOD_OF_CRAFTSMEN: PantheonDef = {
  id: 'god_of_craftsmen',
  name: 'God of Craftsmen',
  description:
    'Divinely inspired artisans organise the workshops of every city, steadily raising output of tools and arms.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 1 },
  faithCost: 25,
};

export const GODDESS_OF_HARVEST: PantheonDef = {
  id: 'goddess_of_harvest',
  name: 'Goddess of the Harvest',
  description:
    'Rites of planting and reaping bless every field and orchard. Every city gains additional Food each turn.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 1 },
  faithCost: 25,
};

export const GODDESS_OF_FESTIVALS: PantheonDef = {
  id: 'goddess_of_festivals',
  name: 'Goddess of Festivals',
  description:
    'Public feasts and processions enrich civic life, producing a steady trickle of Culture across the empire.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 1 },
  faithCost: 25,
};

export const GOD_OF_THE_FORGE: PantheonDef = {
  id: 'god_of_the_forge',
  name: 'God of the Forge',
  description:
    'Smiths work hallowed iron under the patron\'s gaze, granting your siege engines a decisive edge in battle.',
  bonus: { type: 'MODIFY_COMBAT', target: 'siege', value: 4 },
  faithCost: 25,
};

export const GOD_OF_THE_SEA: PantheonDef = {
  id: 'god_of_the_sea',
  name: 'God of the Sea',
  description:
    'Favourable winds and calm waters follow your fleets wherever they sail, strengthening every hull and sailor.',
  bonus: { type: 'MODIFY_COMBAT', target: 'naval', value: 3 },
  faithCost: 30,
};

export const GOD_OF_THE_SUN: PantheonDef = {
  id: 'god_of_the_sun',
  name: 'God of the Sun',
  description:
    'Long growing seasons and clear skies enrich every settlement. Cities accrue Gold from increased commerce.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: 1 },
  faithCost: 25,
};

export const GODDESS_OF_WISDOM: PantheonDef = {
  id: 'goddess_of_wisdom',
  name: 'Goddess of Wisdom',
  description:
    'Scholars and oracles flock to your academies. Every city generates a little extra Science each turn.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 1 },
  faithCost: 25,
};

export const GOD_OF_STORMS: PantheonDef = {
  id: 'god_of_storms',
  name: 'God of Storms',
  description:
    'Thundering patrons quicken the hooves of your cavalry, letting horse columns cross battlefields with uncanny speed.',
  bonus: { type: 'MODIFY_MOVEMENT', target: 'cavalry', value: 1 },
  faithCost: 30,
};

export const GODDESS_OF_THE_HUNT: PantheonDef = {
  id: 'goddess_of_the_hunt',
  name: 'Goddess of the Hunt',
  description:
    'Keen-eyed archers and woodsmen receive her blessing, improving the accuracy and morale of ranged infantry.',
  bonus: { type: 'MODIFY_COMBAT', target: 'ranged', value: 3 },
  faithCost: 25,
};

export const GOD_OF_THE_DEAD: PantheonDef = {
  id: 'god_of_the_dead',
  name: 'God of the Dead',
  description:
    'Funerary priests tend the memory of the ancestors in every populous city, and the devotion of mourners feeds a steady Faith yield across the empire.',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 1 },
  faithCost: 30,
};

export const GODDESS_OF_LOVE: PantheonDef = {
  id: 'goddess_of_love',
  name: 'Goddess of Love',
  description:
    'Household shrines to the patron of marriage and family pacify civic life. Every city gains a trickle of Happiness in the form of additional Culture.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 1 },
  faithCost: 25,
};

export const GOD_OF_WRITING: PantheonDef = {
  id: 'god_of_writing',
  name: 'God of Writing',
  description:
    'Scribes consecrate every tablet, scroll, and monument under the patron of letters. The empire-wide Science yield rises as records and inscriptions multiply.',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 },
  faithCost: 30,
};

export const GODDESS_OF_THE_DAWN: PantheonDef = {
  id: 'goddess_of_the_dawn',
  name: 'Goddess of the Dawn',
  description:
    'Daybreak rites gather the city before every shrine. Each settlement in the empire gains additional Culture from morning processions and hymns.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 1 },
  faithCost: 25,
};

export const GODDESS_OF_THE_WILD: PantheonDef = {
  id: 'goddess_of_the_wild',
  name: 'Goddess of the Wild',
  description:
    'Groves, clearings, and canopies are held sacred. Forested hinterlands feed the empire, adding Food to every city that shelters beneath them.',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 1 },
  faithCost: 25,
};

/**
 * Full catalogue of pantheons. Not yet registered in the engine index —
 * the Religion system wiring cycle will consume this barrel.
 */
export const ALL_PANTHEONS: ReadonlyArray<PantheonDef> = [
  GOD_OF_HEALING,
  GOD_OF_WAR,
  GOD_OF_CRAFTSMEN,
  GODDESS_OF_HARVEST,
  GODDESS_OF_FESTIVALS,
  GOD_OF_THE_FORGE,
  GOD_OF_THE_SEA,
  GOD_OF_THE_SUN,
  GODDESS_OF_WISDOM,
  GOD_OF_STORMS,
  GODDESS_OF_THE_HUNT,
  GOD_OF_THE_DEAD,
  GODDESS_OF_LOVE,
  GOD_OF_WRITING,
  GODDESS_OF_THE_DAWN,
  GODDESS_OF_THE_WILD,
];
