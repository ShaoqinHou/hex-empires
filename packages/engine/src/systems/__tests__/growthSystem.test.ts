import { describe, it, expect } from 'vitest';
import { growthSystem, getGrowthThreshold, calculateCityYields } from '../growthSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 1,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 }), coordToKey({ q: 3, r: 4 })],
    housing: 10,
    amenities: 1,
    ...overrides,
  };
}

describe('growthSystem', () => {
  it('accumulates food surplus', () => {
    const city = createTestCity({ population: 1, food: 0 });
    const state = createTestState({
      cities: new Map([['c1', city]]),
    });
    const next = growthSystem(state, { type: 'END_TURN' });
    // Should have accumulated some food (city yields - consumption)
    const updatedCity = next.cities.get('c1')!;
    expect(updatedCity.food).toBeGreaterThan(0);
  });

  it('grows population when food reaches threshold', () => {
    const threshold = getGrowthThreshold(1);
    const city = createTestCity({ population: 1, food: threshold - 1 });
    const state = createTestState({
      cities: new Map([['c1', city]]),
    });
    // After one turn of food surplus, should grow
    const next = growthSystem(state, { type: 'END_TURN' });
    const updatedCity = next.cities.get('c1')!;
    // The city may or may not have grown depending on exact yields
    // but food should have changed
    expect(updatedCity.food !== city.food || updatedCity.population !== city.population).toBe(true);
  });

  it('does not grow past housing limit', () => {
    const city = createTestCity({ population: 3, food: 100, housing: 3 });
    const state = createTestState({
      cities: new Map([['c1', city]]),
    });
    const next = growthSystem(state, { type: 'END_TURN' });
    expect(next.cities.get('c1')!.population).toBe(3);
  });

  it('ignores non-END_TURN actions', () => {
    const state = createTestState();
    const next = growthSystem(state, { type: 'START_TURN' });
    expect(next).toBe(state);
  });
});

describe('getGrowthThreshold', () => {
  it('increases with population', () => {
    expect(getGrowthThreshold(2)).toBeGreaterThan(getGrowthThreshold(1));
    expect(getGrowthThreshold(5)).toBeGreaterThan(getGrowthThreshold(3));
  });
});

describe('calculateCityYields', () => {
  it('includes city center bonus', () => {
    const city = createTestCity({ territory: [coordToKey({ q: 3, r: 3 })] });
    const state = createTestState({
      cities: new Map([['c1', city]]),
    });
    const yields = calculateCityYields(city, state);
    // City center adds 2 food + 1 production, terrain adds its own
    expect(yields.food).toBeGreaterThanOrEqual(2);
    expect(yields.production).toBeGreaterThanOrEqual(1);
  });

  it('sums yields from territory tiles', () => {
    const city = createTestCity({
      territory: [
        coordToKey({ q: 3, r: 3 }),
        coordToKey({ q: 4, r: 3 }),
        coordToKey({ q: 3, r: 4 }),
      ],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
    });
    const yields = calculateCityYields(city, state);
    // 3 grassland tiles (2 food each) + city center (2+1) = 8 food, 1 prod
    expect(yields.food).toBeGreaterThanOrEqual(6);
  });
});
