// Content validation for the first Government data drop (Cycle B).
//
// These tests assert:
//   1. Governments and policies have unique ids.
//   2. Every `unlockCivic` points at a real civic.
//   3. Every government's policy slot totals sum > 0 and span the 3 ages.
//   4. Every `bonus` / `legacyBonus` is a valid EffectDef shape (discriminated
//      union is well-formed).
//   5. Policy category distribution covers all 4 categories.

import { describe, it, expect } from 'vitest';
import { ALL_GOVERNMENTS } from '../governments/governments';
import { ALL_POLICIES } from '../governments/policies';
import { ALL_CIVICS } from '../civics';
import type { EffectDef, UnitCategory, Age } from '../../types/GameState';
import type { YieldType } from '../../types/Yields';

// ── Helpers ──

const VALID_YIELDS: ReadonlySet<YieldType> = new Set<YieldType>([
  'food', 'production', 'gold', 'science', 'culture', 'faith', 'influence',
]);

const VALID_UNIT_TARGETS: ReadonlySet<UnitCategory | 'all'> = new Set([
  'melee', 'ranged', 'siege', 'cavalry', 'naval', 'civilian', 'religious', 'all',
]);

const VALID_EFFECT_TARGETS = new Set(['city', 'empire', 'unit', 'tile']);

function isValidEffect(e: EffectDef): boolean {
  switch (e.type) {
    case 'MODIFY_YIELD':
      return (
        VALID_EFFECT_TARGETS.has(e.target) &&
        VALID_YIELDS.has(e.yield) &&
        typeof e.value === 'number' &&
        Number.isFinite(e.value)
      );
    case 'MODIFY_COMBAT':
      return (
        VALID_UNIT_TARGETS.has(e.target) &&
        typeof e.value === 'number' &&
        Number.isFinite(e.value)
      );
    case 'GRANT_UNIT':
      return typeof e.unitId === 'string' && e.unitId.length > 0 && e.count > 0;
    case 'UNLOCK_BUILDING':
      return typeof e.buildingId === 'string' && e.buildingId.length > 0;
    case 'DISCOUNT_PRODUCTION':
      return (
        typeof e.target === 'string' &&
        e.target.length > 0 &&
        typeof e.percent === 'number' &&
        e.percent > 0 &&
        e.percent < 100
      );
    case 'MODIFY_MOVEMENT':
      return VALID_UNIT_TARGETS.has(e.target) && typeof e.value === 'number';
    case 'FREE_TECH':
      return typeof e.techId === 'string' && e.techId.length > 0;
    case 'CULTURE_BOMB':
      return typeof e.range === 'number' && e.range > 0;
    default:
      return false;
  }
}

const CIVIC_IDS: ReadonlySet<string> = new Set(ALL_CIVICS.map((c) => c.id));
const VALID_AGES: ReadonlySet<Age> = new Set<Age>(['antiquity', 'exploration', 'modern']);

// ── Governments ──

