import { describe, it, expect } from 'vitest';
import {
  commanderPromotionSystem,
  commanderLevelForXp,
  isCommander,
  LEVEL_THRESHOLDS,
  type GainCommanderXpAction,
  type PromoteCommanderAction,
} from '../commanderPromotionSystem';
import { createTestState, createTestUnit } from './helpers';

describe('commanderPromotionSystem — identity / guards', () => {
  it('returns state unchanged for non-matching actions', () => {
    const units = new Map([
      ['c1', createTestUnit({ id: 'c1', typeId: 'captain', experience: 0 })],
    ]);
    const state = createTestState({ units });
    const next = commanderPromotionSystem(state, { type: 'END_TURN' });
    expect(next).toBe(state);
  });

  it('returns state unchanged when commander id does not resolve', () => {
    const state = createTestState();
    const action: GainCommanderXpAction = {
      type: 'GAIN_COMMANDER_XP',
      commanderId: 'ghost',
      amount: 25,
    };
    expect(commanderPromotionSystem(state, action)).toBe(state);
  });

  it('returns state unchanged when target unit is not a commander', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', typeId: 'warrior', experience: 0 })],
    ]);
    const state = createTestState({ units });
    const action: GainCommanderXpAction = {
      type: 'GAIN_COMMANDER_XP',
      commanderId: 'u1',
      amount: 60,
    };
    expect(commanderPromotionSystem(state, action)).toBe(state);
  });
});

describe('commanderPromotionSystem — GAIN_COMMANDER_XP', () => {
  it('adds XP to the commander', () => {
    const units = new Map([
      ['c1', createTestUnit({ id: 'c1', typeId: 'captain', experience: 10 })],
    ]);
    const state = createTestState({ units });
    const action: GainCommanderXpAction = {
      type: 'GAIN_COMMANDER_XP',
      commanderId: 'c1',
      amount: 25,
    };
    const next = commanderPromotionSystem(state, action);
    expect(next.units.get('c1')!.experience).toBe(35);
  });

  it('crossing the 50-XP threshold raises commanderLevel to 2', () => {
    const units = new Map([
      ['c1', createTestUnit({ id: 'c1', typeId: 'captain', experience: 40 })],
    ]);
    const state = createTestState({ units });
    const action: GainCommanderXpAction = {
      type: 'GAIN_COMMANDER_XP',
      commanderId: 'c1',
      amount: 20,
    };
    const next = commanderPromotionSystem(state, action);
    const xp = next.units.get('c1')!.experience;
    expect(xp).toBe(60);
    expect(commanderLevelForXp(xp)).toBe(2);
  });

  it('ignores zero-amount XP gains', () => {
    const units = new Map([
      ['c1', createTestUnit({ id: 'c1', typeId: 'captain', experience: 10 })],
    ]);
    const state = createTestState({ units });
    const action: GainCommanderXpAction = {
      type: 'GAIN_COMMANDER_XP',
      commanderId: 'c1',
      amount: 0,
    };
    expect(commanderPromotionSystem(state, action)).toBe(state);
  });

  it('ignores negative XP gains (XP is monotonic)', () => {
    const units = new Map([
      ['c1', createTestUnit({ id: 'c1', typeId: 'captain', experience: 60 })],
    ]);
    const state = createTestState({ units });
    const action: GainCommanderXpAction = {
      type: 'GAIN_COMMANDER_XP',
      commanderId: 'c1',
      amount: -10,
    };
    expect(commanderPromotionSystem(state, action)).toBe(state);
  });
});

