import { describe, it, expect } from 'vitest';
import { growthSystem, getGrowthThreshold, calculateCityYields, calculateTotalGrowthRate } from '../growthSystem';
import { calculateCityHappiness } from '../resourceSystem';
import { createTestState } from './helpers';
import type { CityState, GameState, HexTile } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

/**
 * Rulebook §3 (Population and Growth) parity audit.
 *
 * Each test asserts ONE specific rule from civ7-rulebook.md §3.1-3.4.
 * Tests using `it.fails(...)` are intentional — they document engine divergence
 * from the Civ VII rulebook, flagged for follow-up implementation cycles.
 *
 * Rule codes:
 *   R31  §3.1  Growth threshold: Flat + Scalar*X + Exponent*X² (quadratic)
 *   R31b §3.1  Food accumulated toward threshold carries turn-to-turn
 *   R31c §3.1  Threshold grows strictly quadratically with X
 *   R32a §3.2  Granary/buildings reduce effective threshold (growth-rate bonus)
 *   R32b §3.2  Fresh water (river-adjacent city) increases growth rate
 *   R32c §3.2  Settlement-cap overage reduces growth rate
 *   R32d §3.2  Deeply unhappy city (< -6) has reduced growth
 *   R33a §3.3  Each specialist costs -2 food (YieldCalculator)
 *   R33b §3.3  Each specialist costs -2 happiness (rulebook; engine uses -2)
 *   R33c §3.3  Specialists do not grow a city past pop cap when they zero-out food
 */

/** Create a city with defaults, plus required `districts` field. */
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
    territory: [
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
    ],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
    ...overrides,
  } as CityState;
}

/** Mark the city-center tile as river-adjacent (fresh water). */
function withRiverAtCenter(state: GameState, at: { q: number; r: number }): GameState {
  const tiles = new Map(state.map.tiles);
  const key = coordToKey(at);
  const tile = tiles.get(key);
  if (tile) {
    const updated: HexTile = { ...tile, river: [0, 1, 2] };
    tiles.set(key, updated);
  }
  return {
    ...state,
    map: { ...state.map, tiles },
  };
}

describe('§3.1 — Growth threshold formula (quadratic post-patch)', () => {
  it('R31: antiquity base threshold at pop=1 is 30 (X=0 → 30 + 0 + 0)', () => {
    expect(getGrowthThreshold(1, 'antiquity')).toBe(30);
  });

  it('R31: antiquity threshold at pop=5 is 30 + 3*4 + 33*16 = 570 (X=4)', () => {
    // X = pop - starting_pop (= pop - 1) = 4, X² = 16.
    // Flat 30 + Scalar 3·4 + Exponent 33·16 = 30 + 12 + 528 = 570.
    expect(getGrowthThreshold(5, 'antiquity')).toBe(570);
  });

  it('R31: exploration threshold at pop=5 is 20 + 20*4 + 30*16 = 580 (X=4)', () => {
    expect(getGrowthThreshold(5, 'exploration')).toBe(580);
  });

  it('R31: modern threshold at pop=5 is 20 + 40*4 + 27*16 = 612 (X=4)', () => {
    expect(getGrowthThreshold(5, 'modern')).toBe(612);
  });

  it('R31c: threshold difference between pop=5 and pop=2 is dominated by X² term', () => {
    // pop=2 (X=1): 30 + 3 + 33 = 66
    // pop=5 (X=4): 570. Difference 504 ≫ 66 — quadratic dominates.
    const t2 = getGrowthThreshold(2, 'antiquity');
    const t5 = getGrowthThreshold(5, 'antiquity');
    expect(t2).toBe(66);
    expect(t5).toBe(570);
    expect(t5 - t2).toBeGreaterThan(7 * t2); // quadratic blowup: 504 > 7·66 = 462
  });

  it('R31b: food accumulates turn-to-turn when surplus is positive and below threshold', () => {
    // pop=1, threshold=30, yield=8 food (3 grassland × 2 + city center 2) (II2 F-10), consumption=2 → surplus=6.
    // Two ticks should leave food near 12, far below threshold 30, and the city should not grow.
    const city = createTestCity({ population: 1, food: 0 });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const tick1 = growthSystem(state, { type: 'END_TURN' });
    const c1 = tick1.cities.get('c1')!;
    expect(c1.population).toBe(1);
    // Per docstring above: yield=8, consumption=2 → surplus=6. After tick1: food = 0 + 6 = 6.
    expect(c1.food).toBe(6);
    const foodAfterTick1 = c1.food;

    // Run the second tick with the state from the first.
    const tick2 = growthSystem(tick1, { type: 'END_TURN' });
    const c2 = tick2.cities.get('c1')!;
    expect(c2.population).toBe(1);
    // Monotonic accumulation (same per-turn surplus on a stateless map).
    expect(c2.food).toBe(foodAfterTick1 * 2);
  });

  it('R31: pop=1 with enough food crosses threshold and grows to pop=2 on END_TURN', () => {
    // threshold = 30. Start at food = 25, surplus = 6 (yield 8 − consumption 2) (II2 F-10). 25+6=31 ≥ 30 → grow.
    const city = createTestCity({ population: 1, food: 25 });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = growthSystem(state, { type: 'END_TURN' });
    const updated = next.cities.get('c1')!;
    expect(updated.population).toBe(2);
    // Leftover food = 31 − 30 = 1.
    expect(updated.food).toBe(1);
  });
});

