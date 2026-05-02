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
  'AURA_COMMANDER_MOBILITY',
  'AURA_FLANKING_BONUS',
  'AURA_AMPHIBIOUS_OPERATIONS',
  'AURA_IGNORE_TERRAIN_MOVEMENT_RESTRICTIONS',
  'AURA_ZONE_OF_CONTROL',
  'AURA_SETTLEMENT_YIELD_BONUS_WHILE_STATIONED',
  'AURA_UPGRADE_SUPPORT',
  'AURA_COMMANDER_SELF_CS',
  'AURA_COMMANDER_RECOVERY_TIME_REDUCTION_PERCENT',
  'AURA_COMMAND_ACTION_COMBAT_BONUS',
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
    // Seeded trees are complete in this cycle.
    const trees = new Set(ALL_COMMANDER_PROMOTIONS.map(p => p.tree));
    expect(trees.size).toBeGreaterThanOrEqual(5);
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
        case 'AURA_FLANKING_BONUS':
          expect(a.radius).toBeGreaterThan(0);
          expect(a.value).not.toBe(0);
          break;
        case 'AURA_AMPHIBIOUS_OPERATIONS':
        case 'AURA_IGNORE_TERRAIN_MOVEMENT_RESTRICTIONS':
        case 'AURA_ZONE_OF_CONTROL':
          expect(a.radius).toBeGreaterThan(0);
          break;
        case 'AURA_UPGRADE_SUPPORT':
          expect(a.radius).toBeGreaterThan(0);
          expect(a.healOnUpgrade).not.toBe(0);
          expect(a.allowsUpgradeOutsideFriendlyTerritory).toBe(true);
          break;
        case 'AURA_COMMANDER_MOBILITY':
          expect(a.value).not.toBe(0);
          expect(a.terrainRestrictionScope).toBe('packed_land');
          break;
        case 'AURA_SETTLEMENT_YIELD_BONUS_WHILE_STATIONED':
          expect(a.value).not.toBe(0);
          expect(a.yieldScope).toBe('all');
          expect(a.requiresDistrict).toBe(true);
          break;
        case 'AURA_COMMANDER_SELF_CS':
          expect(a.value).not.toBe(0);
          expect(a.condition).toBe('defending');
          break;
        case 'AURA_COMMANDER_RECOVERY_TIME_REDUCTION_PERCENT':
          expect(a.value).not.toBe(0);
          break;
        case 'AURA_COMMAND_ACTION_COMBAT_BONUS':
          expect(a.value).not.toBe(0);
          expect(['focus_fire', 'coordinated_attack']).toContain(a.command);
          break;
        case 'AURA_GRANT_ABILITY':
          expect(a.abilityId.length).toBeGreaterThan(0);
          break;
        case 'AURA_DEPLOY_WITH_MOVEMENT':
          expect(a.type).toBe('AURA_DEPLOY_WITH_MOVEMENT');
          break;
        case 'AURA_FORTIFY_ACTION_TURN_REDUCTION':
          expect(a.value).not.toBe(0);
          expect(a.radius).toBeGreaterThan(0);
          break;
        case 'AURA_DISTRICT_HP_BONUS':
          expect(a.value).not.toBe(0);
          expect(a.requiresCommanderOnCityCenter).toBe(true);
          break;
        case 'AURA_HEAL_AFTER_ATTACK':
          expect(a.amount).not.toBe(0);
          expect(a.radius).toBeGreaterThan(0);
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

