// Social Policy definitions — first Government content (Cycle B).
//
// Types are defined locally (see governments.ts for the rationale).
// Shape follows the design doc at
// `.codex/workflow/design/government-system.md` §4.2 and
// `rulebook-government-expansion.md` §14.2.2.
//
// Every `unlockCivic` here MUST exist in ALL_CIVICS — enforced by the
// accompanying test (`data/__tests__/governments.test.ts`).

import type { EffectDef } from '../../types/GameState';
import type { PolicyCategory } from './governments';

// ── Shape ──

export interface PolicyDef {
  readonly id: string;
  readonly name: string;
  readonly category: PolicyCategory;
  /** CivicId (must exist in ALL_CIVICS) that unlocks this policy. */
  readonly unlockCivic: string;
  readonly bonus: EffectDef;
  readonly description: string;
}

// ── Military policies ──

export const DISCIPLINE: PolicyDef = {
  id: 'discipline',
  name: 'Discipline',
  category: 'military',
  unlockCivic: 'code_of_laws',
  bonus: { type: 'MODIFY_COMBAT', target: 'melee', value: 3 },
  description: '+3 Combat Strength to Melee units.',
};

export const PROFESSIONAL_ARMY: PolicyDef = {
  id: 'professional_army',
  name: 'Professional Army',
  category: 'military',
  unlockCivic: 'military_tradition',
  bonus: { type: 'DISCOUNT_PRODUCTION', target: 'unit', percent: 15 },
  description: '-15% Production cost of all Units.',
};

export const CONSCRIPTION: PolicyDef = {
  id: 'conscription',
  name: 'Conscription',
  category: 'military',
  unlockCivic: 'nationalism',
  bonus: { type: 'MODIFY_COMBAT', target: 'all', value: 2 },
  description: '+2 Combat Strength to all units.',
};

export const LEVEE_EN_MASSE: PolicyDef = {
  id: 'levee_en_masse',
  name: 'Levée en Masse',
  category: 'military',
  unlockCivic: 'totalitarianism',
  bonus: { type: 'MODIFY_COMBAT', target: 'all', value: 5 },
  description: '+5 Combat Strength to all units.',
};

// ── Economic policies ──

export const GOD_KING: PolicyDef = {
  id: 'god_king',
  name: 'God King',
  category: 'economic',
  unlockCivic: 'mysticism',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 1 },
  description: '+1 Faith and +1 Gold per turn on the Palace (flavor: +1 Faith).',
};

export const URBAN_PLANNING: PolicyDef = {
  id: 'urban_planning',
  name: 'Urban Planning',
  category: 'economic',
  unlockCivic: 'craftsmanship',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 1 },
  description: '+1 Production per City.',
};

export const CRAFTSMEN: PolicyDef = {
  id: 'craftsmen',
  name: 'Craftsmen',
  category: 'economic',
  unlockCivic: 'craftsmanship',
  bonus: { type: 'DISCOUNT_PRODUCTION', target: 'building', percent: 10 },
  description: '-10% Production cost of all Buildings.',
};

export const SERFDOM: PolicyDef = {
  id: 'serfdom',
  name: 'Serfdom',
  category: 'economic',
  unlockCivic: 'state_workforce',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 1 },
  description: '+1 Food per City.',
};

export const FREE_MARKET: PolicyDef = {
  id: 'free_market',
  name: 'Free Market',
  category: 'economic',
  unlockCivic: 'mercantilism',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
  description: '+3 Gold per turn to the empire.',
};

// ── Diplomatic policies ──

export const DIPLOMATIC_LEAGUE: PolicyDef = {
  id: 'diplomatic_league',
  name: 'Diplomatic League',
  category: 'diplomatic',
  unlockCivic: 'foreign_trade',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'influence', value: 2 },
  description: '+2 Influence per turn.',
};

export const RELIGIOUS_UNITY: PolicyDef = {
  id: 'religious_unity',
  name: 'Religious Unity',
  category: 'diplomatic',
  unlockCivic: 'divine_right',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 2 },
  description: '+2 Faith per turn to the empire.',
};

export const NATURAL_PHILOSOPHY: PolicyDef = {
  id: 'natural_philosophy',
  name: 'Natural Philosophy',
  category: 'diplomatic',
  unlockCivic: 'humanism',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 },
  description: '+2 Science per turn to the empire.',
};

// ── Wildcard policies ──

export const ANCESTOR_WORSHIP: PolicyDef = {
  id: 'ancestor_worship',
  name: 'Ancestor Worship',
  category: 'wildcard',
  unlockCivic: 'mysticism',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 1 },
  description: '+1 Faith per turn to the empire.',
};

export const RECORDS_OFFICE: PolicyDef = {
  id: 'records_office',
  name: 'Records Office',
  category: 'wildcard',
  unlockCivic: 'recorded_history',
  bonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 },
  description: '+1 Science per turn to the empire.',
};

export const COLONIAL_OFFICE: PolicyDef = {
  id: 'colonial_office',
  name: 'Colonial Office',
  category: 'wildcard',
  unlockCivic: 'colonialism',
  bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: 1 },
  description: '+1 Gold per City.',
};

// ── Barrel ──

export const ALL_POLICIES: ReadonlyArray<PolicyDef> = [
  // military
  DISCIPLINE,
  PROFESSIONAL_ARMY,
  CONSCRIPTION,
  LEVEE_EN_MASSE,
  // economic
  GOD_KING,
  URBAN_PLANNING,
  CRAFTSMEN,
  SERFDOM,
  FREE_MARKET,
  // diplomatic
  DIPLOMATIC_LEAGUE,
  RELIGIOUS_UNITY,
  NATURAL_PHILOSOPHY,
  // wildcard
  ANCESTOR_WORSHIP,
  RECORDS_OFFICE,
  COLONIAL_OFFICE,
];
