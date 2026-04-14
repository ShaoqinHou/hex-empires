import { describe, it, expect } from 'vitest';
import {
  ALL_COMMANDERS,
  ALL_COMMANDER_PROMOTIONS,
  COMMANDER_PROMOTION_XP_COST,
} from '../commanders';
import type {
  AuraEffectDef,
  CommanderPromotionDef,
  CommanderTree,
} from '../../types/Commander';

// Cycle B content-validation tests. Guard: barrel completeness, ID
// uniqueness, age distribution, non-zero auras, valid AuraEffectDef
// variants, tier monotonicity against prerequisites. No cross-cycle
// wiring is asserted — that lands with the commanderPromotionSystem
// in cycle C.

const VALID_AURA_TYPES: ReadonlyArray<AuraEffectDef['type']> = [
  'AURA_MODIFY_CS',
  'AURA_MODIFY_RS',
  'AURA_HEAL_PER_TURN',
  'AURA_EXTRA_MOVEMENT',
  'AURA_EXPAND_RADIUS',
  'AURA_EXPAND_STACK',
  'AURA_FORTIFY_BONUS',
];

const VALID_TREES: ReadonlyArray<CommanderTree> = [
  'bastion',
  'assault',
  'logistics',
  'maneuver',
  'leadership',
];

describe('ALL_COMMANDERS catalogue', () => {
  it('contains between 3 and 6 commander archetypes', () => {
    expect(ALL_COMMANDERS.length).toBeGreaterThanOrEqual(3);
    expect(ALL_COMMANDERS.length).toBeLessThanOrEqual(6);
  });

  it('has all unique ids', () => {
    const ids = ALL_COMMANDERS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has all unique display names', () => {
    const names = ALL_COMMANDERS.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('covers at least the three canonical ages', () => {
    const ages = new Set(ALL_COMMANDERS.map(c => c.age));
    expect(ages.has('antiquity')).toBe(true);
    expect(ages.has('exploration')).toBe(true);
    expect(ages.has('modern')).toBe(true);
  });

  it('has a positive base aura radius on every commander', () => {
    for (const c of ALL_COMMANDERS) {
      expect(c.auraRadius).toBeGreaterThan(0);
    }
  });

  it('has positive cost / combat / movement / initialLevel on every commander', () => {
    for (const c of ALL_COMMANDERS) {
      expect(c.cost).toBeGreaterThan(0);
      expect(c.combat).toBeGreaterThan(0);
      expect(c.movement).toBeGreaterThan(0);
      expect(c.initialLevel).toBeGreaterThan(0);
    }
  });

  it('uses only known commander roles', () => {
    for (const c of ALL_COMMANDERS) {
      expect(['ground', 'naval', 'air']).toContain(c.role);
    }
  });

  it('includes the Antiquity captain as the sole antiquity commander', () => {
    const antiquity = ALL_COMMANDERS.filter(c => c.age === 'antiquity');
    expect(antiquity).toHaveLength(1);
    expect(antiquity[0]!.id).toBe('captain');
    expect(antiquity[0]!.role).toBe('ground');
  });

  it('includes a naval commander in the Exploration age', () => {
    const expNaval = ALL_COMMANDERS.filter(
      c => c.age === 'exploration' && c.role === 'naval',
    );
    expect(expNaval.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ALL_COMMANDER_PROMOTIONS catalogue', () => {
  it('contains at least one promotion per seeded tree', () => {
    // We seed 4 trees in cycle B (assault, logistics, bastion, leadership);
    // maneuver is reserved for a later cycle.
    const trees = new Set(ALL_COMMANDER_PROMOTIONS.map(p => p.tree));
    expect(trees.size).toBeGreaterThanOrEqual(2);
    for (const t of trees) {
      expect(VALID_TREES).toContain(t);
    }
  });

  it('has all unique promotion ids', () => {
    const ids = ALL_COMMANDER_PROMOTIONS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has all unique display names', () => {
    const names = ALL_COMMANDER_PROMOTIONS.map(p => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('uses only valid tiers (1, 2, 3)', () => {
    for (const p of ALL_COMMANDER_PROMOTIONS) {
      expect([1, 2, 3]).toContain(p.tier);
    }
  });

  it('every aura is a known AuraEffectDef variant', () => {
    for (const p of ALL_COMMANDER_PROMOTIONS) {
      expect(VALID_AURA_TYPES).toContain(p.aura.type);
    }
  });

  it('every radius-bearing aura declares a positive radius', () => {
    for (const p of ALL_COMMANDER_PROMOTIONS) {
      if ('radius' in p.aura) {
        expect(p.aura.radius).toBeGreaterThan(0);
      }
    }
  });

  it('every aura carries a non-zero magnitude on its scalar field', () => {
    for (const p of ALL_COMMANDER_PROMOTIONS) {
      const a = p.aura;
      switch (a.type) {
        case 'AURA_MODIFY_CS':
        case 'AURA_MODIFY_RS':
        case 'AURA_EXTRA_MOVEMENT':
        case 'AURA_FORTIFY_BONUS':
          expect(a.value).not.toBe(0);
          break;
        case 'AURA_HEAL_PER_TURN':
          expect(a.amount).not.toBe(0);
          break;
        case 'AURA_EXPAND_RADIUS':
        case 'AURA_EXPAND_STACK':
          expect(a.delta).not.toBe(0);
          break;
      }
    }
  });

  it('every prerequisite references an existing promotion id', () => {
    const ids = new Set(ALL_COMMANDER_PROMOTIONS.map(p => p.id));
    for (const p of ALL_COMMANDER_PROMOTIONS) {
      for (const prereq of p.prerequisites) {
        expect(ids.has(prereq)).toBe(true);
      }
    }
  });

  it('enforces monotonic tier progression across prerequisites', () => {
    // A tier-N promotion must list only tier-(N-1)-or-lower predecessors;
    // tier-1 nodes have no prerequisites.
    const byId = new Map<string, CommanderPromotionDef>(
      ALL_COMMANDER_PROMOTIONS.map(p => [p.id, p] as const),
    );
    for (const p of ALL_COMMANDER_PROMOTIONS) {
      if (p.tier === 1) {
        expect(p.prerequisites).toHaveLength(0);
      } else {
        expect(p.prerequisites.length).toBeGreaterThan(0);
        for (const prereqId of p.prerequisites) {
          const pre = byId.get(prereqId);
          expect(pre).toBeDefined();
          expect(pre!.tier).toBeLessThan(p.tier);
        }
      }
    }
  });

  it('forbids cross-tree prerequisites', () => {
    const byId = new Map<string, CommanderPromotionDef>(
      ALL_COMMANDER_PROMOTIONS.map(p => [p.id, p] as const),
    );
    for (const p of ALL_COMMANDER_PROMOTIONS) {
      for (const prereqId of p.prerequisites) {
        const pre = byId.get(prereqId)!;
        expect(pre.tree).toBe(p.tree);
      }
    }
  });

  it('exposes the tier XP-cost table with strictly increasing costs', () => {
    expect(COMMANDER_PROMOTION_XP_COST[1]).toBeGreaterThan(0);
    expect(COMMANDER_PROMOTION_XP_COST[2]).toBeGreaterThan(
      COMMANDER_PROMOTION_XP_COST[1],
    );
    expect(COMMANDER_PROMOTION_XP_COST[3]).toBeGreaterThan(
      COMMANDER_PROMOTION_XP_COST[2],
    );
  });
});
