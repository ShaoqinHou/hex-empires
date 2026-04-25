/**
 * Government celebration bonus validation (DD3.2)
 *
 * Verifies that every GovernmentDef in ALL_GOVERNMENTS has non-empty
 * celebrationBonuses (two options, each with a non-empty id, name, and
 * description) and that the overall dataset provides meaningful bonus
 * coverage across the full government roster.
 */
import { describe, it, expect } from 'vitest';
import { ALL_GOVERNMENTS } from '../governments/governments';

describe('ALL_GOVERNMENTS — celebrationBonuses (DD3.2)', () => {
  it('every government has exactly 2 celebration bonus options', () => {
    for (const g of ALL_GOVERNMENTS) {
      expect(
        g.celebrationBonuses,
        `${g.id} must have celebrationBonuses`,
      ).toBeDefined();
      expect(
        g.celebrationBonuses.length,
        `${g.id} must have exactly 2 celebration bonus options`,
      ).toBe(2);
    }
  });

  it('every celebration bonus option has a non-empty id', () => {
    for (const g of ALL_GOVERNMENTS) {
      for (const bonus of g.celebrationBonuses) {
        expect(
          typeof bonus.id === 'string' && bonus.id.length > 0,
          `${g.id} has a bonus with empty id`,
        ).toBe(true);
      }
    }
  });

  it('every celebration bonus option has a non-empty name', () => {
    for (const g of ALL_GOVERNMENTS) {
      for (const bonus of g.celebrationBonuses) {
        expect(
          typeof bonus.name === 'string' && bonus.name.length > 0,
          `${g.id} bonus "${bonus.id}" has empty name`,
        ).toBe(true);
      }
    }
  });

  it('every celebration bonus option has a non-empty description', () => {
    for (const g of ALL_GOVERNMENTS) {
      for (const bonus of g.celebrationBonuses) {
        expect(
          typeof bonus.description === 'string' && bonus.description.length > 0,
          `${g.id} bonus "${bonus.id}" has empty description`,
        ).toBe(true);
      }
    }
  });

  it('celebration bonus ids are unique across all governments', () => {
    const allBonusIds: string[] = [];
    for (const g of ALL_GOVERNMENTS) {
      for (const bonus of g.celebrationBonuses) {
        allBonusIds.push(bonus.id);
      }
    }
    expect(new Set(allBonusIds).size).toBe(allBonusIds.length);
  });

  it('at least 8 governments have celebration bonuses (all 10 governments)', () => {
    const withBonuses = ALL_GOVERNMENTS.filter(
      (g) => g.celebrationBonuses && g.celebrationBonuses.length >= 2,
    );
    expect(withBonuses.length).toBeGreaterThanOrEqual(8);
  });

  it('classical_republic has both celebration bonus options', () => {
    const g = ALL_GOVERNMENTS.find((gov) => gov.id === 'classical_republic');
    expect(g).toBeDefined();
    expect(g!.celebrationBonuses[0].id).toBe('classical-rep-culture');
    expect(g!.celebrationBonuses[1].id).toBe('classical-rep-wonder');
  });

  it('despotism has military and tribute celebration options', () => {
    const g = ALL_GOVERNMENTS.find((gov) => gov.id === 'despotism');
    expect(g).toBeDefined();
    expect(g!.celebrationBonuses[0].id).toBe('despotism-military');
    expect(g!.celebrationBonuses[1].id).toBe('despotism-tribute');
  });

  it('oligarchy has trade and growth celebration options', () => {
    const g = ALL_GOVERNMENTS.find((gov) => gov.id === 'oligarchy');
    expect(g).toBeDefined();
    expect(g!.celebrationBonuses[0].id).toBe('oligarchy-trade');
    expect(g!.celebrationBonuses[1].id).toBe('oligarchy-growth');
  });
});