describe('commanderPromotionSystem — PROMOTE_COMMANDER', () => {
  it('appends a valid tier-1 promotion when a pick is available', () => {
    const units = new Map([
      // level 2 (>=50 XP), zero picks used
      ['c1', createTestUnit({ id: 'c1', typeId: 'captain', experience: 60, promotions: [] })],
    ]);
    const state = createTestState({ units });
    const action: PromoteCommanderAction = {
      type: 'PROMOTE_COMMANDER',
      commanderId: 'c1',
      promotionId: 'assault_battle_cry',
    };
    const next = commanderPromotionSystem(state, action);
    expect(next.units.get('c1')!.promotions).toEqual(['assault_battle_cry']);
  });

  it('does nothing when the commander has no unspent pick', () => {
    const units = new Map([
      // level 1 (<50 XP), already has a promotion — no picks available
      ['c1', createTestUnit({
        id: 'c1',
        typeId: 'captain',
        experience: 40,
        promotions: ['assault_battle_cry'],
      })],
    ]);
    const state = createTestState({ units });
    const action: PromoteCommanderAction = {
      type: 'PROMOTE_COMMANDER',
      commanderId: 'c1',
      promotionId: 'logistics_forced_march',
    };
    expect(commanderPromotionSystem(state, action)).toBe(state);
  });

  it('does nothing for an unknown promotion id', () => {
    const units = new Map([
      ['c1', createTestUnit({ id: 'c1', typeId: 'captain', experience: 60, promotions: [] })],
    ]);
    const state = createTestState({ units });
    const action: PromoteCommanderAction = {
      type: 'PROMOTE_COMMANDER',
      commanderId: 'c1',
      promotionId: 'made_up_promotion',
    };
    expect(commanderPromotionSystem(state, action)).toBe(state);
  });

  it('enforces prerequisites — tier-2 denied without tier-1', () => {
    const units = new Map([
      // level 3 (>=150 XP), zero picks — enough picks but prereq not satisfied
      ['c1', createTestUnit({ id: 'c1', typeId: 'captain', experience: 160, promotions: [] })],
    ]);
    const state = createTestState({ units });
    const action: PromoteCommanderAction = {
      type: 'PROMOTE_COMMANDER',
      commanderId: 'c1',
      promotionId: 'assault_press_attack', // needs assault_battle_cry
    };
    expect(commanderPromotionSystem(state, action)).toBe(state);
  });

  it('allows tier-2 once the tier-1 prereq is held', () => {
    const units = new Map([
      // level 3 — one pick spent on prereq, one still available
      ['c1', createTestUnit({
        id: 'c1',
        typeId: 'captain',
        experience: 160,
        promotions: ['assault_battle_cry'],
      })],
    ]);
    const state = createTestState({ units });
    const action: PromoteCommanderAction = {
      type: 'PROMOTE_COMMANDER',
      commanderId: 'c1',
      promotionId: 'assault_press_attack',
    };
    const next = commanderPromotionSystem(state, action);
    expect(next.units.get('c1')!.promotions).toEqual([
      'assault_battle_cry',
      'assault_press_attack',
    ]);
  });

  it('rejects duplicate promotion picks', () => {
    const units = new Map([
      ['c1', createTestUnit({
        id: 'c1',
        typeId: 'captain',
        experience: 160,
        promotions: ['assault_battle_cry'],
      })],
    ]);
    const state = createTestState({ units });
    const action: PromoteCommanderAction = {
      type: 'PROMOTE_COMMANDER',
      commanderId: 'c1',
      promotionId: 'assault_battle_cry',
    };
    expect(commanderPromotionSystem(state, action)).toBe(state);
  });

  it('does not mutate the original state or units map', () => {
    const originalUnit = createTestUnit({
      id: 'c1',
      typeId: 'general',
      experience: 60,
      promotions: [],
    });
    const units = new Map([['c1', originalUnit]]);
    const state = createTestState({ units });
    const action: PromoteCommanderAction = {
      type: 'PROMOTE_COMMANDER',
      commanderId: 'c1',
      promotionId: 'bastion_shield_wall',
    };
    const next = commanderPromotionSystem(state, action);
    expect(next).not.toBe(state);
    expect(next.units).not.toBe(state.units);
    // Original references unchanged.
    expect(originalUnit.promotions).toEqual([]);
    expect(state.units.get('c1')!.promotions).toEqual([]);
    // New unit reflects the pick.
    expect(next.units.get('c1')!.promotions).toEqual(['bastion_shield_wall']);
  });
});

describe('commanderLevelForXp / LEVEL_THRESHOLDS', () => {
  it('matches the published table [0,50,150,300,500] (F-04: level-6 threshold removed)', () => {
    expect(LEVEL_THRESHOLDS).toEqual([0, 50, 150, 300, 500]);
  });

  it('maps XP to level at exact thresholds and between', () => {
    expect(commanderLevelForXp(0)).toBe(1);
    expect(commanderLevelForXp(49)).toBe(1);
    expect(commanderLevelForXp(50)).toBe(2);
    expect(commanderLevelForXp(149)).toBe(2);
    expect(commanderLevelForXp(150)).toBe(3);
    expect(commanderLevelForXp(300)).toBe(4);
    expect(commanderLevelForXp(500)).toBe(5);
    expect(commanderLevelForXp(800)).toBe(5); // F-04: hard-capped at 5
    expect(commanderLevelForXp(9999)).toBe(5); // F-04: hard-capped at 5
  });
});

describe('isCommander', () => {
  it('is true for known commander archetypes', () => {
    expect(isCommander(createTestUnit({ typeId: 'captain' }))).toBe(true);
    expect(isCommander(createTestUnit({ typeId: 'general' }))).toBe(true);
    expect(isCommander(createTestUnit({ typeId: 'fleet_admiral' }))).toBe(true);
  });

  it('is false for ordinary unit archetypes', () => {
    expect(isCommander(createTestUnit({ typeId: 'warrior' }))).toBe(false);
    expect(isCommander(createTestUnit({ typeId: 'archer' }))).toBe(false);
    expect(isCommander(createTestUnit({ typeId: 'settler' }))).toBe(false);
  });
});