describe('ALL_GOVERNMENTS', () => {
  it('contains between 8 and 16 governments (II4.1 added 3 Exploration crisis-locked: REVOLUTIONARY_REPUBLIC/REVOLUTIONARY_AUTHORITARIANISM/CONSTITUTIONAL_MONARCHY)', () => {
    expect(ALL_GOVERNMENTS.length).toBeGreaterThanOrEqual(8);
    expect(ALL_GOVERNMENTS.length).toBeLessThanOrEqual(16);
  });

  it('has unique ids', () => {
    const ids = ALL_GOVERNMENTS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every id is a non-empty string', () => {
    for (const g of ALL_GOVERNMENTS) {
      expect(typeof g.id).toBe('string');
      expect(g.id.length).toBeGreaterThan(0);
    }
  });

  it('every name is a non-empty string', () => {
    for (const g of ALL_GOVERNMENTS) {
      expect(g.name.length).toBeGreaterThan(0);
    }
  });

  it('every age is antiquity|exploration|modern', () => {
    for (const g of ALL_GOVERNMENTS) {
      expect(VALID_AGES.has(g.age)).toBe(true);
    }
  });

  it('spans all 3 ages', () => {
    const ages = new Set(ALL_GOVERNMENTS.map((g) => g.age));
    expect(ages.has('antiquity')).toBe(true);
    expect(ages.has('exploration')).toBe(true);
    expect(ages.has('modern')).toBe(true);
  });

  it('every unlockCivic references a real civic', () => {
    for (const g of ALL_GOVERNMENTS) {
      expect(
        CIVIC_IDS.has(g.unlockCivic),
        `government ${g.id} references unknown civic ${g.unlockCivic}`,
      ).toBe(true);
    }
  });

  it('every policy slot total is > 0', () => {
    for (const g of ALL_GOVERNMENTS) {
      // W2-03: flat wildcard model — policySlots.total replaces per-category counts
      expect(g.policySlots.total, `${g.id} must have at least one slot`).toBeGreaterThan(0);
    }
  });

  it('every policy slot count is a positive integer', () => {
    for (const g of ALL_GOVERNMENTS) {
      // W2-03: flat wildcard model — only policySlots.total exists
      expect(Number.isInteger(g.policySlots.total)).toBe(true);
      expect(g.policySlots.total).toBeGreaterThan(0);
    }
  });

  it('every legacyBonus is a valid EffectDef', () => {
    for (const g of ALL_GOVERNMENTS) {
      expect(
        isValidEffect(g.legacyBonus),
        `government ${g.id} has invalid legacyBonus ${JSON.stringify(g.legacyBonus)}`,
      ).toBe(true);
    }
  });

  // II4.1 — Exploration crisis-locked governments (government-policies F-04)
  it('revolutionary_republic exists with correct fields', () => {
    const g = ALL_GOVERNMENTS.find((gov) => gov.id === 'revolutionary_republic');
    expect(g).toBeDefined();
    expect(g!.name).toBe('Revolutionary Republic');
    expect(g!.age).toBe('exploration');
    expect(g!.policySlots.total).toBe(3);
  });

  it('revolutionary_authoritarianism exists with correct fields', () => {
    const g = ALL_GOVERNMENTS.find((gov) => gov.id === 'revolutionary_authoritarianism');
    expect(g).toBeDefined();
    expect(g!.name).toBe('Revolutionary Authoritarianism');
    expect(g!.age).toBe('exploration');
    expect(g!.policySlots.total).toBe(3);
  });

  it('constitutional_monarchy exists with correct fields', () => {
    const g = ALL_GOVERNMENTS.find((gov) => gov.id === 'constitutional_monarchy');
    expect(g).toBeDefined();
    expect(g!.name).toBe('Constitutional Monarchy');
    expect(g!.age).toBe('exploration');
    expect(g!.policySlots.total).toBe(3);
  });

  it('has exactly 6 exploration-age governments (3 standard + 3 crisis-locked)', () => {
    const explorationGovs = ALL_GOVERNMENTS.filter((g) => g.age === 'exploration');
    expect(explorationGovs.length).toBe(6);
  });

  it('three exploration crisis-locked governments all reference nationalism civic', () => {
    const crisisLocked = ['revolutionary_republic', 'revolutionary_authoritarianism', 'constitutional_monarchy'];
    for (const id of crisisLocked) {
      const g = ALL_GOVERNMENTS.find((gov) => gov.id === id);
      expect(g, `${id} must exist`).toBeDefined();
      expect(g!.unlockCivic, `${id} unlockCivic must be nationalism`).toBe('nationalism');
    }
  });

  it('three exploration crisis-locked governments require the final Revolutions crisis stage', () => {
    const crisisLocked = ['revolutionary_republic', 'revolutionary_authoritarianism', 'constitutional_monarchy'];
    for (const id of crisisLocked) {
      const g = ALL_GOVERNMENTS.find((gov) => gov.id === id);
      expect(g, `${id} must exist`).toBeDefined();
      expect(g!.crisisRequired).toEqual({ crisisType: 'revolution', minStage: 3 });
    }
  });
});

// ── Policies ──

describe('ALL_POLICIES', () => {
  it('contains between 12 and 18 policies', () => {
    expect(ALL_POLICIES.length).toBeGreaterThanOrEqual(12);
    expect(ALL_POLICIES.length).toBeLessThanOrEqual(18);
  });

  it('has unique ids', () => {
    const ids = ALL_POLICIES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every id is a non-empty string', () => {
    for (const p of ALL_POLICIES) {
      expect(typeof p.id).toBe('string');
      expect(p.id.length).toBeGreaterThan(0);
    }
  });

  it('every unlockCivic references a real civic', () => {
    for (const p of ALL_POLICIES) {
      expect(
        CIVIC_IDS.has(p.unlockCivic),
        `policy ${p.id} references unknown civic ${p.unlockCivic}`,
      ).toBe(true);
    }
  });

  it('every bonus is a valid EffectDef', () => {
    for (const p of ALL_POLICIES) {
      expect(
        isValidEffect(p.bonus),
        `policy ${p.id} has invalid bonus ${JSON.stringify(p.bonus)}`,
      ).toBe(true);
    }
  });

  it('every policy has one of the four categories', () => {
    const VALID = new Set(['military', 'economic', 'diplomatic', 'wildcard']);
    for (const p of ALL_POLICIES) {
      expect(VALID.has(p.category)).toBe(true);
    }
  });

  it('covers all four policy categories', () => {
    const categories = new Set(ALL_POLICIES.map((p) => p.category));
    expect(categories.has('military')).toBe(true);
    expect(categories.has('economic')).toBe(true);
    expect(categories.has('diplomatic')).toBe(true);
    expect(categories.has('wildcard')).toBe(true);
  });

  it('has at least 2 military policies', () => {
    const count = ALL_POLICIES.filter((p) => p.category === 'military').length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('has at least 2 economic policies', () => {
    const count = ALL_POLICIES.filter((p) => p.category === 'economic').length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('has at least 2 diplomatic policies', () => {
    const count = ALL_POLICIES.filter((p) => p.category === 'diplomatic').length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('every name is a non-empty string', () => {
    for (const p of ALL_POLICIES) {
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it('every description is a non-empty string', () => {
    for (const p of ALL_POLICIES) {
      expect(p.description.length).toBeGreaterThan(0);
    }
  });
});

// ── Cross-cutting ──

describe('governments × policies', () => {
  it('government and policy id namespaces do not collide', () => {
    const govIds = new Set(ALL_GOVERNMENTS.map((g) => g.id));
    for (const p of ALL_POLICIES) {
      expect(
        govIds.has(p.id),
        `policy id ${p.id} collides with a government id`,
      ).toBe(false);
    }
  });
});
