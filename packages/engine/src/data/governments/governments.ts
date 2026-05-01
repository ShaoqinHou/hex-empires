// Government definitions — first Government content (Cycle B).
//
// Types live here (locally) because the engine-level `types/Government.ts`
// from M7 has not yet landed on this branch. We keep the shape aligned
// with the design doc at `.codex/workflow/design/government-system.md`
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

/**
 * Slot count for a GovernmentDef. Per VII §14.2 all slots are wildcard;
 * `total` is the Government's base slot count. The old typed-category
 * struct `{ military, economic, diplomatic, wildcard }` was removed in
 * W2-03.
 */
export interface PolicySlotCounts {
  readonly total: number;
}

/**
 * One of the two Celebration bonus options for a Government (§4.5 / §14.4).
 * Player picks Option A or Option B when a celebration is triggered.
 */
export interface GovernmentCelebrationBonus {
  readonly id: string;
  readonly name: string;
  readonly description: string;
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
  /** Exactly two celebration bonus options. Player picks one when threshold is crossed. */
  readonly celebrationBonuses: readonly [GovernmentCelebrationBonus, GovernmentCelebrationBonus];
  /** If set, this government is only available to the specified civilization. Undefined = universal. */
  readonly civRequired?: string;
}

// ── Antiquity ──

// Slot totals are the sum of the old { military, economic, diplomatic, wildcard }
// per-category counts, flattened to VII-style wildcard (§14.2 W2-03).

export const CLASSICAL_REPUBLIC: GovernmentDef = {
  id: 'classical_republic',
  name: 'Classical Republic',
  age: 'antiquity',
  unlockCivic: 'code_of_laws',
  policySlots: { total: 2 }, // was: military 0, economic 1, diplomatic 0, wildcard 1
  legacyBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 1 },
  description:
    'Early representative government. +1 Culture per City while active.',
  celebrationBonuses: [
    {
      id: 'classical-rep-culture',
      name: '+20% Culture for 10 turns',
      description: 'All empire culture output increased by 20% for the celebration window.',
    },
    {
      id: 'classical-rep-wonder',
      name: '+15% Production toward Wonders for 10 turns',
      description: 'Wonder production increased by 15% for the celebration window.',
    },
  ],
};

export const DESPOTISM: GovernmentDef = {
  id: 'despotism',
  name: 'Despotism',
  age: 'antiquity',
  unlockCivic: 'mysticism',
  policySlots: { total: 2 }, // was: military 2, economic 0, diplomatic 0, wildcard 0
  legacyBonus: { type: 'MODIFY_COMBAT', target: 'melee', value: 2 },
  description:
    'Strong-arm rule. +2 Combat Strength to Melee units while active.',
  celebrationBonuses: [
    {
      id: 'despotism-science',
      name: '+20% Science for 10 turns',
      description: 'Empire science output increased by 20% for the celebration window.',
    },
    {
      id: 'despotism-infantry',
      name: '+30% Production toward Infantry Units for 10 turns',
      description: 'Infantry unit production increased by 30% for the celebration window.',
    },
  ],
};

export const OLIGARCHY: GovernmentDef = {
  id: 'oligarchy',
  name: 'Oligarchy',
  age: 'antiquity',
  unlockCivic: 'state_workforce',
  policySlots: { total: 2 }, // was: military 0, economic 1, diplomatic 1, wildcard 0
  legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 },
  description:
    'Rule by elite council. +2 Gold per turn to the empire while active.',
  celebrationBonuses: [
    {
      id: 'oligarchy-food',
      name: '+20% Food for 10 turns',
      description: 'Empire food output increased by 20% for the celebration window.',
    },
    {
      id: 'oligarchy-buildings',
      name: '+30% Production toward Buildings for 10 turns',
      description: 'Building production increased by 30% for the celebration window.',
    },
  ],
};

// ── Exploration ──

export const FEUDAL_MONARCHY: GovernmentDef = {
  id: 'feudal_monarchy',
  name: 'Feudal Monarchy',
  age: 'exploration',
  unlockCivic: 'divine_right',
  policySlots: { total: 3 }, // was: military 2, economic 1, diplomatic 0, wildcard 0
  legacyBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 2 },
  description:
    'Hereditary royal rule. +2 Food per City-Center while active.',
  celebrationBonuses: [
    {
      id: 'feudal-monarchy-food',
      name: '+20% Food for 10 turns',
      description: 'Empire food output increased by 20% for the celebration window.',
    },
    {
      id: 'feudal-monarchy-cavalry-naval',
      name: '+30% Production toward Cavalry and Naval Units for 10 turns',
      description: 'Cavalry and naval unit production increased by 30% for the celebration window.',
    },
  ],
};

