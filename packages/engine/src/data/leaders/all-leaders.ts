import type { LeaderDef, AgendaDef } from './types';

const AUGUSTUS_AGENDAS: readonly AgendaDef[] = [
  { id: 'expansionist', name: 'Expansionist', triggerAction: 'FOUND_CITY', relationshipDelta: 1, condition: 'Likes civs that found cities rapidly' },
  { id: 'builder', name: 'Builder', triggerAction: 'BUILDING_COMPLETE', relationshipDelta: 1, condition: 'Likes civs that construct buildings' },
] as const;

export const AUGUSTUS: LeaderDef = {
  id: 'augustus',
  name: 'Augustus',
  ability: {
    name: 'Imperium Maius',
    description: '+5 combat strength when defending. Cities grow 10% faster.',
    effects: [{ type: 'MODIFY_COMBAT', target: 'all', value: 5 }],
  },
  agendas: AUGUSTUS_AGENDAS,
  startingBias: 'grassland',
  historicalCivId: 'rome',

  primaryAttributes: ['economic', 'militaristic'],
  // F-05: persona scaffold — two variants of Augustus
  personas: [
    {
      id: 'augustus_imperator',
      name: 'Imperator',
      abilityOverride: {
        name: 'Imperial Legion',
        description: '+7 combat strength for melee units. +1 production in all cities.',
        effects: [
          { type: 'MODIFY_COMBAT', target: 'melee', value: 7 },
          { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 },
        ],
      },
      primaryAttributesOverride: ['militaristic', 'economic'],
    },
    {
      id: 'augustus_pater_patriae',
      name: 'Pater Patriae',
      abilityOverride: {
        name: 'Father of the Nation',
        description: '+3 culture and +2 food in all cities.',
        effects: [
          { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
          { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 2 },
        ],
      },
      primaryAttributesOverride: ['cultural', 'economic'],
    },
  ],
};

const CLEOPATRA_AGENDAS: readonly AgendaDef[] = [
  { id: 'diplomat', name: 'Diplomat', triggerAction: 'DECLARE_FRIENDSHIP', relationshipDelta: 2, condition: 'Likes civs that maintain friendly relations' },
  { id: 'trader', name: 'Trader', triggerAction: 'TRADE_ROUTE_ESTABLISHED', relationshipDelta: 1, condition: 'Likes civs that trade actively' },
] as const;

// [CIV-VI-HOLDOVER: unverified VII name — "Mediterranean Bride" is from Civ VI]
export const CLEOPATRA: LeaderDef = {
  id: 'cleopatra',
  name: 'Cleopatra',
  ability: {
    name: 'Mediterranean Bride',
    description: 'Trade routes to other civs provide +4 gold. +2 food from floodplains.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 }],
  },
  agendas: CLEOPATRA_AGENDAS,
  startingBias: 'floodplains',
  historicalCivId: 'egypt',

  primaryAttributes: ['diplomatic', 'economic'],
};

const PERICLES_AGENDAS: readonly AgendaDef[] = [
  { id: 'culturalist', name: 'Culturalist', triggerAction: 'CULTURE_MILESTONE', relationshipDelta: 1, condition: 'Likes civs that invest in culture' },
  { id: 'diplomat', name: 'Diplomat', triggerAction: 'DECLARE_FRIENDSHIP', relationshipDelta: 2, condition: 'Likes civs that maintain friendly relations' },
] as const;

// [CIV-VI-HOLDOVER: not confirmed as a Civ VII leader — carried from Civ VI]
export const PERICLES: LeaderDef = {
  id: 'pericles',
  name: 'Pericles',
  ability: {
    name: 'Surrounded by Glory',
    description: '+5% culture per city-state you are suzerain of.',
    // TODO(W3-04 F-08): dynamic multiplier pending attribute system (W3-07). Currently flat +2 culture.
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 }],
  },
  agendas: PERICLES_AGENDAS,
  historicalCivId: 'greece',

  primaryAttributes: ['cultural', 'diplomatic'],
};

const CYRUS_AGENDAS: readonly AgendaDef[] = [
  { id: 'conqueror', name: 'Conqueror', triggerAction: 'WAR_DECLARED', relationshipDelta: -2, condition: 'Dislikes civs that fall behind militarily' },
  { id: 'opportunist', name: 'Opportunist', triggerAction: 'WAR_DECLARED', relationshipDelta: 1, condition: 'Likes civs that exploit momentary advantages' },
] as const;

