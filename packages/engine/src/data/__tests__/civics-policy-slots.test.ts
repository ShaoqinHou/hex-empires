/**
 * AA5.2: Verify GRANT_POLICY_SLOT coverage across civic ages.
 * - Every age must have at least 2 civics that grant a policy slot.
 * - Total slots achievable across all 3 ages must be >= 12.
 */

import { describe, it, expect } from 'vitest';
import { ALL_ANTIQUITY_CIVICS } from '../civics/antiquity/index';
import { ALL_EXPLORATION_CIVICS } from '../civics/exploration/index';
import { ALL_MODERN_CIVICS } from '../civics/modern/index';
import type { CivicDef } from '../civics/types';

function policySlotCount(civics: ReadonlyArray<CivicDef>): number {
  let total = 0;
  for (const civic of civics) {
    if (!civic.effects) continue;
    for (const effect of civic.effects) {
      if (effect.type === 'GRANT_POLICY_SLOT') total += 1;
    }
  }
  return total;
}

function civicsWithPolicySlots(civics: ReadonlyArray<CivicDef>): ReadonlyArray<CivicDef> {
  return civics.filter(
    (c) => c.effects?.some((e) => e.type === 'GRANT_POLICY_SLOT') ?? false,
  );
}

describe('AA5.2: GRANT_POLICY_SLOT distribution across ages', () => {
  it('antiquity has at least 2 civics granting policy slots', () => {
    const withSlots = civicsWithPolicySlots(ALL_ANTIQUITY_CIVICS);
    expect(withSlots.length).toBeGreaterThanOrEqual(2);
  });

  it('exploration has at least 2 civics granting policy slots', () => {
    const withSlots = civicsWithPolicySlots(ALL_EXPLORATION_CIVICS);
    expect(withSlots.length).toBeGreaterThanOrEqual(2);
  });

  it('modern has at least 2 civics granting policy slots', () => {
    const withSlots = civicsWithPolicySlots(ALL_MODERN_CIVICS);
    expect(withSlots.length).toBeGreaterThanOrEqual(2);
  });

  it('total policy slots achievable across all ages >= 12', () => {
    const total =
      policySlotCount(ALL_ANTIQUITY_CIVICS) +
      policySlotCount(ALL_EXPLORATION_CIVICS) +
      policySlotCount(ALL_MODERN_CIVICS);
    expect(total).toBeGreaterThanOrEqual(12);
  });

  it('policy slot types are valid (military/economic/diplomatic/wildcard)', () => {
    const validTypes = new Set(['military', 'economic', 'diplomatic', 'wildcard']);
    const allCivics = [
      ...ALL_ANTIQUITY_CIVICS,
      ...ALL_EXPLORATION_CIVICS,
      ...ALL_MODERN_CIVICS,
    ];
    for (const civic of allCivics) {
      if (!civic.effects) continue;
      for (const effect of civic.effects) {
        if (effect.type === 'GRANT_POLICY_SLOT') {
          expect(validTypes.has(effect.slotType)).toBe(true);
        }
      }
    }
  });
});
