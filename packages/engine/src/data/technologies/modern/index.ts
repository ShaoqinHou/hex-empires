import type { TechnologyDef } from '../types';

export const INDUSTRIALIZATION: TechnologyDef = {
  id: 'industrialization',
  name: 'Industrialization',
  age: 'modern',
  cost: 500,
  prerequisites: [],
  unlocks: ['factory'],
  description: 'Enables Factory building',
  treePosition: { row: 1, col: 0 },
};

export const SCIENTIFIC_THEORY: TechnologyDef = {
  id: 'scientific_theory',
  name: 'Scientific Theory',
  age: 'modern',
  cost: 500,
  prerequisites: [],
  unlocks: ['research_lab'],
  description: 'Enables Research Lab',
  treePosition: { row: 0, col: 0 },
};

export const RIFLING: TechnologyDef = {
  id: 'rifling',
  name: 'Rifling',
  age: 'modern',
  cost: 500,
  prerequisites: [],
  unlocks: ['infantry'],
  description: 'Enables Infantry unit',
  treePosition: { row: 2, col: 0 },
};

export const STEAM_POWER: TechnologyDef = {
  id: 'steam_power',
  name: 'Steam Power',
  age: 'modern',
  cost: 600,
  prerequisites: ['industrialization'],
  unlocks: ['ironclad'],
  description: 'Enables Ironclad naval unit',
  treePosition: { row: 3, col: 1 },
};

export const ELECTRICITY: TechnologyDef = {
  id: 'electricity',
  name: 'Electricity',
  age: 'modern',
  cost: 700,
  prerequisites: ['scientific_theory', 'industrialization'],
  unlocks: ['power_plant'],
  description: 'Enables Power Plant',
  treePosition: { row: 0, col: 1 },
};

export const REPLACEABLE_PARTS: TechnologyDef = {
  id: 'replaceable_parts',
  name: 'Replaceable Parts',
  age: 'modern',
  cost: 700,
  prerequisites: ['rifling'],
  unlocks: ['machine_gun'],
  description: 'Enables Machine Gun unit',
  treePosition: { row: 2, col: 1 },
};

export const FLIGHT: TechnologyDef = {
  id: 'flight',
  name: 'Flight',
  age: 'modern',
  cost: 800,
  prerequisites: ['electricity'],
  unlocks: ['biplane'],
  description: 'Enables air units',
  treePosition: { row: 1, col: 2 },
};

export const NUCLEAR_FISSION: TechnologyDef = {
  id: 'nuclear_fission',
  name: 'Nuclear Fission',
  age: 'modern',
  cost: 1000,
  prerequisites: ['electricity'],
  unlocks: ['nuclear_plant'],
  description: 'Enables nuclear power and weapons',
  treePosition: { row: 0, col: 2 },
};

export const COMBINED_ARMS: TechnologyDef = {
  id: 'combined_arms',
  name: 'Combined Arms',
  age: 'modern',
  cost: 900,
  prerequisites: ['replaceable_parts', 'flight'],
  unlocks: ['tank', 'fighter'],
  description: 'Enables Tank and Fighter units',
  treePosition: { row: 2, col: 2 },
};

export const ROCKETRY: TechnologyDef = {
  id: 'rocketry',
  name: 'Rocketry',
  age: 'modern',
  cost: 1200,
  prerequisites: ['nuclear_fission', 'combined_arms'],
  unlocks: ['rocket_artillery'],
  description: 'Enables Rocket Artillery',
  treePosition: { row: 1, col: 3 },
};

export const MASS_CONSUMPTION: TechnologyDef = {
  id: 'mass_consumption',
  name: 'Mass Consumption',
  age: 'modern',
  cost: 700,
  prerequisites: ['industrialization'],
  unlocks: ['mall'],
  description: 'Enables Mall and consumer economy',
  treePosition: { row: 3, col: 2 },
};

export const MASS_MEDIA: TechnologyDef = {
  id: 'mass_media',
  name: 'Mass Media',
  age: 'modern',
  cost: 750,
  prerequisites: ['scientific_theory'],
  unlocks: ['stadium'],
  description: 'Enables Stadium and cultural influence',
  treePosition: { row: 4, col: 1 },
};

export const AMPHIBIOUS_WARFARE: TechnologyDef = {
  id: 'amphibious_warfare',
  name: 'Amphibious Warfare',
  age: 'modern',
  cost: 800,
  prerequisites: ['rifling'],
  unlocks: ['marine'],
  description: 'Enables Marine unit',
  treePosition: { row: 2, col: 3 },
};

