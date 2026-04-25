import type { BuildingDef } from '../../types/Building';

export const FACTORY: BuildingDef = {
  id: 'factory',
  name: 'Factory',
  age: 'modern',
  cost: 600,
  maintenance: 3,
  yields: { production: 12 },
  effects: [],
  requiredTech: 'industrialization',
  category: 'military',
  happinessCost: 4,
} as const;

export const RESEARCH_LAB: BuildingDef = {
  id: 'research_lab',
  name: 'Research Lab',
  age: 'modern',
  cost: 650,
  maintenance: 3,
  yields: { science: 6 },
  effects: [],
  requiredTech: 'scientific_theory',
  category: 'science',
  happinessCost: 4,
} as const;

export const POWER_PLANT: BuildingDef = {
  id: 'power_plant',
  name: 'Power Plant',
  age: 'modern',
  cost: 400,
  maintenance: 4,
  yields: { production: 4 },
  effects: [],
  requiredTech: 'electricity',
  category: 'military',
  happinessCost: 4,
} as const;

export const NUCLEAR_PLANT: BuildingDef = {
  id: 'nuclear_plant',
  name: 'Nuclear Plant',
  age: 'modern',
  cost: 500,
  maintenance: 5,
  yields: { production: 8, science: 3 },
  effects: [],
  requiredTech: 'nuclear_fission',
  category: 'military',
  happinessCost: 4,
} as const;

export const BROADCAST_TOWER: BuildingDef = {
  id: 'broadcast_tower',
  name: 'Broadcast Tower',
  age: 'modern',
  cost: 300,
  maintenance: 2,
  yields: { culture: 6 },
  effects: [],
  requiredTech: 'flight',
  category: 'culture',
  happinessCost: 4,
} as const;

export const HOSPITAL: BuildingDef = {
  id: 'hospital',
  name: 'Hospital',
  age: 'modern',
  cost: 350,
  maintenance: 3,
  yields: { food: 3 },
  effects: ['+15% city growth rate'],
  requiredTech: 'scientific_theory',
  category: 'happiness',
  happinessCost: 0,
} as const;

export const AIRPORT: BuildingDef = {
  id: 'airport',
  name: 'Airport',
  age: 'modern',
  cost: 450,
  maintenance: 4,
  yields: { production: 2, gold: 2 },
  effects: [],
  requiredTech: 'flight',
  category: 'gold',
  happinessCost: 0,
} as const;

export const MALL: BuildingDef = {
  id: 'mall',
  name: 'Mall',
  age: 'modern',
  cost: 350,
  maintenance: 2,
  yields: { gold: 5 },
  effects: [],
  requiredTech: 'mass_consumption',
  category: 'gold',
  happinessCost: 2,
} as const;

export const STADIUM: BuildingDef = {
  id: 'stadium',
  name: 'Stadium',
  age: 'modern',
  cost: 400,
  maintenance: 3,
  yields: { culture: 7 },
  effects: [],
  requiredTech: 'mass_media',
  category: 'culture',
  happinessCost: 2,
} as const;

export const MILITARY_BASE: BuildingDef = {
  id: 'military_base',
  name: 'Military Base',
  age: 'modern',
  cost: 380,
  maintenance: 4,
  yields: { production: 3 },
  effects: ['+20% unit production cost'],
  requiredTech: 'combined_arms',
  category: 'military',
  happinessCost: 3,
} as const;

// ── World Wonders (Modern) ──

export const EIFFEL_TOWER: BuildingDef = {
  id: 'eiffel_tower',
  name: 'Eiffel Tower',
  age: 'modern',
  cost: 700,
  maintenance: 0,
  yields: { culture: 8 },
  effects: ['+2 Culture adjacency', '+1 Great Artist point per turn', 'Double tourism from all museums'],
  requiredTech: 'industrialization',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'artist', amount: 1 },
} as const;

export const STATUE_OF_LIBERTY: BuildingDef = {
  id: 'statue_of_liberty',
  name: 'Statue of Liberty',
  age: 'modern',
  cost: 650,
  maintenance: 0,
  yields: { culture: 5 },
  effects: ['+1 Great Person point per turn', '+25% great person generation', 'Immigrate 1 population to each city upon completion'],
  requiredTech: 'mass_media',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'artist', amount: 1 },
} as const;

