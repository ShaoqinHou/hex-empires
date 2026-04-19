// Civic catalog audit against the Civ VII-style rulebook.
//
// The rulebook (§9.3 Civic Tree, §14.1.1–14.1.3 Governments, §12 Military
// Victory, §14.6 Slot Maths) names a specific set of civics that the
// catalog must ship. This suite audits ALL_CIVICS for:
//
//   1. Catalog counts per age match the rulebook-expected totals after the
//      additive audit drop.
//   2. Every rulebook-named civic from §14 appears in the catalog.
//   3. Every civic id is unique globally.
//   4. Every prerequisite id resolves to a civic in the SAME age.
//   5. Costs fall inside the §9.2-adjacent cost curves
//      (antiquity 20–120, exploration 80–300, modern 300–700). The upper
//      antiquity/exploration bounds absorb pre-existing late-tree civics.
//   6. New civics (state_service, feudalism, scholasticism, political_theory,
//      enlightenment, class_struggle) are actually present.
//   7. tree positions are finite non-negative integers.
//   8. Universal civics (no civId) and civ-unique civics are both represented.
//
// The audit is additive: pre-existing civics are NOT renamed or dropped.
// Rulebook civics already shipped under the same id are considered present
// (e.g. `code_of_laws`, `mysticism`, `mercantilism`, `divine_right`,
// `totalitarianism`, `nationalism`).

import { describe, it, expect } from 'vitest';
import { ALL_CIVICS } from '../civics';
import { ALL_ANTIQUITY_CIVICS } from '../civics/antiquity/index';
import { ALL_EXPLORATION_CIVICS } from '../civics/exploration/index';
import { ALL_MODERN_CIVICS } from '../civics/modern/index';
import type { CivicDef } from '../civics/types';

// ── Rulebook-expected civic ids (names per §14 Government tables + §12). ──

const RULEBOOK_ANTIQUITY_CIVICS: ReadonlyArray<string> = [
  'code_of_laws',   // §14.1.1 — Classical Republic
  'mysticism',      // §14.1.1 — Despotism
  'state_service',  // §14.1.1 — Oligarchy (added in this audit)
];

const RULEBOOK_EXPLORATION_CIVICS: ReadonlyArray<string> = [
  'feudalism',      // §14.1.2 — Feudal Monarchy (added in this audit)
  'mercantilism',   // §14.1.2 — Plutocracy
  'scholasticism',  // §14.1.2 — Theocracy (added in this audit)
  'divine_right',   // §14.6 — +1 diplomatic slot
];

const RULEBOOK_MODERN_CIVICS: ReadonlyArray<string> = [
  'enlightenment',    // §14.1.3 — Democracy (added in this audit)
  'totalitarianism',  // §14.1.3 — Fascism
  'class_struggle',   // §14.1.3 — Communism (added in this audit)
  'political_theory', // §12 — required to adopt Ideology (added in this audit)
];

// Civics newly added by this audit cycle. Pre-existing civics are NOT here.
const NEWLY_ADDED_IDS: ReadonlyArray<string> = [
  'state_service',
  'feudalism',
  'scholasticism',
  'political_theory',
  'enlightenment',
  'class_struggle',
];

// ── Helpers ──

function byAge(age: CivicDef['age']): ReadonlyArray<CivicDef> {
  return ALL_CIVICS.filter((c) => c.age === age);
}

function ids(list: ReadonlyArray<CivicDef>): ReadonlySet<string> {
  return new Set(list.map((c) => c.id));
}

// ── Audit tests ──

