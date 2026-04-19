/**
 * Pure stateless helpers shared between diplomacySystem and any system that
 * needs to look up or initialize diplomacy relations.
 *
 * Lives in state/ (not systems/) so multiple systems can import it without
 * creating cross-system dependencies (see import-boundaries.md).
 */
import type { DiplomacyRelation } from '../types/GameState';

/** Canonical key for a bilateral relation — always sorted so A:B === B:A. */
export function getRelationKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** Zero-value relation used for player pairs that have never interacted. */
export function defaultRelation(): DiplomacyRelation {
  return {
    status: 'neutral',
    relationship: 0,
    warSupport: 0,
    turnsAtPeace: 0,
    turnsAtWar: 0,
    hasAlliance: false,
    hasFriendship: false,
    hasDenounced: false,
    warDeclarer: null,
    isSurpriseWar: false,
    activeEndeavors: [],
    activeSanctions: [],
  };
}