export const OXFORD_UNIVERSITY: BuildingDef = {
  id: 'oxford_university',
  name: 'Oxford University',
  age: 'modern',
  cost: 600,
  maintenance: 0,
  yields: { science: 8 },
  effects: ['+2 Science adjacency', '+1 Great Scientist point per turn', 'Instantly grant 2 random free technologies'],
  requiredTech: 'scientific_theory',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'scientist', amount: 1 },
} as const;

export const BIG_BEN: BuildingDef = {
  id: 'big_ben',
  name: 'Big Ben',
  age: 'modern',
  cost: 550,
  maintenance: 0,
  yields: { gold: 6 },
  effects: ['+1 Great Merchant point per turn', '+5 gold from all trade routes', 'Gain 1 free trader'],
  requiredTech: 'economics',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'merchant', amount: 1 },
} as const;

export const PENTAGON: BuildingDef = {
  id: 'pentagon',
  name: 'The Pentagon',
  age: 'modern',
  cost: 800,
  maintenance: 0,
  yields: { production: 5 },
  effects: ['+1 Great General point per turn', 'All land units start with +1 promotion', '+50% military policy slot capacity'],
  requiredTech: 'combined_arms',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'general', amount: 1 },
} as const;

export const UN_HEDQUARTERS: BuildingDef = {
  id: 'un_headquarters',
  name: 'United Nations',
  age: 'modern',
  cost: 1000,
  maintenance: 0,
  yields: { influence: 10 },
  effects: ['+1 Diplomatic Victory point per turn', '+2 diplomatic envoy slots', 'All civilizations declare peace on completion'],
  requiredTech: 'mass_media',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'diplomat', amount: 1 },
} as const;

export const BRANDENBURG_GATE: BuildingDef = {
  id: 'brandenburg_gate',
  name: 'Brandenburg Gate',
  age: 'modern',
  cost: 900,
  maintenance: 0,
  yields: { culture: 4, production: 3 },
  effects: ['Requires a Military Academy in this city', 'All land units gain +5 Combat Strength in friendly territory'],
  requiredTech: 'combined_arms',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'general', amount: 1 },
} as const;

export const SYDNEY_OPERA_HOUSE: BuildingDef = {
  id: 'sydney_opera_house',
  name: 'Sydney Opera House',
  age: 'modern',
  cost: 850,
  maintenance: 0,
  yields: { culture: 8 },
  effects: ['Must be placed on a Coastal urban tile', '+1 Culture on every Coast tile in this city'],
  requiredTech: 'mass_media',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'artist', amount: 1 },
} as const;

export const PANAMA_CANAL: BuildingDef = {
  id: 'panama_canal',
  name: 'Panama Canal',
  age: 'modern',
  cost: 1100,
  maintenance: 0,
  yields: { gold: 6, production: 2 },
  effects: ['Allows naval units to cross between oceans', '+4 Gold per Trade Route'],
  requiredTech: 'industrialization',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'engineer', amount: 1 },
} as const;

export const BROADWAY: BuildingDef = {
  id: 'broadway',
  name: 'Broadway',
  age: 'modern',
  cost: 800,
  maintenance: 0,
  yields: { culture: 6, gold: 2 },
  effects: ['Requires an Opera House in this city', '+2 Culture on Theatre-type buildings empire-wide'],
  requiredTech: 'mass_media',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'writer', amount: 1 },
} as const;

export const CRISTO_REDENTOR: BuildingDef = {
  id: 'cristo_redentor',
  name: 'Cristo Redentor',
  age: 'modern',
  cost: 850,
  maintenance: 0,
  yields: { faith: 4, culture: 2 },
  effects: ['Must be placed adjacent to a Mountain', 'All Trade Routes grant +1 Religion spread'],
  requiredTech: 'flight',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'prophet', amount: 1 },
} as const;

