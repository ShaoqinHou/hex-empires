import type { PlayerState } from '../types/GameState';
import type { GovernmentDef } from '../data/governments/governments';

/**
 * Age baselines for policy slots (civic-tree F-10).
 * Each age guarantees a minimum number of wildcard policy slots regardless
 * of which government the player adopts.
 */
export const AGE_POLICY_SLOT_BASELINE: Readonly<Record<string, number>> = {
  antiquity: 2,
  exploration: 4,
  modern: 6,
} as const;

function getLegacyGrantPolicySlotCount(player?: PlayerState): number {
  const legacyBonuses = player?.legacyBonuses ?? [];
  return legacyBonuses.reduce((total, bonus) => (
    total + (bonus.effect.type === 'GRANT_POLICY_SLOT' ? 1 : 0)
  ), 0);
}

function getPolicySlotContributionCount(player?: PlayerState): number {
  const counts = player?.policySlotCounts;
  if (!counts) return 0;

  return (
    (counts.military ?? 0) +
    (counts.economic ?? 0) +
    (counts.diplomatic ?? 0) +
    (counts.wildcard ?? 0)
  );
}

export function effectivePolicySlotCount(
  gov: GovernmentDef,
  age: string,
  player?: PlayerState,
): number {
  const baseline = AGE_POLICY_SLOT_BASELINE[age] ?? 0;
  const base = Math.max(gov.policySlots.total, baseline);
  const socialBonus = player?.socialPolicySlots ?? 0;
  const civicBonus = getPolicySlotContributionCount(player);
  const legacyBonus = getLegacyGrantPolicySlotCount(player);

  return base + socialBonus + civicBonus + legacyBonus;
}

export function normalizePolicySlotArray(
  source: ReadonlyArray<string | null> | undefined,
  total: number,
): ReadonlyArray<string | null> {
  const next: Array<string | null> = new Array<string | null>(total).fill(null);
  const current = source ?? [];
  for (let i = 0; i < total; i++) {
    next[i] = current[i] ?? null;
  }
  return next;
}
