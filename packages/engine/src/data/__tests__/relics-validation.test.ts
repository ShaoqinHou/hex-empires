/**
 * KK2 (F-09): Relics data validation tests.
 *
 * Verifies that all RelicDef entries have the required fields,
 * IDs are unique, and yields are non-negative.
 */

import { describe, it, expect } from 'vitest';
import { ALL_RELICS } from '../relics';

describe('relics data validation (KK2 / F-09)', () => {
  it('ALL_RELICS has at least 10 entries', () => {
    expect(ALL_RELICS.length).toBeGreaterThanOrEqual(10);
  });

  it('each relic has a non-empty id, name, and description', () => {
    for (const relic of ALL_RELICS) {
      expect(relic.id.length).toBeGreaterThan(0);
      expect(relic.name.length).toBeGreaterThan(0);
      expect(relic.description.length).toBeGreaterThan(0);
    }
  });

  it('each relic has non-negative faithPerTurn and culturePerTurn', () => {
    for (const relic of ALL_RELICS) {
      expect(relic.faithPerTurn).toBeGreaterThanOrEqual(0);
      expect(relic.culturePerTurn).toBeGreaterThanOrEqual(0);
    }
  });

  it('each relic provides at least 1 total yield per turn', () => {
    for (const relic of ALL_RELICS) {
      expect(relic.faithPerTurn + relic.culturePerTurn).toBeGreaterThanOrEqual(1);
    }
  });

  it('all relic IDs are unique', () => {
    const ids = ALL_RELICS.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('new relics are present: buddhas_bowl, mahabharata_manuscript, book_of_the_dead, mount_sinai_tablets', () => {
    const ids = new Set(ALL_RELICS.map((r) => r.id));
    expect(ids.has('buddhas_bowl')).toBe(true);
    expect(ids.has('mahabharata_manuscript')).toBe(true);
    expect(ids.has('book_of_the_dead')).toBe(true);
    expect(ids.has('mount_sinai_tablets')).toBe(true);
  });
});