// ── Expansion: commanders + sourced promotions added post-M10 ──
// Guards the new Air General + Partisan Leader archetypes and the sourced
// Army Maneuver + Leadership commander trees.

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

  it('matches sourced Army Maneuver promotion tree and prereqs from Civ VII', () => {
    const maneuver = ALL_COMMANDER_PROMOTIONS.filter(p => p.tree === 'maneuver');
    expect(maneuver).toHaveLength(6);
    expect(maneuver.map(p => p.id)).toEqual([
      'maneuver_mobility',
      'maneuver_harassment',
      'maneuver_redeploy',
      'maneuver_amphibious',
      'maneuver_pathfinder',
      'maneuver_area_denial',
    ]);
    expect(maneuver.map(p => p.name)).toEqual([
      'Mobility',
      'Harassment',
      'Redeploy',
      'Amphibious',
      'Pathfinder',
      'Area Denial',
    ]);
    expect(maneuver.map(p => p.tier)).toEqual([1, 2, 2, 3, 3, 4]);

    const mobility = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'maneuver_mobility');
    expect(mobility).toBeDefined();
    expect(mobility!.tree).toBe('maneuver');
    expect(mobility!.tier).toBe(1);
    expect(mobility!.prerequisites).toEqual([]);
    expect(mobility!.aura.type).toBe('AURA_COMMANDER_MOBILITY');
    if (mobility!.aura.type === 'AURA_COMMANDER_MOBILITY') {
      expect(mobility!.aura.value).toBe(1);
      expect(mobility!.aura.terrainRestrictionScope).toBe('packed_land');
    }

    const harassment = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'maneuver_harassment');
    expect(harassment).toBeDefined();
    expect(harassment!.tree).toBe('maneuver');
    expect(harassment!.tier).toBe(2);
    expect(harassment!.prerequisites).toEqual(['maneuver_mobility']);
    expect(harassment!.aura.type).toBe('AURA_FLANKING_BONUS');
    if (harassment!.aura.type === 'AURA_FLANKING_BONUS') {
      expect(harassment!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(harassment!.aura.value).toBe(2);
      expect(harassment!.aura.radius).toBe(1);
      expect(harassment!.aura.appliesTo).toBe('friendly_attacking');
    }

    const redeploy = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'maneuver_redeploy');
    expect(redeploy).toBeDefined();
    expect(redeploy!.tree).toBe('maneuver');
    expect(redeploy!.tier).toBe(2);
    expect(redeploy!.prerequisites).toEqual(['maneuver_mobility']);
    expect(redeploy!.aura.type).toBe('AURA_FLANKING_BONUS');
    if (redeploy!.aura.type === 'AURA_FLANKING_BONUS') {
      expect(redeploy!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(redeploy!.aura.value).toBe(-2);
      expect(redeploy!.aura.radius).toBe(1);
      expect(redeploy!.aura.appliesTo).toBe('enemy_attacking');
    }

    const amphibious = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'maneuver_amphibious');
    expect(amphibious).toBeDefined();
    expect(amphibious!.tree).toBe('maneuver');
    expect(amphibious!.tier).toBe(3);
    expect(amphibious!.prerequisites).toEqual(['maneuver_harassment']);
    expect(amphibious!.aura.type).toBe('AURA_AMPHIBIOUS_OPERATIONS');
    if (amphibious!.aura.type === 'AURA_AMPHIBIOUS_OPERATIONS') {
      expect(amphibious!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(amphibious!.aura.radius).toBe(1);
      expect(amphibious!.aura.embarkDisembarkMovementCost).toBe(1);
      expect(amphibious!.aura.ignoresEmbarkedAttackPenalty).toBe(true);
    }

    const pathfinder = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'maneuver_pathfinder');
    expect(pathfinder).toBeDefined();
    expect(pathfinder!.tree).toBe('maneuver');
    expect(pathfinder!.tier).toBe(3);
    expect(pathfinder!.prerequisites).toEqual(['maneuver_redeploy']);
    expect(pathfinder!.aura.type).toBe('AURA_IGNORE_TERRAIN_MOVEMENT_RESTRICTIONS');
    if (pathfinder!.aura.type === 'AURA_IGNORE_TERRAIN_MOVEMENT_RESTRICTIONS') {
      expect(pathfinder!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(pathfinder!.aura.radius).toBe(1);
    }

    const areaDenial = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'maneuver_area_denial');
    expect(areaDenial).toBeDefined();
    expect(areaDenial!.tree).toBe('maneuver');
    expect(areaDenial!.tier).toBe(4);
    expect(areaDenial!.prerequisiteMode).toBe('any');
    expect(areaDenial!.prerequisites).toEqual(
      expect.arrayContaining(['maneuver_amphibious', 'maneuver_pathfinder']),
    );
    expect(areaDenial!.aura.type).toBe('AURA_ZONE_OF_CONTROL');
    if (areaDenial!.aura.type === 'AURA_ZONE_OF_CONTROL') {
      expect(areaDenial!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(areaDenial!.aura.radius).toBe(1);
      expect(areaDenial!.aura.appliesTo).toBe('enemy');
    }
  });

  it('matches sourced Army Leadership promotion tree and prereqs from Civ VII', () => {
    const leadership = ALL_COMMANDER_PROMOTIONS.filter(p => p.tree === 'leadership');
    expect(leadership).toHaveLength(6);
    expect(leadership.map(p => p.id)).toEqual([
      'leadership_zeal',
      'leadership_field_commission',
      'leadership_old_guard',
      'leadership_resilience',
      'leadership_barrage',
      'leadership_onslaught',
    ]);
    expect(leadership.map(p => p.name)).toEqual([
      'Zeal',
      'Field Commission',
      'Old Guard',
      'Resilience',
      'Barrage',
      'Onslaught',
    ]);
    expect(leadership.map(p => p.tier)).toEqual([1, 2, 3, 3, 4, 4]);

    const zeal = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'leadership_zeal');
    expect(zeal).toBeDefined();
    expect(zeal!.tree).toBe('leadership');
    expect(zeal!.tier).toBe(1);
    expect(zeal!.prerequisites).toEqual([]);
    expect(zeal!.aura.type).toBe('AURA_SETTLEMENT_YIELD_BONUS_WHILE_STATIONED');
    if (zeal!.aura.type === 'AURA_SETTLEMENT_YIELD_BONUS_WHILE_STATIONED') {
      expect(zeal!.aura.value).toBe(5);
      expect(zeal!.aura.yieldScope).toBe('all');
      expect(zeal!.aura.requiresDistrict).toBe(true);
      expect(zeal!.aura.stackable).toBe(true);
    }

    const fieldCommission = ALL_COMMANDER_PROMOTIONS.find(
      p => p.id === 'leadership_field_commission',
    );
    expect(fieldCommission).toBeDefined();
    expect(fieldCommission!.tier).toBe(2);
    expect(fieldCommission!.prerequisites).toEqual(['leadership_zeal']);
    expect(fieldCommission!.aura.type).toBe('AURA_UPGRADE_SUPPORT');
    if (fieldCommission!.aura.type === 'AURA_UPGRADE_SUPPORT') {
      expect(fieldCommission!.aura.target).toEqual(['melee', 'ranged', 'cavalry', 'siege']);
      expect(fieldCommission!.aura.radius).toBe(1);
      expect(fieldCommission!.aura.healOnUpgrade).toBe(10);
      expect(fieldCommission!.aura.allowsUpgradeOutsideFriendlyTerritory).toBe(true);
    }

    const oldGuard = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'leadership_old_guard');
    expect(oldGuard).toBeDefined();
    expect(oldGuard!.tier).toBe(3);
    expect(oldGuard!.prerequisites).toEqual(['leadership_field_commission']);
    expect(oldGuard!.aura.type).toBe('AURA_COMMANDER_SELF_CS');
    if (oldGuard!.aura.type === 'AURA_COMMANDER_SELF_CS') {
      expect(oldGuard!.aura.value).toBe(10);
      expect(oldGuard!.aura.condition).toBe('defending');
    }

    const resilience = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'leadership_resilience');
    expect(resilience).toBeDefined();
    expect(resilience!.tier).toBe(3);
    expect(resilience!.prerequisites).toEqual(['leadership_field_commission']);
    expect(resilience!.aura.type).toBe('AURA_COMMANDER_RECOVERY_TIME_REDUCTION_PERCENT');
    if (resilience!.aura.type === 'AURA_COMMANDER_RECOVERY_TIME_REDUCTION_PERCENT') {
      expect(resilience!.aura.value).toBe(50);
    }

    const barrage = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'leadership_barrage');
    expect(barrage).toBeDefined();
    expect(barrage!.tier).toBe(4);
    expect(barrage!.prerequisites).toEqual(['leadership_old_guard']);
    expect(barrage!.aura.type).toBe('AURA_COMMAND_ACTION_COMBAT_BONUS');
    if (barrage!.aura.type === 'AURA_COMMAND_ACTION_COMBAT_BONUS') {
      expect(barrage!.aura.command).toBe('focus_fire');
      expect(barrage!.aura.value).toBe(5);
    }

    const onslaught = ALL_COMMANDER_PROMOTIONS.find(p => p.id === 'leadership_onslaught');
    expect(onslaught).toBeDefined();
    expect(onslaught!.tier).toBe(4);
    expect(onslaught!.prerequisites).toEqual(['leadership_resilience']);
    expect(onslaught!.aura.type).toBe('AURA_COMMAND_ACTION_COMBAT_BONUS');
    if (onslaught!.aura.type === 'AURA_COMMAND_ACTION_COMBAT_BONUS') {
      expect(onslaught!.aura.command).toBe('coordinated_attack');
      expect(onslaught!.aura.value).toBe(4);
    }
  });

  it('keeps every expansion prereq internal to its own tree (no cross-tree leaks)', () => {
    const byId = new Map(ALL_COMMANDER_PROMOTIONS.map(p => [p.id, p] as const));
    const expansionIds = [
      'maneuver_mobility',
      'maneuver_harassment',
      'maneuver_redeploy',
      'maneuver_amphibious',
      'maneuver_pathfinder',
      'maneuver_area_denial',
      'leadership_zeal',
      'leadership_field_commission',
      'leadership_old_guard',
      'leadership_resilience',
      'leadership_barrage',
      'leadership_onslaught',
    ];
    for (const id of expansionIds) {
      const p = byId.get(id)!;
      expect(p).toBeDefined();
      for (const prereqId of p.prerequisites) {
        const pre = byId.get(prereqId)!;
        expect(pre.tree).toBe(p.tree);
      }
    }
  });

  it('keeps all expansion auras inside the known AuraEffectDef variant set', () => {
    const expansionIds = new Set([
      'maneuver_mobility',
      'maneuver_harassment',
      'maneuver_redeploy',
      'maneuver_amphibious',
      'maneuver_pathfinder',
      'maneuver_area_denial',
      'leadership_zeal',
      'leadership_field_commission',
      'leadership_old_guard',
      'leadership_resilience',
      'leadership_barrage',
      'leadership_onslaught',
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