// [CIV-VI-HOLDOVER: not confirmed as a Civ VII leader — carried from Civ VI]
export const CYRUS: LeaderDef = {
  id: 'cyrus',
  name: 'Cyrus',
  ability: {
    name: 'Fall of Babylon',
    description: '+2 movement for all units for 10 turns after declaring surprise war.',
    effects: [{ type: 'MODIFY_MOVEMENT', target: 'all', value: 2 }],
  },
  agendas: CYRUS_AGENDAS,
  historicalCivId: 'persia',

  primaryAttributes: ['militaristic', 'diplomatic'],
};

const GANDHI_AGENDAS: readonly AgendaDef[] = [
  { id: 'peacemaker', name: 'Peacemaker', triggerAction: 'WAR_DECLARED', relationshipDelta: -3, condition: 'Dislikes civs that declare wars' },
  { id: 'religious', name: 'Religious', triggerAction: 'FOUND_RELIGION', relationshipDelta: 2, condition: 'Likes civs that found and spread religion' },
] as const;

// [CIV-VI-HOLDOVER: not confirmed as a Civ VII leader — carried from Civ VI]
export const GANDHI: LeaderDef = {
  id: 'gandhi',
  name: 'Gandhi',
  ability: {
    name: 'Satyagraha',
    description: '+5 faith for each civ at peace with. Opponents receive doubled war weariness.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 3 }],
  },
  agendas: GANDHI_AGENDAS,
  historicalCivId: 'india',

  primaryAttributes: ['cultural', 'scientific'],
};

const QIN_SHI_HUANG_AGENDAS: readonly AgendaDef[] = [
  { id: 'builder', name: 'Builder', triggerAction: 'BUILDING_COMPLETE', relationshipDelta: 1, condition: 'Likes civs that construct buildings' },
  { id: 'wonder_obsessed', name: 'Wonder Obsessed', triggerAction: 'WONDER_BUILT', relationshipDelta: 2, condition: 'Likes civs that build wonders' },
] as const;

export const QIN_SHI_HUANG: LeaderDef = {
  id: 'qin_shi_huang',
  name: 'Qin Shi Huang',
  ability: {
    name: 'First Emperor',
    description: 'Builders receive extra charge. Can spend builder charges to rush wonders.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 }],
  },
  agendas: QIN_SHI_HUANG_AGENDAS,
  historicalCivId: 'china',

  primaryAttributes: ['militaristic', 'economic'],
};

const ALEXANDER_AGENDAS: readonly AgendaDef[] = [
  { id: 'conqueror', name: 'Conqueror', triggerAction: 'WAR_DECLARED', relationshipDelta: -2, condition: 'Dislikes civs that fall behind militarily' },
  { id: 'expansionist', name: 'Expansionist', triggerAction: 'FOUND_CITY', relationshipDelta: 1, condition: 'Likes civs that found cities rapidly' },
] as const;

export const ALEXANDER: LeaderDef = {
  id: 'alexander',
  name: 'Alexander',
  ability: {
    name: 'To the World\'s End',
    description: 'Cities never incur war weariness. All military units heal when capturing a city. Grants Hephaestion, a named commander, at game start.',
    effects: [
      { type: 'MODIFY_COMBAT', target: 'all', value: 3 },
      { type: 'GRANT_UNIT', unitId: 'hephaestion', count: 1 },
    ],
  },
  agendas: ALEXANDER_AGENDAS,
  startingBias: 'hills',
  historicalCivId: 'greece',

  primaryAttributes: ['militaristic', 'expansionist'],
};

const HATSHEPSUT_AGENDAS: readonly AgendaDef[] = [
  { id: 'trader', name: 'Trader', triggerAction: 'TRADE_ROUTE_ESTABLISHED', relationshipDelta: 1, condition: 'Likes civs that trade actively' },
  { id: 'builder', name: 'Builder', triggerAction: 'BUILDING_COMPLETE', relationshipDelta: 1, condition: 'Likes civs that construct buildings' },
] as const;

