import { describe, it, expect } from 'vitest';
import { citySystem } from '../citySystem';
import { createTestState, createTestUnit, setTile } from './helpers';

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
  });

  it('ignores non-city actions', () => {
    const state = createTestState();
    const next = citySystem(state, { type: 'END_TURN' });
    expect(next).toBe(state);
  });
});
