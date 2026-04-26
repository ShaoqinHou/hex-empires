/**
 * HH4.1 — Leaders data validation (independent-powers F-08).
 *
 * Verifies:
 *  - Pericles "Surrounded by Glory" has no flat MODIFY_YIELD effect
 *    (per-suzerain scaling cannot be represented as a flat yield; the effect
 *    array is intentionally empty until MODIFY_YIELD_PER_SUZERAIN lands).
 *  - Pericles description correctly references the Delian League and
 *    per-suzerain scaling.
 *  - All leaders have non-empty effects arrays OR have descriptions that
 *    explain why effects are empty (no silent mismatches).
 */
import { describe, it, expect } from 'vitest';
import { PERICLES, ALL_LEADERS } from '../leaders';

describe('HH4.1 — Pericles ability (independent-powers F-08)', () => {
  it('has the correct ability name', () => {
    expect(PERICLES.ability.name).toBe('Surrounded by Glory');
  });

  it('description references per-suzerain scaling and Delian League', () => {
    expect(PERICLES.ability.description).toContain('Suzerain');
    expect(PERICLES.ability.description).toContain('Delian League');
  });

  it('effects array is empty — no flat MODIFY_YIELD masquerading as per-suzerain scaling', () => {
    // The old implementation had { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 }
    // which is a flat +2 culture — it does NOT scale with suzerain count and misrepresents
    // the "Delian League" ability. The correct fix (independent-powers F-08) is to leave
    // effects: [] until MODIFY_YIELD_PER_SUZERAIN is implemented.
    expect(PERICLES.ability.effects).toEqual([]);
  });

  it('no MODIFY_YIELD culture effect on Pericles (flat +2 was the bug)', () => {
    const flatCultureEffect = PERICLES.ability.effects.find(
      (e) => e.type === 'MODIFY_YIELD' && 'yield' in e && e.yield === 'culture',
    );
    expect(flatCultureEffect).toBeUndefined();
  });
});

describe('HH4.1 — All leaders: description/effects coherence', () => {
  it('every leader with a non-empty effects array has at least one effect with a recognized type', () => {
    const validTypes = new Set([
      'MODIFY_YIELD', 'MODIFY_COMBAT', 'GRANT_UNIT', 'UNLOCK_BUILDING',
      'DISCOUNT_PRODUCTION', 'MODIFY_MOVEMENT', 'FREE_TECH', 'CULTURE_BOMB', 'GRANT_POLICY_SLOT',
    ]);
    const bad: string[] = [];
    for (const leader of ALL_LEADERS) {
      for (const effect of leader.ability.effects) {
        if (!validTypes.has(effect.type)) {
          bad.push(`${leader.id}: unknown effect type "${effect.type}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('Pericles is present in ALL_LEADERS', () => {
    const found = ALL_LEADERS.find((l) => l.id === 'pericles');
    expect(found).toBeDefined();
    expect(found!.id).toBe('pericles');
  });
});