export const HATSHEPSUT: LeaderDef = {
  id: 'hatshepsut',
  name: 'Hatshepsut',
  ability: {
    name: 'Gods Wife of Amun',
    description: 'International trade routes generate +2 gold and +1 food.',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 }],
  },
  agendas: HATSHEPSUT_AGENDAS,
  historicalCivId: 'egypt',

  primaryAttributes: ['cultural', 'economic'],
};

const GENGHIS_KHAN_AGENDAS: readonly AgendaDef[] = [
  { id: 'conqueror', name: 'Conqueror', triggerAction: 'WAR_DECLARED', relationshipDelta: -2, condition: 'Dislikes civs that fall behind militarily' },
  { id: 'expansionist', name: 'Expansionist', triggerAction: 'FOUND_CITY', relationshipDelta: 1, condition: 'Likes civs that found cities rapidly' },
] as const;

// [CIV-VI-HOLDOVER: not confirmed as a Civ VII leader — carried from Civ VI]
export const GENGHIS_KHAN: LeaderDef = {
  id: 'genghis_khan',
  name: 'Genghis Khan',
  ability: {
    name: 'Mongol Horde',
    description: '+10 combat strength for cavalry units. Cavalry units ignore movement penalties from terrain.',
    effects: [{ type: 'MODIFY_COMBAT', target: 'cavalry', value: 10 }],
  },
  agendas: GENGHIS_KHAN_AGENDAS,
  startingBias: 'plains',
  historicalCivId: 'mongolia',

  primaryAttributes: ['militaristic', 'expansionist'],
};

// ── Confucius (China, Antiquity) ──

const CONFUCIUS_AGENDAS: readonly AgendaDef[] = [
  { id: 'scholar', name: 'Scholar', triggerAction: 'SET_RESEARCH', relationshipDelta: 1, condition: 'Likes civs that prioritize science and education' },
  { id: 'harmonizer', name: 'Harmonizer', triggerAction: 'DECLARE_FRIENDSHIP', relationshipDelta: 2, condition: 'Likes civs that maintain peaceful relations' },
] as const;

export const CONFUCIUS: LeaderDef = {
  id: 'confucius',
  name: 'Confucius',
  ability: {
    name: 'Great Teacher',
    description: '+3 science per city. Specialists generate +1 additional science.',
    effects: [
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 3 },
    ],
  },
  agendas: CONFUCIUS_AGENDAS,
  startingBias: 'grassland',
  historicalCivId: 'china',
  primaryAttributes: ['scientific', 'cultural'],
};

// ── Ibn Battuta (Morocco, Exploration) ──

const IBN_BATTUTA_AGENDAS: readonly AgendaDef[] = [
  { id: 'explorer', name: 'Explorer', triggerAction: 'FOUND_CITY', relationshipDelta: 1, condition: 'Likes civs that explore and expand widely' },
  { id: 'trader', name: 'Trader', triggerAction: 'TRADE_ROUTE_ESTABLISHED', relationshipDelta: 1, condition: 'Likes civs that trade actively' },
] as const;

export const IBN_BATTUTA: LeaderDef = {
  id: 'ibn_battuta',
  name: 'Ibn Battuta',
  ability: {
    name: 'Travels of Ibn Battuta',
    description: '+2 gold per trade route. Scouts and explorers gain +1 movement.',
    effects: [
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 },
      { type: 'MODIFY_MOVEMENT', target: 'civilian', value: 1 },
    ],
  },
  agendas: IBN_BATTUTA_AGENDAS,
  startingBias: 'desert',
  historicalCivId: 'ottoman',
  primaryAttributes: ['economic', 'expansionist'],
};

// ── Harriet Tubman (America, Modern) ──

const HARRIET_TUBMAN_AGENDAS: readonly AgendaDef[] = [
  { id: 'liberator', name: 'Liberator', triggerAction: 'WAR_DECLARED', relationshipDelta: -1, condition: 'Dislikes civs that declare surprise wars' },
  { id: 'diplomat', name: 'Diplomat', triggerAction: 'DECLARE_FRIENDSHIP', relationshipDelta: 2, condition: 'Likes civs that maintain friendly relations' },
] as const;

