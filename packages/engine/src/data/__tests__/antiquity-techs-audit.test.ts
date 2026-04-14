/**
 * Antiquity technologies audit — validates catalog against rulebook §9.4.
 *
 * Rulebook §9.4 lists 15 antiquity techs:
 *   Agriculture, Animal Husbandry, Pottery, Sailing, Writing, Irrigation,
 *   Masonry, Currency, Bronze Working, The Wheel, Navigation, Engineering,
 *   Military Training, Mathematics, Iron Working.
 *
 * This test file added 4 previously-missing techs: agriculture, engineering,
 * military_training, navigation (cross-referenced against ALL_ANTIQUITY_UNITS
 * and ALL_ANTIQUITY_BUILDINGS). Also doubles as a catalog-completeness guard.
 *
 * Skipped (already under different ids or folded into other techs):
 *   - Archer is unlocked via the existing `archery` tech (rulebook folds into
 *     bronze_working); kept as-is to avoid removing existing content.
 *   - Horseman / Phalanx unlocks already live under iron_working.
 */
import { describe, it, expect } from 'vitest';
import {
  AGRICULTURE,
  ENGINEERING,
  MILITARY_TRAINING,
  NAVIGATION,
  ALL_ANTIQUITY_TECHS,
} from '../technologies/antiquity';
import type { TechnologyDef } from '../technologies/types';
import { ALL_ANTIQUITY_UNITS } from '../units/antiquity-units';
import { ALL_ANTIQUITY_BUILDINGS } from '../buildings/antiquity-buildings';

const NEW_ANTIQUITY_TECHS: ReadonlyArray<TechnologyDef> = [
  AGRICULTURE,
  ENGINEERING,
  MILITARY_TRAINING,
  NAVIGATION,
];

// The rulebook §9.4 list of technology names expected to exist in the catalog.
const RULEBOOK_TECH_NAMES: ReadonlyArray<string> = [
  'Agriculture',
  'Animal Husbandry',
  'Pottery',
  'Sailing',
  'Writing',
  'Irrigation',
  'Masonry',
  'Currency',
  'Bronze Working',
  'Wheel', // rulebook calls it "The Wheel" — we store it as "Wheel"
  'Navigation',
  'Engineering',
  'Military Training',
  'Mathematics',
  'Iron Working',
];

describe('antiquity technologies audit — rulebook §9.4', () => {
  it('adds exactly 4 previously-missing antiquity technologies', () => {
    expect(NEW_ANTIQUITY_TECHS).toHaveLength(4);
  });

  it('catalog grew to include all 4 new techs (total 19)', () => {
    expect(ALL_ANTIQUITY_TECHS).toHaveLength(19);
    for (const tech of NEW_ANTIQUITY_TECHS) {
      expect(ALL_ANTIQUITY_TECHS).toContain(tech);
    }
  });

  it('each new tech has a unique id', () => {
    const newIds = NEW_ANTIQUITY_TECHS.map(t => t.id);
    expect(new Set(newIds).size).toBe(newIds.length);
  });

  it('overall antiquity tech ids are unique', () => {
    const allIds = ALL_ANTIQUITY_TECHS.map(t => t.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('each new tech is tagged age=antiquity', () => {
    for (const tech of NEW_ANTIQUITY_TECHS) {
      expect(tech.age).toBe('antiquity');
    }
  });

  it('each new tech has a cost within the antiquity 20-80 range', () => {
    for (const tech of NEW_ANTIQUITY_TECHS) {
      expect(tech.cost).toBeGreaterThanOrEqual(20);
      expect(tech.cost).toBeLessThanOrEqual(80);
    }
  });

  it('every prerequisite for a new tech exists in ALL_ANTIQUITY_TECHS', () => {
    const antiquityIds = new Set(ALL_ANTIQUITY_TECHS.map(t => t.id));
    for (const tech of NEW_ANTIQUITY_TECHS) {
      for (const prereq of tech.prerequisites) {
        expect(antiquityIds.has(prereq)).toBe(true);
      }
    }
  });

  it('every unlock id for a new tech references a real unit or building', () => {
    const unitIds = new Set(ALL_ANTIQUITY_UNITS.map(u => u.id));
    const buildingIds = new Set(ALL_ANTIQUITY_BUILDINGS.map(b => b.id));
    for (const tech of NEW_ANTIQUITY_TECHS) {
      for (const unlock of tech.unlocks) {
        expect(unitIds.has(unlock) || buildingIds.has(unlock)).toBe(true);
      }
    }
  });

  it('catalog contains every technology listed in rulebook §9.4', () => {
    const catalogNames = new Set(ALL_ANTIQUITY_TECHS.map(t => t.name));
    for (const rulebookName of RULEBOOK_TECH_NAMES) {
      expect(catalogNames.has(rulebookName)).toBe(true);
    }
  });

  it('new techs have specific, concrete properties per rulebook §9.4', () => {
    expect(AGRICULTURE.id).toBe('agriculture');
    expect(AGRICULTURE.prerequisites).toEqual([]);
    expect(ENGINEERING.id).toBe('engineering');
    expect(ENGINEERING.prerequisites).toEqual(['masonry']);
    expect(ENGINEERING.unlocks).toContain('amphitheatre');
    expect(MILITARY_TRAINING.id).toBe('military_training');
    expect(MILITARY_TRAINING.prerequisites).toEqual(['bronze_working']);
    expect(MILITARY_TRAINING.unlocks).toContain('arena');
    expect(NAVIGATION.id).toBe('navigation');
    expect(NAVIGATION.prerequisites).toEqual(['sailing']);
  });
});
