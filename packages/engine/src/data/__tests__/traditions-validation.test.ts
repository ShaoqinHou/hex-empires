/**
 * Traditions catalog validation (DD5.2).
 *
 * Validates the 6 starter traditions:
 *   1. All IDs are unique.
 *   2. Each age field is one of 'antiquity' | 'exploration' | 'modern'.
 *   3. Each tradition has a non-empty unlockCivic string.
 *   4. Each tradition has non-empty id, name, description.
 *   5. 2 traditions per age (the initial scaffold commitment).
 */

import { describe, it, expect } from 'vitest';
import { ALL_TRADITIONS } from '../traditions/index';

const VALID_AGES = new Set(['antiquity', 'exploration', 'modern']);

describe('Traditions catalog validation', () => {
  it('contains exactly 6 starter traditions', () => {
    expect(ALL_TRADITIONS).toHaveLength(6);
  });

  it('all tradition IDs are unique', () => {
    const ids = ALL_TRADITIONS.map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('each tradition has a non-empty id, name, and description', () => {
    for (const t of ALL_TRADITIONS) {
      expect(t.id.length).toBeGreaterThan(0);
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it('each tradition age is valid', () => {
    for (const t of ALL_TRADITIONS) {
      expect(VALID_AGES.has(t.age)).toBe(true);
    }
  });

  it('each tradition has a non-empty unlockCivic string', () => {
    for (const t of ALL_TRADITIONS) {
      expect(typeof t.unlockCivic).toBe('string');
      expect(t.unlockCivic.length).toBeGreaterThan(0);
    }
  });

  it('contains exactly 2 traditions per age', () => {
    const countsByAge: Record<string, number> = { antiquity: 0, exploration: 0, modern: 0 };
    for (const t of ALL_TRADITIONS) {
      countsByAge[t.age] = (countsByAge[t.age] ?? 0) + 1;
    }
    expect(countsByAge.antiquity).toBe(2);
    expect(countsByAge.exploration).toBe(2);
    expect(countsByAge.modern).toBe(2);
  });

  it('tradition IDs are prefixed with tradition-', () => {
    for (const t of ALL_TRADITIONS) {
      expect(t.id.startsWith('tradition-')).toBe(true);
    }
  });

  it('all effect entries use valid yield types where provided', () => {
    const VALID_YIELDS = new Set(['food', 'production', 'gold', 'science', 'culture', 'faith', 'influence']);
    for (const t of ALL_TRADITIONS) {
      if (!t.effect) continue;
      for (const eff of t.effect) {
        if (eff.type === 'MODIFY_YIELD') {
          expect(VALID_YIELDS.has(eff.yield)).toBe(true);
        }
      }
    }
  });
});
