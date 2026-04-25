/**
 * Pure stateless helpers shared between diplomacySystem and any system that
 * needs to look up or initialize diplomacy relations.
 *
 * Lives in state/ (not systems/) so multiple systems can import it without
 * creating cross-system dependencies (see import-boundaries.md).
 */
import type { DiplomacyRelation, DiplomaticStatus } from '../types/GameState';

/** Canonical key for a bilateral relation — always sorted so A:B === B:A. */
export function getRelationKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * Derive the DiplomaticStatus stage from relationship score.
 * Shared by diplomacySystem and treatySystem (kept in state/ to avoid
 * cross-system imports per import-boundaries.md).
 */
export function statusFromRelationship(score: number): DiplomaticStatus {
  if (score > 60) return 'helpful';
  if (score > 20) return 'friendly';
  if (score >= -20) return 'neutral';
  if (score >= -60) return 'unfriendly';
  return 'hostile';
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

/**
 * Y4.1 - Simplified relationship tier derived from relationshipScore.
 * Distinct from DiplomaticStatus (no helpful/war states; used for gating).
 *
 * Thresholds:
 *   +50 or higher  -> Friendly
 *   0 to +49       -> Neutral
 *   -1 to -49      -> Unfriendly
 *   -50 or lower   -> Hostile
 */
export type RelationshipTier = 'Friendly' | 'Neutral' | 'Unfriendly' | 'Hostile';

/**
 * Derive the RelationshipTier from a numeric relationship score (-100 to +100).
 */
export function getRelationshipTier(score: number): RelationshipTier {
  if (score >= 50) return 'Friendly';
  if (score >= 0) return 'Neutral';
  if (score >= -49) return 'Unfriendly';
  return 'Hostile';
}

/**
 * Derive tier from a bilateral relation between two players in state.
 * Returns Neutral when the pair have never interacted.
 */
export function getRelationshipTierForPair(
  playerA: string,
  playerB: string,
  relations: ReadonlyMap<string, DiplomacyRelation>,
): RelationshipTier {
  const key = getRelationKey(playerA, playerB);
  const rel = relations.get(key);
  if (!rel) return 'Neutral';
  return getRelationshipTier(rel.relationship);
}
