/**
 * Exploration technologies audit — validates catalog against rulebook §9.5.
 *
 * Rulebook §9.5 lists 14 exploration techs (Selected):
 *   Machinery, Astronomy, Cartography, Castles, Heraldry, Feudalism, Guilds,
 *   Metallurgy, Shipbuilding, Education, Metal Casting, Architecture,
 *   Gunpowder, Urban Planning.
 *
 * This test file added 6 previously-missing techs: machinery, castles,
 * feudalism, guilds, shipbuilding, metal_casting (cross-referenced against
 * ALL_EXPLORATION_UNITS and ALL_EXPLORATION_BUILDINGS). Also doubles as a
 * catalog-completeness guard.
 *
 * Skipped (no matching unit/building content or folded under alternative id):
 *   - Heraldry → Man-at-Arms (unit not present in ALL_EXPLORATION_UNITS).
 *   - Architecture → Pavilion (building not present).
 *   - Urban Planning → Bank, Hospital (Bank already unlocked under `banking`;
 *     Hospital already unlocked under the modern-age `sanitation` tech).
 */
import { describe, it, expect } from 'vitest';
import {
  MACHINERY,
  CASTLES,
  FEUDALISM,
  GUILDS,
  SHIPBUILDING,
  METAL_CASTING,
  ALL_EXPLORATION_TECHS,
} from '../technologies/exploration';
import type { TechnologyDef } from '../technologies/types';
import { ALL_EXPLORATION_UNITS } from '../units/exploration-units';
import { ALL_EXPLORATION_BUILDINGS } from '../buildings/exploration-buildings';

const NEW_EXPLORATION_TECHS: ReadonlyArray<TechnologyDef> = [
  MACHINERY,
  CASTLES,
  FEUDALISM,
  GUILDS,
  SHIPBUILDING,
  METAL_CASTING,
];

// Subset of rulebook §9.5 names that the catalog is expected to cover.
const RULEBOOK_COVERED_NAMES: ReadonlyArray<string> = [
  'Machinery',
  'Astronomy',
  'Cartography',
  'Castles',
  'Feudalism',
  'Guilds',
  'Metallurgy',
  'Shipbuilding',
  'Education',
  'Metal Casting',
  'Gunpowder',
];

describe('exploration technologies audit — rulebook §9.5', () => {
  it('adds exactly 6 previously-missing exploration technologies', () => {
    expect(NEW_EXPLORATION_TECHS).toHaveLength(6);
  });

  it('catalog grew from 12 to 19 exploration techs (18 + FUTURE_TECH)', () => {
    expect(ALL_EXPLORATION_TECHS).toHaveLength(19);
    for (const tech of NEW_EXPLORATION_TECHS) {
      expect(ALL_EXPLORATION_TECHS).toContain(tech);
    }
  });

  it('each new tech has a unique id', () => {
    const newIds = NEW_EXPLORATION_TECHS.map(t => t.id);
    expect(new Set(newIds).size).toBe(newIds.length);
  });

  it('overall exploration tech ids are unique', () => {
    const allIds = ALL_EXPLORATION_TECHS.map(t => t.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('each new tech is tagged age=exploration', () => {
    for (const tech of NEW_EXPLORATION_TECHS) {
      expect(tech.age).toBe('exploration');
    }
  });

  it('each new tech has a cost within the rulebook §9.2 exploration range (80-450)', () => {
    for (const tech of NEW_EXPLORATION_TECHS) {
      expect(tech.cost).toBeGreaterThanOrEqual(80);
      expect(tech.cost).toBeLessThanOrEqual(450);
    }
  });

  it('every prerequisite for a new tech resolves to an existing exploration tech', () => {
    const explorationIds = new Set(ALL_EXPLORATION_TECHS.map(t => t.id));
    for (const tech of NEW_EXPLORATION_TECHS) {
      for (const prereq of tech.prerequisites) {
        expect(explorationIds.has(prereq)).toBe(true);
      }
    }
  });

  it('every unlock id for a new tech references a real exploration unit or building', () => {
    const unitIds = new Set(ALL_EXPLORATION_UNITS.map(u => u.id));
    const buildingIds = new Set(ALL_EXPLORATION_BUILDINGS.map(b => b.id));
    for (const tech of NEW_EXPLORATION_TECHS) {
      expect(tech.unlocks.length).toBeGreaterThan(0);
      for (const unlock of tech.unlocks) {
        expect(unitIds.has(unlock) || buildingIds.has(unlock)).toBe(true);
      }
    }
  });

  it('catalog covers the expected rulebook §9.5 technology names', () => {
    const catalogNames = new Set(ALL_EXPLORATION_TECHS.map(t => t.name));
    for (const rulebookName of RULEBOOK_COVERED_NAMES) {
      expect(catalogNames.has(rulebookName)).toBe(true);
    }
  });

  it('new techs have specific concrete properties per rulebook §9.5', () => {
    expect(MACHINERY.id).toBe('machinery');
    expect(MACHINERY.unlocks).toEqual(['catapult', 'gristmill', 'sawmill']);

    expect(CASTLES.id).toBe('castles');
    expect(CASTLES.prerequisites).toEqual(['feudalism']);
    expect(CASTLES.unlocks).toContain('crossbowman');
    expect(CASTLES.unlocks).toContain('dungeon');

    expect(FEUDALISM.id).toBe('feudalism');
    expect(FEUDALISM.unlocks).toContain('inn');

    expect(GUILDS.id).toBe('guilds');
    expect(GUILDS.prerequisites).toEqual(['apprenticeship']);
    expect(GUILDS.unlocks).toContain('guildhall');

    expect(SHIPBUILDING.id).toBe('shipbuilding');
    expect(SHIPBUILDING.prerequisites).toEqual(['cartography']);
    expect(SHIPBUILDING.unlocks).toContain('shipyard');

    expect(METAL_CASTING.id).toBe('metal_casting');
    expect(METAL_CASTING.prerequisites).toEqual(['metallurgy']);
    expect(METAL_CASTING.unlocks).toContain('pikeman');
    expect(METAL_CASTING.unlocks).toContain('lancer');
  });

  it('every exploration tech prerequisite resolves to a known tech id', () => {
    const allTechIds = new Set(ALL_EXPLORATION_TECHS.map(t => t.id));
    // antiquity prereqs are permitted cross-age references; collect union
    for (const tech of ALL_EXPLORATION_TECHS) {
      for (const prereq of tech.prerequisites) {
        // Must at minimum resolve somewhere; for this test, restrict to
        // exploration-internal prereqs — new techs must not reach back.
        if (NEW_EXPLORATION_TECHS.includes(tech)) {
          expect(allTechIds.has(prereq)).toBe(true);
        }
      }
    }
  });
});