export const MILITARY_ACADEMY: BuildingDef = {
  id: 'military_academy',
  name: 'Military Academy',
  age: 'modern',
  cost: 380,
  maintenance: 3,
  yields: { production: 2 },
  effects: ['+30% military XP', '+1 Great General point per turn'],
  requiredTech: 'combined_arms',
  category: 'military',
  happinessCost: 3,
  greatPersonPoints: { type: 'general', amount: 1 },
} as const;

export const AERODROME: BuildingDef = {
  id: 'aerodrome',
  name: 'Aerodrome',
  age: 'modern',
  cost: 420,
  maintenance: 3,
  yields: { production: 3 },
  effects: ['+25% air unit production speed', '+2 air unit slots'],
  requiredTech: 'flight',
  category: 'military',
  happinessCost: 3,
} as const;

export const CITY_PARK: BuildingDef = {
  id: 'city_park',
  name: 'City Park',
  age: 'modern',
  cost: 280,
  maintenance: 2,
  yields: { culture: 3, food: 1 },
  effects: ['+3 Amenities', '+10% growth rate'],
  requiredTech: 'mass_consumption',
  category: 'happiness',
  growthRateBonus: 0.1,
  happinessCost: 0,
} as const;

export const DEPARTMENT_STORE: BuildingDef = {
  id: 'department_store',
  name: 'Department Store',
  age: 'modern',
  cost: 320,
  maintenance: 2,
  yields: { gold: 6 },
  effects: ['+2 Amenities', '+15% gold from trade routes'],
  requiredTech: 'mass_consumption',
  category: 'gold',
  happinessCost: 2,
} as const;

export const RADIO_STATION: BuildingDef = {
  id: 'radio_station',
  name: 'Radio Station',
  age: 'modern',
  cost: 300,
  maintenance: 2,
  yields: { culture: 4 },
  effects: ['+25% cultural influence range'],
  requiredTech: 'mass_media',
  category: 'culture',
  happinessCost: 4,
} as const;

export const MUSEUM: BuildingDef = {
  id: 'museum',
  name: 'Museum',
  age: 'modern',
  cost: 360,
  maintenance: 2,
  yields: { culture: 5 },
  effects: ['+2 Great Work slots', '+1 Great Artist point per turn'],
  requiredTech: 'mass_media',
  category: 'culture',
  happinessCost: 2,
  greatPersonPoints: { type: 'artist', amount: 1 },
  /** BB5.1: Museums provide 4 codex display slots (+2 science per placed codex). */
  codexSlots: 4,
} as const;

export const OPERA_HOUSE: BuildingDef = {
  id: 'opera_house',
  name: 'Opera House',
  age: 'modern',
  cost: 340,
  maintenance: 2,
  yields: { culture: 4, gold: 1 },
  effects: ['+2 Amenities', '+1 Great Writer point per turn'],
  requiredTech: 'electricity',
  category: 'culture',
  happinessCost: 2,
  greatPersonPoints: { type: 'writer', amount: 1 },
} as const;

export const SCHOOLHOUSE: BuildingDef = {
  id: 'schoolhouse',
  name: 'Schoolhouse',
  age: 'modern',
  cost: 290,
  maintenance: 2,
  yields: { science: 4 },
  effects: ['+15% science from campuses'],
  requiredTech: 'scientific_theory',
  category: 'science',
  happinessCost: 4,
} as const;

export const RAIL_STATION: BuildingDef = {
  id: 'rail_station',
  name: 'Rail Station',
  age: 'modern',
  cost: 400,
  maintenance: 3,
  yields: { production: 3, gold: 2 },
  effects: ['+1 trade route capacity', '+2 production from mines'],
  requiredTech: 'steam_power',
  category: 'gold',
  happinessCost: 2,
} as const;

export const TENEMENT: BuildingDef = {
  id: 'tenement',
  name: 'Tenement',
  age: 'modern',
  cost: 250,
  maintenance: 1,
  yields: { happiness: 4 },
  effects: ['+20% growth rate'],
  requiredTech: 'industrialization',
  category: 'food',
  growthRateBonus: 0.2,
  happinessCost: 0,
} as const;

