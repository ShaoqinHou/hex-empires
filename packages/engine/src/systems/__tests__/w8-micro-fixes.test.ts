/**
 * W8 micro-fixes test suite.
 *
 * Covers all 5 items:
 * 1. trade F-01 — origin city earns food per turn
 * 2. trade F-10 — PLUNDER_TRADE_ROUTE loot (50 + half destination yield)
 * 3. combat F-11 — unit retreat mechanic (melee only)
 * 4. buildings F-12 — REPAIR_BUILDING action
 * 5. yields F-10 — yield cap (YIELD_CAP_PER_CITY constant + clamp)
 */

import { describe, it, expect } from 'vitest';
import { tradeSystem } from '../tradeSystem';
import { combatSystem } from '../combatSystem';
import { productionSystem } from '../productionSystem';
import { calculateCityYields, YIELD_CAP_PER_CITY } from '../../state/YieldCalculator';
import type { CityState, GameState } from '../../types/GameState';
import type { BuildingId } from '../../types/Ids';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';

// ── Helpers ──

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'city1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 0, r: 0 },
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

function tradeStateFixture(opts: { assignedResources?: ReadonlyArray<string> } = {}): GameState {
  const homeCity = makeCity({ id: 'city1', owner: 'p1', position: { q: 0, r: 0 }, food: 0 });
  const foreignCity = makeCity({
    id: 'city2',
    name: 'Athens',
    owner: 'p2',
    position: { q: 2, r: 0 },
    assignedResources: opts.assignedResources ?? [],
  });
  const merchant = createTestUnit({
    id: 'm1', typeId: 'merchant', owner: 'p1', position: { q: 1, r: 0 },
  });
  return createTestState({
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', gold: 100 })],
      ['p2', createTestPlayer({ id: 'p2', gold: 50 })],
    ]),
    units: new Map([['m1', merchant]]),
    cities: new Map([['city1', homeCity], ['city2', foreignCity]]),
    tradeRoutes: new Map(),
  });
}

// ── 1. trade F-01 — origin city earns food ──

describe('trade F-01 — origin city earns food per END_TURN', () => {
  it('origin home city food increments by 2 per active trade route per turn', () => {
    const state = tradeStateFixture({ assignedResources: [] });
    const afterCreate = tradeSystem(state, {
      type: 'CREATE_TRADE_ROUTE', merchantId: 'm1', targetCityId: 'city2',
    });
    expect(afterCreate.tradeRoutes.size).toBe(1);

    const afterTurn = tradeSystem(afterCreate, { type: 'END_TURN' });

    const originCity = afterTurn.cities.get('city1')!;
    expect(originCity.food).toBe(2); // +2 food from trade route
  });

  it('destination city owner still receives gold on same END_TURN', () => {
    const state = tradeStateFixture({ assignedResources: [] });
    const afterCreate = tradeSystem(state, {
      type: 'CREATE_TRADE_ROUTE', merchantId: 'm1', targetCityId: 'city2',
    });
    const afterTurn = tradeSystem(afterCreate, { type: 'END_TURN' });
    // p2 started at 50 gold; antiquity rate=2, 1 slot min = 2 gold to p2
    expect(afterTurn.players.get('p2')!.gold).toBe(52);
  });
});

// ── 2. trade F-10 — PLUNDER_TRADE_ROUTE loot ──

