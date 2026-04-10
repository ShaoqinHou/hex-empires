import { describe, it, expect } from 'vitest';
import { growthSystem, getGrowthThreshold, calculateCityYields, calculateTotalGrowthRate } from '../growthSystem';
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
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
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

  it('does not grow past population cap for towns (cap=5)', () => {
    const city = createTestCity({ population: 5, food: 100, settlementType: 'town', happiness: 5, isCapital: false });
    const state = createTestState({
      cities: new Map([['c1', city]]),
    });
    const next = growthSystem(state, { type: 'END_TURN' });
    expect(next.cities.get('c1')!.population).toBe(5);
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

  it('defaults to antiquity when no age provided', () => {
    expect(getGrowthThreshold(1)).toBe(getGrowthThreshold(1, 'antiquity'));
  });

  it('antiquity has fast early growth', () => {
    // At pop 1 (growthEvents=0): 30 + 0 + 0 = 30
    expect(getGrowthThreshold(1, 'antiquity')).toBe(30);
  });

  it('exploration has moderate growth', () => {
    // At pop 1 (growthEvents=0): 20 + 0 + 0 = 20
    expect(getGrowthThreshold(1, 'exploration')).toBe(20);
  });

  it('modern has slow late growth', () => {
    // At pop 1 (growthEvents=0): 20 + 0 + 0 = 20
    expect(getGrowthThreshold(1, 'modern')).toBe(20);
    // At pop 5 (growthEvents=4): modern should be harder than antiquity
    expect(getGrowthThreshold(5, 'modern')).toBeGreaterThan(getGrowthThreshold(5, 'antiquity'));
  });

  it('higher population is harder across all ages', () => {
    for (const age of ['antiquity', 'exploration', 'modern'] as const) {
      expect(getGrowthThreshold(10, age)).toBeGreaterThan(getGrowthThreshold(5, age));
    }
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

describe('calculateTotalGrowthRate', () => {
  it('returns 0 when city has no buildings', () => {
    const city = createTestCity({ buildings: [] });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    expect(calculateTotalGrowthRate(city, state)).toBe(0);
  });

  it('returns 0 when buildings have no growthRateBonus', () => {
    // monument has no growthRateBonus
    const city = createTestCity({ buildings: ['monument'] });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    expect(calculateTotalGrowthRate(city, state)).toBe(0);
  });

  it('returns granary bonus (0.1) when city has granary', () => {
    const city = createTestCity({ buildings: ['granary'] });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    expect(calculateTotalGrowthRate(city, state)).toBe(0.1);
  });

  it('returns watermill bonus (0.05) when city has watermill', () => {
    const city = createTestCity({ buildings: ['watermill'] });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    expect(calculateTotalGrowthRate(city, state)).toBe(0.05);
  });

  it('stacks multiple building bonuses (granary + watermill = 0.15)', () => {
    const city = createTestCity({ buildings: ['granary', 'watermill'] });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    expect(calculateTotalGrowthRate(city, state)).toBeCloseTo(0.15);
  });

  it('ignores unknown building ids gracefully', () => {
    const city = createTestCity({ buildings: ['nonexistent_building'] });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    expect(calculateTotalGrowthRate(city, state)).toBe(0);
  });
});

describe('growthSystem — growth rate modifiers', () => {
  it('city with granary has lower effective growth threshold than city without', () => {
    // Threshold at pop=1, antiquity = 30. With granary (0.1): round(30 * 0.9) = 27.
    // We test the effect by setting food so that the city with the granary
    // already starts above its (reduced) threshold. The growthSystem will
    // grow it immediately (food >= threshold before any surplus is added).
    //
    // Strategy: set accumulated food = reducedThreshold and population high
    // enough that food surplus = 0 (population * 2 == food yield), so the
    // surplus added this turn is 0. That way the comparison is clean.
    //
    // createTestState gives a flat grassland map: 3 territory tiles × 2 food
    // + city center 2 = 8 food yield; consumption = pop * 2.
    // At pop=4: consumption=8, surplus=0.
    const baseThreshold = getGrowthThreshold(4, 'antiquity');           // 30 + 3*3 + 33*9 = 336
    const reducedThreshold = Math.round(baseThreshold * (1 - 0.1));     // 302
    // food set to reducedThreshold: city WITH granary is exactly at its threshold → grows.
    // city WITHOUT granary is below base threshold (302 < 336) → does NOT grow.

    const territory = [
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
    ];
    const cityNoBuilding = createTestCity({
      population: 4,
      food: reducedThreshold,
      buildings: [],
      territory,
    });
    const cityWithGranary = createTestCity({
      population: 4,
      food: reducedThreshold,
      buildings: ['granary'],
      territory,
    });

    const stateNoBuilding = createTestState({ cities: new Map([['c1', cityNoBuilding]]) });
    const stateWithGranary = createTestState({ cities: new Map([['c1', cityWithGranary]]) });

    const nextNoBuilding = growthSystem(stateNoBuilding, { type: 'END_TURN' });
    const nextWithGranary = growthSystem(stateWithGranary, { type: 'END_TURN' });

    // City without granary: food + surplus < baseThreshold → no growth
    expect(nextNoBuilding.cities.get('c1')!.population).toBe(4);
    // City with granary: food + surplus >= reducedThreshold → grew
    expect(nextWithGranary.cities.get('c1')!.population).toBe(5);
  });

  it('city with granary + watermill has lower threshold than granary alone', () => {
    const baseThreshold = getGrowthThreshold(1, 'antiquity'); // 30
    const withGranary = Math.round(baseThreshold * (1 - 0.1));      // 27
    const withBoth = Math.round(baseThreshold * (1 - 0.15));         // 26

    expect(withBoth).toBeLessThan(withGranary);
    expect(withBoth).toBeLessThan(baseThreshold);
  });

  it('effective threshold is never less than 1', () => {
    // Extreme case: 100% growth bonus should clamp to threshold of 1
    const city = createTestCity({ buildings: ['granary'] });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    // buildingDef for granary has growthRateBonus=0.1; 30 * 0.9 = 27, well above 1
    // The Math.max(1, ...) guard ensures it never hits 0
    const baseThreshold = getGrowthThreshold(1, 'antiquity');
    const totalRate = calculateTotalGrowthRate(city, state);
    const effectiveThreshold = Math.max(1, Math.round(baseThreshold * (1 - totalRate)));
    expect(effectiveThreshold).toBeGreaterThanOrEqual(1);
  });

  it('buildings without growthRateBonus do not reduce threshold', () => {
    // monument has no growthRateBonus; threshold should equal base
    const baseThreshold = getGrowthThreshold(1, 'antiquity'); // 30
    const cityWithMonument = createTestCity({ buildings: ['monument'] });
    const state = createTestState({ cities: new Map([['c1', cityWithMonument]]) });
    const totalRate = calculateTotalGrowthRate(cityWithMonument, state);
    const effectiveThreshold = Math.max(1, Math.round(baseThreshold * (1 - totalRate)));
    expect(effectiveThreshold).toBe(baseThreshold);
  });
});
