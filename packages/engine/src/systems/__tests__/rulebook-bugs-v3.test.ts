import { describe, it, expect } from 'vitest';
import { combatSystem } from '../combatSystem';
import {
  calculateSettlementCapPenalty,
  calculateCityHappiness,
} from '../resourceSystem';
import { turnSystem } from '../turnSystem';
import { calculateCityYields } from '../../state/YieldCalculator';
import {
  createTestState,
  createTestUnit,
  createTestPlayer,
} from './helpers';
import type { CityState } from '../../types/GameState';

/**
 * Regression tests for the 7 critical rulebook bugs from gap-analysis-v3.md.
 * Each test constructs a minimal state, exercises the system, and makes a concrete
 * assertion against the rulebook-correct behaviour.
 */

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'TestCity',
    owner: 'p1',
    position: { q: 0, r: 0 },
    population: 1,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [],
    settlementType: 'city',
    happiness: 0,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
    ...overrides,
  };
}

// ── B1: River penalty direction — attacker crossing, not defender ──
describe('B1: River penalty hits ATTACKER attacking from a river tile (rulebook §6.4)', () => {
  it('attacker on a river tile deals less damage than from a non-river tile', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const stateFlat = createTestState({ units, players });

    // Put river on attacker's tile
    const tiles = new Map(stateFlat.map.tiles);
    const attackerKey = '3,3';
    const t = tiles.get(attackerKey);
    if (t) tiles.set(attackerKey, { ...t, river: [0] });
    const stateRiver = { ...stateFlat, map: { ...stateFlat.map, tiles } };

    const flat = combatSystem(stateFlat, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const river = combatSystem(stateRiver, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defHPFlat = flat.units.get('d1')!.health;
    const defHPRiver = river.units.get('d1')!.health;
    // Attacker on river is penalised → defender survives with more HP
    expect(defHPRiver).toBeGreaterThan(defHPFlat);
  });

  it('defender on a river tile is NOT penalised (old bug had this inverted)', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const stateFlat = createTestState({ units, players });

    const tiles = new Map(stateFlat.map.tiles);
    const defKey = '4,3';
    const t = tiles.get(defKey);
    if (t) tiles.set(defKey, { ...t, river: [0] });
    const stateDefRiver = { ...stateFlat, map: { ...stateFlat.map, tiles } };

    const flat = combatSystem(stateFlat, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const defRiver = combatSystem(stateDefRiver, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defHPFlat = flat.units.get('d1')!.health;
    const defHPRiverDef = defRiver.units.get('d1')!.health;
    // Defender on river should NOT take extra damage → HP at least equal
    expect(defHPRiverDef).toBeGreaterThanOrEqual(defHPFlat);
  });
});

// ── B2: Specialist happiness cost = -2 per specialist ──
describe('B2: Specialists cost -2 happiness each (rulebook §2.2/3.3)', () => {
  it('3 specialists reduce happiness by exactly 6 compared to 0 specialists', () => {
    const baseCity = makeCity({ specialists: 0 });
    const specCity = makeCity({ specialists: 3 });
    const state = createTestState({
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
    });

    const h0 = calculateCityHappiness(baseCity, state);
    const h3 = calculateCityHappiness(specCity, state);

    expect(h0 - h3).toBe(6); // 3 specialists × -2 = -6
  });
});

// ── B3: Specialist food cost = -2 food per specialist ──
describe('B3: Specialists cost -2 food each (rulebook §3.3)', () => {
  it('2 specialists reduce food yield by exactly 4', () => {
    const baseCity = makeCity({ specialists: 0 });
    const specCity = makeCity({ specialists: 2 });
    const state = createTestState({
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
    });

    const y0 = calculateCityYields(baseCity, state);
    const y2 = calculateCityYields(specCity, state);

    expect(y0.food - y2.food).toBe(4); // 2 specialists × -2 = -4 food
  });
});

// ── B4: Enemy-territory healing = 5 HP (rulebook §6.9) ──
describe('B4: Unit in enemy territory heals only 5 HP per turn (rulebook §6.9)', () => {
  it('wounded unit in enemy territory at war heals exactly 5 HP', () => {
    // p1 is current player; p2 owns a city whose territory includes the unit's tile; they are at war.
    const unitPos = { q: 5, r: 5 };
    const enemyCity: CityState = makeCity({
      id: 'ec', name: 'EnemyCity', owner: 'p2', position: { q: 6, r: 5 },
      territory: ['5,5'],
    });
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', position: unitPos, movementLeft: 2, health: 50 })],
    ]);
    const diplomacy = {
      relations: new Map([
        ['p1:p2', {
          status: 'war' as const,
          relationship: -50,
          warSupport: 0,
          turnsAtPeace: 0,
          turnsAtWar: 1,
          hasAlliance: false,
          hasFriendship: false,
          hasDenounced: false,
          warDeclarer: 'p1',
          isSurpriseWar: false,
          activeEndeavors: [],
          activeSanctions: [],
        }],
      ]),
    };
    const state = createTestState({
      phase: 'start',
      units,
      cities: new Map([['ec', enemyCity]]),
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
      diplomacy,
    });

    const next = turnSystem(state, { type: 'START_TURN' });
    const healed = next.units.get('u1')!;
    expect(healed.health).toBe(55); // 50 + 5 = 55 (not 60, which would be neutral-territory rate)
  });

  it('wounded unit in neutral territory heals 10 HP (control)', () => {
    const unitPos = { q: 5, r: 5 };
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', position: unitPos, movementLeft: 2, health: 50 })],
    ]);
    const state = createTestState({
      phase: 'start',
      units,
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
    });

    const next = turnSystem(state, { type: 'START_TURN' });
    const healed = next.units.get('u1')!;
    expect(healed.health).toBe(60); // 50 + 10 = 60
  });
});

