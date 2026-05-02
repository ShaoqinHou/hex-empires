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
  'AURA_GOLD_PER_PACKED_UNIT',
  'AURA_LAND_PRODUCTION_BONUS_WHILE_STATIONED',
  'AURA_PILLAGE_BONUS',
  'AURA_EXTRA_MOVEMENT',
  'AURA_EXPAND_RADIUS',
  'AURA_EXPAND_STACK',
  'AURA_FORTIFY_BONUS',
  'AURA_GRANT_ABILITY',
  'AURA_DEPLOY_WITH_MOVEMENT',
  'AURA_FORTIFY_ACTION_TURN_REDUCTION',
  'AURA_DISTRICT_HP_BONUS',
  'AURA_HEAL_AFTER_ATTACK',
];

const VALID_TREES: ReadonlyArray<CommanderTree> = [
  'bastion',
  'assault',
  'logistics',
  'maneuver',
  'leadership',
];

describe('ALL_COMMANDERS catalogue', () => {
  it('contains between 3 and 10 commander archetypes (seed + expansion)', () => {
    expect(ALL_COMMANDERS.length).toBeGreaterThanOrEqual(3);
    expect(ALL_COMMANDERS.length).toBeLessThanOrEqual(10);
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

  it('uses only valid tiers (1, 2, 3, 4)', () => {
    for (const p of ALL_COMMANDER_PROMOTIONS) {
      expect([1, 2, 3, 4]).toContain(p.tier);
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
          expect(a.radius).toBeGreaterThan(0);
          break;
        case 'AURA_GOLD_PER_PACKED_UNIT':
        case 'AURA_LAND_PRODUCTION_BONUS_WHILE_STATIONED':
          expect(a.value).not.toBe(0);
          break;
        case 'AURA_EXPAND_RADIUS':
        case 'AURA_EXPAND_STACK':
          expect(a.delta).not.toBe(0);
          if (a.type === 'AURA_EXPAND_STACK' && a.reinforcementSpeed != null) {
            expect(a.reinforcementSpeed).toBeGreaterThanOrEqual(0);
          }
          break;
        case 'AURA_PILLAGE_BONUS':
          expect(a.radius).toBeGreaterThan(0);
          expect(a.yieldBonusPercent).not.toBe(0);
          expect(a.hpBonusPercent).not.toBe(0);
          break;
        case 'AURA_GRANT_ABILITY':
          expect(a.abilityId.length).toBeGreaterThan(0);
          break;
        case 'AURA_DEPLOY_WITH_MOVEMENT':
          expect(a.type).toBe('AURA_DEPLOY_WITH_MOVEMENT');
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
    expect(COMMANDER_PROMOTION_XP_COST[4]).toBeGreaterThan(
      COMMANDER_PROMOTION_XP_COST[3],
    );
  });

  it('matches the sourced Army Assault promotion tree shape', () => {
    const assault = ALL_COMMANDER_PROMOTIONS.filter(p => p.tree === 'assault');
    expect(assault.map(p => p.id)).toEqual([
      'assault_initiative',
      'assault_rout',
      'assault_storm',
      'assault_shock_tactics',
      'assault_enfilade',
      'assault_advancement',
    ]);
    expect(assault.map(p => p.name)).toEqual([
      'Initiative',
      'Rout',
      'Storm',
      'Shock Tactics',
      'Enfilade',
      'Advancement',
    ]);
    expect(assault.map(p => p.tier)).toEqual([1, 2, 2, 3, 3, 4]);
    expect(assault[1]!.prerequisites).toEqual(['assault_initiative']);
    expect(assault[2]!.prerequisites).toEqual(['assault_initiative']);
    expect(assault[3]!.prerequisites).toEqual(['assault_rout']);
    expect(assault[4]!.prerequisites).toEqual(['assault_storm']);
    expect(assault[5]!.prerequisites).toEqual(['assault_shock_tactics', 'assault_enfilade']);
    expect(assault[5]!.prerequisiteMode).toBe('any');
    for (const promotion of assault.slice(1, 5)) {
      expect(promotion.aura.type).toBe('AURA_MODIFY_CS');
      if (promotion.aura.type === 'AURA_MODIFY_CS') {
        expect(promotion.aura.condition).toBe('attacking');
      }
    }
  });

  it('matches the sourced Army Bastion promotion tree shape', () => {
    const bastionSteadfast = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'bastion_steadfast');
    expect(bastionSteadfast).toBeDefined();
    const bastionBulwark = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'bastion_bulwark');
    const bastionHoldTheLine = ALL_COMMANDER_PROMOTIONS.find(
      p => p.id === 'bastion_hold_the_line',
    );
    const bastionDefilade = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'bastion_defilade');
    const bastionGarrison = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'bastion_garrison');
    const bastionResolute = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'bastion_resolute');

    const bastionTree = ALL_COMMANDER_PROMOTIONS.filter(p => p.tree === 'bastion').map(p => p.id);
    expect(bastionTree).toEqual([
      'bastion_steadfast',
      'bastion_bulwark',
      'bastion_hold_the_line',
      'bastion_defilade',
      'bastion_garrison',
      'bastion_resolute',
    ]);

    const bastion = ALL_COMMANDER_PROMOTIONS.filter(p => p.tree === 'bastion');
    expect(bastion.map(p => p.name)).toEqual([
      'Steadfast',
      'Bulwark',
      'Hold the Line',
      'Defilade',
      'Garrison',
      'Resolute',
    ]);
    expect(bastion.map(p => p.tier)).toEqual([1, 2, 2, 3, 3, 4]);

    expect(bastionSteadfast).toBeDefined();
    expect(bastionSteadfast!.name).toBe('Steadfast');
    expect(bastionSteadfast!.tree).toBe('bastion');
    expect(bastionSteadfast!.tier).toBe(1);
    expect(bastionSteadfast!.prerequisites).toEqual([]);
    expect(bastionSteadfast!.aura.type).toBe('AURA_MODIFY_CS');
    if (bastionSteadfast!.aura.type === 'AURA_MODIFY_CS') {
      expect(bastionSteadfast!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(bastionSteadfast!.aura.value).toBe(2);
      expect(bastionSteadfast!.aura.radius).toBe(1);
      expect(bastionSteadfast!.aura.condition).toBe('defending');
    }

    expect(bastionBulwark).toBeDefined();
    expect(bastionBulwark!.prerequisites).toEqual(['bastion_steadfast']);
    expect(bastionBulwark!.tier).toBe(2);
    expect(bastionBulwark!.aura.type).toBe('AURA_FORTIFY_ACTION_TURN_REDUCTION');
    if (bastionBulwark!.aura.type === 'AURA_FORTIFY_ACTION_TURN_REDUCTION') {
      expect(bastionBulwark!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(bastionBulwark!.aura.value).toBe(1);
      expect(bastionBulwark!.aura.radius).toBe(1);
    }

    expect(bastionHoldTheLine).toBeDefined();
    expect(bastionHoldTheLine!.prerequisites).toEqual(['bastion_steadfast']);
    expect(bastionHoldTheLine!.tier).toBe(2);
    expect(bastionHoldTheLine!.aura.type).toBe('AURA_MODIFY_CS');
    if (bastionHoldTheLine!.aura.type === 'AURA_MODIFY_CS') {
      expect(bastionHoldTheLine!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(bastionHoldTheLine!.aura.value).toBe(2);
      expect(bastionHoldTheLine!.aura.radius).toBe(1);
      expect(bastionHoldTheLine!.aura.requiresDistrict).toBe(true);
    }

    expect(bastionDefilade).toBeDefined();
    expect(bastionDefilade!.prerequisites).toEqual(['bastion_bulwark']);
    expect(bastionDefilade!.tier).toBe(3);
    expect(bastionDefilade!.aura.type).toBe('AURA_MODIFY_CS');
    if (bastionDefilade!.aura.type === 'AURA_MODIFY_CS') {
      expect(bastionDefilade!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(bastionDefilade!.aura.value).toBe(3);
      expect(bastionDefilade!.aura.radius).toBe(1);
      expect(bastionDefilade!.aura.condition).toBe('defending');
      expect(bastionDefilade!.aura.requiresFortified).toBe(true);
    }

    expect(bastionGarrison).toBeDefined();
    expect(bastionGarrison!.prerequisites).toEqual(['bastion_hold_the_line']);
    expect(bastionGarrison!.tier).toBe(3);
    expect(bastionGarrison!.aura.type).toBe('AURA_DISTRICT_HP_BONUS');
    if (bastionGarrison!.aura.type === 'AURA_DISTRICT_HP_BONUS') {
      expect(bastionGarrison!.aura.value).toBe(10);
      expect(bastionGarrison!.aura.requiresCommanderOnCityCenter).toBe(true);
    }

    expect(bastionResolute).toBeDefined();
    expect(bastionResolute!.prerequisites).toEqual(
      expect.arrayContaining(['bastion_defilade', 'bastion_garrison']),
    );
    expect(bastionResolute!.prerequisiteMode).toBe('any');
    expect(bastionResolute!.tier).toBe(4);
    expect(bastionResolute!.aura.type).toBe('AURA_HEAL_AFTER_ATTACK');
    if (bastionResolute!.aura.type === 'AURA_HEAL_AFTER_ATTACK') {
      expect(bastionResolute!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(bastionResolute!.aura.amount).toBe(5);
      expect(bastionResolute!.aura.radius).toBe(1);
    }
  });

  it('includes Assault Advancement as a First Strike ability grant', () => {
    const advancement = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'assault_advancement');
    expect(advancement).toBeDefined();
    expect(advancement!.name).toBe('Advancement');
    expect(advancement!.tree).toBe('assault');
    expect(advancement!.tier).toBe(4);
    expect(advancement!.prerequisites).toEqual(
      expect.arrayContaining(['assault_shock_tactics', 'assault_enfilade'],
    ));
    expect(advancement!.prerequisiteMode).toBe('any');
    expect(advancement!.aura.type).toBe('AURA_GRANT_ABILITY');
    if (advancement!.aura.type === 'AURA_GRANT_ABILITY') {
      expect(advancement!.aura.abilityId).toBe('first_strike');
      expect(advancement!.aura.target).toEqual(['melee', 'cavalry']);
    }
  });

  it('includes Assault Initiative as the deploy-with-movement exception', () => {
    const initiative = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'assault_initiative');
    expect(initiative).toBeDefined();
    expect(initiative!.name).toBe('Initiative');
    expect(initiative!.tree).toBe('assault');
    expect(initiative!.tier).toBe(1);
    expect(initiative!.prerequisites).toEqual([]);
    expect(initiative!.aura.type).toBe('AURA_DEPLOY_WITH_MOVEMENT');
  });

  it('matches sourced Army Logistics promotion tree and prereqs from Civ VII', () => {
    const logistics = ALL_COMMANDER_PROMOTIONS.filter(p => p.tree === 'logistics');
    expect(logistics.map(p => p.id)).toEqual([
      'logistics_quartermaster',
      'logistics_recruitment',
      'logistics_regiments',
      'logistics_field_medic',
      'logistics_looting',
      'logistics_survival_training',
    ]);

    const quartermaster = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'logistics_quartermaster');
    expect(quartermaster).toBeDefined();
    expect(quartermaster!.name).toBe('Quartermaster');
    expect(quartermaster!.tier).toBe(1);
    expect(quartermaster!.prerequisites).toEqual([]);
    expect(quartermaster!.aura.type).toBe('AURA_GOLD_PER_PACKED_UNIT');
    if (quartermaster!.aura.type === 'AURA_GOLD_PER_PACKED_UNIT') {
      expect(quartermaster!.aura.value).toBe(1);
    }

    const recruitment = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'logistics_recruitment');
    expect(recruitment).toBeDefined();
    expect(recruitment!.name).toBe('Recruitment');
    expect(recruitment!.tier).toBe(1);
    expect(recruitment!.prerequisites).toEqual([]);
    expect(recruitment!.aura.type).toBe('AURA_LAND_PRODUCTION_BONUS_WHILE_STATIONED');
    if (recruitment!.aura.type === 'AURA_LAND_PRODUCTION_BONUS_WHILE_STATIONED') {
      expect(recruitment!.aura.value).toBe(15);
    }

    const regiments = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'logistics_regiments');
    expect(regiments).toBeDefined();
    expect(regiments!.name).toBe('Regiments');
    expect(regiments!.tier).toBe(2);
    expect(regiments!.prerequisiteMode).toBe('any');
    expect(regiments!.prerequisites).toEqual(
      expect.arrayContaining(['logistics_quartermaster', 'logistics_recruitment']),
    );
    expect(regiments!.aura.type).toBe('AURA_EXPAND_STACK');
    if (regiments!.aura.type === 'AURA_EXPAND_STACK') {
      expect(regiments!.aura.delta).toBe(2);
      expect(regiments!.aura.reinforcementSpeed).toBe(1);
    }

    const fieldMedic = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'logistics_field_medic');
    expect(fieldMedic).toBeDefined();
    expect(fieldMedic!.name).toBe('Field Medic');
    expect(fieldMedic!.tier).toBe(3);
    expect(fieldMedic!.prerequisites).toEqual(['logistics_regiments']);
    expect(fieldMedic!.aura.type).toBe('AURA_HEAL_PER_TURN');
    if (fieldMedic!.aura.type === 'AURA_HEAL_PER_TURN') {
      expect(fieldMedic!.aura.amount).toBe(5);
      expect(fieldMedic!.aura.territoryScope).toBe('enemy_or_neutral_territory');
      expect(fieldMedic!.aura.radius).toBe(1);
    }

    const looting = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'logistics_looting');
    expect(looting).toBeDefined();
    expect(looting!.name).toBe('Looting');
    expect(looting!.tier).toBe(3);
    expect(looting!.prerequisites).toEqual(['logistics_regiments']);
    expect(looting!.aura.type).toBe('AURA_PILLAGE_BONUS');
    if (looting!.aura.type === 'AURA_PILLAGE_BONUS') {
      expect(looting!.aura.radius).toBe(1);
      expect(looting!.aura.yieldBonusPercent).toBe(50);
      expect(looting!.aura.hpBonusPercent).toBe(50);
    }

    const survival = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'logistics_survival_training');
    expect(survival).toBeDefined();
    expect(survival!.name).toBe('Survival Training');
    expect(survival!.tier).toBe(4);
    expect(survival!.prerequisites).toEqual(
      expect.arrayContaining(['logistics_field_medic', 'logistics_looting']),
    );
    expect(survival!.prerequisiteMode).toBe('any');
    expect(survival!.aura.type).toBe('AURA_GRANT_ABILITY');
    if (survival!.aura.type === 'AURA_GRANT_ABILITY') {
      expect(survival!.aura.abilityId).toBe('commando');
      expect(survival!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(survival!.aura.radius).toBe(1);
    }
  });
});