describe('trade F-10 — plunder trade route gives loot to plunderer', () => {
  it('plunderer earns 51 gold with 0 resource slots (50 base + floor(2/2))', () => {
    const state = tradeStateFixture({ assignedResources: [] });
    const afterCreate = tradeSystem(state, {
      type: 'CREATE_TRADE_ROUTE', merchantId: 'm1', targetCityId: 'city2',
    });

    const route = [...afterCreate.tradeRoutes.values()][0];
    const warrior = createTestUnit({ id: 'w1', typeId: 'warrior', owner: 'p2', position: { q: 2, r: 0 } });
    const stateWithWarrior: GameState = {
      ...afterCreate,
      currentPlayerId: 'p2',
      units: new Map([...afterCreate.units, ['w1', warrior]]),
    };

    const p2GoldBefore = stateWithWarrior.players.get('p2')!.gold;

    const afterPlunder = tradeSystem(stateWithWarrior, {
      type: 'PLUNDER_TRADE_ROUTE',
      caravanUnitId: route.caravanUnitId,
      plundererId: 'w1',
    });

    const loot = afterPlunder.players.get('p2')!.gold - p2GoldBefore;
    // 0 slots: perTurnYield = max(1,0)*2*1 = 2, loot = 50 + floor(2/2) = 51
    expect(loot).toBe(51);
  });

  it('plunderer earns 50 + floor(perTurnYield/2) with multiple resource slots', () => {
    // 3 slots, antiquity rate=2, land: perTurnYield = 3*2*1 = 6, loot = 50+3 = 53
    const state = tradeStateFixture({ assignedResources: ['iron', 'horses', 'wheat'] });
    const afterCreate = tradeSystem(state, {
      type: 'CREATE_TRADE_ROUTE', merchantId: 'm1', targetCityId: 'city2',
    });

    const route = [...afterCreate.tradeRoutes.values()][0];
    const warrior = createTestUnit({ id: 'w1', typeId: 'warrior', owner: 'p2', position: { q: 2, r: 0 } });
    const stateWithWarrior: GameState = {
      ...afterCreate,
      currentPlayerId: 'p2',
      units: new Map([...afterCreate.units, ['w1', warrior]]),
    };

    const p2GoldBefore = stateWithWarrior.players.get('p2')!.gold;
    const afterPlunder = tradeSystem(stateWithWarrior, {
      type: 'PLUNDER_TRADE_ROUTE',
      caravanUnitId: route.caravanUnitId,
      plundererId: 'w1',
    });

    const loot = afterPlunder.players.get('p2')!.gold - p2GoldBefore;
    expect(loot).toBe(53);
  });
});

// ── 3. combat F-11 — unit retreat mechanic ──

describe('combat F-11 — unit retreat mechanic (melee only)', () => {
  it('system does not throw when a melee attack is resolved', () => {
    const warrior = createTestUnit({
      id: 'atk', typeId: 'warrior', owner: 'p1',
      position: { q: 0, r: 0 }, health: 100, movementLeft: 1,
    });
    const spearman = createTestUnit({
      id: 'def', typeId: 'spearman', owner: 'p2',
      position: { q: 1, r: 0 }, health: 20, movementLeft: 0,
    });
    const state = createTestState({
      units: new Map([['atk', warrior], ['def', spearman]]),
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
    });
    expect(() => combatSystem(state, {
      type: 'ATTACK_UNIT', attackerId: 'atk', targetId: 'def',
    })).not.toThrow();
  });

  it('defender at 24 HP retreats or dies after melee attack (never stays at >24 HP at original position)', () => {
    const warrior = createTestUnit({
      id: 'atk', typeId: 'warrior', owner: 'p1',
      position: { q: 0, r: 0 }, health: 100, movementLeft: 1,
    });
    // Defender starts at 24 HP — any hit keeps it below 25, triggering retreat if alive
    const spearman = createTestUnit({
      id: 'def', typeId: 'spearman', owner: 'p2',
      position: { q: 1, r: 0 }, health: 24, movementLeft: 0,
    });
    const state = createTestState({
      units: new Map([['atk', warrior], ['def', spearman]]),
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
    });
    const next = combatSystem(state, {
      type: 'ATTACK_UNIT', attackerId: 'atk', targetId: 'def',
    });
    const defAfter = next.units.get('def');
    if (defAfter && defAfter.health < 25) {
      // Retreat must have fired — defender moved away from original position
      const stayed = defAfter.position.q === 1 && defAfter.position.r === 0;
      expect(stayed).toBe(false);
    }
    // If dead (health = 0 / deleted), no retreat check needed — test passes
  });

  it('ranged attack does NOT trigger retreat regardless of defender HP', () => {
    const archer = createTestUnit({
      id: 'arc', typeId: 'archer', owner: 'p1',
      position: { q: 0, r: 0 }, health: 100, movementLeft: 1,
    });
    const spearman = createTestUnit({
      id: 'def', typeId: 'spearman', owner: 'p2',
      position: { q: 2, r: 0 }, health: 10, movementLeft: 0,
    });
    const state = createTestState({
      units: new Map([['arc', archer], ['def', spearman]]),
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
    });
    const next = combatSystem(state, {
      type: 'ATTACK_UNIT', attackerId: 'arc', targetId: 'def',
    });
    const defAfter = next.units.get('def');
    if (defAfter) {
      // Ranged attack — defender must NOT move (retreat is melee-only)
      expect(defAfter.position).toEqual({ q: 2, r: 0 });
    }
  });
});