describe('§3.2 — Growth rate modifiers', () => {
  it('R32a: Granary (growthRateBonus=0.1) lowers effective threshold vs no-building', () => {
    // At pop=1, antiquity base = 30. With 0.1 rate bonus → round(30 × 0.9) = 27.
    const city = createTestCity({ buildings: ['granary'] });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const base = getGrowthThreshold(1, 'antiquity');
    const rate = calculateTotalGrowthRate(city, state);
    const effective = Math.max(1, Math.round(base * (1 - rate)));
    expect(effective).toBe(27);
    expect(effective).toBeLessThan(base);
  });

  it.fails(
    'R32b: fresh water (river-adjacent city center) increases growth rate',
    () => {
      // Rulebook §3.2: fresh water is a growth-rate source (Bath building on river is +10%).
      // Engine BUG: fresh water is wired into happiness (+3) in resourceSystem, not growth rate.
      // A city with a river-adjacent center should grow faster than one without.
      const territory = [coordToKey({ q: 3, r: 3 })];
      const noRiverCity = createTestCity({ population: 2, food: 0, territory });
      const riverCity = createTestCity({ population: 2, food: 0, territory });

      const noRiverState = createTestState({ cities: new Map([['c1', noRiverCity]]) });
      const riverState = withRiverAtCenter(
        createTestState({ cities: new Map([['c1', riverCity]]) }),
        { q: 3, r: 3 },
      );

      // Effective threshold should be strictly lower for the river city.
      const base = getGrowthThreshold(2, 'antiquity');
      const effNoRiver = Math.max(1, Math.round(base * (1 - calculateTotalGrowthRate(noRiverCity, noRiverState))));
      const effRiver = Math.max(1, Math.round(base * (1 - calculateTotalGrowthRate(riverCity, riverState))));
      expect(effRiver).toBeLessThan(effNoRiver);
    },
  );

  it.fails(
    'R32c: settlement-cap overage reduces growth rate',
    () => {
      // Rulebook §3.2: over-cap settlements carry a growth-rate penalty.
      // Engine BUG: cap overage is a happiness penalty only (resourceSystem); growthSystem
      // ignores settlement count entirely. Build 6 cities for p1 (cap = 4 → 2 overage).
      // After END_TURN the 6th city should have accumulated LESS food than the same city
      // in a single-city empire under otherwise identical conditions.
      const cities = new Map<string, CityState>();
      for (let i = 0; i < 6; i++) {
        cities.set(`c${i}`, createTestCity({
          id: `c${i}`,
          name: `City${i}`,
          position: { q: i, r: 0 },
          territory: [coordToKey({ q: i, r: 0 })],
          population: 1,
          food: 0,
          happiness: 10,
          isCapital: i === 0,
        }));
      }
      const overCapState = createTestState({ cities });

      const soloState = createTestState({
        cities: new Map([['c0', createTestCity({
          id: 'c0',
          name: 'City0',
          position: { q: 0, r: 0 },
          territory: [coordToKey({ q: 0, r: 0 })],
          population: 1,
          food: 0,
          happiness: 10,
        })]]),
      });

      const overCapNext = growthSystem(overCapState, { type: 'END_TURN' });
      const soloNext = growthSystem(soloState, { type: 'END_TURN' });

      const foodOverCap = overCapNext.cities.get('c0')!.food;
      const foodSolo = soloNext.cities.get('c0')!.food;
      expect(foodOverCap).toBeLessThan(foodSolo);
    },
  );

  it('R32d: deeply unhappy city (happiness ≤ -6) has reduced food growth rate', () => {
    // Y2.4: YieldCalculator now applies proportional slowdown (-2% per unit unhappiness).
    // city.happiness=-6 → multiplier=0.88 → 12% yield reduction.
    //
    // Compare two same-config cities: happy (happiness=10) and unhappy (happiness=-6).
    // The unhappy city's food accumulation should be STRICTLY less than the happy city,
    // and > 0 (proportional slowdown, not hard stop).
    const territory = [coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 }), coordToKey({ q: 3, r: 4 })];
    const happyCity = createTestCity({ population: 1, food: 0, happiness: 10, territory });
    const unhappyCity = createTestCity({ population: 1, food: 0, happiness: -6, territory });

    const happyNext = growthSystem(createTestState({ cities: new Map([['c1', happyCity]]) }), { type: 'END_TURN' });
    const unhappyNext = growthSystem(createTestState({ cities: new Map([['c1', unhappyCity]]) }), { type: 'END_TURN' });

    const happyFood = happyNext.cities.get('c1')!.food;
    const unhappyFood = unhappyNext.cities.get('c1')!.food;

    // Rulebook: unhappiness of -6 → multiplier=max(0,1+(-6)*0.02)=0.88 → 12% yield reduction.
    // happyCity (happiness=10): base food=8 (3 grassland×2 + center 2, II2 F-10), no penalty → surplus=6 → food=6.
    // unhappyCity (happiness=-6): Math.floor(8*0.88)=Math.floor(7.04)=7 food, consumption=2, surplus=5 → food=5.
    expect(unhappyFood).toBeLessThan(happyFood);
    expect(unhappyFood).toBe(5);
  });
});

