/**
 * YieldCalculator-assigned-resources.test.ts
 *
 * F-06: Assigned resource bonuses applied to city yields.
 *
 * The YieldCalculator reads city.assignedResources and adds each resource's
 * bonusTable row for the current age to the city's total yields.
 *
 * Test scenarios:
 * 1. City with no assignedResources — baseline only.
 * 2. City with WHEAT assigned in antiquity — baseline + food:1.
 * 3. City with SILK assigned in antiquity — baseline + gold:1.
 * 4. City with WHEAT + SILK assigned in antiquity — both bonuses stack.
 * 5. SILK exploration gives more gold than SILK antiquity (per-age scaling).
 * 6. IRON assigned in antiquity has no yields row — baseline unchanged.
 */

import { describe, it, expect } from 'vitest';
import { calculateCityYields } from '../YieldCalculator';
import { createTestState, createTestPlayer } from '../../systems/__tests__/helpers';
import type { CityState } from '../../types/GameState';
import type { ResourceId } from '../../types/Ids';
import { coordToKey } from '../../hex/HexMath';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a minimal CityState.
 * territory: one grassland tile at (0,0) — terrain yields food:2.
 * City center always adds food:2 + production:1.
 * Baseline with no special bonuses: food:4, production:1, all others 0.
 */
function makeCity(
  assignedResources?: ReadonlyArray<ResourceId>,
): CityState {
  const base: CityState = {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 0, r: 0 },
    population: 1,
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
  };
  if (assignedResources !== undefined) {
    return { ...base, assignedResources } as CityState;
  }
  return base;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('F-06: Assigned resource yields in city YieldCalculator', () => {
  it('city with no assignedResources produces baseline food:4 production:2 gold:0', () => {
    const state = createTestState({
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      cities: new Map([['c1', makeCity()]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const city = makeCity();
    const yields = calculateCityYields(city, state);

    // Grassland terrain: food:2; city center: +food:2, +production:1.
    // Rome civ ability (createTestPlayer uses 'rome'): +1 production empire-wide.
    // Total baseline: food:4, production:2, gold:0, science:0, culture:0.
    expect(yields.food).toBe(4);
    expect(yields.production).toBe(2);
    expect(yields.gold).toBe(0);
    expect(yields.science).toBe(0);
    expect(yields.culture).toBe(0);
  });

  it('WHEAT assigned in antiquity adds food:1 to city yields (total food:5)', () => {
    // WHEAT antiquity bonusTable: { yields: { food: 1 } }
    const city = makeCity(['wheat'] as ReadonlyArray<ResourceId>);
    const state = createTestState({
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      cities: new Map([['c1', city]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const yields = calculateCityYields(city, state);
    // Baseline food:4 + WHEAT antiquity bonus food:1 = 5
    // Baseline production:2 (center:1 + Rome civ:1), unchanged
    expect(yields.food).toBe(5);
    expect(yields.production).toBe(2);
    expect(yields.gold).toBe(0);
  });

  it('SILK assigned in antiquity adds gold:1 to city yields', () => {
    // SILK antiquity bonusTable: { happiness: 2, yields: { gold: 1 } }
    const city = makeCity(['silk'] as ReadonlyArray<ResourceId>);
    const state = createTestState({
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      cities: new Map([['c1', city]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const yields = calculateCityYields(city, state);
    // Baseline food:4, production:2 (center:1 + Rome civ:1), gold:0.
    // SILK antiquity: +gold:1 = gold:1
    expect(yields.food).toBe(4);
    expect(yields.production).toBe(2);
    expect(yields.gold).toBe(1);
  });

  it('two resources assigned in antiquity both stack — WHEAT food:1 + SILK gold:1', () => {
    // WHEAT antiquity: food+1; SILK antiquity: gold+1
    const city = makeCity(['wheat', 'silk'] as ReadonlyArray<ResourceId>);
    const state = createTestState({
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      cities: new Map([['c1', city]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const yields = calculateCityYields(city, state);
    // Baseline food:4 + WHEAT:1 = 5; production:2 (unchanged); gold:0 + SILK:1 = 1
    expect(yields.food).toBe(5);
    expect(yields.production).toBe(2);
    expect(yields.gold).toBe(1);
  });

  it('SILK exploration yields gold:2 — more than antiquity gold:1 (per-age scaling)', () => {
    // SILK exploration bonusTable: { happiness: 3, yields: { gold: 2 } }
    const city = makeCity(['silk'] as ReadonlyArray<ResourceId>);
    const antiquityState = createTestState({
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      cities: new Map([['c1', city]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const explorationState = {
      ...antiquityState,
      age: { currentAge: 'exploration' as const, ageThresholds: { exploration: 50, modern: 100 } },
    };

    const antiquityYields = calculateCityYields(city, antiquityState);
    const explorationYields = calculateCityYields(city, explorationState);

    // SILK antiquity: gold:1; SILK exploration: gold:2
    expect(antiquityYields.gold).toBe(1);
    expect(explorationYields.gold).toBe(2);
    expect(explorationYields.gold).toBeGreaterThan(antiquityYields.gold);
  });

  it('IRON assigned in antiquity has combatMod only (no yields) — city yields unchanged', () => {
    // IRON antiquity bonusTable: { combatMod: { unitCategory: 'melee', value: 2 } }
    // No yields field in the antiquity row → city yields should be identical to baseline
    const baseCity = makeCity();
    const ironCity = makeCity(['iron'] as ReadonlyArray<ResourceId>);
    const state = createTestState({
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      cities: new Map([
        ['c1', ironCity],
        ['c2', baseCity],
      ]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const ironYields = calculateCityYields(ironCity, state);
    const baseYields = calculateCityYields(baseCity, state);

    // IRON antiquity has no yields row — no change to any yield
    expect(ironYields.food).toBe(baseYields.food);           // 4
    expect(ironYields.production).toBe(baseYields.production); // 2 (center:1 + Rome:1)
    expect(ironYields.gold).toBe(baseYields.gold);           // 0
  });
});
