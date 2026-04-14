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

    const variants: ReadonlyArray<AuraEffectDef> = [
      modCs,
      modRs,
      heal,
      mov,
      expandR,
      expandS,
      fort,
    ];
    const kinds = new Set(variants.map((v) => v.type));
    expect(kinds.size).toBe(7);
    // Discriminant narrowing works:
    if (heal.type === 'AURA_HEAL_PER_TURN') {
      expect(heal.amount).toBe(5);
    }
    if (expandR.type === 'AURA_EXPAND_RADIUS') {
      expect(expandR.delta).toBe(1);
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

  it('CommanderAction covers all six Commander-scoped actions', () => {
    const promote: CommanderAction = {
      type: 'PROMOTE_COMMANDER',
      commanderId: 'u-c-1',
      promotionId: 'assault.vanguard.t1',
    };
    const pickTree: CommanderAction = {
      type: 'SELECT_COMMANDER_TREE',
      commanderId: 'u-c-1',
      tree: 'assault',
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
      pickTree,
      attach,
      detach,
      pack,
      unpack,
    ];
    const kinds = new Set(actions.map((a) => a.type));
    expect(kinds.size).toBe(6);
  });

  it('exposes rulebook constants for radius and stack cap', () => {
    expect(COMMANDER_BASE_RADIUS).toBe(1);
    expect(COMMANDER_BASE_STACK_CAP).toBe(4);
  });
});
