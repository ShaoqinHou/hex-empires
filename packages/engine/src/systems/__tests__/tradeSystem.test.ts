import { describe, it, expect } from 'vitest';
import { tradeSystem } from '../tradeSystem';
import type { CityState, GameState } from '../../types/GameState';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';

// ── Helpers ──

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'city1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 2,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    ...overrides,
  };
}

function stateWithMerchantAndCities(): GameState {
  const homeCity = makeCity({ id: 'city1', owner: 'p1', position: { q: 0, r: 0 } });
  const foreignCity = makeCity({ id: 'city2', name: 'Athens', owner: 'p2', position: { q: 2, r: 0 } });

  const merchant = createTestUnit({
    id: 'm1',
    typeId: 'merchant',
    owner: 'p1',
    position: { q: 1, r: 0 }, // adjacent to foreignCity at {q:2, r:0}
  });

  const p2 = createTestPlayer({ id: 'p2', name: 'Player 2', gold: 50 });

  return createTestState({
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', gold: 100 })],
      ['p2', p2],
    ]),
    units: new Map([['m1', merchant]]),
    cities: new Map([
      ['city1', homeCity],
      ['city2', foreignCity],
    ]),
    tradeRoutes: new Map(),
  });
}

// ── Tests ──

describe('tradeSystem', () => {
  describe('CREATE_TRADE_ROUTE', () => {
    it('creates a trade route and consumes the merchant', () => {
      const state = stateWithMerchantAndCities();
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });

      // Merchant is consumed
      expect(next.units.has('m1')).toBe(false);

      // Route created
      expect(next.tradeRoutes.size).toBe(1);
      const route = [...next.tradeRoutes.values()][0];
      expect(route.from).toBe('city1'); // nearest home city
      expect(route.to).toBe('city2');
      expect(route.owner).toBe('p1');
      expect(route.turnsRemaining).toBe(20);
      expect(route.goldPerTurn).toBe(3);
    });

    it('adds a log entry when trade route is created', () => {
      const state = stateWithMerchantAndCities();
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(next.log.length).toBeGreaterThan(0);
      expect(next.log[next.log.length - 1].type).toBe('production');
    });

    it('rejects if merchant does not exist', () => {
      const state = stateWithMerchantAndCities();
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'nonexistent',
        targetCityId: 'city2',
      });
      expect(next).toBe(state); // unchanged
    });

    it('rejects if merchant is not owned by current player', () => {
      const state = stateWithMerchantAndCities();
      // merchant belongs to p1 but currentPlayerId is p1 -- create a different merchant for p2
      const merchant2 = createTestUnit({
        id: 'm2',
        typeId: 'merchant',
        owner: 'p2',
        position: { q: 1, r: 0 },
      });
      const modifiedState = {
        ...state,
        units: new Map([...state.units, ['m2', merchant2]]),
      };
      const next = tradeSystem(modifiedState, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm2',
        targetCityId: 'city2',
      });
      expect(next).toBe(modifiedState); // unchanged
    });

    it('rejects if unit lacks create_trade_route ability', () => {
      const state = stateWithMerchantAndCities();
      const warrior = createTestUnit({
        id: 'w1',
        typeId: 'warrior',
        owner: 'p1',
        position: { q: 1, r: 0 },
      });
      const modifiedState = {
        ...state,
        units: new Map([...state.units, ['w1', warrior]]),
      };
      const next = tradeSystem(modifiedState, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'w1',
        targetCityId: 'city2',
      });
      expect(next).toBe(modifiedState);
    });

    it('rejects trading with own city', () => {
      const state = stateWithMerchantAndCities();
      // Place merchant adjacent to own city
      const merchant = createTestUnit({
        id: 'm1',
        typeId: 'merchant',
        owner: 'p1',
        position: { q: 1, r: 0 },
      });
      const modifiedState = {
        ...state,
        units: new Map([['m1', merchant]]),
      };
      const next = tradeSystem(modifiedState, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city1', // own city
      });
      expect(next).toBe(modifiedState);
    });

    it('rejects if merchant is not adjacent to target city', () => {
      const state = stateWithMerchantAndCities();
      // Move merchant far away
      const farMerchant = createTestUnit({
        id: 'm1',
        typeId: 'merchant',
        owner: 'p1',
        position: { q: 8, r: 8 }, // far from foreignCity at {q:2, r:0}
      });
      const modifiedState = {
        ...state,
        units: new Map([['m1', farMerchant]]),
      };
      const next = tradeSystem(modifiedState, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(next).toBe(modifiedState);
    });

    it('rejects duplicate route between same two cities', () => {
      const state = stateWithMerchantAndCities();
      // First route created
      const after1 = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(after1.tradeRoutes.size).toBe(1);

      // Try to create another merchant and duplicate the route
      const merchant2 = createTestUnit({
        id: 'm2',
        typeId: 'merchant',
        owner: 'p1',
        position: { q: 1, r: 0 },
      });
      const stateWith2Merchants = {
        ...after1,
        units: new Map([['m2', merchant2]]),
      };
      const after2 = tradeSystem(stateWith2Merchants, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm2',
        targetCityId: 'city2',
      });
      // Should still only have 1 route
      expect(after2.tradeRoutes.size).toBe(1);
    });

    it('accepts merchant on the city tile itself (distance 0)', () => {
      const state = stateWithMerchantAndCities();
      const merchantOnCity = createTestUnit({
        id: 'm1',
        typeId: 'merchant',
        owner: 'p1',
        position: { q: 2, r: 0 }, // exactly on foreignCity position
      });
      const modifiedState = {
        ...state,
        units: new Map([['m1', merchantOnCity]]),
      };
      const next = tradeSystem(modifiedState, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(next.tradeRoutes.size).toBe(1);
      expect(next.units.has('m1')).toBe(false);
    });
  });

  describe('END_TURN gold accumulation', () => {
    it('adds gold to both parties each turn', () => {
      const state = stateWithMerchantAndCities();
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });

      const afterEndTurn = tradeSystem(afterCreate, { type: 'END_TURN' });

      const p1Gold = afterEndTurn.players.get('p1')!.gold;
      const p2Gold = afterEndTurn.players.get('p2')!.gold;
      // p1 started with 100, receives 3 gold
      expect(p1Gold).toBe(103);
      // p2 started with 50, receives 3 gold
      expect(p2Gold).toBe(53);
    });

    it('also increments totalGoldEarned', () => {
      const state = stateWithMerchantAndCities();
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      const afterEndTurn = tradeSystem(afterCreate, { type: 'END_TURN' });

      const p1 = afterEndTurn.players.get('p1')!;
      expect(p1.totalGoldEarned).toBe(3);
    });

    it('decrements turnsRemaining each END_TURN', () => {
      const state = stateWithMerchantAndCities();
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });

      const after1 = tradeSystem(afterCreate, { type: 'END_TURN' });
      const route = [...after1.tradeRoutes.values()][0];
      expect(route.turnsRemaining).toBe(19);
    });

    it('removes expired route when turnsRemaining reaches 0', () => {
      const state = stateWithMerchantAndCities();
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });

      // Manually set turnsRemaining to 1 to trigger expiry on next END_TURN
      const routeId = [...afterCreate.tradeRoutes.keys()][0];
      const route = afterCreate.tradeRoutes.get(routeId)!;
      const stateWith1Turn = {
        ...afterCreate,
        tradeRoutes: new Map([[routeId, { ...route, turnsRemaining: 1 }]]),
      };

      const afterExpiry = tradeSystem(stateWith1Turn, { type: 'END_TURN' });
      expect(afterExpiry.tradeRoutes.size).toBe(0);
    });

    it('passes through state unchanged when no trade routes exist', () => {
      const state = createTestState({ tradeRoutes: new Map() });
      const next = tradeSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state); // same reference — no work done
    });
  });

  describe('unrelated actions', () => {
    it('passes through state unchanged for MOVE_UNIT', () => {
      const state = stateWithMerchantAndCities();
      const next = tradeSystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'm1',
        path: [{ q: 2, r: 0 }],
      });
      expect(next).toBe(state);
    });
  });
});