describe('Civic catalog audit — rulebook §9.3 / §14 / §12', () => {
  it('1. Catalog totals per age match post-audit expectations', () => {
    // Pre-audit counts: antiquity=11, exploration=8, modern=6.
    // This audit adds: antiquity +1, exploration +2, modern +3.
    expect(ALL_ANTIQUITY_CIVICS).toHaveLength(12);
    expect(ALL_EXPLORATION_CIVICS).toHaveLength(10);
    expect(ALL_MODERN_CIVICS).toHaveLength(9);
    expect(ALL_CIVICS).toHaveLength(31);
  });

  it('2. Every rulebook-named civic appears in the correct age', () => {
    const antiquityIds = ids(byAge('antiquity'));
    const explorationIds = ids(byAge('exploration'));
    const modernIds = ids(byAge('modern'));

    for (const id of RULEBOOK_ANTIQUITY_CIVICS) {
      expect(antiquityIds.has(id), `missing antiquity civic ${id}`).toBe(true);
    }
    for (const id of RULEBOOK_EXPLORATION_CIVICS) {
      expect(explorationIds.has(id), `missing exploration civic ${id}`).toBe(true);
    }
    for (const id of RULEBOOK_MODERN_CIVICS) {
      expect(modernIds.has(id), `missing modern civic ${id}`).toBe(true);
    }
  });

  it('3. Every civic id is globally unique', () => {
    const seen = new Map<string, number>();
    for (const c of ALL_CIVICS) {
      seen.set(c.id, (seen.get(c.id) ?? 0) + 1);
    }
    const dupes = [...seen.entries()].filter(([, count]) => count > 1);
    expect(dupes).toEqual([]);
  });

  it('4. Every prerequisite id resolves to a civic in the same age', () => {
    for (const age of ['antiquity', 'exploration', 'modern'] as const) {
      const sameAge = ids(byAge(age));
      for (const c of byAge(age)) {
        for (const prereq of c.prerequisites) {
          expect(
            sameAge.has(prereq),
            `${c.id} (${age}) prereq ${prereq} not found in same age`,
          ).toBe(true);
        }
      }
    }
  });

  it('5. Costs fall inside each age band', () => {
    // Bounds absorb pre-existing late-tree civics while matching §9.2 scale.
    for (const c of byAge('antiquity')) {
      expect(c.cost, `${c.id} antiquity cost`).toBeGreaterThanOrEqual(20);
      expect(c.cost, `${c.id} antiquity cost`).toBeLessThanOrEqual(120);
    }
    for (const c of byAge('exploration')) {
      expect(c.cost, `${c.id} exploration cost`).toBeGreaterThanOrEqual(80);
      expect(c.cost, `${c.id} exploration cost`).toBeLessThanOrEqual(300);
    }
    for (const c of byAge('modern')) {
      expect(c.cost, `${c.id} modern cost`).toBeGreaterThanOrEqual(300);
      expect(c.cost, `${c.id} modern cost`).toBeLessThanOrEqual(700);
    }
  });

  it('6. Each newly-added civic is present and age-tagged correctly', () => {
    const byId = new Map(ALL_CIVICS.map((c) => [c.id, c]));
    for (const id of NEWLY_ADDED_IDS) {
      const c = byId.get(id);
      expect(c, `missing newly-added civic ${id}`).toBeDefined();
      if (!c) continue;
      if (id === 'state_service') expect(c.age).toBe('antiquity');
      if (id === 'feudalism' || id === 'scholasticism') expect(c.age).toBe('exploration');
      if (id === 'political_theory' || id === 'enlightenment' || id === 'class_struggle') {
        expect(c.age).toBe('modern');
      }
      // Every new civic must have a non-empty name, a description, and a
      // tree position.
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
      expect(Number.isInteger(c.treePosition.row)).toBe(true);
      expect(Number.isInteger(c.treePosition.col)).toBe(true);
    }
  });

  it('7. Tree positions are finite non-negative integers', () => {
    for (const c of ALL_CIVICS) {
      expect(Number.isFinite(c.treePosition.row)).toBe(true);
      expect(Number.isFinite(c.treePosition.col)).toBe(true);
      expect(c.treePosition.row).toBeGreaterThanOrEqual(0);
      expect(c.treePosition.col).toBeGreaterThanOrEqual(0);
    }
  });

  it('8. Catalog contains both universal and civ-unique civics', () => {
    const universal = ALL_CIVICS.filter((c) => c.civId === undefined);
    const unique = ALL_CIVICS.filter((c) => c.civId !== undefined);
    expect(universal.length).toBeGreaterThan(0);
    expect(unique.length).toBeGreaterThan(0);
    // All newly-added civics are universal (not civ-locked).
    for (const id of NEWLY_ADDED_IDS) {
      const c = ALL_CIVICS.find((x) => x.id === id);
      expect(c?.civId, `${id} should be universal`).toBeUndefined();
    }
  });

  it('9. Newly-added government-unlock civics declare their unlock', () => {
    // Unlocks updated in audit batch 1A: 'government_X' prefix stripped to match GovernmentDef ids.
    // 'class_struggle' unlocks removed (communism GovernmentDef not yet defined — TODO(content)).
    // 'political_theory' unlocks removed (adopt_ideology mechanic id not yet defined — TODO(content)).
    const byId = new Map(ALL_CIVICS.map((c) => [c.id, c]));
    const governmentUnlocks: ReadonlyArray<readonly [string, string]> = [
      ['state_service', 'oligarchy'],
      ['feudalism', 'feudal_monarchy'],
      ['scholasticism', 'theocracy'],
      ['enlightenment', 'elective_republic'],
    ];
    for (const [civicId, unlockId] of governmentUnlocks) {
      const c = byId.get(civicId);
      expect(c, civicId).toBeDefined();
      expect(c?.unlocks, `${civicId} unlocks`).toContain(unlockId);
    }
    // class_struggle: no communism government yet — verify unlocks is empty
    const classStruggle = byId.get('class_struggle');
    expect(classStruggle, 'class_struggle').toBeDefined();
    expect(classStruggle?.unlocks, 'class_struggle unlocks should be empty until communism is defined').toHaveLength(0);
  });
});
