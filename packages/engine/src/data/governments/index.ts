// Barrel for the governments data module (Cycle B).
//
// No engine-level barrel wiring yet — this module is internally
// self-contained. Consumers (future Cycle C systems, tests) import
// `ALL_GOVERNMENTS` and `ALL_POLICIES` from here.

export type { GovernmentDef, PolicyCategory, PolicySlotCounts } from './governments';
export {
  ALL_GOVERNMENTS,
  CHIEFDOM,
  CLASSICAL_REPUBLIC,
  DESPOTISM,
  OLIGARCHY,
  MONARCHY,
  MERCHANT_REPUBLIC,
  THEOCRACY,
  DEMOCRACY,
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