// ── 4. buildings F-12 — REPAIR_BUILDING action ──

describe('buildings F-12 — REPAIR_BUILDING action', () => {
  it('charges player 50 gold when repairing a building (no repairCost on def)', () => {
    const city = makeCity({
      id: 'city1', owner: 'p1', buildings: ['barracks' as BuildingId],
    });
    const state = createTestState({
      cities: new Map([['city1', city]]),
      players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 200 })]]),
    });
    const next = productionSystem(state, {
      type: 'REPAIR_BUILDING', cityId: 'city1', buildingId: 'barracks',
    });
    expect(next.players.get('p1')!.gold).toBe(150); // 200 - 50
    expect(next.lastValidation).toBeNull();
  });

  it('rejects REPAIR_BUILDING if city not found', () => {
    const state = createTestState({
      players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 200 })]]),
    });
    const next = productionSystem(state, {
      type: 'REPAIR_BUILDING', cityId: 'nonexistent', buildingId: 'barracks',
    });
    expect(next.lastValidation).not.toBeNull();
    expect(next.lastValidation!.valid).toBe(false);
  });

  it('rejects REPAIR_BUILDING if building not present in city', () => {
    const city = makeCity({ id: 'city1', owner: 'p1', buildings: [] });
    const state = createTestState({
      cities: new Map([['city1', city]]),
      players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 200 })]]),
    });
    const next = productionSystem(state, {
      type: 'REPAIR_BUILDING', cityId: 'city1', buildingId: 'barracks',
    });
    expect(next.lastValidation!.valid).toBe(false);
  });

  it('rejects REPAIR_BUILDING if player has insufficient gold', () => {
    const city = makeCity({ id: 'city1', owner: 'p1', buildings: ['barracks' as BuildingId] });
    const state = createTestState({
      cities: new Map([['city1', city]]),
      players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 10 })]]),
    });
    const next = productionSystem(state, {
      type: 'REPAIR_BUILDING', cityId: 'city1', buildingId: 'barracks',
    });
    expect(next.lastValidation!.valid).toBe(false);
  });
});

// ── 5. yields F-10 — Yield cap ──

describe('yields F-10 — YIELD_CAP_PER_CITY constant and clamp', () => {
  it('YIELD_CAP_PER_CITY is exported and equals 999', () => {
    expect(YIELD_CAP_PER_CITY).toBe(999);
  });

  it('calculateCityYields returns values no higher than YIELD_CAP_PER_CITY', () => {
    const city = makeCity({
      id: 'city1',
      owner: 'p1',
      buildings: [],
      territory: ['0,0'],
    });
    const state = createTestState({
      cities: new Map([['city1', city]]),
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
    });
    const yields = calculateCityYields(city, state);
    expect(yields.food).toBeLessThanOrEqual(YIELD_CAP_PER_CITY);
    expect(yields.production).toBeLessThanOrEqual(YIELD_CAP_PER_CITY);
    expect(yields.gold).toBeLessThanOrEqual(YIELD_CAP_PER_CITY);
    expect(yields.science).toBeLessThanOrEqual(YIELD_CAP_PER_CITY);
    expect(yields.culture).toBeLessThanOrEqual(YIELD_CAP_PER_CITY);
    expect(yields.faith).toBeLessThanOrEqual(YIELD_CAP_PER_CITY);
  });
});
