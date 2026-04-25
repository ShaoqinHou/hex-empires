import { describe, it, expect } from 'vitest';
import { calculateCityYields } from '../YieldCalculator';
import { createTestState } from '../../systems/__tests__/helpers';
import type { CityState, HexTile } from '../../types/GameState';
import type { BuildingDef } from '../../types/Building';
import type { NaturalWonderDef } from '../../types/NaturalWonder';
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

describe('F-08: natural wonder tile yields', () => {
  it('natural wonder tile adds its yields to a city that includes it in territory', () => {
    const wonderId = 'aurora_borealis';
    const wonderDef: NaturalWonderDef = {
      id: wonderId,
      name: 'Aurora Borealis',
      type: 'scenic',
      tileCount: 1,
      firstSettleBonus: { type: 'GRANT_UNIT', unitId: 'scout', count: 1 },
      description: 'Shimmering lights in the sky.',
      yields: { food: 0, production: 0, gold: 0, science: 3, culture: 2, faith: 0, influence: 0, happiness: 0 },
    };

    const state = createTestState();
    // Register the wonder in config
    const naturalWonders = new Map([[wonderId, wonderDef]]);
    const config = { ...state.config, naturalWonders };

    // Place a wonder tile at the city position (3,3) which is already in territory
    const tileKey = coordToKey({ q: 3, r: 3 });
    const tiles = new Map(state.map.tiles);
    const existingTile = tiles.get(tileKey)!;
    const wonderTile: HexTile = {
      ...existingTile,
      isNaturalWonder: true,
      naturalWonderId: wonderId,
    };
    tiles.set(tileKey, wonderTile);

    const testState = { ...state, config, map: { ...state.map, tiles } };
    const city = makeCity();
    const yields = calculateCityYields(city, testState);

    // Science should include the wonder's +3
    // Base grassland tile (3,3) gives food=3; wonder adds science=3, culture=2
    expect(yields.science).toBeGreaterThanOrEqual(3);
    expect(yields.culture).toBeGreaterThanOrEqual(2);
  });

  it('tile without naturalWonderId contributes no wonder yields', () => {
    const state = createTestState();
    const city = makeCity();
    const yieldsNormal = calculateCityYields(city, state);
    // No wonder tile in the territory → science from yields only (zero from base grassland)
    expect(yieldsNormal.science).toBe(0);
  });
});

describe('X3.1: YieldSet.happiness accumulates from buildings', () => {
  it('happiness-providing building (Bath) contributes its happiness yield to calculateCityYields', () => {
    // Bath: yields: { happiness: 2 }
    const bath: BuildingDef = {
      id: 'bath', name: 'Bath', age: 'antiquity', cost: 90, maintenance: 1,
      yields: { happiness: 2 },
      effects: [], requiredTech: 'construction', category: 'happiness', happinessCost: 0,
    };
    const state = createTestState();
    const buildings = new Map(state.config.buildings);
    buildings.set('bath', bath);
    const config = { ...state.config, buildings };
    const testState = { ...state, config };

    const cityNoBath = makeCity({ buildings: [] });
    const cityWithBath = makeCity({ buildings: ['bath'] });

    const yieldsNoBath = calculateCityYields(cityNoBath, testState);
    const yieldsWithBath = calculateCityYields(cityWithBath, testState);

    // Bath adds +2 happiness
    expect(yieldsWithBath.happiness - yieldsNoBath.happiness).toBe(2);
  });

  it('multiple happiness-providing buildings accumulate in YieldSet.happiness', () => {
    // Bath (+2), Aqueduct (+3), Hanging Gardens (+2) = +7 total
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
    const hangingGardens: BuildingDef = {
      id: 'hanging_gardens', name: 'Hanging Gardens', age: 'antiquity', cost: 350, maintenance: 0,
      yields: { food: 8, happiness: 2 },
      effects: [], requiredTech: 'irrigation', category: 'wonder', happinessCost: 0,
      isWonder: true, isAgeless: true,
    };

    const state = createTestState();
    const buildings = new Map(state.config.buildings);
    buildings.set('bath', bath);
    buildings.set('aqueduct', aqueduct);
    buildings.set('hanging_gardens', hangingGardens);
    const config = { ...state.config, buildings };
    const testState = { ...state, config };

    const cityWithAll = makeCity({ buildings: ['bath', 'aqueduct', 'hanging_gardens'] });
    const yieldsWithAll = calculateCityYields(cityWithAll, testState);

    // Bath +2, Aqueduct +3, Hanging Gardens +2 = 7 total happiness yield
    expect(yieldsWithAll.happiness).toBe(7);
  });
});
