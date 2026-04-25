// Barrel for the governments data module (Cycle B).
//
// No engine-level barrel wiring yet — this module is internally
// self-contained. Consumers (future Cycle C systems, tests) import
// `ALL_GOVERNMENTS` and `ALL_POLICIES` from here.

export type { GovernmentDef, GovernmentCelebrationBonus, PolicyCategory, PolicySlotCounts } from './governments';
export {
  ALL_GOVERNMENTS,
  CLASSICAL_REPUBLIC,
  DESPOTISM,
  OLIGARCHY,
  FEUDAL_MONARCHY,
  PLUTOCRACY,
  THEOCRACY,
  ELECTIVE_REPUBLIC,
  // F-04: Modern governments (Z1 additions)
  AUTHORITARIANISM,
  BUREAUCRATIC_MONARCHY,
  REVOLUCION,
} from './governments';

export type { PolicyDef } from './policies';
export {
  ALL_POLICIES,
  DISCIPLINE,
  PROFESSIONAL_ARMY,
  CONSCRIPTION,
  LEVEE_EN_MASSE,
  GOD_KING,
  URBAN_PLANNING,
  CRAFTSMEN,
  SERFDOM,
  FREE_MARKET,
  DIPLOMATIC_LEAGUE,
  RELIGIOUS_UNITY,
  NATURAL_PHILOSOPHY,
  ANCESTOR_WORSHIP,
  RECORDS_OFFICE,
  COLONIAL_OFFICE,
} from './policies';
