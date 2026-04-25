import { describe, it, expect } from 'vitest';
import { citySystem } from '../citySystem';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';
import { createTestState, createTestPlayer, createTestUnit, setTile } from './helpers';

describe('citySystem', () => {
  describe('FOUND_CITY', () => {
    it('creates a city and removes the settler', () => {
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 3, r: 3 } })],
      ]);
      const state = createTestState({ units });
      const next = citySystem(state, {
        type: 'FOUND_CITY',
        unitId: 's1',
        name: 'Rome',
      });

      expect(next.units.has('s1')).toBe(false);
      expect(next.cities.size).toBe(1);
      const city = [...next.cities.values()][0];
      expect(city.name).toBe('Rome');
      expect(city.position).toEqual({ q: 3, r: 3 });
      expect(city.population).toBe(1);
      expect(city.owner).toBe('p1');
      // First city is always a City (capital)
      expect(city.settlementType).toBe('city');
      expect(city.isCapital).toBe(true);
      expect(city.happiness).toBe(10); // capital +5 Palace −5 no fresh water (U2)
      expect(city.buildings).toContain('palace');
    });

    it('grants territory of radius 1', () => {
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 3, r: 3 } })],
      ]);
      const state = createTestState({ units });
      const next = citySystem(state, {
        type: 'FOUND_CITY',
        unitId: 's1',
        name: 'Rome',
      });

      const city = [...next.cities.values()][0];
      expect(city.territory.length).toBeGreaterThanOrEqual(4); // center + some neighbors
    });

    it('rejects founding on water', () => {
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 3, r: 3 } })],
      ]);
      const state = createTestState({ units });
      const tiles = new Map(state.map.tiles);
      setTile(tiles, { q: 3, r: 3 }, 'ocean');
      const next = citySystem(
        { ...state, map: { ...state.map, tiles } },
        { type: 'FOUND_CITY', unitId: 's1', name: 'Atlantis' },
      );
      expect(next.cities.size).toBe(0);
      expect(next.units.has('s1')).toBe(true);
    });

    it('rejects founding on mountains', () => {
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 3, r: 3 } })],
      ]);
      const state = createTestState({ units });
      const tiles = new Map(state.map.tiles);
      setTile(tiles, { q: 3, r: 3 }, 'plains', 'mountains');
      const next = citySystem(
        { ...state, map: { ...state.map, tiles } },
        { type: 'FOUND_CITY', unitId: 's1', name: 'Mountain City' },
      );
      expect(next.cities.size).toBe(0);
    });

    it('rejects founding with non-settler unit', () => {
      const units = new Map([
        ['w1', createTestUnit({ id: 'w1', typeId: 'warrior', position: { q: 3, r: 3 } })],
      ]);
      const state = createTestState({ units });
      const next = citySystem(state, {
        type: 'FOUND_CITY',
        unitId: 'w1',
        name: 'Warrior City',
      });
      expect(next.cities.size).toBe(0);
    });

    it('adds log entry on founding', () => {
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 3, r: 3 } })],
      ]);
      const state = createTestState({ units });
      const next = citySystem(state, {
        type: 'FOUND_CITY',
        unitId: 's1',
        name: 'Rome',
      });
      expect(next.log.length).toBe(1);
      expect(next.log[0].type).toBe('city');
      expect(next.log[0].message).toContain('Rome');
    });

    it('rejects founding too close to another city (hex distance < 4)', () => {
      // Place existing city at (3,3), try to found at (5,2) — hex distance is 2, too close
      const existingCity: CityState = {
        id: 'c1',
        name: 'Rome',
        owner: 'p1',
        position: { q: 3, r: 3 },
        population: 1,
        food: 0,
        productionQueue: [],
        productionProgress: 0,
        buildings: [],
        territory: ['3,3'],
        settlementType: 'city',
        happiness: 10,
        isCapital: true,
        defenseHP: 100,
        specialization: null,
        specialists: 0,
        districts: [],
      };
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 5, r: 2 } })],
      ]);
      const cities = new Map([['c1', existingCity]]);
      const state = createTestState({ units, cities });
      const next = citySystem(state, {
        type: 'FOUND_CITY',
        unitId: 's1',
        name: 'Carthage',
      });

      expect(next.cities.size).toBe(1); // no new city
      expect(next.units.has('s1')).toBe(true); // settler not consumed
    });

    it('rejects founding at hex distance 3 (need at least 4)', () => {
      // Place existing city at (3,3), try to found at (6,3) — hex distance is 3, still too close
      const existingCity: CityState = {
        id: 'c1',
        name: 'Rome',
        owner: 'p1',
        position: { q: 3, r: 3 },
        population: 1,
        food: 0,
        productionQueue: [],
        productionProgress: 0,
        buildings: [],
        territory: ['3,3'],
        settlementType: 'city',
        happiness: 10,
        isCapital: true,
        defenseHP: 100,
        specialization: null,
        specialists: 0,
        districts: [],
      };
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 6, r: 3 } })],
      ]);
      const cities = new Map([['c1', existingCity]]);
      const state = createTestState({ units, cities });
      const next = citySystem(state, {
        type: 'FOUND_CITY',
        unitId: 's1',
        name: 'Carthage',
      });

      expect(next.cities.size).toBe(1); // no new city
      expect(next.units.has('s1')).toBe(true); // settler not consumed
    });

    it('allows founding at hex distance 4 or more', () => {
      // Place existing city at (3,3), try to found at (7,3) — hex distance is 4, allowed
      const existingCity: CityState = {
        id: 'c1',
        name: 'Rome',
        owner: 'p1',
        position: { q: 3, r: 3 },
        population: 1,
        food: 0,
        productionQueue: [],
        productionProgress: 0,
        buildings: [],
        territory: ['3,3'],
        settlementType: 'city',
        happiness: 10,
        isCapital: true,
        defenseHP: 100,
        specialization: null,
        specialists: 0,
        districts: [],
      };
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 7, r: 3 } })],
      ]);
      const cities = new Map([['c1', existingCity]]);
      const state = createTestState({ units, cities });
      const next = citySystem(state, {
        type: 'FOUND_CITY',
        unitId: 's1',
        name: 'Carthage',
      });

      expect(next.cities.size).toBe(2); // new city added
      expect(next.units.has('s1')).toBe(false); // settler consumed
      const newCity = [...next.cities.values()].find(c => c.name === 'Carthage');
      expect(newCity).toBeDefined();
      expect(newCity!.position).toEqual({ q: 7, r: 3 });
    });

    it('uses hex distance not Manhattan distance for proximity check', () => {
      // (3,3) to (4,1): Manhattan |dq|+|dr| = 1+2 = 3 (would be "ok" with old threshold of 3)
      // But hex distance = max(|1|, |-2|, |1|) = 2, so it's too close
      const existingCity: CityState = {
        id: 'c1',
        name: 'Rome',
        owner: 'p1',
        position: { q: 3, r: 3 },
        population: 1,
        food: 0,
        productionQueue: [],
        productionProgress: 0,
        buildings: [],
        territory: ['3,3'],
        settlementType: 'city',
        happiness: 10,
        isCapital: true,
        defenseHP: 100,
        specialization: null,
        specialists: 0,
        districts: [],
      };
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 4, r: 1 } })],
      ]);
      const cities = new Map([['c1', existingCity]]);
      const state = createTestState({ units, cities });
      const next = citySystem(state, {
        type: 'FOUND_CITY',
        unitId: 's1',
        name: 'Carthage',
      });

      expect(next.cities.size).toBe(1); // rejected — hex distance is 2
      expect(next.units.has('s1')).toBe(true);
    });

    it('auto-places Palace at city center without entering placement mode', () => {
      // Bug regression: Palace is auto-built when a capital is founded, so it
      // must also be auto-placed on the city-center tile. Otherwise the CityPanel
      // lists Palace as "NEEDS PLACEMENT" and launches enterPlacementMode on
      // click — which is wrong for an auto-built capital building.
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 3, r: 3 } })],
      ]);
      const state = createTestState({ units });
      const next = citySystem(state, {
        type: 'FOUND_CITY',
        unitId: 's1',
        name: 'Rome',
      });

      const city = [...next.cities.values()][0];
      // 1. Palace is in city.buildings (auto-built in capital)
      expect(city.buildings).toContain('palace');
      // 2. No production-queue entry for palace — it was never queued
      expect(city.productionQueue.find(p => p.id === 'palace')).toBeUndefined();
      // 3. The city-center tile carries building: 'palace' so the UI treats
      //    it as already placed (no "NEEDS PLACEMENT" flag, no placement mode)
      const centerKey = coordToKey({ q: 3, r: 3 });
      const centerTile = next.map.tiles.get(centerKey);
      expect(centerTile?.building).toBe('palace');
    });

    it('does not auto-place Palace for non-capital (town) founding', () => {
      const existingCity: CityState = {
        id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
        population: 1, food: 0, productionQueue: [], productionProgress: 0,
        buildings: ['palace'], territory: ['3,3'],
        settlementType: 'city', happiness: 15, isCapital: true, defenseHP: 100,
        specialization: null, specialists: 0, districts: [],
      };
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 7, r: 3 } })],
      ]);
      const cities = new Map([['c1', existingCity]]);
      const state = createTestState({ units, cities });
      const next = citySystem(state, {
        type: 'FOUND_CITY',
        unitId: 's1',
        name: 'Carthage',
      });

      const newCity = [...next.cities.values()].find(c => c.name === 'Carthage');
      expect(newCity).toBeDefined();
      expect(newCity!.buildings).not.toContain('palace');
      const centerKey = coordToKey({ q: 7, r: 3 });
      const centerTile = next.map.tiles.get(centerKey);
      expect(centerTile?.building ?? null).toBeNull();
    });

    it('second city founded is a Town (not capital)', () => {
      const existingCity: CityState = {
        id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
        population: 1, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: ['3,3'],
        settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
        specialization: null, specialists: 0, districts: [],
      };
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 7, r: 3 } })],
      ]);
      const cities = new Map([['c1', existingCity]]);
      const state = createTestState({ units, cities });
      const next = citySystem(state, {
        type: 'FOUND_CITY',
        unitId: 's1',
        name: 'Carthage',
      });

      const newCity = [...next.cities.values()].find(c => c.name === 'Carthage');
      expect(newCity).toBeDefined();
      expect(newCity!.settlementType).toBe('town');
      expect(newCity!.isCapital).toBe(false);
      expect(newCity!.happiness).toBe(0); // town base 5 −5 no fresh water (U2)
    });
  });

  describe('UPGRADE_SETTLEMENT', () => {
    it('upgrades a town to a city for dynamic cost (200 base, no existing cities, pop 1)', () => {
      // Dynamic cost = max(200, min(1000, 200 + cityCount*100 - pop*20))
      // With 0 existing cities and pop=1: max(200, 200 + 0 - 20) = max(200, 180) = 200
      const town: CityState = {
        id: 'c1', name: 'Outpost', owner: 'p1', position: { q: 3, r: 3 },
        population: 1, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: ['3,3'],
        settlementType: 'town', happiness: 5, isCapital: false, defenseHP: 100,
        specialization: null, specialists: 0, districts: [],
      };
      const state = createTestState({
        cities: new Map([['c1', town]]),
        players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 200 })]]),
      });
      const next = citySystem(state, { type: 'UPGRADE_SETTLEMENT', cityId: 'c1' });
      expect(next.cities.get('c1')!.settlementType).toBe('city');
      expect(next.cities.get('c1')!.happiness).toBe(10);
      expect(next.players.get('p1')!.gold).toBe(0); // 200 - 200
    });

    it('rejects upgrade if not enough gold', () => {
      const town: CityState = {
        id: 'c1', name: 'Outpost', owner: 'p1', position: { q: 3, r: 3 },
        population: 1, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: ['3,3'],
        settlementType: 'town', happiness: 5, isCapital: false, defenseHP: 100,
        specialization: null, specialists: 0, districts: [],
      };
      const state = createTestState({
        cities: new Map([['c1', town]]),
        players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 50 })]]),
      });
      const next = citySystem(state, { type: 'UPGRADE_SETTLEMENT', cityId: 'c1' });
      expect(next.cities.get('c1')!.settlementType).toBe('town'); // unchanged
    });

    it('rejects upgrade if already a city', () => {
      const city: CityState = {
        id: 'c1', name: 'Capital', owner: 'p1', position: { q: 3, r: 3 },
        population: 1, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: ['3,3'],
        settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
        specialization: null, specialists: 0, districts: [],
      };
      const state = createTestState({
        cities: new Map([['c1', city]]),
      });
      const next = citySystem(state, { type: 'UPGRADE_SETTLEMENT', cityId: 'c1' });
      expect(next).toBe(state);
    });
  });

  it('ignores non-city actions', () => {
    const state = createTestState();
    const next = citySystem(state, { type: 'END_TURN' });
    expect(next).toBe(state);
  });
});

