/**
 * CC3.3 — Civ unique unit and building reference validation.
 *
 * Verifies:
 *  - Every civ uniqueUnit (non-null) resolves to a known unit ID in ALL_UNITS.
 *  - Every civ uniqueBuilding (non-null) resolves to a known building ID in ALL_BUILDINGS.
 *  - At least 8 civs have a non-null uniqueUnit (CC3.1 requirement).
 *  - At least 4 civs have a non-null uniqueBuilding (CC3.2 requirement).
 *  - Spot-checks for specific CC3 uniques: IDs, ages, categories, and abilities.
 */
import { describe, it, expect } from 'vitest';
import { ALL_UNITS } from '../units';
import { ALL_BUILDINGS } from '../buildings';
import { ALL_ANTIQUITY_CIVS } from '../civilizations/antiquity-civs';
import { ALL_EXPLORATION_CIVS } from '../civilizations/exploration-civs';
import { ALL_MODERN_CIVS } from '../civilizations/modern-civs';
import {
  HOPLITE, IMMORTAL, MARYANNU_CHARIOT,
  ROMAN_LEGION, KESHIG, CONQUISTADOR,
  REDCOAT, GARDE_IMPERIALE, COSSACK,
} from '../units';
import { ACROPOLIS, PYRAMID, BATH } from '../buildings';
import { MOSQUE } from '../buildings';

const ALL_CIVS = [
  ...ALL_ANTIQUITY_CIVS,
  ...ALL_EXPLORATION_CIVS,
  ...ALL_MODERN_CIVS,
];

const UNIT_ID_SET = new Set(ALL_UNITS.map((u) => u.id));
const BUILDING_ID_SET = new Set(ALL_BUILDINGS.map((b) => b.id));

// ── Reference integrity ────────────────────────────────────────────────────

describe('CC3.3 — civ unique reference integrity', () => {
  it('every uniqueUnit is null OR references a known unit ID', () => {
    const badRefs: string[] = [];
    for (const civ of ALL_CIVS) {
      if (civ.uniqueUnit !== null && !UNIT_ID_SET.has(civ.uniqueUnit)) {
        badRefs.push(`${civ.id} -> uniqueUnit: ${civ.uniqueUnit}`);
      }
    }
    expect(badRefs).toEqual([]);
  });

  it('every uniqueBuilding is null OR references a known building ID', () => {
    const badRefs: string[] = [];
    for (const civ of ALL_CIVS) {
      if (civ.uniqueBuilding !== null && !BUILDING_ID_SET.has(civ.uniqueBuilding)) {
        badRefs.push(`${civ.id} -> uniqueBuilding: ${civ.uniqueBuilding}`);
      }
    }
    expect(badRefs).toEqual([]);
  });
});

// ── Coverage thresholds ────────────────────────────────────────────────────

describe('CC3.3 — civ unique coverage thresholds', () => {
  it('at least 8 civs have a non-null uniqueUnit', () => {
    const civsWithUnit = ALL_CIVS.filter((c) => c.uniqueUnit !== null);
    expect(civsWithUnit.length).toBeGreaterThanOrEqual(8);
  });

  it('at least 4 civs have a non-null uniqueBuilding', () => {
    const civsWithBuilding = ALL_CIVS.filter((c) => c.uniqueBuilding !== null);
    expect(civsWithBuilding.length).toBeGreaterThanOrEqual(4);
  });
});

// ── Civ wiring spot-checks ─────────────────────────────────────────────────

