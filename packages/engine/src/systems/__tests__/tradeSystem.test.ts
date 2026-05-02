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
    it('destination owner receives gold by slotted resources and age rate, while origin food stays unchanged', () => {
      const state = stateWithMerchantAndCities({
        assignedResources: ['iron', 'horses', 'wheat'],
      });
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      const beforeCityFood = state.cities.get('city1')?.food ?? 0;

      const afterEndTurn = tradeSystem(afterCreate, { type: 'END_TURN' });

      // 3 resources × 2 gold (antiquity) × land = 6 gold
      expect(afterEndTurn.players.get('p2')!.gold).toBe(56);
      expect(afterEndTurn.players.get('p1')!.gold).toBe(100);
      expect(afterEndTurn.players.get('p2')!.totalGoldEarned).toBe(6);
      expect(afterEndTurn.cities.get('city1')?.food).toBe(beforeCityFood);
    });

    it('destination owner does not receive extra gold when no destination resources are slotted', () => {
      const state = stateWithMerchantAndCities({ assignedResources: [] });
      const afterCreate = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      const afterEndTurn = tradeSystem(afterCreate, { type: 'END_TURN' });

      expect(afterEndTurn.players.get('p2')!.gold).toBe(50);
      expect(afterEndTurn.players.get('p1')!.gold).toBe(100);
      expect(afterEndTurn.players.get('p2')!.totalGoldEarned).toBe(0);
    });

    it('origin owner receives destination resources in ownedResources, not food yield', () => {
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
      const ownedResources = afterEndTurn.players.get('p1')?.ownedResources ?? [];

      expect(ownedResources).toEqual(expect.arrayContaining(['iron', 'horses', 'wheat']));
      expect(ownedResources.length).toBe(3);
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

  // ── F-05 Diplomatic gate (FF3.2) ──
  describe('CREATE_TRADE_ROUTE — diplomatic gate (F-05, FF3.2)', () => {
    it('rejects route when at war (FF3.2 diplomatic gate)', () => {
      // FF3.2: war is a hard gate — no route can be created while players are at war.
      const state = withRelation(stateWithMerchantAndCities(), { status: 'war' });
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(next).toBe(state);
      expect(next.tradeRoutes.size).toBe(0);
    });

    it('rejects route when relation is hostile (FF3.2 diplomatic gate)', () => {
      // Hostile is the tier just below war; also blocked.
      const state = withRelation(stateWithMerchantAndCities(), { status: 'hostile' });
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(next).toBe(state);
    });

    it('allows route between two players at peace (neutral status, FF3.2)', () => {
      // FF3.2: neutral (default) is a peaceful relation — trade is permitted.
      // Default relation in helpers is neutral, which represents "at peace".
      const state = withRelation(stateWithMerchantAndCities(), { status: 'neutral' });
      const next = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(next.tradeRoutes.size).toBe(1);
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

  // ── F-06 Per-origin-city route cap (FF3.2) ──
  describe('CREATE_TRADE_ROUTE — per-origin-city cap (F-06, FF3.2)', () => {
    it('allows a 2nd route from the same origin city to a different destination (cap=2 per origin)', () => {
      // FF3.2: cap is per origin city (=2). A city can hold up to 2 outbound routes
      // to different destinations simultaneously.
      const homeCity = makeCity({ id: 'city1', owner: 'p1', position: { q: 0, r: 0 } });
      const foreignCity2 = makeCity({ id: 'city2', name: 'Athens', owner: 'p2', position: { q: 2, r: 0 } });
      const foreignCity3 = makeCity({ id: 'city3', name: 'Sparta', owner: 'p3', position: { q: 4, r: 0 } });

      const merchant1 = createTestUnit({ id: 'm1', typeId: 'merchant', owner: 'p1', position: { q: 1, r: 0 } });
      const merchant2 = createTestUnit({ id: 'm2', typeId: 'merchant', owner: 'p1', position: { q: 3, r: 0 } }); // adjacent to city3

      const base = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', gold: 100 })],
          ['p2', createTestPlayer({ id: 'p2', gold: 50 })],
          ['p3', createTestPlayer({ id: 'p3', gold: 50 })],
        ]),
        units: new Map([['m1', merchant1], ['m2', merchant2]]),
        cities: new Map([['city1', homeCity], ['city2', foreignCity2], ['city3', foreignCity3]]),
        tradeRoutes: new Map(),
      });

      // First route: city1 → city2
      const after1 = tradeSystem(base, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(after1.tradeRoutes.size).toBe(1);

      // Second route: city1 → city3 (same origin, different destination)
      const after2 = tradeSystem(after1, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm2',
        targetCityId: 'city3',
      });
      // 2nd route allowed (within cap of 2)
      expect(after2.tradeRoutes.size).toBe(2);
    });

    it('rejects a 3rd route from the same origin city (cap=2 per origin)', () => {
      // Two routes already exist from city1 → trying to add a 3rd hits the cap.
      const homeCity = makeCity({ id: 'city1', owner: 'p1', position: { q: 0, r: 0 } });
      const foreignCity2 = makeCity({ id: 'city2', name: 'Athens', owner: 'p2', position: { q: 2, r: 0 } });
      const foreignCity3 = makeCity({ id: 'city3', name: 'Sparta', owner: 'p3', position: { q: 4, r: 0 } });
      const foreignCity4 = makeCity({ id: 'city4', name: 'Corinth', owner: 'p4', position: { q: 6, r: 0 } });

      const merchant1 = createTestUnit({ id: 'm1', typeId: 'merchant', owner: 'p1', position: { q: 1, r: 0 } });
      const merchant2 = createTestUnit({ id: 'm2', typeId: 'merchant', owner: 'p1', position: { q: 3, r: 0 } });
      const merchant3 = createTestUnit({ id: 'm3', typeId: 'merchant', owner: 'p1', position: { q: 5, r: 0 } });

      const base = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1' })],
          ['p2', createTestPlayer({ id: 'p2' })],
          ['p3', createTestPlayer({ id: 'p3' })],
          ['p4', createTestPlayer({ id: 'p4' })],
        ]),
        units: new Map([['m1', merchant1], ['m2', merchant2], ['m3', merchant3]]),
        cities: new Map([
          ['city1', homeCity], ['city2', foreignCity2],
          ['city3', foreignCity3], ['city4', foreignCity4],
        ]),
        tradeRoutes: new Map(),
      });

      // First route
      const after1 = tradeSystem(base, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      expect(after1.tradeRoutes.size).toBe(1);

      // Second route (different destination)
      const after2 = tradeSystem(after1, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm2',
        targetCityId: 'city3',
      });
      expect(after2.tradeRoutes.size).toBe(2);

      // Attempt 3rd route — must be rejected (cap=2 per origin city)
      const after3 = tradeSystem(after2, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm3',
        targetCityId: 'city4',
      });
      expect(after3.tradeRoutes.size).toBe(2);
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

  // -- Y1.2: railroadTycoonPoints accumulation --
  describe('END_TURN -- railroadTycoonPoints accumulation (Y1.2)', () => {
    it('1 route x 50 END_TURN ticks = 50 railroadTycoonPoints', () => {
      const state = stateWithMerchantAndCities({ assignedResources: [] });
      let s = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      for (let i = 0; i < 50; i++) {
        s = tradeSystem(s, { type: 'END_TURN' });
      }
      expect(s.players.get('p1')!.railroadTycoonPoints).toBe(50);
    });

    it('age-crossing route (Modern origin, Antiquity dest) earns 3/turn -> 102 at 34 turns', () => {
      const homeCity: CityState = {
        id: 'city1', name: 'Rome', owner: 'p1', position: { q: 0, r: 0 },
        population: 2, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: [], settlementType: 'city', happiness: 10,
        isCapital: true, defenseHP: 100, specialization: null, specialists: 0, districts: [],
      };
      const foreignCity: CityState = {
        id: 'city2', name: 'Athens', owner: 'p2', position: { q: 2, r: 0 },
        population: 2, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: [], settlementType: 'city', happiness: 10,
        isCapital: false, defenseHP: 100, specialization: null, specialists: 0, districts: [],
        assignedResources: [],
      };
      const merchant = createTestUnit({ id: 'm1', typeId: 'merchant', owner: 'p1', position: { q: 1, r: 0 } });
      // p1 is Modern, p2 is Antiquity -> cross-age -> 3 pts/turn
      const p1 = createTestPlayer({ id: 'p1', age: 'modern' });
      const p2 = createTestPlayer({ id: 'p2', age: 'antiquity' });
      let s = createTestState({
        players: new Map([['p1', p1], ['p2', p2]]),
        units: new Map([['m1', merchant]]),
        cities: new Map([['city1', homeCity], ['city2', foreignCity]]),
        tradeRoutes: new Map(),
      });
      s = tradeSystem(s, { type: 'CREATE_TRADE_ROUTE', merchantId: 'm1', targetCityId: 'city2' });
      for (let i = 0; i < 34; i++) {
        s = tradeSystem(s, { type: 'END_TURN' });
      }
      // 3 pts/turn x 34 turns = 102
      expect(s.players.get('p1')!.railroadTycoonPoints).toBe(102);
    });
  });

  // -- Y1.3: permanent routes, asymmetric yields fix --
  describe('Y1.3 -- permanent routes, correct asymmetric yields', () => {
    it('route persists for 30 turns with no expiry', () => {
      const state = stateWithMerchantAndCities({ assignedResources: [] });
      let s = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      for (let i = 0; i < 30; i++) {
        s = tradeSystem(s, { type: 'END_TURN' });
      }
      expect(s.tradeRoutes.size).toBe(1);
    });

    it('war declaration cancels routes between belligerents', () => {
      const state = stateWithMerchantAndCities({ assignedResources: [] });
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

    it('trade route persists across 30 regular END_TURN calls (no age transition)', () => {
      const state = stateWithMerchantAndCities({ assignedResources: [] });
      let s = tradeSystem(state, {
        type: 'CREATE_TRADE_ROUTE',
        merchantId: 'm1',
        targetCityId: 'city2',
      });
      for (let i = 0; i < 30; i++) {
        s = tradeSystem(s, { type: 'END_TURN' });
      }
      // Route still active after 30 non-age-transition turns
      expect(s.tradeRoutes.size).toBe(1);
    });
  });

});
