import { describe, it, expect } from 'vitest';
import { calculateCityYields } from '../YieldCalculator';
import { createTestState } from '../../systems/__tests__/helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
    population: 1, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey({ q: 3, r: 3 })],
    settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
    specialization: null, specialists: 0, districts: [],
    ...overrides,
  };
}

describe('B3: specialist food cost (-2 food per specialist)', () => {
  it('city with no specialists has no food penalty', () => {
    const state = createTestState();
    const city = makeCity({ specialists: 0 });
    const yields = calculateCityYields(city, state);
    // Grassland center: 2 food base from city center + 2 from grassland tile = 4 food
    // No penalty for 0 specialists
    expect(yields.food).toBeGreaterThan(0);
  });

  it('each specialist reduces food yield by 2', () => {
    const state = createTestState();
    const cityNoSpec = makeCity({ specialists: 0 });
    const cityWith1Spec = makeCity({ specialists: 1 });
    const cityWith2Spec = makeCity({ specialists: 2 });

    const yieldsNoSpec = calculateCityYields(cityNoSpec, state);
    const yields1Spec = calculateCityYields(cityWith1Spec, state);
    const yields2Spec = calculateCityYields(cityWith2Spec, state);

    // 1 specialist: -2 food
    expect(yieldsNoSpec.food - yields1Spec.food).toBe(2);
    // 2 specialists: -4 food
    expect(yieldsNoSpec.food - yields2Spec.food).toBe(4);
  });

  it('specialists still produce +2 science and +2 culture each', () => {
    const state = createTestState();
    const cityNoSpec = makeCity({ specialists: 0 });
    const cityWith2Spec = makeCity({ specialists: 2 });

    const yieldsNoSpec = calculateCityYields(cityNoSpec, state);
    const yields2Spec = calculateCityYields(cityWith2Spec, state);

    // 2 specialists: +4 science, +4 culture
    expect(yields2Spec.science - yieldsNoSpec.science).toBe(4);
    expect(yields2Spec.culture - yieldsNoSpec.culture).toBe(4);
    // But also -4 food
    expect(yieldsNoSpec.food - yields2Spec.food).toBe(4);
  });
});
