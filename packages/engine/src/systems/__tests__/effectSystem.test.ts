import { describe, it, expect } from 'vitest';
import {
  effectSystem,
  getActiveEffects,
  getYieldBonus,
  getYieldPercentBonus,
  getCombatBonus,
  getMovementBonus,
  getProductionDiscount,
  getProductionPercentBonus,
  getDiplomaticActionPercentBonus,
  getRelationshipDeltaPercentBonus,
  getWarSupportBonus,
} from '../effectSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { ActiveEffect } from '../../types/GameState';

describe('effectSystem', () => {
  describe('pass-through', () => {
    it('returns state unchanged for any action', () => {
      const state = createTestState();
      expect(effectSystem(state, { type: 'START_TURN' })).toBe(state);
      expect(effectSystem(state, { type: 'END_TURN' })).toBe(state);
    });
  });

  describe('getActiveEffects', () => {
    it('returns civ ability effects for current civilization', () => {
      // Player is rome (civ), augustus (leader) by default
      const state = createTestState();
      const effects = getActiveEffects(state, 'p1');

      // Rome has MODIFY_YIELD production +1
      const civEffect = effects.find(e => e.source === 'civ:rome');
      expect(civEffect).toBeDefined();
      expect(civEffect!.effect.type).toBe('MODIFY_YIELD');
      if (civEffect!.effect.type === 'MODIFY_YIELD') {
        expect(civEffect!.effect.yield).toBe('production');
        expect(civEffect!.effect.value).toBe(1);
      }
    });

    it('returns leader ability effects', () => {
      const state = createTestState();
      const effects = getActiveEffects(state, 'p1');

      // Augustus has MODIFY_COMBAT all +5
      const leaderEffect = effects.find(e => e.source === 'leader:augustus');
      expect(leaderEffect).toBeDefined();
      expect(leaderEffect!.effect.type).toBe('MODIFY_COMBAT');
    });

    it('returns legacy bonuses', () => {
      const legacy: ActiveEffect = {
        source: 'legacy:egypt',
        effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
      };
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', legacyBonuses: [legacy] })],
        ]),
      });
      const effects = getActiveEffects(state, 'p1');

      const legacyEffect = effects.find(e => e.source === 'legacy:egypt');
      expect(legacyEffect).toBeDefined();
    });

    it('combines civ + leader + legacy effects', () => {
      const legacy: ActiveEffect = {
        source: 'legacy:egypt',
        effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
      };
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', legacyBonuses: [legacy] })],
        ]),
      });
      const effects = getActiveEffects(state, 'p1');

      // Should have at least: 1 civ + 1 leader + 1 legacy = 3 effects
      expect(effects.length).toBeGreaterThanOrEqual(3);
    });

    it('returns empty for non-existent player', () => {
      const state = createTestState();
      const effects = getActiveEffects(state, 'nonexistent');
      expect(effects).toEqual([]);
    });

    it('includes structured active celebration effects', () => {
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({
            id: 'p1',
            activeCelebrationBonus: {
              governmentId: 'classical_republic',
              bonusId: 'classical-rep-culture',
              turnsRemaining: 3,
              effects: [
                { type: 'MODIFY_YIELD_PERCENT', target: 'empire', yield: 'culture', percent: 20 },
              ],
            },
          })],
        ]),
      });

      const effects = getActiveEffects(state, 'p1');
      expect(effects).toContainEqual({
        source: 'government-celebration:classical_republic:classical-rep-culture',
        effect: { type: 'MODIFY_YIELD_PERCENT', target: 'empire', yield: 'culture', percent: 20 },
      });
    });
  });

  describe('getYieldBonus', () => {
    it('sums MODIFY_YIELD effects for production (Rome civ)', () => {
      const state = createTestState();
      // Rome gives +1 production
      const bonus = getYieldBonus(state, 'p1', 'production');
      expect(bonus).toBe(1);
    });

    it('sums across civ + legacy bonuses', () => {
      const legacy: ActiveEffect = {
        source: 'legacy:rome',
        effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
      };
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', legacyBonuses: [legacy] })],
        ]),
      });
      // Rome civ: +1 production, legacy: +2 production = 3 total
      const bonus = getYieldBonus(state, 'p1', 'production');
      expect(bonus).toBe(3);
    });

    it('returns 0 for yield types with no effects', () => {
      const state = createTestState();
      // Rome doesn't give food bonuses
      const bonus = getYieldBonus(state, 'p1', 'food');
      expect(bonus).toBe(0);
    });
  });

  describe('getCombatBonus', () => {
    it('returns leader combat bonus (Augustus: +5 all)', () => {
      const state = createTestState();
      const bonus = getCombatBonus(state, 'p1', 'melee');
      expect(bonus).toBe(5);
    });

    it('applies "all" target to any category', () => {
      const state = createTestState();
      expect(getCombatBonus(state, 'p1', 'ranged')).toBe(5);
      expect(getCombatBonus(state, 'p1', 'cavalry')).toBe(5);
    });
  });

  describe('getMovementBonus', () => {
    it('returns 0 when no movement effects active', () => {
      const state = createTestState();
      // Augustus and Rome don't have movement bonuses
      const bonus = getMovementBonus(state, 'p1', 'melee');
      expect(bonus).toBe(0);
    });

    it('returns bonus when movement effect is active via legacy', () => {
      const legacy: ActiveEffect = {
        source: 'leader:cyrus',
        effect: { type: 'MODIFY_MOVEMENT', target: 'all', value: 2 },
      };
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', legacyBonuses: [legacy] })],
        ]),
      });
      const bonus = getMovementBonus(state, 'p1', 'cavalry');
      expect(bonus).toBe(2);
    });
  });

  describe('getProductionDiscount', () => {
    it('returns 0 when no discount active', () => {
      const state = createTestState();
      const discount = getProductionDiscount(state, 'p1', 'wonder');
      expect(discount).toBe(0);
    });

    it('returns discount from civ ability (Egypt)', () => {
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', civilizationId: 'egypt' })],
        ]),
      });
      // Egypt has DISCOUNT_PRODUCTION wonder 15%
      const discount = getProductionDiscount(state, 'p1', 'wonder');
      expect(discount).toBe(15);
    });
  });

  describe('structured celebration helper effects', () => {
    it('sums percent yield, production, diplomacy, relationship, and war-support modifiers', () => {
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({
            id: 'p1',
            activeCelebrationBonus: {
              governmentId: 'revolucion',
              bonusId: 'mixed',
              turnsRemaining: 4,
              effects: [
                { type: 'MODIFY_YIELD_PERCENT', target: 'empire', yield: 'culture', percent: 30 },
                { type: 'MODIFY_PRODUCTION_PERCENT', target: { kind: 'militaryUnit' }, percent: 40 },
                { type: 'MODIFY_DIPLOMATIC_ACTION_PERCENT', target: 'diplomatic_action', percent: 50 },
                { type: 'MODIFY_RELATIONSHIP_DELTA_PERCENT', target: 'endeavor', percent: 30 },
                { type: 'MODIFY_WAR_SUPPORT', value: 6 },
              ],
            },
          })],
        ]),
      });

      expect(getYieldPercentBonus(state, 'p1', 'culture')).toBe(30);
      expect(getProductionPercentBonus(state, 'p1', {
        item: { type: 'unit', id: 'warrior' },
        unitCategory: 'melee',
      })).toBe(40);
      expect(getDiplomaticActionPercentBonus(state, 'p1', 'endeavor')).toBe(50);
      expect(getRelationshipDeltaPercentBonus(state, 'p1', 'endeavor')).toBe(30);
      expect(getWarSupportBonus(state, 'p1')).toBe(6);
    });
  });
});