// ── B5: Settlement cap penalty applies per-settlement, capped at 7 excess ──
describe('B5: Settlement cap penalty is per-settlement and capped at 7 excess (rulebook §2.2, gap S9)', () => {
  it('5 cities (1 over cap of 4) returns per-settlement penalty of 5', () => {
    const cities = new Map([
      ['c1', makeCity({ id: 'c1', owner: 'p1' })],
      ['c2', makeCity({ id: 'c2', owner: 'p1' })],
      ['c3', makeCity({ id: 'c3', owner: 'p1' })],
      ['c4', makeCity({ id: 'c4', owner: 'p1' })],
      ['c5', makeCity({ id: 'c5', owner: 'p1' })],
    ]);
    const state = createTestState({
      cities,
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
    });
    expect(calculateSettlementCapPenalty(state, 'p1')).toBe(5);
  });

  it('12 cities (8 over cap) returns per-settlement penalty of 35 (excess capped at 7)', () => {
    const cities = new Map<string, CityState>();
    for (let i = 1; i <= 12; i++) {
      cities.set(`c${i}`, makeCity({ id: `c${i}`, owner: 'p1' }));
    }
    const state = createTestState({
      cities,
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
    });
    // cap = 4, count = 12, excess = min(7, 8) = 7; penalty = 7 * 5 = 35
    expect(calculateSettlementCapPenalty(state, 'p1')).toBe(35);
  });
});

// ── B6: Fortification is flat +5 CS additive (rulebook §6.5) ──
describe('B6: Fortification grants flat +5 CS (rulebook §6.5)', () => {
  it('fortified defender takes less damage than non-fortified defender, all else equal', () => {
    const makeState = (fortified: boolean) => createTestState({
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100, fortified })],
      ]),
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
    });

    const unfortified = combatSystem(makeState(false), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const fortified = combatSystem(makeState(true), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defHPUnfort = unfortified.units.get('d1')!.health;
    const defHPFort = fortified.units.get('d1')!.health;
    // Fortified defender takes less damage (survives with more HP)
    expect(defHPFort).toBeGreaterThan(defHPUnfort);
  });
});

// ── HP degradation: VII multiplicative formula (W4-03) ──
// Replaced old discrete bracket model with computeEffectiveCS: floor(baseCS * hp/100).
// The continuous multiplicative model means every HP point matters, not just each 10 HP.
describe('HP degradation: VII multiplicative formula (W4-03 — replaces discrete B7 brackets)', () => {
  it('attacker at 50 HP deals less damage than attacker at 90 HP (continuous scaling)', () => {
    const makeState = (attackerHP: number) => createTestState({
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: attackerHP })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
      ]),
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
    });
    const r90 = combatSystem(makeState(90), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const r50 = combatSystem(makeState(50), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const d90 = r90.units.get('d1')!.health;
    const d50 = r50.units.get('d1')!.health;
    // Lower HP → lower effectiveCS → less damage → defender has more HP remaining
    expect(d50).toBeGreaterThan(d90);
  });
});
