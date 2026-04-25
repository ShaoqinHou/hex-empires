/**
 * Yields — happiness field tests (DD3.1)
 *
 * Verifies that `happiness` participates correctly in YieldSet aggregation:
 *   1. `addYields` sums happiness from both operands.
 *   2. When one YieldSet has no explicit happiness (Partial usage), it
 *      is treated as 0 (the `?? 0` fallback in addYields).
 */
import { describe, it, expect } from 'vitest';
import { addYields, EMPTY_YIELDS } from '../Yields';
import type { YieldSet } from '../Yields';

// Helper: build a minimal YieldSet starting from EMPTY_YIELDS
function yields(overrides: Partial<YieldSet>): YieldSet {
  return { ...EMPTY_YIELDS, ...overrides };
}

describe('YieldSet — happiness aggregation (DD3.1)', () => {
  it('addYields sums happiness from both operands', () => {
    const a = yields({ happiness: 3 });
    const b = yields({ happiness: 2 });
    const result = addYields(a, b);
    expect(result.happiness).toBe(5);
  });

  it('addYields treats missing happiness on the second operand (Partial) as 0', () => {
    const a = yields({ happiness: 4 });
    // Pass a Partial that omits happiness
    const result = addYields(a, { food: 1 });
    expect(result.happiness).toBe(4);
  });

  it('addYields does not disturb other yields when only happiness differs', () => {
    const a = yields({ food: 2, production: 1, happiness: 1 });
    const b = yields({ happiness: 3 });
    const result = addYields(a, b);
    expect(result.food).toBe(2);
    expect(result.production).toBe(1);
    expect(result.happiness).toBe(4);
  });

  it('happiness starts at 0 in EMPTY_YIELDS', () => {
    expect(EMPTY_YIELDS.happiness).toBe(0);
  });

  it('addYields on two EMPTY_YIELDS produces 0 happiness', () => {
    const result = addYields(EMPTY_YIELDS, EMPTY_YIELDS);
    expect(result.happiness).toBe(0);
  });
});
