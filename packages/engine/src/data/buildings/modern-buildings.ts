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
  greatPersonPoints: { type: 'general', amount: 1 },
} as const;

export const UN_HEDQUARTERS: BuildingDef = {
  id: 'un_headquarters',
  name: 'United Nations',
  age: 'modern',
  cost: 1000,
  maintenance: 0,
  yields: { diplomacy: 10 },
  effects: ['+1 Diplomatic Victory point per turn', '+2 diplomatic envoy slots', 'All civilizations declare peace on completion'],
  requiredTech: 'mass_media',
  category: 'wonder',
  happinessCost: 0,
  isWonder: true,
  greatPersonPoints: { type: 'diplomat', amount: 1 },
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
  yields: { housing: 4 },
  effects: ['+20% growth rate'],
  requiredTech: 'industrialization',
  category: 'food',
  growthRateBonus: 0.2,
  happinessCost: 0,
} as const;

export const ALL_MODERN_BUILDINGS: ReadonlyArray<BuildingDef> = [
  FACTORY, RESEARCH_LAB, POWER_PLANT, NUCLEAR_PLANT, BROADCAST_TOWER, HOSPITAL, AIRPORT, MALL, STADIUM, MILITARY_BASE,
  MILITARY_ACADEMY, AERODROME, CITY_PARK, DEPARTMENT_STORE, RADIO_STATION, MUSEUM, OPERA_HOUSE, SCHOOLHOUSE, RAIL_STATION, TENEMENT,
  EIFFEL_TOWER, STATUE_OF_LIBERTY, OXFORD_UNIVERSITY, BIG_BEN, PENTAGON, UN_HEDQUARTERS,
] as const;
