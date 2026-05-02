import { describe, it, expect } from 'vitest';
import {
  COMMANDER_BASE_RADIUS,
  COMMANDER_BASE_STACK_CAP,
} from '../../types/Commander';
import type {
  CommanderPromotionId,
  CommanderTree,
  AuraTarget,
  AuraEffectDef,
  CommanderPromotionDef,
  CommanderState,
  AuraBonus,
  CommanderAction,
} from '../../types/Commander';

/**
 * Compile-time shape tests for the Commander type scaffolding (cycle
 * A). These tests construct a literal of each new type with the
 * minimum-valid shape, exercise each discriminant/branch, and assert
 * property values. If a type changes shape (required field added,
 * discriminant renamed), these tests stop compiling — that is the
 * signal to bump downstream cycles.
 */
describe('Commander types — compile-time shape tests', () => {
  it('CommanderPromotionId is a string alias usable as a map key', () => {
    const id: CommanderPromotionId = 'assault.vanguard.t1';
    const map = new Map<CommanderPromotionId, number>();
    map.set(id, 1);
    expect(map.get(id)).toBe(1);
  });

  it('CommanderTree accepts each of the five rulebook branches', () => {
    const trees: ReadonlyArray<CommanderTree> = [
      'bastion',
      'assault',
      'logistics',
      'maneuver',
      'leadership',
    ];
    expect(trees).toHaveLength(5);
    expect(new Set(trees).size).toBe(5);
  });

  it('AuraTarget accepts UnitCategory values and the "all" wildcard', () => {
    const t1: AuraTarget = 'all';
    const t2: AuraTarget = 'melee';
    const t3: AuraTarget = 'ranged';
    const t4: AuraTarget = 'cavalry';
    const t5: AuraTarget = 'siege';
    const t6: AuraTarget = 'naval';
    const t7: AuraTarget = 'civilian';
    const t8: AuraTarget = 'religious';
    expect([t1, t2, t3, t4, t5, t6, t7, t8]).toHaveLength(8);
  });

  it('AuraEffectDef covers every expected variant', () => {
    const modCs: AuraEffectDef = {
      type: 'AURA_MODIFY_CS',
      target: 'melee',
      value: 3,
      radius: 1,
    };
    const modCsWithFilters: AuraEffectDef = {
      type: 'AURA_MODIFY_CS',
      target: ['melee', 'ranged'],
      value: 2,
      radius: 1,
      requiresDistrict: true,
      requiresFortified: true,
    };
    const modRs: AuraEffectDef = {
      type: 'AURA_MODIFY_RS',
      target: 'ranged',
      value: 2,
      radius: 1,
    };
    const heal: AuraEffectDef = {
      type: 'AURA_HEAL_PER_TURN',
      target: 'all',
      amount: 5,
      radius: 1,
    };
    const mov: AuraEffectDef = {
      type: 'AURA_EXTRA_MOVEMENT',
      target: 'cavalry',
      value: 1,
      radius: 1,
    };
    const expandR: AuraEffectDef = {
      type: 'AURA_EXPAND_RADIUS',
      delta: 1,
    };
    const expandS: AuraEffectDef = {
      type: 'AURA_EXPAND_STACK',
      delta: 1,
    };
    const fort: AuraEffectDef = {
      type: 'AURA_FORTIFY_BONUS',
      target: 'all',
      value: 2,
      radius: 1,
    };
    const grantAbility: AuraEffectDef = {
      type: 'AURA_GRANT_ABILITY',
      target: ['melee', 'cavalry'],
      abilityId: 'first_strike',
      radius: 1,
    };
    const deployMove: AuraEffectDef = {
      type: 'AURA_DEPLOY_WITH_MOVEMENT',
    };
    const commanderMobility: AuraEffectDef = {
      type: 'AURA_COMMANDER_MOBILITY',
      value: 1,
      terrainRestrictionScope: 'packed_land',
    };
    const flankingBonus: AuraEffectDef = {
      type: 'AURA_FLANKING_BONUS',
      target: ['melee', 'ranged', 'cavalry', 'siege'],
      value: 2,
      radius: 1,
      appliesTo: 'friendly_attacking',
    };
    const amphibiousOps: AuraEffectDef = {
      type: 'AURA_AMPHIBIOUS_OPERATIONS',
      target: ['melee', 'ranged', 'cavalry', 'siege'],
      radius: 1,
      embarkDisembarkMovementCost: 1,
      ignoresEmbarkedAttackPenalty: true,
    };
    const ignoreTerrainRestrictions: AuraEffectDef = {
      type: 'AURA_IGNORE_TERRAIN_MOVEMENT_RESTRICTIONS',
      target: ['melee', 'ranged', 'cavalry', 'siege'],
      radius: 1,
    };
    const zoneOfControl: AuraEffectDef = {
      type: 'AURA_ZONE_OF_CONTROL',
      target: ['melee', 'ranged', 'cavalry', 'siege'],
      radius: 1,
      appliesTo: 'enemy',
    };
    const settlementYieldBonus: AuraEffectDef = {
      type: 'AURA_SETTLEMENT_YIELD_BONUS_WHILE_STATIONED',
      value: 5,
      yieldScope: 'all',
      requiresDistrict: true,
      stackable: true,
    };
    const upgradeSupport: AuraEffectDef = {
      type: 'AURA_UPGRADE_SUPPORT',
      target: ['melee', 'ranged', 'cavalry', 'siege'],
      radius: 1,
      healOnUpgrade: 10,
      allowsUpgradeOutsideFriendlyTerritory: true,
    };
    const commanderSelfCs: AuraEffectDef = {
      type: 'AURA_COMMANDER_SELF_CS',
      value: 10,
      condition: 'defending',
    };
    const commanderRecoveryReduction: AuraEffectDef = {
      type: 'AURA_COMMANDER_RECOVERY_TIME_REDUCTION_PERCENT',
      value: 50,
    };
    const commandActionCombatBonus: AuraEffectDef = {
      type: 'AURA_COMMAND_ACTION_COMBAT_BONUS',
      command: 'focus_fire',
      value: 5,
    };
    const goldPerPacked: AuraEffectDef = {
      type: 'AURA_GOLD_PER_PACKED_UNIT',
      value: 1,
    };
    const productionBonus: AuraEffectDef = {
      type: 'AURA_LAND_PRODUCTION_BONUS_WHILE_STATIONED',
      value: 15,
    };
    const pillage: AuraEffectDef = {
      type: 'AURA_PILLAGE_BONUS',
      target: ['melee', 'ranged', 'cavalry', 'siege'],
      radius: 1,
      yieldBonusPercent: 50,
      hpBonusPercent: 50,
    };
    const fortifyTurn: AuraEffectDef = {
      type: 'AURA_FORTIFY_ACTION_TURN_REDUCTION',
      target: ['melee', 'ranged', 'cavalry', 'siege'],
      value: 1,
      radius: 1,
    };
    const districtHp: AuraEffectDef = {
      type: 'AURA_DISTRICT_HP_BONUS',
      value: 10,
      requiresCommanderOnCityCenter: true,
    };
    const healAfterAttack: AuraEffectDef = {
      type: 'AURA_HEAL_AFTER_ATTACK',
      target: ['melee', 'ranged', 'cavalry', 'siege'],
      amount: 5,
      radius: 1,
    };

    const variants: ReadonlyArray<AuraEffectDef> = [
      modCs,
      modCsWithFilters,
      modRs,
      heal,
      mov,
      expandR,
      expandS,
      fort,
      grantAbility,
      deployMove,
      goldPerPacked,
      productionBonus,
      pillage,
      fortifyTurn,
      districtHp,
      healAfterAttack,
      commanderMobility,
      flankingBonus,
      amphibiousOps,
      ignoreTerrainRestrictions,
      zoneOfControl,
      settlementYieldBonus,
      upgradeSupport,
      commanderSelfCs,
      commanderRecoveryReduction,
      commandActionCombatBonus,
    ];
    const kinds = new Set<AuraEffectDef['type']>(variants.map(v => v.type));
    expect(kinds.size).toBe(25);
    // Discriminant narrowing works:
    if (heal.type === 'AURA_HEAL_PER_TURN') {
      expect(heal.amount).toBe(5);
    }
    if (expandR.type === 'AURA_EXPAND_RADIUS') {
      expect(expandR.delta).toBe(1);
    }
    if (grantAbility.type === 'AURA_GRANT_ABILITY') {
      expect(grantAbility.abilityId).toBe('first_strike');
    }
    if (goldPerPacked.type === 'AURA_GOLD_PER_PACKED_UNIT') {
      expect(goldPerPacked.value).toBe(1);
    }
    if (productionBonus.type === 'AURA_LAND_PRODUCTION_BONUS_WHILE_STATIONED') {
      expect(productionBonus.value).toBe(15);
    }
    if (pillage.type === 'AURA_PILLAGE_BONUS') {
      expect(pillage.radius).toBe(1);
      expect(pillage.yieldBonusPercent).toBe(50);
      expect(pillage.hpBonusPercent).toBe(50);
    }
    if (deployMove.type === 'AURA_DEPLOY_WITH_MOVEMENT') {
      expect(deployMove.type).toBe('AURA_DEPLOY_WITH_MOVEMENT');
    }
    if (modCs.type === 'AURA_MODIFY_CS') {
      expect(modCs.requiresDistrict).toBeUndefined();
      expect(modCs.requiresFortified).toBeUndefined();
    }
    if (modCsWithFilters.type === 'AURA_MODIFY_CS') {
      expect(modCsWithFilters.requiresDistrict).toBe(true);
      expect(modCsWithFilters.requiresFortified).toBe(true);
    }
    if (commanderMobility.type === 'AURA_COMMANDER_MOBILITY') {
      expect(commanderMobility.value).toBe(1);
      expect(commanderMobility.terrainRestrictionScope).toBe('packed_land');
    }
    if (flankingBonus.type === 'AURA_FLANKING_BONUS') {
      expect(flankingBonus.appliesTo).toBe('friendly_attacking');
      expect(flankingBonus.value).toBe(2);
      expect(flankingBonus.radius).toBe(1);
    }
    if (amphibiousOps.type === 'AURA_AMPHIBIOUS_OPERATIONS') {
      expect(amphibiousOps.ignoresEmbarkedAttackPenalty).toBe(true);
      expect(amphibiousOps.embarkDisembarkMovementCost).toBe(1);
      expect(amphibiousOps.radius).toBe(1);
    }
    if (ignoreTerrainRestrictions.type === 'AURA_IGNORE_TERRAIN_MOVEMENT_RESTRICTIONS') {
      expect(ignoreTerrainRestrictions.radius).toBe(1);
      expect(ignoreTerrainRestrictions.target).toEqual([
        'melee',
        'ranged',
        'cavalry',
        'siege',
      ]);
    }
    if (zoneOfControl.type === 'AURA_ZONE_OF_CONTROL') {
      expect(zoneOfControl.appliesTo).toBe('enemy');
      expect(zoneOfControl.radius).toBe(1);
    }
    if (settlementYieldBonus.type === 'AURA_SETTLEMENT_YIELD_BONUS_WHILE_STATIONED') {
      expect(settlementYieldBonus.yieldScope).toBe('all');
      expect(settlementYieldBonus.requiresDistrict).toBe(true);
    }
    if (upgradeSupport.type === 'AURA_UPGRADE_SUPPORT') {
      expect(upgradeSupport.healOnUpgrade).toBe(10);
      expect(upgradeSupport.allowsUpgradeOutsideFriendlyTerritory).toBe(true);
    }
    if (commanderSelfCs.type === 'AURA_COMMANDER_SELF_CS') {
      expect(commanderSelfCs.condition).toBe('defending');
    }
    if (commanderRecoveryReduction.type === 'AURA_COMMANDER_RECOVERY_TIME_REDUCTION_PERCENT') {
      expect(commanderRecoveryReduction.value).toBe(50);
    }
    if (commandActionCombatBonus.type === 'AURA_COMMAND_ACTION_COMBAT_BONUS') {
      expect(commandActionCombatBonus.command).toBe('focus_fire');
      expect(commandActionCombatBonus.value).toBe(5);
    }
    if (districtHp.type === 'AURA_DISTRICT_HP_BONUS') {
      expect(districtHp.requiresCommanderOnCityCenter).toBe(true);
      expect(districtHp.value).toBe(10);
    }
    if (healAfterAttack.type === 'AURA_HEAL_AFTER_ATTACK') {
      expect(healAfterAttack.amount).toBe(5);
      expect(healAfterAttack.radius).toBe(1);
    }
  });

  it('CommanderPromotionDef has all required fields with correct types', () => {
    const def: CommanderPromotionDef = {
      id: 'bastion.rampart.t1',
      name: 'Rampart',
      description: '+2 CS to friendly units in range when fortified.',
      tree: 'bastion',
      tier: 1,
      prerequisites: [],
      aura: {
        type: 'AURA_FORTIFY_BONUS',
        target: 'all',
        value: 2,
        radius: 1,
      },
    };
    expect(def.id).toBe('bastion.rampart.t1');
    expect(def.tree).toBe('bastion');
    expect(def.tier).toBe(1);
    expect(def.prerequisites).toEqual([]);
    expect(def.aura.type).toBe('AURA_FORTIFY_BONUS');
  });

  it('CommanderState enforces immutable arrays and optional tree', () => {
    const cs: CommanderState = {
      unitId: 'u-commander-1',
      xp: 42,
      commanderLevel: 2,
      unspentPromotionPicks: 1,
      promotions: ['bastion.rampart.t1'],
      tree: 'bastion',
      attachedUnits: ['u-warrior-1', 'u-archer-1'],
      packed: false,
    };
    expect(cs.xp).toBe(42);
    expect(cs.commanderLevel).toBe(2);
    expect(cs.unspentPromotionPicks).toBe(1);
    expect(cs.promotions).toHaveLength(1);
    expect(cs.tree).toBe('bastion');
    expect(cs.attachedUnits).toHaveLength(2);
    expect(cs.packed).toBe(false);

    // Null tree is valid (fresh commander pre-first-pick).
    const fresh: CommanderState = {
      unitId: 'u-commander-2',
      xp: 0,
      commanderLevel: 1,
      unspentPromotionPicks: 0,
      promotions: [],
      tree: null,
      attachedUnits: [],
      packed: false,
    };
    expect(fresh.tree).toBeNull();
    expect(fresh.attachedUnits).toEqual([]);
  });

  it('AuraBonus shape links a commander to a flat numeric contribution', () => {
    const bonus: AuraBonus = {
      source: 'u-commander-1',
      promotionId: 'assault.vanguard.t1',
      type: 'AURA_MODIFY_CS',
      value: 3,
    };
    expect(bonus.source).toBe('u-commander-1');
    expect(bonus.promotionId).toBe('assault.vanguard.t1');
    expect(bonus.type).toBe('AURA_MODIFY_CS');
    expect(bonus.value).toBe(3);
  });

  it('CommanderAction covers all five Commander-scoped actions (F-03: SELECT_COMMANDER_TREE removed)', () => {
    const promote: CommanderAction = {
      type: 'PROMOTE_COMMANDER',
      commanderId: 'u-c-1',
      promotionId: 'assault.vanguard.t1',
    };
    const attach: CommanderAction = {
      type: 'ATTACH_UNIT_TO_COMMANDER',
      commanderId: 'u-c-1',
      unitId: 'u-warrior-1',
    };
    const detach: CommanderAction = {
      type: 'DETACH_UNIT_FROM_COMMANDER',
      commanderId: 'u-c-1',
      unitId: 'u-warrior-1',
    };
    const pack: CommanderAction = { type: 'PACK_COMMANDER', commanderId: 'u-c-1' };
    const unpack: CommanderAction = {
      type: 'UNPACK_COMMANDER',
      commanderId: 'u-c-1',
    };

    const actions: ReadonlyArray<CommanderAction> = [
      promote,
      attach,
      detach,
      pack,
      unpack,
    ];
    const kinds = new Set(actions.map((a) => a.type));
    expect(kinds.size).toBe(5);
  });

  it('exposes rulebook constants for radius and stack cap', () => {
    expect(COMMANDER_BASE_RADIUS).toBe(1);
    expect(COMMANDER_BASE_STACK_CAP).toBe(4);
  });
});
