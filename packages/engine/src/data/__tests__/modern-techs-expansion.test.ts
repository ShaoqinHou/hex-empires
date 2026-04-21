/**
 * Modern technologies expansion tests — validates new modern-age
 * technologies added per rulebook §9.6. Audits the §9.6 selected-tech
 * list against existing data and adds entries for the missing ones,
 * cross-referenced against ALL_MODERN_UNITS and ALL_MODERN_BUILDINGS.
 */
import { describe, it, expect } from 'vitest';
import {
  ACADEMICS,
  MILITARY_SCIENCE,
  URBANIZATION,
  COMBUSTION,
  RADIO,
  MASS_PRODUCTION,
  MOBILIZATION,
  ARMOR,
  AERODYNAMICS,
  ALL_MODERN_TECHS,
} from '../technologies/modern';
import type { TechnologyDef } from '../technologies/types';
import { ALL_MODERN_UNITS } from '../units/modern-units';
import { ALL_MODERN_BUILDINGS } from '../buildings/modern-buildings';

const NEW_MODERN_TECHS: ReadonlyArray<TechnologyDef> = [
  ACADEMICS,
  MILITARY_SCIENCE,
  URBANIZATION,
  COMBUSTION,
  RADIO,
  MASS_PRODUCTION,
  MOBILIZATION,
  ARMOR,
  AERODYNAMICS,
];

describe('modern technologies expansion — rulebook §9.6', () => {
  it('adds exactly 9 new modern technologies', () => {
    expect(NEW_MODERN_TECHS).toHaveLength(9);
  });

  it('ALL_MODERN_TECHS grew by 9 (from 14 to 24, including FUTURE_TECH)', () => {
    expect(ALL_MODERN_TECHS).toHaveLength(24);
  });

  it('every new tech has a unique id within ALL_MODERN_TECHS', () => {
    const ids = ALL_MODERN_TECHS.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    for (const t of NEW_MODERN_TECHS) {
      expect(ids).toContain(t.id);
    }
  });

  it('every new tech is in the modern age', () => {
    for (const t of NEW_MODERN_TECHS) {
      expect(t.age).toBe('modern');
    }
  });

  it('every new tech cost is in the §9.2 modern range (>=600)', () => {
    for (const t of NEW_MODERN_TECHS) {
      expect(t.cost).toBeGreaterThanOrEqual(600);
      expect(t.cost).toBeLessThanOrEqual(1500);
    }
  });

  it('all prerequisites reference an existing modern tech id', () => {
    const modernIds = new Set(ALL_MODERN_TECHS.map((t) => t.id));
    for (const t of NEW_MODERN_TECHS) {
      for (const prereq of t.prerequisites) {
        expect(modernIds.has(prereq), `${t.id} prereq ${prereq}`).toBe(true);
      }
    }
  });

  it('every new tech has at least one unlock', () => {
    for (const t of NEW_MODERN_TECHS) {
      expect(t.unlocks.length).toBeGreaterThan(0);
    }
  });

  it('every unlocked id resolves to a real modern unit or building', () => {
    const unitIds = new Set(ALL_MODERN_UNITS.map((u) => u.id));
    const buildingIds = new Set(ALL_MODERN_BUILDINGS.map((b) => b.id));
    for (const t of NEW_MODERN_TECHS) {
      for (const unlock of t.unlocks) {
        const resolved = unitIds.has(unlock) || buildingIds.has(unlock);
        expect(resolved, `${t.id} unlocks ${unlock}`).toBe(true);
      }
    }
  });

  it('no unlock appears twice across all modern techs (no double-unlocks)', () => {
    const allUnlocks: string[] = [];
    for (const t of ALL_MODERN_TECHS) {
      allUnlocks.push(...t.unlocks);
    }
    const unique = new Set(allUnlocks);
    expect(unique.size).toBe(allUnlocks.length);
  });

  it('every new tech has a non-empty name and description', () => {
    for (const t of NEW_MODERN_TECHS) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });
});