export const PLUTOCRACY: GovernmentDef = {
  id: 'plutocracy',
  name: 'Plutocracy',
  age: 'exploration',
  unlockCivic: 'mercantilism',
  policySlots: { total: 3 }, // was: military 0, economic 2, diplomatic 0, wildcard 1
  legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 4 },
  description:
    'Wealth-driven oligarchy. +4 Gold per turn to the empire while active.',
  celebrationBonuses: [
    {
      id: 'plutocracy-gold',
      name: '+20% Gold for 10 turns',
      description: 'Empire gold output increased by 20% for the celebration window.',
    },
    {
      id: 'plutocracy-overbuilding',
      name: '+30% Production toward Overbuilding for 10 turns',
      description: 'Overbuilding production increased by 30% for the celebration window.',
    },
  ],
};

export const THEOCRACY: GovernmentDef = {
  id: 'theocracy',
  name: 'Theocracy',
  age: 'exploration',
  unlockCivic: 'reformed_church',
  policySlots: { total: 3 }, // was: military 1, economic 0, diplomatic 1, wildcard 1
  legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 3 },
  description:
    'Religious authority rules the state. +3 Faith per turn to the empire.',
  celebrationBonuses: [
    {
      id: 'theocracy-culture',
      name: '+20% Culture for 10 turns',
      description: 'Empire culture output increased by 20% for the celebration window.',
    },
    {
      id: 'theocracy-units',
      name: '+40% Production toward Civilian and Support Units for 10 turns',
      description: 'Civilian and support unit production increased by 40% for the celebration window.',
    },
  ],
};

// ── Exploration crisis-locked (II4.1 — government-policies F-04) ──
// These three governments are gated by the end-of-Exploration Revolutions
// crisis. `unlockCivic` is set to `nationalism` (the terminal Exploration civic)
// as a proxy gate; the crisis system is responsible for the true unlock
// condition (specific Revolutions resolution path).

export const REVOLUTIONARY_REPUBLIC: GovernmentDef = {
  id: 'revolutionary_republic',
  name: 'Revolutionary Republic',
  age: 'exploration',
  unlockCivic: 'nationalism',
  policySlots: { total: 3 },
  legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
  description:
    'Born of popular revolution. +1 Policy Slot on adoption. Crisis-locked: available only via specific Revolutions crisis outcomes.',
  celebrationBonuses: [
    {
      id: 'revolutionary-republic-military-production',
      name: '+100% Production toward Military Units for 10 turns',
      description: 'Military unit production increased by 100% for the celebration window.',
    },
    {
      id: 'revolutionary-republic-war-support',
      name: '+6 War Support for 10 turns',
      description: 'Empire war support increased by 6 for the celebration window.',
    },
  ],
};

export const REVOLUTIONARY_AUTHORITARIANISM: GovernmentDef = {
  id: 'revolutionary_authoritarianism',
  name: 'Revolutionary Authoritarianism',
  age: 'exploration',
  unlockCivic: 'nationalism',
  policySlots: { total: 3 },
  legacyBonus: { type: 'MODIFY_COMBAT', target: 'all', value: 3 },
  description:
    'Authoritarian revolution that trades economic stability for military power. Crisis-locked: available only via specific Revolutions crisis outcomes.',
  celebrationBonuses: [
    {
      id: 'revolutionary-authoritarianism-culture-science',
      name: '+20% Culture and Science for 10 turns',
      description: 'Empire culture and science output increased by 20% for the celebration window.',
    },
    {
      id: 'revolutionary-authoritarianism-sanctions',
      name: '+100% Influence toward Sanctions',
      description: 'Influence toward Sanctions increased by 100% for the celebration window.',
    },
  ],
};

export const CONSTITUTIONAL_MONARCHY: GovernmentDef = {
  id: 'constitutional_monarchy',
  name: 'Constitutional Monarchy',
  age: 'exploration',
  unlockCivic: 'nationalism',
  policySlots: { total: 3 },
  legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
  description:
    'Stability-focused constitutional government with a royal executive. Crisis-locked: available only via specific Revolutions crisis outcomes.',
  celebrationBonuses: [
    {
      id: 'constitutional-monarchy-gold',
      name: '+40% Gold for 10 turns',
      description: 'Empire gold output increased by 40% for the celebration window.',
    },
    {
      id: 'constitutional-monarchy-diplomatic',
      name: '+100% Influence toward Diplomatic Endeavors',
      description: 'Influence toward Diplomatic Endeavors increased by 100% for the celebration window.',
    },
  ],
};