// ── Expansion: commanders + promotions added post-M10 ──
// Guards the new Air General + Partisan Leader archetypes and the
// Guerilla Tactics / Air Superiority branches.

describe('Commander expansion content', () => {
  it('ships more than the M10 starter count in both catalogues', () => {
    // M10 seeded 5 commanders and 10 promotions.
    expect(ALL_COMMANDERS.length).toBeGreaterThan(5);
    expect(ALL_COMMANDER_PROMOTIONS.length).toBeGreaterThan(10);
  });

  it('adds an air-role commander in the modern age (pairs with M17 aircraft)', () => {
    const airModern = ALL_COMMANDERS.filter(
      c => c.age === 'modern' && c.role === 'air',
    );
    expect(airModern).toHaveLength(1);
    expect(airModern[0]!.id).toBe('air_general');
    expect(airModern[0]!.auraRadius).toBeGreaterThanOrEqual(1);
  });

  it('adds a Partisan Leader ground commander in the exploration age', () => {
    const partisan = ALL_COMMANDERS.find(c => c.id === 'partisan_leader');
    expect(partisan).toBeDefined();
    expect(partisan!.age).toBe('exploration');
    expect(partisan!.role).toBe('ground');
    // Cheaper + faster than a line General so it reads as irregular.
    const general = ALL_COMMANDERS.find(c => c.id === 'general')!;
    expect(partisan!.cost).toBeLessThan(general.cost);
    expect(partisan!.movement).toBeGreaterThan(general.movement);
  });

  it('covers every declared role (ground, naval, air) at least once', () => {
    const roles = new Set(ALL_COMMANDERS.map(c => c.role));
    expect(roles.has('ground')).toBe(true);
    expect(roles.has('naval')).toBe(true);
    expect(roles.has('air')).toBe(true);
  });

  it('seeds the maneuver tree with a full 3-tier Guerilla Tactics spine', () => {
    const maneuver = ALL_COMMANDER_PROMOTIONS.filter(p => p.tree === 'maneuver');
    expect(maneuver).toHaveLength(3);
    const tiers = maneuver.map(p => p.tier).sort();
    expect(tiers).toEqual([1, 2, 3]);
    const ids = maneuver.map(p => p.id);
    expect(ids).toContain('maneuver_ambush');
    expect(ids).toContain('maneuver_hit_and_run');
    expect(ids).toContain('maneuver_guerilla_war');
  });

  it('grows the leadership tree with an Air Superiority sub-branch', () => {
    const airSup = ALL_COMMANDER_PROMOTIONS.find(
      p => p.id === 'leadership_air_superiority',
    );
    const longRange = ALL_COMMANDER_PROMOTIONS.find(
      p => p.id === 'leadership_long_range',
    );
    expect(airSup).toBeDefined();
    expect(longRange).toBeDefined();
    expect(airSup!.tree).toBe('leadership');
    expect(longRange!.tree).toBe('leadership');
    expect(airSup!.tier).toBe(2);
    expect(longRange!.tier).toBe(3);
    expect(airSup!.prerequisites).toContain('leadership_commanding_presence');
    expect(longRange!.prerequisites).toContain('leadership_air_superiority');
  });

  it('keeps every expansion prereq internal to its own tree (no cross-tree leaks)', () => {
    const byId = new Map(ALL_COMMANDER_PROMOTIONS.map(p => [p.id, p] as const));
    const expansionIds = [
      'maneuver_ambush',
      'maneuver_hit_and_run',
      'maneuver_guerilla_war',
      'leadership_air_superiority',
      'leadership_long_range',
    ];
    for (const id of expansionIds) {
      const p = byId.get(id)!;
      for (const prereqId of p.prerequisites) {
        const pre = byId.get(prereqId)!;
        expect(pre.tree).toBe(p.tree);
      }
    }
  });

  it('keeps all expansion auras inside the known AuraEffectDef variant set', () => {
    const expansionIds = new Set([
      'maneuver_ambush',
      'maneuver_hit_and_run',
      'maneuver_guerilla_war',
      'leadership_air_superiority',
      'leadership_long_range',
    ]);
    for (const p of ALL_COMMANDER_PROMOTIONS) {
      if (!expansionIds.has(p.id)) continue;
      expect(VALID_AURA_TYPES).toContain(p.aura.type);
    }
  });

  it('leaves every age+role slot with at least one commander archetype', () => {
    // Sanity: Antiquity ground, Exploration ground+naval, Modern ground+naval+air
    const has = (age: string, role: string): boolean =>
      ALL_COMMANDERS.some(c => c.age === age && c.role === role);
    expect(has('antiquity', 'ground')).toBe(true);
    expect(has('exploration', 'ground')).toBe(true);
    expect(has('exploration', 'naval')).toBe(true);
    expect(has('modern', 'ground')).toBe(true);
    expect(has('modern', 'naval')).toBe(true);
    expect(has('modern', 'air')).toBe(true);
  });

  it('keeps all commander + promotion ids globally unique after expansion', () => {
    const cIds = ALL_COMMANDERS.map(c => c.id);
    expect(new Set(cIds).size).toBe(cIds.length);
    const pIds = ALL_COMMANDER_PROMOTIONS.map(p => p.id);
    expect(new Set(pIds).size).toBe(pIds.length);
  });
});
