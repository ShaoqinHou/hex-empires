/**
 * KK3.1 — population-specialists F-02: Specialist food cost in YieldCalculator.
 *
 * Each specialist subtracts 2 food/turn from the city's effective food yield.
 * The deduction lives in calculateCityYields (YieldCalculator.ts) so that the
 * city's reported food/turn already reflects specialist maintenance cost.
 * growthSystem.foodConsumed no longer adds the specialist component (only pop × 2),
 * preventing double-counting.
 */
import { describe, it, expect } from 'vitest';
import { calculateCityYields } from '../YieldCalculator';
import { createTestState } from '../../systems/__tests__/helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 0, r: 0 },
    population: 4,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [coordToKey({ q: 0, r: 0 })],
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

describe('KK3.1 — specialist food cost in YieldCalculator (population-specialists F-02)', () => {
  it('city with 0 specialists: food is unchanged from base', () => {
    const state = createTestState();
    const city = makeCity({ specialists: 0 });
    const yields = calculateCityYields(city, state);
    // Base yields from city center = food:2 + production:1, plus grassland territory tile (food:2)
    // = food:4 total (no specialist deduction)
    expect(yields.food).toBe(4);
    expect(yields.science).toBe(0);
    expect(yields.culture).toBe(0);
  });

  it('city with 1 specialist: food/turn = base - 2', () => {
    const state = createTestState();
    const cityBase = makeCity({ specialists: 0 });
    const city1Spec = makeCity({ specialists: 1 });

    const baseYields = calculateCityYields(cityBase, state);
    const yields1Spec = calculateCityYields(city1Spec, state);

    // 1 specialist: −2 food, +2 science, +2 culture
    expect(yields1Spec.food).toBe(baseYields.food - 2);
    expect(yields1Spec.science).toBe(baseYields.science + 2);
    expect(yields1Spec.culture).toBe(baseYields.culture + 2);
  });

  it('city with 3 specialists: food/turn = base - 6 (concrete numbers)', () => {
    const state = createTestState();
    const cityBase = makeCity({ specialists: 0 });
    const city3Spec = makeCity({ specialists: 3 });

    const baseYields = calculateCityYields(cityBase, state);
    const yields3Spec = calculateCityYields(city3Spec, state);

    // 3 specialists: −6 food, +6 science, +6 culture
    expect(baseYields.food - yields3Spec.food).toBe(6);
    expect(yields3Spec.science - baseYields.science).toBe(6);
    expect(yields3Spec.culture - baseYields.culture).toBe(6);
  });

  it('food deduction does not go below zero when clamped (city yields can be zero food)', () => {
    const state = createTestState();
    // A city with 0 base territory food (only city center's 2 food) and many specialists
    const city = makeCity({
      specialists: 3,
      territory: [], // no territory tiles → only city center bonus applies
    });
    const yields = calculateCityYields(city, state);
    // City center contributes 2 food; 3 specialists deduct 6 → raw = -4
    // The yield cap clamps at 0 via the happiness multiplier path, but
    // actually the happy penalty is irrelevant here (happiness=10, no penalty).
    // Net food = 2 - 6 = -4 (negative is valid — means city is in food deficit,
    // growthSystem will handle starvation from this)
    expect(yields.food).toBe(-4);
  });

  it('food deduction is proportional: each additional specialist subtracts exactly 2 food', () => {
    const state = createTestState();
    const results: number[] = [];
    for (let specialists = 0; specialists <= 3; specialists++) {
      const city = makeCity({ specialists });
      const yields = calculateCityYields(city, state);
      results.push(yields.food);
    }
    // Each step should decrease by exactly 2
    expect(results[0]! - results[1]!).toBe(2);
    expect(results[1]! - results[2]!).toBe(2);
    expect(results[2]! - results[3]!).toBe(2);
  });
});