export const RADAR: TechnologyDef = {
  id: 'radar',
  name: 'Radar',
  age: 'modern',
  cost: 650,
  prerequisites: ['electricity'],
  unlocks: ['sam'],
  description: 'Enables SAM Battery',
  treePosition: { row: 0, col: 3 },
};

// --- Rulebook §9.6 expansion: missing modern-age technologies ---

export const ACADEMICS: TechnologyDef = {
  id: 'academics',
  name: 'Academics',
  age: 'modern',
  cost: 600,
  prerequisites: ['scientific_theory'],
  unlocks: ['schoolhouse', 'oxford_university'],
  description: 'Enables Schoolhouse and Oxford University wonder',
  treePosition: { row: 5, col: 1 },
};

export const MILITARY_SCIENCE: TechnologyDef = {
  id: 'military_science',
  name: 'Military Science',
  age: 'modern',
  cost: 750,
  prerequisites: ['rifling'],
  unlocks: ['military_academy', 'pentagon'],
  description: 'Enables Military Academy and the Pentagon wonder',
  treePosition: { row: 2, col: 2 },
};

export const URBANIZATION: TechnologyDef = {
  id: 'urbanization',
  name: 'Urbanization',
  age: 'modern',
  cost: 800,
  prerequisites: ['mass_media'],
  unlocks: ['opera_house', 'museum', 'department_store'],
  description: 'Enables Opera House, Museum, and Department Store',
  treePosition: { row: 4, col: 2 },
};

export const COMBUSTION: TechnologyDef = {
  id: 'combustion',
  name: 'Combustion',
  age: 'modern',
  cost: 850,
  prerequisites: ['steam_power'],
  unlocks: ['destroyer', 'submarine'],
  description: 'Enables Destroyer and Submarine naval units',
  treePosition: { row: 3, col: 2 },
};

export const RADIO: TechnologyDef = {
  id: 'radio',
  name: 'Radio',
  age: 'modern',
  cost: 750,
  prerequisites: ['electricity', 'mass_media'],
  unlocks: ['radio_station', 'broadcast_tower', 'tenement'],
  description: 'Enables Radio Station, Broadcast Tower, and Tenement',
  treePosition: { row: 4, col: 3 },
};

export const MASS_PRODUCTION: TechnologyDef = {
  id: 'mass_production',
  name: 'Mass Production',
  age: 'modern',
  cost: 850,
  prerequisites: ['industrialization'],
  unlocks: ['hospital', 'rail_station'],
  description: 'Enables Hospital and Rail Station via assembly-line production',
  treePosition: { row: 1, col: 1 },
};

export const MOBILIZATION: TechnologyDef = {
  id: 'mobilization',
  name: 'Mobilization',
  age: 'modern',
  cost: 1000,
  prerequisites: ['combustion', 'military_science'],
  unlocks: ['battleship', 'military_base'],
  description: 'Enables Battleship and Military Base',
  treePosition: { row: 3, col: 3 },
};

export const ARMOR: TechnologyDef = {
  id: 'armor',
  name: 'Armor',
  age: 'modern',
  cost: 1100,
  prerequisites: ['combined_arms'],
  unlocks: ['paratroopers', 'mechanized_infantry'],
  description: 'Enables Paratroopers and Mechanized Infantry',
  treePosition: { row: 2, col: 4 },
};

export const AERODYNAMICS: TechnologyDef = {
  id: 'aerodynamics',
  name: 'Aerodynamics',
  age: 'modern',
  cost: 1100,
  prerequisites: ['flight', 'combined_arms'],
  unlocks: ['bomber', 'airport', 'jet_fighter'],
  description: 'Enables Bomber, Airport, and Jet Fighter',
  treePosition: { row: 1, col: 4 },
};

export const ALL_MODERN_TECHS: ReadonlyArray<TechnologyDef> = [
  SCIENTIFIC_THEORY, RIFLING, INDUSTRIALIZATION,
  STEAM_POWER, ELECTRICITY, REPLACEABLE_PARTS,
  FLIGHT, NUCLEAR_FISSION, COMBINED_ARMS, ROCKETRY,
  MASS_CONSUMPTION, MASS_MEDIA, AMPHIBIOUS_WARFARE, RADAR,
  ACADEMICS, MILITARY_SCIENCE, URBANIZATION, COMBUSTION,
  RADIO, MASS_PRODUCTION, MOBILIZATION, ARMOR, AERODYNAMICS,
];
