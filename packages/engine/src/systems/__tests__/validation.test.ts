import { describe, it, expect } from 'vitest';
import { movementSystem } from '../movementSystem';
import { combatSystem } from '../combatSystem';
import { productionSystem } from '../productionSystem';
import { createTestState, createTestUnit, setTile } from './helpers';
import type { GameAction } from '../../types/GameState';

describe('Action Validation', () => {
  describe('movementSystem', () => {
    it('should return validation error when unit does not exist', () => {
      const state = createTestState();
      const action: GameAction = {
        type: 'MOVE_UNIT',
        unitId: 'nonexistent',
        path: [{ q: 1, r: 0 }],
      };
      const result = movementSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Unit not found',
        category: 'movement',
      });
    });

    it('should return validation error when unit has no movement left', () => {
      const unit = createTestUnit({ movementLeft: 0 });
      const state = createTestState({
        units: new Map([['u1', unit]]),
      });
      const action: GameAction = {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }],
      };
      const result = movementSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Unit has no movement left',
        category: 'movement',
      });
    });

    it('should return validation error for impassable terrain', () => {
      const unit = createTestUnit({ position: { q: 0, r: 0 } });
      const state = createTestState({
        units: new Map([['u1', unit]]),
      });
      // Make target tile impassable (mountains)
      setTile(state.map.tiles, { q: 1, r: 0 }, 'grassland', 'mountains');
      const action: GameAction = {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }],
      };
      const result = movementSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Terrain is impassable',
        category: 'movement',
      });
    });

    it('should return validation error for non-adjacent path', () => {
      const unit = createTestUnit({ position: { q: 0, r: 0 } });
      const state = createTestState({
        units: new Map([['u1', unit]]),
      });
      const action: GameAction = {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 5, r: 0 }], // Not adjacent
      };
      const result = movementSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Movement path must be adjacent hexes',
        category: 'movement',
      });
    });

    it('should return validation error for insufficient movement points', () => {
      const unit = createTestUnit({ position: { q: 0, r: 0 }, movementLeft: 1 });
      const state = createTestState({
        units: new Map([['u1', unit]]),
      });
      // Try to move 2 hexes with only 1 movement
      const action: GameAction = {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
      };
      const result = movementSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Not enough movement points',
        category: 'movement',
      });
    });

    it('should return validation error when trying to stack friendly units', () => {
      const unit1 = createTestUnit({ id: 'u1', position: { q: 0, r: 0 } });
      const unit2 = createTestUnit({ id: 'u2', position: { q: 1, r: 0 } });
      const state = createTestState({
        units: new Map([['u1', unit1], ['u2', unit2]]),
      });
      const action: GameAction = {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }], // unit2 is already here
      };
      const result = movementSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Cannot stack friendly units',
        category: 'movement',
      });
    });

    it('should return valid result for successful movement', () => {
      const unit = createTestUnit({ position: { q: 0, r: 0 }, movementLeft: 2 });
      const state = createTestState({
        units: new Map([['u1', unit]]),
      });
      const action: GameAction = {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }],
      };
      const result = movementSystem(state, action);
      expect(result.lastValidation).toBeNull();
      expect(result.units.get('u1')?.position).toEqual({ q: 1, r: 0 });
    });
  });

  describe('combatSystem', () => {
    it('should return validation error when attacker does not exist', () => {
      const state = createTestState();
      const action: GameAction = {
        type: 'ATTACK_UNIT',
        attackerId: 'nonexistent',
        targetId: 'target',
      };
      const result = combatSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Unit not found',
        category: 'combat',
      });
    });

    it('should return validation error when target does not exist', () => {
      const attacker = createTestUnit({ position: { q: 0, r: 0 } });
      const state = createTestState({
        units: new Map([['attacker', attacker]]),
      });
      const action: GameAction = {
        type: 'ATTACK_UNIT',
        attackerId: 'attacker',
        targetId: 'nonexistent',
      };
      const result = combatSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Unit not found',
        category: 'combat',
      });
    });

    it('should return validation error when attacker has no movement left', () => {
      const attacker = createTestUnit({ id: 'attacker', position: { q: 0, r: 0 }, movementLeft: 0 });
      const target = createTestUnit({ id: 'target', position: { q: 1, r: 0 }, owner: 'ai1' });
      const state = createTestState({
        players: new Map([
          ['p1', createTestState().players.get('p1')!],
          ['ai1', { ...createTestState().players.get('p1')!, id: 'ai1', name: 'AI' }],
        ]),
        units: new Map([['attacker', attacker], ['target', target]]),
      });
      const action: GameAction = {
        type: 'ATTACK_UNIT',
        attackerId: 'attacker',
        targetId: 'target',
      };
      const result = combatSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Unit has already attacked this turn',
        category: 'combat',
      });
    });

    it('should return validation error for friendly fire', () => {
      const attacker = createTestUnit({ id: 'attacker', position: { q: 0, r: 0 } });
      const target = createTestUnit({ id: 'target', position: { q: 1, r: 0 } });
      const state = createTestState({
        units: new Map([['attacker', attacker], ['target', target]]),
      });
      const action: GameAction = {
        type: 'ATTACK_UNIT',
        attackerId: 'attacker',
        targetId: 'target',
      };
      const result = combatSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Friendly fire - cannot attack own units',
        category: 'combat',
      });
    });

    it('should return validation error when target out of range', () => {
      const attacker = createTestUnit({ id: 'attacker', position: { q: 0, r: 0 } });
      const target = createTestUnit({ id: 'target', position: { q: 3, r: 0 }, owner: 'ai1' });
      const state = createTestState({
        players: new Map([
          ['p1', createTestState().players.get('p1')!],
          ['ai1', { ...createTestState().players.get('p1')!, id: 'ai1', name: 'AI' }],
        ]),
        units: new Map([['attacker', attacker], ['target', target]]),
      });
      const action: GameAction = {
        type: 'ATTACK_UNIT',
        attackerId: 'attacker',
        targetId: 'target',
      };
      const result = combatSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Target out of melee range',
        category: 'combat',
      });
    });

    it('should return valid result for successful attack', () => {
      const attacker = createTestUnit({ id: 'attacker', position: { q: 0, r: 0 } });
      const target = createTestUnit({ id: 'target', position: { q: 1, r: 0 }, owner: 'ai1' });
      const state = createTestState({
        players: new Map([
          ['p1', createTestState().players.get('p1')!],
          ['ai1', { ...createTestState().players.get('p1')!, id: 'ai1', name: 'AI' }],
        ]),
        units: new Map([['attacker', attacker], ['target', target]]),
      });
      const action: GameAction = {
        type: 'ATTACK_UNIT',
        attackerId: 'attacker',
        targetId: 'target',
      };
      const result = combatSystem(state, action);
      expect(result.lastValidation).toBeNull();
      // Attacker should have 0 movement after attacking
      expect(result.units.get('attacker')?.movementLeft).toBe(0);
    });
  });

  describe('productionSystem', () => {
    it('should return validation error when city does not exist', () => {
      const state = createTestState();
      const action: GameAction = {
        type: 'SET_PRODUCTION',
        cityId: 'nonexistent',
        itemId: 'warrior',
        itemType: 'unit',
      };
      const result = productionSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'City not found',
        category: 'production',
      });
    });

    it('should return validation error when not your city', () => {
      const aiCity = {
        id: 'city1',
        name: 'AI City',
        owner: 'ai1',
        position: { q: 5, r: 5 },
        population: 1,
        food: 0,
        productionQueue: [],
        productionProgress: 0,
        buildings: [],
        territory: [],
        settlementType: 'city' as const,
        happiness: 0,
        isCapital: false,
        defenseHP: 100,
        specialization: null,
        specialists: 0,
      };
      const state = createTestState({
        players: new Map([
          ['p1', createTestState().players.get('p1')!],
          ['ai1', { ...createTestState().players.get('p1')!, id: 'ai1', name: 'AI' }],
        ]),
        cities: new Map([['city1', aiCity]]),
      });
      const action: GameAction = {
        type: 'SET_PRODUCTION',
        cityId: 'city1',
        itemId: 'warrior',
        itemType: 'unit',
      };
      const result = productionSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Not your city',
        category: 'production',
      });
    });

    it('should return validation error when town tries to produce', () => {
      const town = {
        id: 'town1',
        name: 'Town',
        owner: 'p1',
        position: { q: 3, r: 3 },
        population: 1,
        food: 0,
        productionQueue: [],
        productionProgress: 0,
        buildings: [],
        territory: [],
        settlementType: 'town' as const,
        happiness: 0,
        isCapital: false,
        defenseHP: 50,
        specialization: null,
        specialists: 0,
      };
      const state = createTestState({
        cities: new Map([['town1', town]]),
      });
      const action: GameAction = {
        type: 'SET_PRODUCTION',
        cityId: 'town1',
        itemId: 'warrior',
        itemType: 'unit',
      };
      const result = productionSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Towns cannot produce - must purchase with gold',
        category: 'production',
      });
    });

    it('should return validation error when building already constructed', () => {
      const city = {
        id: 'city1',
        name: 'City',
        owner: 'p1',
        position: { q: 3, r: 3 },
        population: 1,
        food: 0,
        productionQueue: [],
        productionProgress: 0,
        buildings: ['granary'],
        territory: [],
        settlementType: 'city' as const,
        happiness: 0,
        isCapital: false,
        defenseHP: 100,
        specialization: null,
        specialists: 0,
      };
      const state = createTestState({
        cities: new Map([['city1', city]]),
      });
      const action: GameAction = {
        type: 'SET_PRODUCTION',
        cityId: 'city1',
        itemId: 'granary',
        itemType: 'building',
      };
      const result = productionSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Building already constructed',
        category: 'production',
      });
    });

    it('should return validation error when not enough gold to purchase', () => {
      const city = {
        id: 'city1',
        name: 'City',
        owner: 'p1',
        position: { q: 3, r: 3 },
        population: 1,
        food: 0,
        productionQueue: [],
        productionProgress: 0,
        buildings: [],
        territory: [],
        settlementType: 'town' as const,
        happiness: 0,
        isCapital: false,
        defenseHP: 50,
        specialization: null,
        specialists: 0,
      };
      const player = createTestState().players.get('p1')!;
      const poorPlayer = { ...player, gold: 10 }; // Not enough for warrior (40 cost)
      const state = createTestState({
        cities: new Map([['city1', city]]),
        players: new Map([['p1', poorPlayer]]),
      });
      const action: GameAction = {
        type: 'PURCHASE_ITEM',
        cityId: 'city1',
        itemId: 'warrior',
        itemType: 'unit',
      };
      const result = productionSystem(state, action);
      expect(result.lastValidation).toEqual({
        valid: false,
        reason: 'Not enough gold (need 120)',
        category: 'production',
      });
    });

    it('should return valid result for successful production set', () => {
      const city = {
        id: 'city1',
        name: 'City',
        owner: 'p1',
        position: { q: 3, r: 3 },
        population: 1,
        food: 0,
        productionQueue: [],
        productionProgress: 0,
        buildings: [],
        territory: [],
        settlementType: 'city' as const,
        happiness: 0,
        isCapital: false,
        defenseHP: 100,
        specialization: null,
        specialists: 0,
      };
      const state = createTestState({
        cities: new Map([['city1', city]]),
      });
      const action: GameAction = {
        type: 'SET_PRODUCTION',
        cityId: 'city1',
        itemId: 'warrior',
        itemType: 'unit',
      };
      const result = productionSystem(state, action);
      expect(result.lastValidation).toBeNull();
      expect(result.cities.get('city1')?.productionQueue).toEqual([
        { type: 'unit', id: 'warrior' },
      ]);
    });
  });
});