export const HARRIET_TUBMAN: LeaderDef = {
  id: 'harriet_tubman',
  name: 'Harriet Tubman',
  ability: {
    name: 'Underground Railroad',
    description: '+5 combat strength when defending in friendly territory. Spies operate 20% faster.',
    effects: [
      { type: 'MODIFY_COMBAT', target: 'all', value: 5 },
    ],
  },
  agendas: HARRIET_TUBMAN_AGENDAS,
  startingBias: 'grassland',
  historicalCivId: 'america',
  primaryAttributes: ['militaristic', 'diplomatic'],
};

// ── Napoleon (France, Modern) ──

const NAPOLEON_AGENDAS: readonly AgendaDef[] = [
  { id: 'conqueror', name: 'Conqueror', triggerAction: 'WAR_DECLARED', relationshipDelta: -2, condition: 'Dislikes civs that fall behind militarily' },
  { id: 'culturalist', name: 'Culturalist', triggerAction: 'CULTURE_MILESTONE', relationshipDelta: 1, condition: 'Likes civs that invest in culture' },
] as const;

export const NAPOLEON: LeaderDef = {
  id: 'napoleon',
  name: 'Napoleon',
  ability: {
    name: 'Empereur des Français',
    description: '+3 combat strength for all land units. +2 culture per city.',
    effects: [
      { type: 'MODIFY_COMBAT', target: 'melee', value: 3 },
      { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
    ],
  },
  agendas: NAPOLEON_AGENDAS,
  startingBias: 'plains',
  historicalCivId: 'france',
  primaryAttributes: ['militaristic', 'cultural'],
};

// ── Tecumseh (Shawnee, Exploration) ──

const TECUMSEH_AGENDAS: readonly AgendaDef[] = [
  { id: 'defender', name: 'Defender', triggerAction: 'WAR_DECLARED', relationshipDelta: -2, condition: 'Dislikes civs that declare wars of aggression' },
  { id: 'unifier', name: 'Unifier', triggerAction: 'DECLARE_FRIENDSHIP', relationshipDelta: 1, condition: 'Likes civs that form alliances' },
] as const;

export const TECUMSEH: LeaderDef = {
  id: 'tecumseh',
  name: 'Tecumseh',
  ability: {
    name: 'Pan-Confederacy',
    description: '+3 combat strength when fighting adjacent to friendly units. Independent powers are befriended 25% faster.',
    effects: [
      { type: 'MODIFY_COMBAT', target: 'melee', value: 3 },
    ],
  },
  agendas: TECUMSEH_AGENDAS,
  startingBias: 'plains',
  historicalCivId: 'america',
  primaryAttributes: ['militaristic', 'diplomatic'],
};

// ── Napoleon — Revolutionary (France, Modern alt persona) ──

const NAPOLEON_REVOLUTIONARY_AGENDAS: readonly AgendaDef[] = [
  { id: 'revolutionary', name: 'Revolutionary', triggerAction: 'WAR_DECLARED', relationshipDelta: -1, condition: 'Likes to spread revolution through conquest' },
  { id: 'expansionist', name: 'Expansionist', triggerAction: 'FOUND_CITY', relationshipDelta: 1, condition: 'Likes civs that found cities rapidly' },
] as const;

export const NAPOLEON_REVOLUTIONARY: LeaderDef = {
  id: 'napoleon_revolutionary',
  name: 'Napoleon (Revolutionary)',
  ability: {
    name: 'Revolutionary Zeal',
    description: '+5 combat strength for all units when attacking. Captured cities retain 50% more population.',
    effects: [
      { type: 'MODIFY_COMBAT', target: 'all', value: 5 },
    ],
  },
  agendas: NAPOLEON_REVOLUTIONARY_AGENDAS,
  startingBias: 'plains',
  historicalCivId: 'france',
  primaryAttributes: ['militaristic', 'expansionist'],
};

export const ALL_LEADERS: ReadonlyArray<LeaderDef> = [
  AUGUSTUS, CLEOPATRA, PERICLES, CYRUS, GANDHI,
  QIN_SHI_HUANG, ALEXANDER, HATSHEPSUT, GENGHIS_KHAN,
  CONFUCIUS, IBN_BATTUTA, HARRIET_TUBMAN, NAPOLEON,
  TECUMSEH, NAPOLEON_REVOLUTIONARY,
];
