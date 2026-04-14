/**
 * Wonders expansion tests — validate new Exploration and Modern wonders added
 * per civ7-rulebook.md §19.5 and §19.6.
 *
 * Ensures each new BuildingDef with isWonder: true has a valid shape, cost tier,
 * and referenced tech, and that barrels include the new entries.
 */
import { describe, it, expect } from 'vitest';
import {
  ANGKOR_WAT,
  HAGIA_SOPHIA,
  GREAT_WALL,
  TERRACOTTA_ARMY,
  ST_BASILS_CATHEDRAL,
  ALL_EXPLORATION_BUILDINGS,
} from '../buildings/exploration-buildings';
import {
  BRANDENBURG_GATE,
  SYDNEY_OPERA_HOUSE,
  PANAMA_CANAL,
  BROADWAY,
  CRISTO_REDENTOR,
  ALL_MODERN_BUILDINGS,
} from '../buildings/modern-buildings';
import type { BuildingDef } from '../../types/Building';
import type { YieldSet } from '../../types/Yields';

const NEW_EXPLORATION_WONDERS: ReadonlyArray<BuildingDef> = [
  ANGKOR_WAT,
  HAGIA_SOPHIA,
  GREAT_WALL,
  TERRACOTTA_ARMY,
  ST_BASILS_CATHEDRAL,
];

const NEW_MODERN_WONDERS: ReadonlyArray<BuildingDef> = [
  BRANDENBURG_GATE,
  SYDNEY_OPERA_HOUSE,
  PANAMA_CANAL,
  BROADWAY,
  CRISTO_REDENTOR,
];

// Techs defined in data/technologies/exploration and modern
const EXPLORATION_TECH_IDS = new Set<string>([
  'cartography', 'gunpowder', 'printing', 'banking', 'astronomy',
  'metallurgy', 'education', 'military_tactics', 'economics',
  'siege_tactics', 'apprenticeship', 'military_science',
]);
const MODERN_TECH_IDS = new Set<string>([
  'industrialization', 'scientific_theory', 'rifling', 'steam_power',
  'electricity', 'replaceable_parts', 'flight', 'nuclear_fission',
  'combined_arms', 'rocketry', 'mass_consumption', 'mass_media',
  'amphibious_warfare', 'radar',
]);

function hasNonZeroYield(yields: Partial<YieldSet>): boolean {
  return Object.values(yields).some((v) => typeof v === 'number' && v > 0);
}

describe('Wonders expansion — rulebook §19.5 Exploration wonders', () => {
  it('adds exactly 5 new Exploration wonders', () => {
    expect(NEW_EXPLORATION_WONDERS.length).toBe(5);
  });

  it('every new Exploration wonder has isWonder === true', () => {
    for (const w of NEW_EXPLORATION_WONDERS) {
      expect(w.isWonder).toBe(true);
    }
  });

  it('every new Exploration wonder has cost >= 300 (per §19.3 guidance)', () => {
    for (const w of NEW_EXPLORATION_WONDERS) {
      expect(w.cost).toBeGreaterThanOrEqual(300);
    }
  });

  it('every new Exploration wonder has age === "exploration"', () => {
    for (const w of NEW_EXPLORATION_WONDERS) {
      expect(w.age).toBe('exploration');
    }
  });

  it('every new Exploration wonder has category === "wonder"', () => {
    for (const w of NEW_EXPLORATION_WONDERS) {
      expect(w.category).toBe('wonder');
    }
  });

  it('every new Exploration wonder has maintenance === 0 and happinessCost === 0', () => {
    for (const w of NEW_EXPLORATION_WONDERS) {
      expect(w.maintenance).toBe(0);
      expect(w.happinessCost).toBe(0);
    }
  });

  it('every new Exploration wonder references a valid exploration-age tech', () => {
    for (const w of NEW_EXPLORATION_WONDERS) {
      expect(w.requiredTech).not.toBeNull();
      expect(EXPLORATION_TECH_IDS.has(w.requiredTech!)).toBe(true);
    }
  });

  it('every new Exploration wonder has at least one non-zero yield', () => {
    for (const w of NEW_EXPLORATION_WONDERS) {
      expect(hasNonZeroYield(w.yields)).toBe(true);
    }
  });

  it('every new Exploration wonder has at least one effect description', () => {
    for (const w of NEW_EXPLORATION_WONDERS) {
      expect(w.effects.length).toBeGreaterThan(0);
    }
  });

  it('ALL_EXPLORATION_BUILDINGS includes every new Exploration wonder', () => {
    for (const w of NEW_EXPLORATION_WONDERS) {
      expect(ALL_EXPLORATION_BUILDINGS).toContain(w);
    }
  });
});

describe('Wonders expansion — rulebook §19.6 Modern wonders', () => {
  it('adds exactly 5 new Modern wonders', () => {
    expect(NEW_MODERN_WONDERS.length).toBe(5);
  });

  it('every new Modern wonder has isWonder === true', () => {
    for (const w of NEW_MODERN_WONDERS) {
      expect(w.isWonder).toBe(true);
    }
  });

  it('every new Modern wonder has cost >= 300 (per §19.3 guidance)', () => {
    for (const w of NEW_MODERN_WONDERS) {
      expect(w.cost).toBeGreaterThanOrEqual(300);
    }
  });

  it('every new Modern wonder has age === "modern"', () => {
    for (const w of NEW_MODERN_WONDERS) {
      expect(w.age).toBe('modern');
    }
  });

  it('every new Modern wonder has category === "wonder"', () => {
    for (const w of NEW_MODERN_WONDERS) {
      expect(w.category).toBe('wonder');
    }
  });

  it('every new Modern wonder has maintenance === 0 and happinessCost === 0', () => {
    for (const w of NEW_MODERN_WONDERS) {
      expect(w.maintenance).toBe(0);
      expect(w.happinessCost).toBe(0);
    }
  });

  it('every new Modern wonder references a valid modern-age tech', () => {
    for (const w of NEW_MODERN_WONDERS) {
      expect(w.requiredTech).not.toBeNull();
      expect(MODERN_TECH_IDS.has(w.requiredTech!)).toBe(true);
    }
  });

  it('every new Modern wonder has at least one non-zero yield', () => {
    for (const w of NEW_MODERN_WONDERS) {
      expect(hasNonZeroYield(w.yields)).toBe(true);
    }
  });

  it('every new Modern wonder has at least one effect description', () => {
    for (const w of NEW_MODERN_WONDERS) {
      expect(w.effects.length).toBeGreaterThan(0);
    }
  });

  it('ALL_MODERN_BUILDINGS includes every new Modern wonder', () => {
    for (const w of NEW_MODERN_WONDERS) {
      expect(ALL_MODERN_BUILDINGS).toContain(w);
    }
  });
});

describe('Wonders expansion — uniqueness and identifiers', () => {
  it('every new wonder has a non-empty id and name', () => {
    for (const w of [...NEW_EXPLORATION_WONDERS, ...NEW_MODERN_WONDERS]) {
      expect(w.id.length).toBeGreaterThan(0);
      expect(w.name.length).toBeGreaterThan(0);
    }
  });

  it('new wonder ids are unique across both files', () => {
    const ids = [...NEW_EXPLORATION_WONDERS, ...NEW_MODERN_WONDERS].map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('new wonder ids do not collide with any other building in their barrels', () => {
    const expIds = ALL_EXPLORATION_BUILDINGS.map((b) => b.id);
    const modIds = ALL_MODERN_BUILDINGS.map((b) => b.id);
    expect(new Set(expIds).size).toBe(expIds.length);
    expect(new Set(modIds).size).toBe(modIds.length);
  });
});
