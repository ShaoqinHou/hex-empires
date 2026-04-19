import { describe, it, expect } from 'vitest';
import { tradeSystem } from '../tradeSystem';
import type { CityState, GameState, DiplomacyRelation } from '../../types/GameState';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import { getRelationKey } from '../../state/DiplomacyUtils';

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
    districts: [],
    ...overrides,
  };
}

function stateWithMerchantAndCities(opts: { assignedResources?: ReadonlyArray<string> } = {}): GameState {
  const homeCity = makeCity({ id: 'city1', owner: 'p1', position: { q: 0, r: 0 } });
  const foreignCity = makeCity({
    id: 'city2',
    name: 'Athens',
    owner: 'p2',
    position: { q: 2, r: 0 },
    assignedResources: opts.assignedResources ?? [],
  });

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

/** Inject a hostile/war diplomatic relation between p1 and p2 */
function withRelation(
  state: GameState,
  overrides: Partial<DiplomacyRelation>,
): GameState {
  const relKey = getRelationKey('p1', 'p2');
  const base: DiplomacyRelation = {
    status: 'neutral',
    relationship: 0,
    warSupport: 0,
    turnsAtPeace: 0,
    turnsAtWar: 0,
    hasAlliance: false,
    hasFriendship: false,
    hasDenounced: false,
    warDeclarer: null,
    isSurpriseWar: false,
    activeEndeavors: [],
    activeSanctions: [],
  };
  const updatedRelations = new Map(state.diplomacy.relations);
  updatedRelations.set(relKey, { ...base, ...overrides });
  return { ...state, diplomacy: { ...state.diplomacy, relations: updatedRelations } };
}

// ── Tests ──

describe('tradeSystem', () => {
  // ── F-03 Caravan conversion ──
  describe('CREATE_TRADE_ROUTE — caravan conversion (F-03)', () => {
    it('replaces merchant with a stationary caravan at destination', () => {
      const state = stateWithMerchantAndCities();
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });

      // Merchant consumed
      expect(next.units.has('m1')).toBe(false);

      // Caravan created at foreign city position
      const caravans = [...next.units.values()].filter(u => u.typeId === 'caravan');
      expect(caravans.length).toBe(1);
      expect(caravans[0].position).toEqual({ q: 2, r: 0 });
      expect(caravans[0].owner).toBe('p1');
    });

    it('caravan unit id matches route.caravanUnitId', () => {
      const state = stateWithMerchantAndCities();
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });

      const route = [...next.tradeRoutes.values()][0];
      expect(next.units.has(route.caravanUnitId)).toBe(true);
    });

    it('route is permanent — no turnsRemaining field', () => {
      const state = stateWithMerchantAndCities();
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });

      const route = [...next.tradeRoutes.values()][0];
      // TypeScript will verify at compile time that turnsRemaining is absent
      expect('turnsRemaining' in route).toBe(false);
    });
  });

  // ── F-01 Asymmetric yields ──
  describe('END_TURN — asymmetric yields (F-01)', () => {
    it('destination city owner receives gold (no slotted resources → 1 slot minimum)', () => {
      const state = stateWithMerchantAndCities({ assignedResources: [] });
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });

      const afterEndTurn = tradeSystem(afterCreate, { type: 'END_TURN' });

      // p2 (destination owner) started at 50 gold; antiquity rate=2, 1 slot min
      expect(afterEndTurn.players.get('p2')!.gold).toBe(52);
      // p1 (origin owner) does NOT receive gold — only resources
      expect(afterEndTurn.players.get('p1')!.gold).toBe(100);
    });

    it('destination owner receives gold per slot × age rate', () => {
      // 3 resources slotted → 3 slots × 2 gold (antiquity) = 6 gold to p2
      const state = stateWithMerchantAndCities({
        assignedResources: ['iron', 'horses', 'wheat'],
      });
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      const afterEndTurn = tradeSystem(afterCreate, { type: 'END_TURN' });

      expect(afterEndTurn.players.get('p2')!.gold).toBe(56); // 50 + 6
    });

    it('also increments totalGoldEarned for destination owner', () => {
      const state = stateWithMerchantAndCities({ assignedResources: [] });
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      const afterEndTurn = tradeSystem(afterCreate, { type: 'END_TURN' });

      expect(afterEndTurn.players.get('p2')!.totalGoldEarned).toBe(2);
    });

    it('route persists across multiple END_TURN ticks (permanent lifecycle)', () => {
      const state = stateWithMerchantAndCities({ assignedResources: [] });
      let s = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      for (let i = 0; i < 25; i++) {
        s = tradeSystem(s, { type: 'END_TURN' });
      }
      // Route still active after 25 turns
      expect(s.tradeRoutes.size).toBe(1);
    });
  });

  // ── F-02 War cancellation ──
  describe('PROPOSE_DIPLOMACY DECLARE_WAR — war cancellation (F-02)', () => {
    it('cancels all routes between warring players', () => {
      const state = stateWithMerchantAndCities();
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(afterCreate.tradeRoutes.size).toBe(1);

      const afterWar = tradeSystem(afterCreate, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DECLARE_WAR', warType: 'formal' },
      });

      expect(afterWar.tradeRoutes.size).toBe(0);
    });

    it('removes the caravan unit when war cancels the route', () => {
      const state = stateWithMerchantAndCities();
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      const route = [...afterCreate.tradeRoutes.values()][0];

      const afterWar = tradeSystem(afterCreate, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p2',
        proposal: { type: 'DECLARE_WAR', warType: 'formal' },
      });

      expect(afterWar.units.has(route.caravanUnitId)).toBe(false);
    });

    it('does not cancel routes between unrelated parties', () => {
      const state = stateWithMerchantAndCities();
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });

      // War between p1 and p3 — p3 does not exist but the route is p1↔p2
      const afterWar = tradeSystem(afterCreate, {
        type: 'PROPOSE_DIPLOMACY',
        targetId: 'p3',
        proposal: { type: 'DECLARE_WAR', warType: 'formal' },
      });

      expect(afterWar.tradeRoutes.size).toBe(1);
    });
  });

  // ── F-02 Age transition cancellation ──
  describe('TRANSITION_AGE — clear all routes (F-02)', () => {
    it('clears all trade routes on age transition', () => {
      const state = stateWithMerchantAndCities();
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(afterCreate.tradeRoutes.size).toBe(1);

      const afterAge = tradeSystem(afterCreate, {
        type: 'TRANSITION_AGE',
        newCivId: 'egypt',
      });

      expect(afterAge.tradeRoutes.size).toBe(0);
    });

    it('removes caravan units on age transition', () => {
      const state = stateWithMerchantAndCities();
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      const route = [...afterCreate.tradeRoutes.values()][0];

      const afterAge = tradeSystem(afterCreate, {
        type: 'TRANSITION_AGE',
        newCivId: 'egypt',
      });

      expect(afterAge.units.has(route.caravanUnitId)).toBe(false);
    });
  });

  // ── F-04 Distance gate ──
  describe('CREATE_TRADE_ROUTE — distance check (F-04)', () => {
    it('rejects route when city distance exceeds land range for antiquity (>10)', () => {
      // homeCity at {q:0,r:0}, foreignCity at {q:0, r:11} — distance 11 > 10
      const homeCity = makeCity({ id: 'city1', owner: 'p1', position: { q: 0, r: 0 } });
      const farCity = makeCity({ id: 'city2', owner: 'p2', position: { q: 0, r: 11 } });
      const merchant = createTestUnit({
        id: 'm1',
        typeId: 'merchant',
        owner: 'p1',
        position: { q: 0, r: 10 }, // adjacent to farCity
      });

      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1' })],
          ['p2', createTestPlayer({ id: 'p2' })],
        ]),
        units: new Map([['m1', merchant]]),
        cities: new Map([
          ['city1', homeCity],
          ['city2', farCity],
        ]),
        tradeRoutes: new Map(),
      });

      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(next).toBe(state);
    });

    it('accepts route within land range for antiquity (=10)', () => {
      // homeCity at {q:0,r:0}, foreignCity at {q:0, r:10} — distance 10 = max
      const homeCity = makeCity({ id: 'city1', owner: 'p1', position: { q: 0, r: 0 } });
      const borderCity = makeCity({ id: 'city2', owner: 'p2', position: { q: 0, r: 10 } });
      const merchant = createTestUnit({
        id: 'm1',
        typeId: 'merchant',
        owner: 'p1',
        position: { q: 0, r: 9 }, // adjacent to borderCity
      });

      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1' })],
          ['p2', createTestPlayer({ id: 'p2' })],
        ]),
        units: new Map([['m1', merchant]]),
        cities: new Map([
          ['city1', homeCity],
          ['city2', borderCity],
        ]),
        tradeRoutes: new Map(),
      });

      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(next.tradeRoutes.size).toBe(1);
    });
  });

  // ── F-05 Diplomatic gate ──
  describe('CREATE_TRADE_ROUTE — diplomatic gate (F-05)', () => {
    it('rejects route when relation is hostile', () => {
      const state = withRelation(stateWithMerchantAndCities(), { status: 'hostile' });
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(next).toBe(state);
    });

    it('rejects route when at war', () => {
      const state = withRelation(stateWithMerchantAndCities(), { status: 'war' });
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(next).toBe(state);
    });

    it('allows route at unfriendly (below hostile)', () => {
      const state = withRelation(stateWithMerchantAndCities(), { status: 'unfriendly' });
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(next.tradeRoutes.size).toBe(1);
    });
  });

  // ── F-06 Civ-pair cap ──
  describe('CREATE_TRADE_ROUTE — civ-pair cap (F-06)', () => {
    it('rejects a second route between the same civ pair', () => {
      const state = stateWithMerchantAndCities();

      // Create first route
      const after1 = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(after1.tradeRoutes.size).toBe(1);

      // Spawn a second merchant and try to create another route
      const merchant2 = createTestUnit({
        id: 'm2',
        typeId: 'merchant',
        owner: 'p1',
        position: { q: 1, r: 0 },
      });
      const stateWith2Merchants = {
        ...after1,
        units: new Map([...after1.units, ['m2', merchant2]]),
      };

      const after2 = tradeSystem(stateWith2Merchants, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm2',
        targetCityId: 'city2',
      });

      // Still only 1 route (cap hit)
      expect(after2.tradeRoutes.size).toBe(1);
    });
  });

  // ── PLUNDER_TRADE_ROUTE ──
  describe('PLUNDER_TRADE_ROUTE', () => {
    it('removes the route and its caravan unit', () => {
      const state = stateWithMerchantAndCities();
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });

      const route = [...afterCreate.tradeRoutes.values()][0];
      const caravanId = route.caravanUnitId;

      // Attacker unit
      const warrior = createTestUnit({ id: 'w1', typeId: 'warrior', owner: 'p2', position: { q: 2, r: 0 } });
      const stateWithWarrior = {
        ...afterCreate,
        units: new Map([...afterCreate.units, ['w1', warrior]]),
      };

      const afterPlunder = tradeSystem(stateWithWarrior, {
        type: 'PLUNDER_TRADE_ROUTE',
        caravanUnitId: caravanId,
        plundererId: 'w1',
      });

      expect(afterPlunder.tradeRoutes.size).toBe(0);
      expect(afterPlunder.units.has(caravanId)).toBe(false);
    });
  });

  // ── Legacy validations ──
  describe('CREATE_TRADE_ROUTE — basic validations', () => {
    it('rejects if merchant does not exist', () => {
      const state = stateWithMerchantAndCities();
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'nonexistent',
        targetCityId: 'city2',
      });
      expect(next).toBe(state);
    });

    it('rejects if merchant is not owned by current player', () => {
      const state = stateWithMerchantAndCities();
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
      expect(next).toBe(modifiedState);
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
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city1',
      });
      expect(next).toBe(state);
    });

    it('rejects if merchant is not adjacent to target city', () => {
      const state = stateWithMerchantAndCities();
      const farMerchant = createTestUnit({
        id: 'm1',
        typeId: 'merchant',
        owner: 'p1',
        position: { q: 8, r: 8 },
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

    it('accepts merchant on the city tile itself (distance 0)', () => {
      const state = stateWithMerchantAndCities();
      const merchantOnCity = createTestUnit({
        id: 'm1',
        typeId: 'merchant',
        owner: 'p1',
        position: { q: 2, r: 0 },
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

    it('passes through state unchanged when no trade routes exist', () => {
      const state = createTestState({ tradeRoutes: new Map() });
      const next = tradeSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });
  });
});
