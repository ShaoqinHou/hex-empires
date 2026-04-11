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

export const ALL_MODERN_TECHS: ReadonlyArray<TechnologyDef> = [
  SCIENTIFIC_THEORY, RIFLING, INDUSTRIALIZATION,
  STEAM_POWER, ELECTRICITY, REPLACEABLE_PARTS,
  FLIGHT, NUCLEAR_FISSION, COMBINED_ARMS, ROCKETRY,
  MASS_CONSUMPTION, MASS_MEDIA, AMPHIBIOUS_WARFARE, RADAR,
];
