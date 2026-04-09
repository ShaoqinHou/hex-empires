import { describe, it, expect } from 'vitest';
import { citySystem } from '../citySystem';
import type { CityState } from '../../types/GameState';
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
      expect(city.happiness).toBe(15); // capital gets +5 from Palace
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

    it('second city founded is a Town (not capital)', () => {
      const existingCity: CityState = {
        id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
        population: 1, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: ['3,3'],
        settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
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
      expect(newCity!.happiness).toBe(5);
    });
  });

  describe('UPGRADE_SETTLEMENT', () => {
    it('upgrades a town to a city for 100 gold', () => {
      const town: CityState = {
        id: 'c1', name: 'Outpost', owner: 'p1', position: { q: 3, r: 3 },
        population: 1, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: ['3,3'],
        settlementType: 'town', happiness: 5, isCapital: false, defenseHP: 100,
      };
      const state = createTestState({
        cities: new Map([['c1', town]]),
      });
      const next = citySystem(state, { type: 'UPGRADE_SETTLEMENT', cityId: 'c1' });
      expect(next.cities.get('c1')!.settlementType).toBe('city');
      expect(next.cities.get('c1')!.happiness).toBe(10);
      expect(next.players.get('p1')!.gold).toBe(0); // 100 - 100
    });

    it('rejects upgrade if not enough gold', () => {
      const town: CityState = {
        id: 'c1', name: 'Outpost', owner: 'p1', position: { q: 3, r: 3 },
        population: 1, food: 0, productionQueue: [], productionProgress: 0,
        buildings: [], territory: ['3,3'],
        settlementType: 'town', happiness: 5, isCapital: false, defenseHP: 100,
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