describe('§3.3 — Population allocation & specialists', () => {
  it('R33a: specialist food cost handled in growthSystem (not YieldCalculator)', () => {
    // F-02: specialist food cost (2 per specialist) is consolidated in
    // growthSystem.foodConsumed, no longer deducted from calculateCityYields.
    const base = createTestCity({ population: 5, specialists: 0 });
    const withOne = createTestCity({ population: 5, specialists: 1 });
    const withThree = createTestCity({ population: 5, specialists: 3 });
    const state = createTestState({ cities: new Map([['c1', base]]) });

    const baseYields = calculateCityYields(base, state);
    const oneYields = calculateCityYields(withOne, state);
    const threeYields = calculateCityYields(withThree, state);

    // YieldCalculator no longer deducts specialist food — all three should match
    expect(oneYields.food).toBe(baseYields.food);
    expect(threeYields.food).toBe(baseYields.food);
  });

  it('R33b: each specialist subtracts 2 happiness from city happiness', () => {
    // Rulebook §3.3: specialists cost -2 happiness each.
    // Engine: resourceSystem.calculateCityHappiness subtracts specialists * 2.
    const noSpec = createTestCity({ population: 5, specialists: 0, happiness: 0 });
    const twoSpec = createTestCity({ population: 5, specialists: 2, happiness: 0 });
    const state = createTestState({ cities: new Map([['c1', noSpec]]) });

    const hNo = calculateCityHappiness(noSpec, state);
    const hTwo = calculateCityHappiness(twoSpec, state);

    // Delta should be exactly -4 (= 2 specialists × -2).
    expect(hNo - hTwo).toBe(4);
  });

  it('R33c: specialists add +2 science and +2 culture per specialist to yields', () => {
    const noSpec = createTestCity({ population: 5, specialists: 0 });
    const twoSpec = createTestCity({ population: 5, specialists: 2 });
    const state = createTestState({ cities: new Map([['c1', noSpec]]) });

    const yNo = calculateCityYields(noSpec, state);
    const yTwo = calculateCityYields(twoSpec, state);

    expect(yTwo.science).toBe(yNo.science + 4);
    expect(yTwo.culture).toBe(yNo.culture + 4);
  });
});

describe('§3.4 — Quarters', () => {
  it.fails(
    'R34: two same-age buildings in the same urban tile form a Quarter',
    () => {
      // Rulebook §3.4: 2+ same-age (or Ageless, excluding Walls) buildings sharing an urban
      // tile form a Quarter, which boosts adjacency bonuses.
      // Engine BUG: the legacy `buildings: BuildingId[]` field models buildings as
      // city-wide additions with no per-tile placement or quarter detection. There is no
      // `quarters` detection in growthSystem / YieldCalculator for this path. The V2
      // `urbanTiles`/`quarters` namespace exists on CityState but is optional and unused by
      // the growth/yield pipeline.
      //
      // Expected behavior: a city with two antiquity buildings on the same urban tile should
      // have at least one quarter reported in state (and/or an adjacency yield bonus). This
      // check probes the optional `quarters` field that the rulebook implies should be
      // populated.
      const city = createTestCity({
        population: 4,
        buildings: ['granary', 'monument'], // two antiquity buildings
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const updatedCity = state.cities.get('c1')!;
      // The quarters field is optional; we expect it to be populated (length >= 1).
      expect((updatedCity.quarters ?? []).length).toBeGreaterThanOrEqual(1);
    },
  );
});
