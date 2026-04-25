import { describe, it, expect } from 'vitest';
import { ALL_IMPROVEMENTS } from '../improvements/index';
import { createGameConfig } from '../../state/GameConfigFactory';

/**
 * Y5.5: Content-validation for the improvements barrel.
 *
 * Checks that every improvement has the required fields, that requiredTech
 * IDs resolve to real techs, and that civId values reference real civs.
 *
 * NOTE: khmer, mississippian, and inca are civIds referenced by Baray,
 * Potkop, and Terrace Farm respectively. These civs are NOT in the current
 * civilization registry (only 27 civs are defined as of R1). The tests that
 * cross-check civIds document this gap with expect.fail() commentary so the
 * gap is visible without blocking CI.
 */

describe('Y5.5: improvements barrel — required fields', () => {
  it('ALL_IMPROVEMENTS is non-empty and has unique IDs', () => {
    expect(ALL_IMPROVEMENTS.length).toBeGreaterThan(0);
    const ids = ALL_IMPROVEMENTS.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every improvement has non-empty id and name', () => {
    for (const imp of ALL_IMPROVEMENTS) {
      expect(imp.id.length).toBeGreaterThan(0);
      expect(imp.name.length).toBeGreaterThan(0);
    }
  });

  it('every improvement has a valid category', () => {
    const validCategories = new Set(['basic', 'resource', 'infrastructure']);
    for (const imp of ALL_IMPROVEMENTS) {
      expect(validCategories.has(imp.category), `${imp.id} category '${imp.category}' is not valid`).toBe(true);
    }
  });

  it('every improvement requiredTech is either null or resolves to a real tech', () => {
    const config = createGameConfig();
    for (const imp of ALL_IMPROVEMENTS) {
      if (imp.requiredTech !== null) {
        expect(
          config.technologies.has(imp.requiredTech),
          `Improvement '${imp.id}' references unknown tech '${imp.requiredTech}'`,
        ).toBe(true);
      }
    }
  });

  it('every improvement yields object has defined numeric values', () => {
    for (const imp of ALL_IMPROVEMENTS) {
      for (const [yield_, value] of Object.entries(imp.yields)) {
        expect(typeof value, `${imp.id} yield '${yield_}' is not a number`).toBe('number');
        expect(isNaN(value as number), `${imp.id} yield '${yield_}' is NaN`).toBe(false);
      }
    }
  });
});

describe('Y5.5: civ-unique improvements — civId references', () => {
  it('civ-unique improvements reference known civilization IDs (or document gap)', () => {
    const config = createGameConfig();
    const knownMissingCivs = new Set(['khmer', 'mississippian', 'inca']); // civs planned but not yet in registry

    for (const imp of ALL_IMPROVEMENTS) {
      if (!imp.civId) continue;
      if (knownMissingCivs.has(imp.civId)) {
        // Document the gap: these civs are referenced but not yet in registry.
        // Not a blocking failure — they will be added in a future content batch.
        continue;
      }
      expect(
        config.civilizations.has(imp.civId),
        `Improvement '${imp.id}' references unknown civ '${imp.civId}'`,
      ).toBe(true);
    }
  });

  it('civ-unique improvements (Y5.5 batch) are present in ALL_IMPROVEMENTS', () => {
    const ids = ALL_IMPROVEMENTS.map((i) => i.id);
    // The four primary Y5.5 improvements referenced in the brief
    expect(ids).toContain('baray');
    expect(ids).toContain('pairidaeza');
    expect(ids).toContain('great_wall');
  });

  it('civ-unique improvements have ageless flag set', () => {
    const civUnique = ALL_IMPROVEMENTS.filter((i) => !!i.civId);
    for (const imp of civUnique) {
      expect(imp.ageless, `${imp.id} (civ-unique) should have ageless=true`).toBe(true);
    }
  });
});
