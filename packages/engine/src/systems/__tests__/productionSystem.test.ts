import { describe, it, expect } from 'vitest';
import { productionSystem } from '../productionSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 5,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
      coordToKey({ q: 2, r: 4 }),
      coordToKey({ q: 2, r: 3 }),
    ],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    ...overrides,
  };
}

describe('productionSystem', () => {
  describe('SET_PRODUCTION', () => {
    it('sets production queue for a city', () => {
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'warrior',
        itemType: 'unit',
      });
      const updatedCity = next.cities.get('c1')!;
      expect(updatedCity.productionQueue).toEqual([{ type: 'unit', id: 'warrior' }]);
      expect(updatedCity.productionProgress).toBe(0);
    });
  });

  describe('END_TURN production', () => {
    it('accumulates production progress', () => {
      const city = createTestCity({
        productionQueue: [{ type: 'unit', id: 'warrior' }],
        productionProgress: 0,
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });
      expect(next.cities.get('c1')!.productionProgress).toBeGreaterThan(0);
    });

    it('creates unit when production completes', () => {
      const city = createTestCity({
        productionQueue: [{ type: 'unit', id: 'warrior' }],
        productionProgress: 39, // warrior costs 40, should complete with any production
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });

      // Should have created a new unit
      const newUnits = [...next.units.values()].filter(u => u.typeId === 'warrior');
      expect(newUnits.length).toBeGreaterThanOrEqual(1);

      // Queue should be cleared
      expect(next.cities.get('c1')!.productionQueue.length).toBe(0);
    });

    it('adds building when production completes', () => {
      const city = createTestCity({
        productionQueue: [{ type: 'building', id: 'granary' }],
        productionProgress: 64, // granary costs 65
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });
      expect(next.cities.get('c1')!.buildings).toContain('granary');
    });

    it('does nothing with empty queue', () => {
      const city = createTestCity({ productionQueue: [] });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });

    it('skips towns in production processing', () => {
      const town = createTestCity({
        settlementType: 'town',
        happiness: 5,
        isCapital: false,
        productionQueue: [{ type: 'unit', id: 'warrior' }],
        productionProgress: 39,
      });
      const state = createTestState({ cities: new Map([['c1', town]]) });
      const next = productionSystem(state, { type: 'END_TURN' });
      // Town production should be unchanged — skipped entirely
      expect(next.cities.get('c1')!.productionProgress).toBe(39);
    });
  });

  describe('SET_PRODUCTION for towns', () => {
    it('rejects SET_PRODUCTION for a town', () => {
      const town = createTestCity({ settlementType: 'town', happiness: 5, isCapital: false });
      const state = createTestState({ cities: new Map([['c1', town]]) });
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'warrior',
        itemType: 'unit',
      });
      expect(next).toBe(state); // unchanged
    });
  });

  describe('PURCHASE_ITEM', () => {
    it('purchases a unit instantly for gold', () => {
      const town = createTestCity({ settlementType: 'town', happiness: 5, isCapital: false });
      const state = createTestState({
        cities: new Map([['c1', town]]),
        players: new Map([['p1', createTestPlayer({ gold: 200 })]]),
      });
      const next = productionSystem(state, {
        type: 'PURCHASE_ITEM',
        cityId: 'c1',
        itemId: 'warrior',
        itemType: 'unit',
      });
      // Warrior cost = 40, gold cost = 80 (2x)
      expect(next.players.get('p1')!.gold).toBe(120);
      const newUnits = [...next.units.values()].filter(u => u.typeId === 'warrior');
      expect(newUnits.length).toBe(1);
    });

    it('purchases a building instantly for gold', () => {
      const town = createTestCity({ settlementType: 'town', happiness: 5, isCapital: false });
      const state = createTestState({
        cities: new Map([['c1', town]]),
        players: new Map([['p1', createTestPlayer({ gold: 200 })]]),
      });
      const next = productionSystem(state, {
        type: 'PURCHASE_ITEM',
        cityId: 'c1',
        itemId: 'granary',
        itemType: 'building',
      });
      // Granary cost = 65, gold cost = 130 (2x)
      expect(next.players.get('p1')!.gold).toBe(70);
      expect(next.cities.get('c1')!.buildings).toContain('granary');
    });

    it('rejects purchase if not enough gold', () => {
      const town = createTestCity({ settlementType: 'town', happiness: 5, isCapital: false });
      const state = createTestState({
        cities: new Map([['c1', town]]),
        players: new Map([['p1', createTestPlayer({ gold: 10 })]]),
      });
      const next = productionSystem(state, {
        type: 'PURCHASE_ITEM',
        cityId: 'c1',
        itemId: 'warrior',
        itemType: 'unit',
      });
      expect(next).toBe(state); // unchanged
    });
  });
});