describe('CC3.3 — civ unique wiring spot-checks', () => {
  it('Rome has uniqueUnit roman_legion and uniqueBuilding bath', () => {
    const rome = ALL_CIVS.find((c) => c.id === 'rome');
    expect(rome).toBeDefined();
    expect(rome!.uniqueUnit).toBe('roman_legion');
    expect(rome!.uniqueBuilding).toBe('bath');
  });

  it('Greece has uniqueUnit hoplite and uniqueBuilding acropolis', () => {
    const greece = ALL_CIVS.find((c) => c.id === 'greece');
    expect(greece).toBeDefined();
    expect(greece!.uniqueUnit).toBe('hoplite');
    expect(greece!.uniqueBuilding).toBe('acropolis');
  });

  it('Persia has uniqueUnit immortal', () => {
    const persia = ALL_CIVS.find((c) => c.id === 'persia');
    expect(persia).toBeDefined();
    expect(persia!.uniqueUnit).toBe('immortal');
  });

  it('Egypt has uniqueUnit maryannu_chariot and uniqueBuilding pyramid', () => {
    const egypt = ALL_CIVS.find((c) => c.id === 'egypt');
    expect(egypt).toBeDefined();
    expect(egypt!.uniqueUnit).toBe('maryannu_chariot');
    expect(egypt!.uniqueBuilding).toBe('pyramid');
  });

  it('Mongolia has uniqueUnit keshig', () => {
    const mongolia = ALL_CIVS.find((c) => c.id === 'mongolia');
    expect(mongolia).toBeDefined();
    expect(mongolia!.uniqueUnit).toBe('keshig');
  });

  it('Spain has uniqueUnit conquistador', () => {
    const spain = ALL_CIVS.find((c) => c.id === 'spain');
    expect(spain).toBeDefined();
    expect(spain!.uniqueUnit).toBe('conquistador');
  });

  it('England has uniqueUnit redcoat', () => {
    const england = ALL_CIVS.find((c) => c.id === 'england');
    expect(england).toBeDefined();
    expect(england!.uniqueUnit).toBe('redcoat');
  });

  it('France has uniqueUnit garde_imperiale', () => {
    const france = ALL_CIVS.find((c) => c.id === 'france');
    expect(france).toBeDefined();
    expect(france!.uniqueUnit).toBe('garde_imperiale');
  });

  it('Russia has uniqueUnit cossack', () => {
    const russia = ALL_CIVS.find((c) => c.id === 'russia');
    expect(russia).toBeDefined();
    expect(russia!.uniqueUnit).toBe('cossack');
  });
});

// ── Unit definition spot-checks ────────────────────────────────────────────

describe('CC3.3 — unique unit definition correctness', () => {
  it('HOPLITE: antiquity melee, anti_cavalry ability, combat 31', () => {
    expect(HOPLITE.id).toBe('hoplite');
    expect(HOPLITE.age).toBe('antiquity');
    expect(HOPLITE.category).toBe('melee');
    expect(HOPLITE.combat).toBe(31);
    expect(HOPLITE.abilities).toContain('anti_cavalry');
    expect(HOPLITE.abilities).toContain('anti_cavalry_elite');
    expect(UNIT_ID_SET.has('hoplite')).toBe(true);
  });

  it('IMMORTAL: antiquity ranged, movement 4 (faster than base Archer at 2)', () => {
    expect(IMMORTAL.id).toBe('immortal');
    expect(IMMORTAL.age).toBe('antiquity');
    expect(IMMORTAL.category).toBe('ranged');
    expect(IMMORTAL.movement).toBe(4);
    expect(IMMORTAL.rangedCombat).toBeGreaterThan(0);
    expect(UNIT_ID_SET.has('immortal')).toBe(true);
  });

  it('MARYANNU_CHARIOT: antiquity cavalry, movement 5, ranged capability', () => {
    expect(MARYANNU_CHARIOT.id).toBe('maryannu_chariot');
    expect(MARYANNU_CHARIOT.age).toBe('antiquity');
    expect(MARYANNU_CHARIOT.category).toBe('cavalry');
    expect(MARYANNU_CHARIOT.movement).toBe(5);
    expect(MARYANNU_CHARIOT.rangedCombat).toBeGreaterThan(0);
    expect(UNIT_ID_SET.has('maryannu_chariot')).toBe(true);
  });

  it('ROMAN_LEGION: exploration melee, iron required, anti-barbarian', () => {
    expect(ROMAN_LEGION.id).toBe('roman_legion');
    expect(ROMAN_LEGION.age).toBe('exploration');
    expect(ROMAN_LEGION.category).toBe('melee');
    expect(ROMAN_LEGION.requiredTech).toBe('iron_working');
    expect(ROMAN_LEGION.requiredResource).toBe('iron');
    expect(ROMAN_LEGION.abilities).toContain('anti_barbarian');
    expect(UNIT_ID_SET.has('roman_legion')).toBe(true);
  });

  it('KESHIG: exploration cavalry, movement 6, ranged combat', () => {
    expect(KESHIG.id).toBe('keshig');
    expect(KESHIG.age).toBe('exploration');
    expect(KESHIG.category).toBe('cavalry');
    expect(KESHIG.movement).toBeGreaterThanOrEqual(6);
    expect(KESHIG.rangedCombat).toBeGreaterThan(0);
    expect(UNIT_ID_SET.has('keshig')).toBe(true);
  });

  it('CONQUISTADOR: exploration melee, higher movement than musketman', () => {
    expect(CONQUISTADOR.id).toBe('conquistador');
    expect(CONQUISTADOR.age).toBe('exploration');
    expect(CONQUISTADOR.category).toBe('melee');
    expect(CONQUISTADOR.movement).toBeGreaterThan(2);
    expect(UNIT_ID_SET.has('conquistador')).toBe(true);
  });

  it('REDCOAT: modern melee, friendly_territory_bonus ability', () => {
    expect(REDCOAT.id).toBe('redcoat');
    expect(REDCOAT.age).toBe('modern');
    expect(REDCOAT.category).toBe('melee');
    expect(REDCOAT.abilities).toContain('friendly_territory_bonus');
    expect(UNIT_ID_SET.has('redcoat')).toBe(true);
  });

  it('GARDE_IMPERIALE: modern melee, capital_territory_bonus ability', () => {
    expect(GARDE_IMPERIALE.id).toBe('garde_imperiale');
    expect(GARDE_IMPERIALE.age).toBe('modern');
    expect(GARDE_IMPERIALE.category).toBe('melee');
    expect(GARDE_IMPERIALE.abilities).toContain('capital_territory_bonus');
    expect(UNIT_ID_SET.has('garde_imperiale')).toBe(true);
  });

  it('COSSACK: modern cavalry, higher movement, own_territory_bonus', () => {
    expect(COSSACK.id).toBe('cossack');
    expect(COSSACK.age).toBe('modern');
    expect(COSSACK.category).toBe('cavalry');
    expect(COSSACK.movement).toBeGreaterThan(4);
    expect(COSSACK.abilities).toContain('own_territory_bonus');
    expect(UNIT_ID_SET.has('cossack')).toBe(true);
  });
});