export const WORLDS_FAIR: BuildingDef = {
  id: 'worlds_fair',
  name: "World's Fair",
  age: 'modern',
  cost: 900,
  maintenance: 0,
  yields: { culture: 10, gold: 3 },
  effects: [
    'Terminal Cultural Victory wonder — requires 10 Artifacts collected (X5.1)',
    '+4 Culture to all cities',
    '+1 Great Artist point per turn',
    'Unlocks Cultural Victory when 10 Artifacts have been excavated by Explorer units',
  ],
  requiredCivic: 'natural_history',
  requiredTech: null,
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'artist', amount: 1 },
} as const;

/**
 * X5.1: World Bank wonder — Economic Victory terminal wonder.
 * Player must build this AND establish trade routes to >= 3 distinct rival civs.
 * Requires Mercantilism civic.
 */
export const WORLD_BANK: BuildingDef = {
  id: 'world_bank',
  name: 'World Bank',
  age: 'modern',
  cost: 1000,
  maintenance: 0,
  yields: { gold: 12 },
  effects: [
    'Terminal Economic Victory wonder — requires trade routes to >= 3 distinct rival civilizations',
    '+5 Gold per active trade route',
    '+1 Great Merchant point per turn',
    'Unlocks Economic Victory when 3 or more distinct rival civilizations are trading partners',
  ],
  requiredCivic: 'mercantilism',
  requiredTech: null,
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'merchant', amount: 1 },
} as const;

export const MANHATTAN_PROJECT: BuildingDef = {
  id: 'manhattan_project',
  name: 'Manhattan Project',
  age: 'modern',
  cost: 1200,
  maintenance: 0,
  yields: { science: 6, production: 4 },
  effects: [
    'Requires ideology unlock (any ideology chosen)',
    'Enables Nuclear Fission projects in all cities',
    '+1 Great Scientist point per turn',
    'Terminal Military Victory prerequisite wonder',
  ],
  requiredTech: 'nuclear_fission',
  requiredCivic: 'ideology_unlock',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'scientist', amount: 1 },
} as const;

export const WORLDS_FAIR_EXTRA: BuildingDef = {
  id: 'worlds_fair_extra',
  name: "World's Fair Exhibition Hall",
  age: 'modern',
  cost: 950,
  maintenance: 0,
  yields: { culture: 8, gold: 6 },
  effects: [
    'Requires a Stadium in this city',
    '+6 Gold from all trade routes',
    '+2 Great Merchant point per turn',
    'Doubles tourism output of this city',
  ],
  requiredTech: 'mass_media',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  isAgeless: true,
  greatPersonPoints: { type: 'merchant', amount: 2 },
} as const;

export const SOLAR_FARM: BuildingDef = {
  id: 'solar_farm',
  name: 'Solar Farm',
  age: 'modern',
  cost: 360,
  maintenance: 3,
  yields: { production: 5, science: 2 },
  effects: ['+10% science from campus buildings'],
  requiredTech: 'electricity',
  category: 'science',
  happinessCost: 2,
} as const;

export const ALL_MODERN_BUILDINGS: ReadonlyArray<BuildingDef> = [
  FACTORY, RESEARCH_LAB, POWER_PLANT, NUCLEAR_PLANT, BROADCAST_TOWER, HOSPITAL, AIRPORT, MALL, STADIUM, MILITARY_BASE,
  MILITARY_ACADEMY, AERODROME, CITY_PARK, DEPARTMENT_STORE, RADIO_STATION, MUSEUM, OPERA_HOUSE, SCHOOLHOUSE, RAIL_STATION, TENEMENT,
  SOLAR_FARM,
  EIFFEL_TOWER, STATUE_OF_LIBERTY, OXFORD_UNIVERSITY, BIG_BEN, PENTAGON, UN_HEDQUARTERS,
  BRANDENBURG_GATE, SYDNEY_OPERA_HOUSE, PANAMA_CANAL, BROADWAY, CRISTO_REDENTOR,
  WORLDS_FAIR, MANHATTAN_PROJECT, WORLDS_FAIR_EXTRA, WORLD_BANK,
] as const;
