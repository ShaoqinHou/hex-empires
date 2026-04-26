import type { NaturalWonderDef } from '../../types/NaturalWonder';

export const MOUNT_EVEREST: NaturalWonderDef = {
  id: 'mount_everest',
  name: 'Mount Everest',
  type: 'promotion',
  tileCount: 2,
  firstSettleBonus: { type: 'MODIFY_COMBAT', target: 'melee', value: 5 },
  description: 'The highest peak in the world grants mountaineering expertise to adjacent units.',
  yields: { production: 1, faith: 2 },
  impassable: true,
} as const;

export const GRAND_CANYON: NaturalWonderDef = {
  id: 'grand_canyon',
  name: 'Grand Canyon',
  type: 'scenic',
  tileCount: 2,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 4 },
  description: 'A breathtaking geological formation inspiring culture and tourism.',
  yields: { culture: 2, gold: 1 },
} as const;

export const VICTORIA_FALLS: NaturalWonderDef = {
  id: 'victoria_falls',
  name: 'Victoria Falls',
  type: 'fresh-water',
  tileCount: 2,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 3 },
  description: 'The largest waterfall on Earth provides fresh water to all adjacent cities.',
  yields: { food: 2, culture: 1 },
} as const;

export const MOUNT_KILIMANJARO: NaturalWonderDef = {
  id: 'mount_kilimanjaro',
  name: 'Mount Kilimanjaro',
  type: 'promotion',
  tileCount: 1,
  firstSettleBonus: { type: 'MODIFY_COMBAT', target: 'all', value: 3 },
  description: "Africa's highest peak empowers nearby units with high-altitude combat training.",
  yields: { food: 2, culture: 1 },
  impassable: true,
  adjacencyEffect: { yield: 'food', value: 1 },
} as const;

export const GULLFOSS: NaturalWonderDef = {
  id: 'gullfoss',
  name: 'Gullfoss',
  type: 'fresh-water',
  tileCount: 1,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 2 },
  description: 'Icelandic waterfall whose power can be harnessed for industrial production.',
  yields: { production: 1, gold: 1 },
} as const;

export const IGUAZU_FALLS: NaturalWonderDef = {
  id: 'iguazu_falls',
  name: 'Iguazu Falls',
  type: 'fresh-water',
  tileCount: 2,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 2 },
  description: 'Spectacular waterfalls on the border of Brazil and Argentina provide rich farmland.',
  yields: { food: 2, science: 1 },
} as const;

export const TORRES_DEL_PAINE: NaturalWonderDef = {
  id: 'torres_del_paine',
  name: 'Torres del Paine',
  type: 'scenic',
  tileCount: 2,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
  description: "Patagonia's dramatic granite towers attract explorers and inspire cultural growth.",
  yields: { culture: 2, science: 1 },
  impassable: true,
} as const;

export const THERA: NaturalWonderDef = {
  id: 'thera',
  name: 'Thera (Santorini)',
  type: 'volcano',
  tileCount: 1,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 4 },
  description: 'The caldera of a supervolcano enriches the surrounding land with fertile ash.',
  yields: { production: 2, gold: 1 },
} as const;

export const GALAPAGOS: NaturalWonderDef = {
  id: 'galapagos',
  name: 'Galapagos Islands',
  type: 'scenic',
  tileCount: 2,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 4 },
  description: "Darwin's laboratory of evolution inspires scientific breakthroughs.",
  yields: { science: 2, food: 1 },
} as const;

export const ULURU: NaturalWonderDef = {
  id: 'uluru',
  name: 'Uluru',
  type: 'scenic',
  tileCount: 1,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 5 },
  description: "A sacred sandstone monolith at the heart of Australia's Red Centre.",
  yields: { culture: 2, faith: 2 },
} as const;

export const GREAT_BARRIER_REEF: NaturalWonderDef = {
  id: 'great_barrier_reef',
  name: 'Great Barrier Reef',
  type: 'resource-bonus',
  tileCount: 2,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: 4 },
  description: "The world's largest coral reef system enriches coastal trade.",
  yields: { food: 1, gold: 2, science: 1 },
} as const;

export const LAKE_VICTORIA: NaturalWonderDef = {
  id: 'lake_victoria',
  name: 'Lake Victoria',
  type: 'fresh-water',
  tileCount: 2,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 4 },
  description: "Africa's largest lake sustains rich fishing communities and agricultural growth.",
  yields: { food: 3 },
  adjacencyEffect: { yield: 'food', value: 1 },
} as const;

// ── JJ4 additions: Civ VII canon wonders ───────────────────────────────────

export const REEF_OF_CORTEZ: NaturalWonderDef = {
  id: 'reef_of_cortez',
  name: 'Reef of Cortez',
  type: 'resource-bonus',
  tileCount: 1,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 3 },
  description: "One of the world's most diverse marine habitats drives scientific discovery and coastal trade.",
  yields: { food: 1, science: 1, culture: 1 },
} as const;

export const TSINGY_DE_BEMARAHA: NaturalWonderDef = {
  id: 'tsingy_de_bemaraha',
  name: 'Tsingy de Bemaraha',
  type: 'scenic',
  tileCount: 1,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
  description: "Madagascar's razor-sharp limestone forest is impassable but inspires awe and culture.",
  yields: { production: 2, culture: 1 },
  impassable: true,
} as const;

export const MOUNT_FUJI: NaturalWonderDef = {
  id: 'mount_fuji',
  name: 'Mount Fuji',
  type: 'volcano',
  tileCount: 1,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 4 },
  description: "Japan's sacred volcano inspires faith and culture while the fertile ash enriches surrounding fields.",
  yields: { production: 1, faith: 2, culture: 1 },
  impassable: true,
  adjacencyEffect: { yield: 'production', value: 1 },
} as const;

export const OLD_FAITHFUL: NaturalWonderDef = {
  id: 'old_faithful',
  name: 'Old Faithful',
  type: 'volcano',
  tileCount: 1,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 2 },
  description: 'The reliable geyser in Yellowstone symbolises industrial potential and scientific curiosity.',
  yields: { production: 1, science: 1 },
} as const;

export const ATACAMA_DESERT: NaturalWonderDef = {
  id: 'atacama_desert',
  name: 'Atacama Desert',
  type: 'scenic',
  tileCount: 2,
  firstSettleBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 4 },
  description: 'The driest non-polar desert on Earth hosts cutting-edge observatories and unique mineral wealth.',
  yields: { science: 2, gold: 1 },
} as const;

export const ALL_NATURAL_WONDERS: ReadonlyArray<NaturalWonderDef> = [
  MOUNT_EVEREST,
  GRAND_CANYON,
  VICTORIA_FALLS,
  MOUNT_KILIMANJARO,
  GULLFOSS,
  IGUAZU_FALLS,
  TORRES_DEL_PAINE,
  THERA,
  GALAPAGOS,
  ULURU,
  GREAT_BARRIER_REEF,
  LAKE_VICTORIA,
  REEF_OF_CORTEZ,
  TSINGY_DE_BEMARAHA,
  MOUNT_FUJI,
  OLD_FAITHFUL,
  ATACAMA_DESERT,
] as const;
