import { describe, it, expect } from 'vitest';
import { computePlayerHappiness, applyHappinessAccumulator, calculateCityHappiness } from '../HappinessUtils';
import { createTestState, createTestPlayer } from '../../systems/__tests__/helpers';
import type { CityState } from '../../types/GameState';
import type { BuildingDef } from '../../types/Building';
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

describe('X3.2: computePlayerHappiness — YieldSet.happiness from cities', () => {
  it('accumulates +5 happiness when buildings in a single city provide +5 total happiness yield', () => {
    // Bath (+2) + Aqueduct (+3) = +5 happiness yield
    const bath: BuildingDef = {
      id: 'bath', name: 'Bath', age: 'antiquity', cost: 90, maintenance: 1,
      yields: { happiness: 2 },
      effects: [], requiredTech: 'construction', category: 'happiness', happinessCost: 0,
    };
    const aqueduct: BuildingDef = {
      id: 'aqueduct', name: 'Aqueduct', age: 'antiquity', cost: 75, maintenance: 0,
      yields: { happiness: 3 },
      effects: [], requiredTech: 'construction', category: 'food', happinessCost: 0,
    };

    const state = createTestState();
    const buildings = new Map(state.config.buildings);
    buildings.set('bath', bath);
    buildings.set('aqueduct', aqueduct);
    const config = { ...state.config, buildings };
    const city = makeCity({ buildings: ['bath', 'aqueduct'] });
    const testState = {
      ...state, config,
      cities: new Map([['c1', city]]),
    };

    const happiness = computePlayerHappiness(testState, 'p1');
    expect(happiness).toBe(5);
  });

  it('accumulates globalHappiness over 3 turns to reach +15 when delta is +5/turn', () => {
    // This test simulates applyHappinessAccumulator called 3 times with delta=5
    const player = createTestPlayer({ globalHappiness: 0 });

    const afterTurn1 = applyHappinessAccumulator(player, 5);
    expect(afterTurn1.globalHappiness).toBe(5);

    const afterTurn2 = applyHappinessAccumulator(afterTurn1, 5);
    expect(afterTurn2.globalHappiness).toBe(10);

    const afterTurn3 = applyHappinessAccumulator(afterTurn2, 5);
    expect(afterTurn3.globalHappiness).toBe(15);
  });
});

describe('X3.2: applyHappinessAccumulator — immutable PlayerState update', () => {
  it('does not accumulate negative happiness deltas (only positive contributes)', () => {
    const player = createTestPlayer({ globalHappiness: 10 });
    const updated = applyHappinessAccumulator(player, -3);
    // Negative delta is ignored; globalHappiness stays at 10
    expect(updated.globalHappiness).toBe(10);
  });

  it('does not mutate the input PlayerState', () => {
    const player = createTestPlayer({ globalHappiness: 20 });
    const updated = applyHappinessAccumulator(player, 5);
    // Original unchanged
    expect(player.globalHappiness).toBe(20);
    // New state updated
    expect(updated.globalHappiness).toBe(25);
    expect(updated).not.toBe(player);
  });
});

describe('BB1.4: calculateCityHappiness — happinessCost deduction (S8 gap)', () => {
  /** Minimal BuildingDef with a specific happinessCost */
  function makeBuildingDef(id: string, happinessCost: number): BuildingDef {
    return {
      id, name: id, age: 'antiquity', cost: 50, maintenance: 1,
      yields: {},
      effects: [], requiredTech: null, category: 'military', happinessCost,
    };
  }

  it('city with 2 buildings totaling happinessCost=3 → happiness is reduced by 3', () => {
    // building A: happinessCost=1, building B: happinessCost=2 → total=3
    const buildingA = makeBuildingDef('barracks', 1);
    const buildingB = makeBuildingDef('stable', 2);

    const state = createTestState();
    const buildings = new Map(state.config.buildings);
    buildings.set('barracks', buildingA);
    buildings.set('stable', buildingB);
    const config = { ...state.config, buildings };

    const city = makeCity({ buildings: ['barracks', 'stable'] });

    // Baseline: same city with no buildings (no cost, no positive-yield bonus)
    const baseCity = makeCity({ buildings: [] });

    const testState = { ...state, config };

    const baseHappiness = calculateCityHappiness(baseCity, testState);
    const costHappiness = calculateCityHappiness(city, testState);

    // buildings have no positive yields, so buildingBonus=0 for both.
    // Only cost differs: costHappiness should be 3 less than base.
    expect(costHappiness).toBe(baseHappiness - 3);
  });

  it('city with buildings having happinessCost=0 → happiness is unchanged vs baseline', () => {
    const zeroBuilding = makeBuildingDef('granary', 0);

    const state = createTestState();
    const buildings = new Map(state.config.buildings);
    buildings.set('granary', zeroBuilding);
    const config = { ...state.config, buildings };

    const city = makeCity({ buildings: ['granary'] });
    const baseCity = makeCity({ buildings: [] });

    const testState = { ...state, config };

    const baseHappiness = calculateCityHappiness(baseCity, testState);
    const withBuilding = calculateCityHappiness(city, testState);

    // zeroBuilding has no positive yields (buildingBonus=0) and happinessCost=0 → no change
    expect(withBuilding).toBe(baseHappiness);
  });
});
