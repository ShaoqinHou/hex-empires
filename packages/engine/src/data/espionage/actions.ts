import type { EspionageActionDef } from '../../types/Espionage';

/** Y5 — Espionage action stubs (diplomacy F-05). */

export const STEAL_TECH: EspionageActionDef = {
  id: 'steal_tech',
  name: 'Steal Tech',
  description: 'Infiltrate the target\'s research facilities to steal a technology.',
  availableAge: 'antiquity',
  influenceCostPerTurn: 5,
  detectionChance: 0.15,
  effectCategory: 'steal',
} as const;

export const STEAL_CIVICS: EspionageActionDef = {
  id: 'steal_civics',
  name: 'Steal Civics',
  description: 'Infiltrate cultural institutions to steal civic knowledge.',
  availableAge: 'antiquity',
  influenceCostPerTurn: 5,
  detectionChance: 0.15,
  effectCategory: 'steal',
} as const;

export const INCITE_REVOLT: EspionageActionDef = {
  id: 'incite_revolt',
  name: 'Incite Revolt',
  description: 'Stir unrest in a target city, reducing happiness and production.',
  availableAge: 'exploration',
  influenceCostPerTurn: 8,
  detectionChance: 0.20,
  effectCategory: 'political',
} as const;

export const SABOTAGE_PRODUCTION: EspionageActionDef = {
  id: 'sabotage_production',
  name: 'Sabotage Production',
  description: 'Disrupt industrial output in a target city.',
  availableAge: 'exploration',
  influenceCostPerTurn: 7,
  detectionChance: 0.18,
  effectCategory: 'sabotage',
} as const;

export const ASSASSINATE_GOVERNOR: EspionageActionDef = {
  id: 'assassinate_governor',
  name: 'Assassinate Governor',
  description: 'Eliminate a foreign governor to destabilise a rival city.',
  availableAge: 'exploration',
  influenceCostPerTurn: 10,
  detectionChance: 0.25,
  effectCategory: 'political',
} as const;

export const FABRICATE_SCANDAL: EspionageActionDef = {
  id: 'fabricate_scandal',
  name: 'Fabricate Scandal',
  description: 'Spread disinformation to damage the target\'s diplomatic standing.',
  availableAge: 'modern',
  influenceCostPerTurn: 8,
  detectionChance: 0.12,
  effectCategory: 'intel',
} as const;

export const EXTRACT_INTEL: EspionageActionDef = {
  id: 'extract_intel',
  name: 'Extract Intel',
  description: 'Gather military and economic intelligence on the target empire.',
  availableAge: 'modern',
  influenceCostPerTurn: 6,
  detectionChance: 0.10,
  effectCategory: 'intel',
} as const;

export const POISON_SUPPLY: EspionageActionDef = {
  id: 'poison_supply',
  name: 'Poison Supply',
  description: 'Contaminate supply lines to weaken enemy units in the field.',
  availableAge: 'modern',
  influenceCostPerTurn: 12,
  detectionChance: 0.22,
  effectCategory: 'sabotage',
} as const;
