/**
 * Units expansion tests — validates new modern-age units added per
 * gap-analysis-v3 item C4 (rulebook §7). Antiquity and Exploration
 * candidate units were already present on main; only Helicopter and
 * Jet Fighter are genuinely new.
 */
import { describe, it, expect } from 'vitest';
import {
  HELICOPTER,
  JET_FIGHTER,
  ALL_MODERN_UNITS,
} from '../units/modern-units';
import { ALL_MODERN_TECHS } from '../technologies/modern';
import type { UnitDef } from '../../types/Unit';

const NEW_MODERN_UNITS: ReadonlyArray<UnitDef> = [HELICOPTER, JET_FIGHTER];

describe('units expansion — modern additions (gap-v3 C4)', () => {
  it('adds exactly 2 new modern units', () => {
    expect(NEW_MODERN_UNITS).toHaveLength(2);
  });

  it('each new unit has a unique id within ALL_MODERN_UNITS', () => {
    const ids = ALL_MODERN_UNITS.map((u) => u.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    expect(ids).toContain('helicopter');
    expect(ids).toContain('jet_fighter');
  });

  it('each new unit has cost > 0', () => {
    for (const u of NEW_MODERN_UNITS) {
      expect(u.cost).toBeGreaterThan(0);
    }
  });

  it('each new unit has positive combat strength', () => {
    for (const u of NEW_MODERN_UNITS) {
      expect(u.combat).toBeGreaterThan(0);
    }
  });

  it('each new unit has positive movement', () => {
    for (const u of NEW_MODERN_UNITS) {
      expect(u.movement).toBeGreaterThan(0);
    }
  });

  it('each new unit references a valid modern-age tech', () => {
    const techIds = new Set(ALL_MODERN_TECHS.map((t) => t.id));
    for (const u of NEW_MODERN_UNITS) {
      expect(u.requiredTech).not.toBeNull();
      expect(techIds.has(u.requiredTech as string)).toBe(true);
    }
  });

  it('each new unit is tagged to the modern age', () => {
    for (const u of NEW_MODERN_UNITS) {
      expect(u.age).toBe('modern');
    }
  });

  it('helicopter has cavalry category and combined_arms tech', () => {
    expect(HELICOPTER.category).toBe('cavalry');
    expect(HELICOPTER.requiredTech).toBe('combined_arms');
  });

  it('jet fighter has ranged category, rocketry tech, and range > 0', () => {
    expect(JET_FIGHTER.category).toBe('ranged');
    expect(JET_FIGHTER.requiredTech).toBe('rocketry');
    expect(JET_FIGHTER.range).toBeGreaterThan(0);
    expect(JET_FIGHTER.rangedCombat).toBeGreaterThan(0);
  });

  it('helicopter has no upgrade path (terminal unit)', () => {
    expect(HELICOPTER.upgradesTo).toBeNull();
    expect(JET_FIGHTER.upgradesTo).toBeNull();
  });

  it('each new unit has empty abilities array (per scope constraint)', () => {
    expect(HELICOPTER.abilities).toEqual([]);
    expect(JET_FIGHTER.abilities).toEqual([]);
  });

  it('ALL_MODERN_UNITS barrel includes both new units', () => {
    expect(ALL_MODERN_UNITS).toContain(HELICOPTER);
    expect(ALL_MODERN_UNITS).toContain(JET_FIGHTER);
  });

  it('ALL_MODERN_UNITS grew to include the 2 new entries (length >= 17)', () => {
    expect(ALL_MODERN_UNITS.length).toBeGreaterThanOrEqual(17);
  });

  it('jet fighter has higher combat strength than helicopter (jet supremacy)', () => {
    expect(JET_FIGHTER.combat).toBeGreaterThan(HELICOPTER.combat);
  });

  it('new units have sight range >= 3 (modern recon)', () => {
    for (const u of NEW_MODERN_UNITS) {
      expect(u.sightRange).toBeGreaterThanOrEqual(3);
    }
  });
});
