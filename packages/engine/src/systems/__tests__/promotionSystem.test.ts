import { describe, it, expect } from 'vitest';
import { promotionSystem } from '../promotionSystem';
import { getPromotionCombatBonus, getPromotionDefenseBonus, getPromotionRangeBonus, getPromotionMovementBonus } from '../../state/PromotionUtils';
import { createTestState, createTestUnit, createTestPlayer } from './helpers';

describe('promotionSystem', () => {
  it('grants a valid tier 1 promotion to a melee unit with enough XP', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', experience: 20, promotions: [] })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'u1', promotionId: 'battlecry' });

    const unit = next.units.get('u1');
    expect(unit).toBeDefined();
    expect(unit!.promotions).toContain('battlecry');
    // XP should be deducted: 20 - 15 = 5
    expect(unit!.experience).toBe(5);
  });

  it('grants a tier 2 promotion when unit has enough XP', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', experience: 35, promotions: [] })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'u1', promotionId: 'blitz' });

    const unit = next.units.get('u1');
    expect(unit).toBeDefined();
    expect(unit!.promotions).toContain('blitz');
    // XP should be deducted: 35 - 30 = 5
    expect(unit!.experience).toBe(5);
  });

  it('grants a tier 3 promotion and fully heals the unit', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', experience: 65, health: 40, promotions: [] })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'u1', promotionId: 'elite' });

    const unit = next.units.get('u1');
    expect(unit).toBeDefined();
    expect(unit!.promotions).toContain('elite');
    expect(unit!.health).toBe(100); // full heal from HEAL_ON_PROMOTE
    expect(unit!.experience).toBe(5); // 65 - 60 = 5
  });

  it('rejects promotion when unit has insufficient XP', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', experience: 10, promotions: [] })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'u1', promotionId: 'battlecry' });

    // State should be unchanged
    expect(next).toBe(state);
  });

  it('rejects promotion when unit category does not match', () => {
    const units = new Map([
      // warrior is melee, but 'volley' is for ranged
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', experience: 20, promotions: [] })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'u1', promotionId: 'volley' });

    expect(next).toBe(state);
  });

  it('allows "all" category promotions for any combat unit', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'archer', experience: 65, promotions: [] })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'u1', promotionId: 'elite' });

    const unit = next.units.get('u1');
    expect(unit).toBeDefined();
    expect(unit!.promotions).toContain('elite');
  });

  it('rejects duplicate promotion', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', experience: 30, promotions: ['battlecry'] })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'u1', promotionId: 'battlecry' });

    expect(next).toBe(state);
  });

  it('rejects promotion for non-existent unit', () => {
    const state = createTestState({ currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'nonexistent', promotionId: 'battlecry' });

    expect(next).toBe(state);
  });

  it('rejects promotion for unit not owned by current player', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p2', typeId: 'warrior', experience: 20, promotions: [] })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'u1', promotionId: 'battlecry' });

    expect(next).toBe(state);
  });

  it('rejects non-existent promotion id', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', experience: 20, promotions: [] })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'u1', promotionId: 'fake_promo' });

    expect(next).toBe(state);
  });

  it('adds a log entry on successful promotion', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', experience: 20, promotions: [] })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'u1', promotionId: 'battlecry' });

    expect(next.log.length).toBe(1);
    expect(next.log[0].message).toContain('Battlecry');
    expect(next.log[0].type).toBe('combat');
  });

  it('ignores non-PROMOTE_UNIT actions', () => {
    const state = createTestState();
    expect(promotionSystem(state, { type: 'END_TURN' })).toBe(state);
  });

  it('grants cavalry promotion to cavalry unit', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'chariot', experience: 20, promotions: [] })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });

    const next = promotionSystem(state, { type: 'PROMOTE_UNIT', unitId: 'u1', promotionId: 'charge' });

    const unit = next.units.get('u1');
    expect(unit).toBeDefined();
    expect(unit!.promotions).toContain('charge');
    expect(unit!.experience).toBe(5);
  });
});

describe('getPromotionCombatBonus', () => {
  it('returns 0 for unit with no promotions', () => {
    const unit = createTestUnit({ promotions: [] });
    const state = createTestState({ units: new Map([['u1', unit]]) });

    const bonus = getPromotionCombatBonus(state, unit, { isAttacking: true });
    expect(bonus).toBe(0);
  });

  it('returns combat bonus from COMBAT_BONUS effect (elite)', () => {
    const unit = createTestUnit({ promotions: ['elite'] });
    const state = createTestState({ units: new Map([['u1', unit]]) });

    const bonus = getPromotionCombatBonus(state, unit, { isAttacking: true });
    expect(bonus).toBe(10);
  });

  it('returns bonus vs wounded when target is wounded', () => {
    const unit = createTestUnit({ promotions: ['battlecry'] });
    const state = createTestState({ units: new Map([['u1', unit]]) });

    const bonusWounded = getPromotionCombatBonus(state, unit, { isAttacking: true, targetWounded: true });
    expect(bonusWounded).toBe(7);

    const bonusHealthy = getPromotionCombatBonus(state, unit, { isAttacking: true, targetWounded: false });
    expect(bonusHealthy).toBe(0);
  });

  it('returns attack bonus only when attacking (charge)', () => {
    const unit = createTestUnit({ typeId: 'chariot', promotions: ['charge'] });
    const state = createTestState({ units: new Map([['u1', unit]]) });

    const bonusAttacking = getPromotionCombatBonus(state, unit, { isAttacking: true });
    expect(bonusAttacking).toBe(10);

    const bonusDefending = getPromotionCombatBonus(state, unit, { isAttacking: false });
    expect(bonusDefending).toBe(0);
  });
});

describe('getPromotionDefenseBonus', () => {
  it('returns 0 for non-fortified unit with tortoise', () => {
    const unit = createTestUnit({ promotions: ['tortoise'], fortified: false });
    const state = createTestState({ units: new Map([['u1', unit]]) });

    expect(getPromotionDefenseBonus(state, unit)).toBe(0);
  });

  it('returns defense bonus for fortified unit with tortoise', () => {
    const unit = createTestUnit({ promotions: ['tortoise'], fortified: true });
    const state = createTestState({ units: new Map([['u1', unit]]) });

    expect(getPromotionDefenseBonus(state, unit)).toBe(10);
  });
});

describe('getPromotionRangeBonus', () => {
  it('returns range bonus from arrows promotion', () => {
    const unit = createTestUnit({ typeId: 'archer', promotions: ['arrows'] });
    const state = createTestState({ units: new Map([['u1', unit]]) });

    expect(getPromotionRangeBonus(state, unit)).toBe(1);
  });

  it('returns 0 for unit without range promotions', () => {
    const unit = createTestUnit({ promotions: ['battlecry'] });
    const state = createTestState({ units: new Map([['u1', unit]]) });

    expect(getPromotionRangeBonus(state, unit)).toBe(0);
  });
});

describe('getPromotionMovementBonus', () => {
  it('returns movement bonus from pursuit promotion', () => {
    const unit = createTestUnit({ typeId: 'chariot', promotions: ['pursuit'] });
    const state = createTestState({ units: new Map([['u1', unit]]) });

    expect(getPromotionMovementBonus(state, unit)).toBe(1);
  });

  it('stacks movement bonuses from multiple promotions', () => {
    const unit = createTestUnit({ typeId: 'chariot', promotions: ['pursuit', 'elite'] });
    const state = createTestState({ units: new Map([['u1', unit]]) });

    // pursuit: +1, elite: +1
    expect(getPromotionMovementBonus(state, unit)).toBe(2);
  });
});