// ── Building definition spot-checks ───────────────────────────────────────

describe('CC3.3 — unique building definition correctness', () => {
  it('BATH: antiquity, happiness yield, isCivUnique not required (generic building Rome uses)', () => {
    expect(BATH.id).toBe('bath');
    expect(BATH.age).toBe('antiquity');
    expect(BATH.yields.happiness).toBeGreaterThan(0);
    expect(BUILDING_ID_SET.has('bath')).toBe(true);
  });

  it('ACROPOLIS: antiquity culture building, culture and science yields, civId greece', () => {
    expect(ACROPOLIS.id).toBe('acropolis');
    expect(ACROPOLIS.age).toBe('antiquity');
    expect(ACROPOLIS.yields.culture).toBeGreaterThan(0);
    expect(ACROPOLIS.yields.science).toBeGreaterThan(0);
    expect(ACROPOLIS.isCivUnique).toBe(true);
    expect(ACROPOLIS.civId).toBe('greece');
    expect(BUILDING_ID_SET.has('acropolis')).toBe(true);
  });

  it('PYRAMID: antiquity, civ-unique for egypt, production yield', () => {
    expect(PYRAMID.id).toBe('pyramid');
    expect(PYRAMID.age).toBe('antiquity');
    expect(PYRAMID.isCivUnique).toBe(true);
    expect(PYRAMID.civId).toBe('egypt');
    expect(PYRAMID.yields.production).toBeGreaterThan(0);
    expect(BUILDING_ID_SET.has('pyramid')).toBe(true);
  });

  it('MOSQUE: exploration, civ-unique for songhai, higher faith than Temple', () => {
    expect(MOSQUE.id).toBe('mosque');
    expect(MOSQUE.age).toBe('exploration');
    expect(MOSQUE.isCivUnique).toBe(true);
    expect(MOSQUE.civId).toBe('songhai');
    expect(MOSQUE.yields.faith).toBeGreaterThan(4);
    expect(BUILDING_ID_SET.has('mosque')).toBe(true);
  });

  it('ALL_BUILDINGS has no duplicate IDs after CC3.2 additions', () => {
    const ids = ALL_BUILDINGS.map((b) => b.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('ALL_UNITS has no duplicate IDs after CC3.1 additions', () => {
    const ids = ALL_UNITS.map((u) => u.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
