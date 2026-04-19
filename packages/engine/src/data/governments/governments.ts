// Government definitions — first Government content (Cycle B).
//
// Types live here (locally) because the engine-level `types/Government.ts`
// from M7 has not yet landed on this branch. We keep the shape aligned
// with the design doc at `.claude/workflow/design/government-system.md`
// §4.1–4.3 and `rulebook-government-expansion.md` §14.1 so the types can
// be promoted to `types/Government.ts` in a later cycle without churning
// data files.

import type { Age, EffectDef } from '../../types/GameState';

// ── Shape ──

export type PolicyCategory =
  | 'military'
  | 'economic'
  | 'diplomatic'
  | 'wildcard';

export interface PolicySlotCounts {
  readonly military: number;
  readonly economic: number;
  readonly diplomatic: number;
  readonly wildcard: number;
}

export interface GovernmentDef {
  readonly id: string;
  readonly name: string;
  readonly age: Age;
  /** CivicId (must exist in ALL_CIVICS) that gates access to this government. */
  readonly unlockCivic: string;
  readonly policySlots: PolicySlotCounts;
  readonly legacyBonus: EffectDef;
  readonly description: string;
}

// ── Antiquity ──

export const CLASSICAL_REPUBLIC: GovernmentDef = {
  id: 'classical_republic',
  name: 'Classical Republic',
  age: 'antiquity',
  unlockCivic: 'code_of_laws',
  policySlots: { military: 0, economic: 1, diplomatic: 0, wildcard: 1 },
  legacyBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 1 },
  description:
    'Early representative government. +1 Culture per City while active.',
};

export const DESPOTISM: GovernmentDef = {
  id: 'despotism',
  name: 'Despotism',
  age: 'antiquity',
  unlockCivic: 'mysticism',
  policySlots: { military: 2, economic: 0, diplomatic: 0, wildcard: 0 },
  legacyBonus: { type: 'MODIFY_COMBAT', target: 'melee', value: 2 },
  description:
    'Strong-arm rule. +2 Combat Strength to Melee units while active.',
};

export const OLIGARCHY: GovernmentDef = {
  id: 'oligarchy',
  name: 'Oligarchy',
  age: 'antiquity',
  unlockCivic: 'state_workforce',
  policySlots: { military: 0, economic: 1, diplomatic: 1, wildcard: 0 },
  legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 },
  description:
    'Rule by elite council. +2 Gold per turn to the empire while active.',
};

// ── Exploration ──

export const FEUDAL_MONARCHY: GovernmentDef = {
  id: 'feudal_monarchy',
  name: 'Feudal Monarchy',
  age: 'exploration',
  unlockCivic: 'divine_right',
  policySlots: { military: 2, economic: 1, diplomatic: 0, wildcard: 0 },
  legacyBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 2 },
  description:
    'Hereditary royal rule. +2 Food per City-Center while active.',
};

export const PLUTOCRACY: GovernmentDef = {
  id: 'plutocracy',
  name: 'Plutocracy',
  age: 'exploration',
  unlockCivic: 'mercantilism',
  policySlots: { military: 0, economic: 2, diplomatic: 0, wildcard: 1 },
  legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 4 },
  description:
    'Wealth-driven oligarchy. +4 Gold per turn to the empire while active.',
};

export const THEOCRACY: GovernmentDef = {
  id: 'theocracy',
  name: 'Theocracy',
  age: 'exploration',
  unlockCivic: 'reformed_church',
  policySlots: { military: 1, economic: 0, diplomatic: 1, wildcard: 1 },
  legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 3 },
  description:
    'Religious authority rules the state. +3 Faith per turn to the empire.',
};

// ── Modern ──

export const ELECTIVE_REPUBLIC: GovernmentDef = {
  id: 'elective_republic',
  name: 'Elective Republic',
  age: 'modern',
  unlockCivic: 'suffrage',
  policySlots: { military: 1, economic: 2, diplomatic: 1, wildcard: 0 },
  legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
  description:
    'Government by elected representatives. +3 Culture per turn to the empire while active.',
};

// ── Barrel ──

export const ALL_GOVERNMENTS: ReadonlyArray<GovernmentDef> = [
  CLASSICAL_REPUBLIC,
  DESPOTISM,
  OLIGARCHY,
  FEUDAL_MONARCHY,
  PLUTOCRACY,
  THEOCRACY,
  ELECTIVE_REPUBLIC,
];
