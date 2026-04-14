import { describe, it, expect } from 'vitest';
import { ALL_PANTHEONS } from '../religion';
import type { PantheonDef } from '../../types/Religion';
import type { EffectDef } from '../../types/GameState';

// First data cycle for the Religion system (cycle B). These assertions
// guard: barrel completeness, ID uniqueness, positive faithCost, and
// that every pantheon's `bonus` is a valid, already-defined EffectDef
// variant — no new EffectDef types introduced here.

const VALID_EFFECT_TYPES: ReadonlyArray<EffectDef['type']> = [
  'MODIFY_YIELD',
  'MODIFY_COMBAT',
  'GRANT_UNIT',
  'UNLOCK_BUILDING',
  'DISCOUNT_PRODUCTION',
  'MODIFY_MOVEMENT',
  'FREE_TECH',
  'CULTURE_BOMB',
];

const EXPECTED_PANTHEON_COUNT = 16;

describe('ALL_PANTHEONS catalogue', () => {
  it('exposes the expected number of pantheons', () => {
    expect(ALL_PANTHEONS.length).toBe(EXPECTED_PANTHEON_COUNT);
  });

  it('has all unique ids', () => {
    const ids = ALL_PANTHEONS.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has all unique display names', () => {
    const names = ALL_PANTHEONS.map(p => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('populates a non-empty name on every entry', () => {
    for (const p of ALL_PANTHEONS) {
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it('populates a non-empty description on every entry', () => {
    for (const p of ALL_PANTHEONS) {
      expect(p.description.length).toBeGreaterThan(0);
    }
  });

  it('has positive faithCost on every entry', () => {
    for (const p of ALL_PANTHEONS) {
      expect(p.faithCost).toBeGreaterThan(0);
    }
  });

  it('uses only integer faithCost values', () => {
    for (const p of ALL_PANTHEONS) {
      expect(Number.isInteger(p.faithCost)).toBe(true);
    }
  });

  it('keeps every faithCost within the first-tier balance band (<= 100)', () => {
    for (const p of ALL_PANTHEONS) {
      expect(p.faithCost).toBeLessThanOrEqual(100);
    }
  });

  it('uses only already-defined EffectDef variants for every bonus', () => {
    for (const p of ALL_PANTHEONS) {
      expect(VALID_EFFECT_TYPES).toContain(p.bonus.type);
    }
  });

  it('covers multiple EffectDef variants across the catalogue', () => {
    const variants = new Set(ALL_PANTHEONS.map(p => p.bonus.type));
    // Healing/yield pantheons + combat pantheons + movement should span >=3.
    expect(variants.size).toBeGreaterThanOrEqual(3);
  });

  it('includes at least one yield-modifier pantheon', () => {
    const yields = ALL_PANTHEONS.filter(p => p.bonus.type === 'MODIFY_YIELD');
    expect(yields.length).toBeGreaterThan(0);
  });

  it('includes at least one combat-modifier pantheon', () => {
    const combat = ALL_PANTHEONS.filter(p => p.bonus.type === 'MODIFY_COMBAT');
    expect(combat.length).toBeGreaterThan(0);
  });

  it('has valid shape on every MODIFY_YIELD bonus', () => {
    for (const p of ALL_PANTHEONS) {
      if (p.bonus.type === 'MODIFY_YIELD') {
        expect(['city', 'empire', 'unit', 'tile']).toContain(p.bonus.target);
        expect(p.bonus.value).toBeGreaterThan(0);
        expect(typeof p.bonus.yield).toBe('string');
      }
    }
  });

  it('has valid shape on every MODIFY_COMBAT bonus', () => {
    const validCombatTargets: ReadonlyArray<string> = [
      'melee',
      'ranged',
      'siege',
      'cavalry',
      'naval',
      'civilian',
      'religious',
      'all',
    ];
    for (const p of ALL_PANTHEONS) {
      if (p.bonus.type === 'MODIFY_COMBAT') {
        expect(validCombatTargets).toContain(p.bonus.target);
        expect(p.bonus.value).toBeGreaterThan(0);
      }
    }
  });

  it('exposes the god_of_war pantheon with a melee combat bonus', () => {
    const war = ALL_PANTHEONS.find(p => p.id === 'god_of_war');
    expect(war).toBeDefined();
    const bonus = (war as PantheonDef).bonus;
    expect(bonus.type).toBe('MODIFY_COMBAT');
    if (bonus.type === 'MODIFY_COMBAT') {
      expect(bonus.target).toBe('melee');
      expect(bonus.value).toBe(3);
    }
  });

  it('exposes the goddess_of_harvest pantheon with a food yield bonus', () => {
    const harvest = ALL_PANTHEONS.find(p => p.id === 'goddess_of_harvest');
    expect(harvest).toBeDefined();
    const bonus = (harvest as PantheonDef).bonus;
    expect(bonus.type).toBe('MODIFY_YIELD');
    if (bonus.type === 'MODIFY_YIELD') {
      expect(bonus.yield).toBe('food');
      expect(bonus.target).toBe('city');
    }
  });

  it('exposes the god_of_storms pantheon with a cavalry movement bonus', () => {
    const storms = ALL_PANTHEONS.find(p => p.id === 'god_of_storms');
    expect(storms).toBeDefined();
    const bonus = (storms as PantheonDef).bonus;
    expect(bonus.type).toBe('MODIFY_MOVEMENT');
    if (bonus.type === 'MODIFY_MOVEMENT') {
      expect(bonus.target).toBe('cavalry');
      expect(bonus.value).toBeGreaterThan(0);
    }
  });

  it('exposes lookups for every named pantheon from the cycle brief', () => {
    const expectedIds = [
      'god_of_healing',
      'god_of_war',
      'god_of_craftsmen',
      'goddess_of_harvest',
      'goddess_of_festivals',
      'god_of_the_forge',
      'god_of_the_sea',
      'god_of_the_sun',
      'goddess_of_wisdom',
      'god_of_storms',
      'goddess_of_the_hunt',
    ];
    for (const id of expectedIds) {
      expect(ALL_PANTHEONS.find(p => p.id === id)).toBeDefined();
    }
  });

  it('uses snake_case ids only (no spaces, no uppercase)', () => {
    for (const p of ALL_PANTHEONS) {
      expect(p.id).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});