// ── Modern ──

export const ELECTIVE_REPUBLIC: GovernmentDef = {
  id: 'elective_republic',
  name: 'Elective Republic',
  age: 'modern',
  unlockCivic: 'suffrage',
  policySlots: { total: 4 }, // was: military 1, economic 2, diplomatic 1, wildcard 0
  legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
  description:
    'Government by elected representatives. +3 Culture per turn to the empire while active.',
  celebrationBonuses: [
    {
      id: 'elective-republic-culture',
      name: '+20% Culture for 10 turns',
      description: 'Empire culture output increased by 20% for the celebration window.',
    },
    {
      id: 'elective-republic-science',
      name: '+20% Science for 10 turns',
      description: 'Empire science output increased by 20% for the celebration window.',
    },
  ],
};

// ── Modern (F-04) ──

export const AUTHORITARIANISM: GovernmentDef = {
  id: 'authoritarianism',
  name: 'Authoritarianism',
  age: 'modern',
  unlockCivic: 'totalitarianism',
  policySlots: { total: 4 },
  legacyBonus: { type: 'MODIFY_COMBAT', target: 'all', value: 3 },
  description:
    'Centralised power under a single strong leader. +3 Combat Strength to all units while active.',
  celebrationBonuses: [
    {
      id: 'authoritarianism-military-production',
      name: '+30% Production toward Military Units for 10 turns',
      description: 'Military unit production increased by 30% for the celebration window.',
    },
    {
      id: 'authoritarianism-unit-strength',
      name: '+3 Combat Strength for all Units',
      description: 'All units gain +3 combat strength for the celebration window.',
    },
  ],
};

export const BUREAUCRATIC_MONARCHY: GovernmentDef = {
  id: 'bureaucratic_monarchy',
  name: 'Bureaucratic Monarchy',
  age: 'modern',
  unlockCivic: 'political_theory',
  policySlots: { total: 4 },
  legacyBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 3 },
  description:
    'Centralised royal administration with a professional civil service. +3 Science per City while active.',
  celebrationBonuses: [
    {
      id: 'bureaucratic-monarchy-gold',
      name: '+20% Gold for 10 turns',
      description: 'Empire gold output increased by 20% for the celebration window.',
    },
    {
      id: 'bureaucratic-monarchy-diplomacy',
      name: '+30% Relationship change from Endeavors and Sanctions for 10 turns',
      description: 'Relationship changes from Endeavors and Sanctions increased by 30% for the celebration window.',
    },
  ],
};

export const REVOLUCION: GovernmentDef = {
  id: 'revolucion',
  name: 'Revolución',
  age: 'modern',
  unlockCivic: 'class_struggle',
  policySlots: { total: 4 },
  legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 4 },
  description:
    'Revolutionary government born of popular uprising. +4 Culture per turn to the empire while active.',
  celebrationBonuses: [
    {
      id: 'revolucion-culture-influence',
      name: '+30% Culture for 10 turns, +50% Influence toward Diplomatic Actions for 10 turns',
      description: 'Empire culture output increased by 30% and influence toward diplomatic actions increased by 50% for the celebration window.',
    },
    {
      id: 'revolucion-science-military',
      name: '+30% Science for 10 turns, +40% Production toward Military Units for 10 turns',
      description: 'Empire science output increased by 30% and military unit production increased by 40% for the celebration window.',
    },
  ],
  civRequired: 'mexico',
};

// ── Barrel ──

export const ALL_GOVERNMENTS: ReadonlyArray<GovernmentDef> = [
  CLASSICAL_REPUBLIC,
  DESPOTISM,
  OLIGARCHY,
  FEUDAL_MONARCHY,
  PLUTOCRACY,
  THEOCRACY,
  REVOLUTIONARY_REPUBLIC,
  REVOLUTIONARY_AUTHORITARIANISM,
  CONSTITUTIONAL_MONARCHY,
  ELECTIVE_REPUBLIC,
  AUTHORITARIANISM,
  BUREAUCRATIC_MONARCHY,
  REVOLUCION,
];
