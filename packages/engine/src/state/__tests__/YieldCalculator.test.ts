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

describe('B3: specialist yields (food cost moved to growthSystem F-02)', () => {
  it('city with no specialists has no specialist bonus', () => {
    const state = createTestState();
    const city = makeCity({ specialists: 0 });
    const yields = calculateCityYields(city, state);
    expect(yields.food).toBeGreaterThan(0);
  });

  it('specialists do NOT deduct food from yields (cost moved to growthSystem)', () => {
    const state = createTestState();
    const cityNoSpec = makeCity({ specialists: 0 });
    const cityWith2Spec = makeCity({ specialists: 2 });

    const yieldsNoSpec = calculateCityYields(cityNoSpec, state);
    const yields2Spec = calculateCityYields(cityWith2Spec, state);

    // Food cost is handled in growthSystem.foodConsumed, not here
    expect(yieldsNoSpec.food).toBe(yields2Spec.food);
  });

  it('specialists produce +2 science and +2 culture each', () => {
    const state = createTestState();
    const cityNoSpec = makeCity({ specialists: 0 });
    const cityWith2Spec = makeCity({ specialists: 2 });

    const yieldsNoSpec = calculateCityYields(cityNoSpec, state);
    const yields2Spec = calculateCityYields(cityWith2Spec, state);

    // 2 specialists: +4 science, +4 culture
    expect(yields2Spec.science - yieldsNoSpec.science).toBe(4);
    expect(yields2Spec.culture - yieldsNoSpec.culture).toBe(4);
  });
});