describe('W2-02 settlement VII-parity', () => {
  it('F-03: conversion cost scales with cityCount (3 cities = cost 500)', () => {
    // 3 existing cities + 1 town being upgraded: cost = 200 + 3*100 - 1*20 = 480, clamped [200,1000] = 480
    const town: CityState = {
      id: 't1', name: 'Town', owner: 'p1', position: { q: 20, r: 0 },
      population: 1, food: 0, productionQueue: [], productionProgress: 0,
      buildings: [], territory: [], settlementType: 'town', happiness: 5,
      isCapital: false, defenseHP: 100, specialization: null, specialists: 0, districts: [],
    };
    const city1: CityState = {
      id: 'c1', name: 'City1', owner: 'p1', position: { q: 0, r: 0 },
      population: 3, food: 0, productionQueue: [], productionProgress: 0,
      buildings: [], territory: [], settlementType: 'city', happiness: 10,
      isCapital: true, defenseHP: 100, specialization: null, specialists: 0, districts: [],
    };
    const city2: CityState = { ...city1, id: 'c2', name: 'City2', position: { q: 6, r: 0 }, isCapital: false };
    const city3: CityState = { ...city1, id: 'c3', name: 'City3', position: { q: 12, r: 0 }, isCapital: false };
    // cost = 200 + 3*100 - 1*20 = 480
    const state = createTestState({
      cities: new Map([['t1', town], ['c1', city1], ['c2', city2], ['c3', city3]]),
      players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 480 })]]),
    });
    const next = citySystem(state, { type: 'UPGRADE_SETTLEMENT', cityId: 't1' });
    expect(next.cities.get('t1')!.settlementType).toBe('city');
    expect(next.players.get('p1')!.gold).toBe(0); // 480 - 480
  });

  it('F-03: conversion cost scales inversely with town pop (high pop = lower cost, floor 200)', () => {
    // pop=7, 0 cities: cost = max(200, 200 + 0 - 7*20) = max(200, 60) = 200
    const town: CityState = {
      id: 't1', name: 'BigTown', owner: 'p1', position: { q: 0, r: 0 },
      population: 7, food: 0, productionQueue: [], productionProgress: 0,
      buildings: [], territory: [], settlementType: 'town', happiness: 5,
      isCapital: false, defenseHP: 100, specialization: null, specialists: 0, districts: [],
    };
    const state = createTestState({
      cities: new Map([['t1', town]]),
      players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 200 })]]),
    });
    const next = citySystem(state, { type: 'UPGRADE_SETTLEMENT', cityId: 't1' });
    expect(next.cities.get('t1')!.settlementType).toBe('city');
    expect(next.players.get('p1')!.gold).toBe(0); // cost floored at 200
  });

  it('F-03: conversion cost capped at 1000 (many cities)', () => {
    // 9 cities: cost = 200 + 9*100 - 1*20 = 1080, clamped to 1000
    const makeCityEntry = (id: string, pos: { q: number; r: number }): CityState => ({
      id, name: id, owner: 'p1', position: pos,
      population: 3, food: 0, productionQueue: [], productionProgress: 0,
      buildings: [], territory: [], settlementType: 'city', happiness: 10,
      isCapital: id === 'c1', defenseHP: 100, specialization: null, specialists: 0, districts: [],
    });
    const town: CityState = {
      id: 't1', name: 'Town', owner: 'p1', position: { q: 60, r: 0 },
      population: 1, food: 0, productionQueue: [], productionProgress: 0,
      buildings: [], territory: [], settlementType: 'town', happiness: 5,
      isCapital: false, defenseHP: 100, specialization: null, specialists: 0, districts: [],
    };
    const cities = new Map<string, CityState>();
    for (let i = 1; i <= 9; i++) {
      const c = makeCityEntry(`c${i}`, { q: (i - 1) * 6, r: 0 });
      cities.set(`c${i}`, c);
    }
    cities.set('t1', town);
    const state = createTestState({
      cities,
      players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 1000 })]]),
    });
    const next = citySystem(state, { type: 'UPGRADE_SETTLEMENT', cityId: 't1' });
    expect(next.cities.get('t1')!.settlementType).toBe('city');
    expect(next.players.get('p1')!.gold).toBe(0); // 1000 - 1000
  });

  it('F-01: explicit foundingType=founder creates capital (city)', () => {
    const settler = createTestUnit({ id: 'u1', typeId: 'settler', position: { q: 0, r: 0 } });
    const state = createTestState({
      units: new Map([['u1', settler]]),
    });
    const next = citySystem(state, { type: 'FOUND_CITY', unitId: 'u1', name: 'Rome', foundingType: 'founder' });
    expect(next.cities.size).toBe(1);
    const city = [...next.cities.values()][0];
    expect(city.settlementType).toBe('city');
    expect(city.isCapital).toBe(true);
  });

  it('F-01: explicit foundingType=settler creates town even as first city', () => {
    const settler = createTestUnit({ id: 'u1', typeId: 'settler', position: { q: 0, r: 0 } });
    const state = createTestState({
      units: new Map([['u1', settler]]),
    });
    const next = citySystem(state, { type: 'FOUND_CITY', unitId: 'u1', name: 'Outpost', foundingType: 'settler' });
    expect(next.cities.size).toBe(1);
    const city = [...next.cities.values()][0];
    expect(city.settlementType).toBe('town');
    expect(city.isCapital).toBe(false);
  });

  describe('AA1.2: foundedBy + wasConquered provenance', () => {
    it('FOUND_CITY sets foundedBy to the founding player and wasConquered to false', () => {
      const settler = createTestUnit({ id: 's1', typeId: 'settler', position: { q: 3, r: 3 } });
      const state = createTestState({ units: new Map([['s1', settler]]) });
      const next = citySystem(state, { type: 'FOUND_CITY', unitId: 's1', name: 'Roma' });
      const city = [...next.cities.values()][0];
      expect(city.foundedBy).toBe('p1');
      expect(city.wasConquered).toBe(false);
    });
  });

  describe('DD1.2: TRANSITION_AGE downgrades non-capital cities to town', () => {
    const makeCity = (id: string, overrides: Partial<CityState> = {}): CityState => ({
      id,
      name: `City ${id}`,
      owner: 'p1',
      position: { q: 0, r: 0 },
      population: 3,
      food: 0,
      productionQueue: [],
      productionProgress: 0,
      buildings: [],
      territory: [],
      settlementType: 'city' as const,
      happiness: 10,
      isCapital: false,
      defenseHP: 100,
      specialization: null,
      specialists: 0,
      districts: [],
      ...overrides,
    });

    it('TRANSITION_AGE downgrades non-capital city to town', () => {
      const nonCapital = makeCity('nc1', { isCapital: false, settlementType: 'city' });
      const state = createTestState({ cities: new Map([['nc1', nonCapital]]) });
      const next = citySystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      const city = next.cities.get('nc1')!;
      expect(city.settlementType).toBe('town');
      expect(city.isTown).toBe(true);
    });

    it('TRANSITION_AGE preserves capital as city', () => {
      const capital = makeCity('cap', { isCapital: true, settlementType: 'city' });
      const state = createTestState({ cities: new Map([['cap', capital]]) });
      const next = citySystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      const city = next.cities.get('cap')!;
      expect(city.settlementType).toBe('city');
      expect(city.isTown).toBeFalsy();
    });

    it('TRANSITION_AGE does not affect cities owned by other players', () => {
      const otherCity = makeCity('other', { owner: 'p2', isCapital: false, settlementType: 'city' });
      const state = createTestState({
        cities: new Map([['other', otherCity]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1' })],
          ['p2', createTestPlayer({ id: 'p2' })],
        ]),
      });
      const next = citySystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
      // p2's city is unchanged by p1's transition
      expect(next.cities.get('other')!.settlementType).toBe('city');
      // No change means state identity is preserved (no towns to downgrade for p1)
      expect(next).toBe(state);
    });
  });
});
