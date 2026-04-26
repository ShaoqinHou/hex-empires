/**
 * KK1.2 — Town focus toggle tests (settlements F-10)
 *
 * Tests for SET_TOWN_FOCUS action and yield computation for towns.
 * handleSetTownFocus lives in growthSystem.ts;
 * getTownFocusYields (yield layer) lives in YieldCalculator.ts (via calculateCityYields).
 */
import { describe, it, expect } from 'vitest';
import { growthSystem } from '../growthSystem';
import { calculateCityYields } from '../../state/YieldCalculator';
import { createTestState } from './helpers';
import type { CityState, TownFocus } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

// ---------------------------------------------------------------------------
// Helper: build a minimal CityState for tests
// ---------------------------------------------------------------------------

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'TestTown',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 2,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
    ],
    settlementType: 'town',
    isTown: true,
    happiness: 10,
    isCapital: false,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SET_TOWN_FOCUS action handler tests
// ---------------------------------------------------------------------------

describe('SET_TOWN_FOCUS action', () => {
  it('rejects focus change on a city (not a town)', () => {
    const city = makeCity({ settlementType: 'city', isTown: false });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = growthSystem(state, { type: 'SET_TOWN_FOCUS', cityId: 'c1', focus: 'production' });
    // Should be a no-op — settlementType !== 'town'
    expect(next.cities.get('c1')!.townFocus).toBeUndefined();
  });

  it('rejects focus change on a city owned by a different player', () => {
    const city = makeCity({ owner: 'p2' }); // p2 owns it, p1 is current
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = growthSystem(state, { type: 'SET_TOWN_FOCUS', cityId: 'c1', focus: 'farming' });
    // No-op — wrong owner
    expect(next.cities.get('c1')!.townFocus).toBeUndefined();
  });

  it('rejects action for unknown cityId', () => {
    const state = createTestState({ cities: new Map() });
    const next = growthSystem(state, { type: 'SET_TOWN_FOCUS', cityId: 'nonexistent', focus: 'science' });
    expect(next).toBe(state); // reference-equality: no new state
  });

  it('sets townFocus on a valid town — production', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = growthSystem(state, { type: 'SET_TOWN_FOCUS', cityId: 'c1', focus: 'production' });
    expect(next.cities.get('c1')!.townFocus).toBe('production');
  });

  it('sets townFocus on a valid town — science', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = growthSystem(state, { type: 'SET_TOWN_FOCUS', cityId: 'c1', focus: 'science' });
    expect(next.cities.get('c1')!.townFocus).toBe('science');
  });

  it('sets townFocus on a valid town — farming', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = growthSystem(state, { type: 'SET_TOWN_FOCUS', cityId: 'c1', focus: 'farming' });
    expect(next.cities.get('c1')!.townFocus).toBe('farming');
  });

  it('sets townFocus on a valid town — trade', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = growthSystem(state, { type: 'SET_TOWN_FOCUS', cityId: 'c1', focus: 'trade' });
    expect(next.cities.get('c1')!.townFocus).toBe('trade');
  });

  it('sets townFocus on a valid town — growing (resets to default)', () => {
    const city = makeCity({ townFocus: 'science' });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = growthSystem(state, { type: 'SET_TOWN_FOCUS', cityId: 'c1', focus: 'growing' });
    expect(next.cities.get('c1')!.townFocus).toBe('growing');
  });

  it('can change focus freely (growing → science → farming)', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const s1 = growthSystem(state, { type: 'SET_TOWN_FOCUS', cityId: 'c1', focus: 'science' });
    expect(s1.cities.get('c1')!.townFocus).toBe('science');

    const s2 = growthSystem(s1, { type: 'SET_TOWN_FOCUS', cityId: 'c1', focus: 'farming' });
    expect(s2.cities.get('c1')!.townFocus).toBe('farming');
  });

  it('does not mutate other city fields when setting town focus', () => {
    const city = makeCity({ population: 3, food: 7 });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = growthSystem(state, { type: 'SET_TOWN_FOCUS', cityId: 'c1', focus: 'trade' });
    const updated = next.cities.get('c1')!;
    expect(updated.population).toBe(3);
    expect(updated.food).toBe(7);
    expect(updated.name).toBe('TestTown');
    expect(updated.townFocus).toBe('trade');
  });

  it('returns immutable state — cities map is a new reference', () => {
    const city = makeCity();
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = growthSystem(state, { type: 'SET_TOWN_FOCUS', cityId: 'c1', focus: 'production' });
    expect(next).not.toBe(state);
    expect(next.cities).not.toBe(state.cities);
  });
});

// ---------------------------------------------------------------------------
// Yield computation tests (via calculateCityYields)
// ---------------------------------------------------------------------------

describe('town focus yield computation', () => {
  // The test map is 10×10 grassland tiles (createFlatMap in helpers.ts).
  // City territory: q=3,r=3  q=4,r=3  q=3,r=4  (3 tiles, all grassland)
  // Base: 3 tiles × 2 food = 6 food + city center +2 food, +1 production
  //       Total base: 8 food, 1 production, 0 gold, 0 science

  it('growing focus (default) — no bonus over base yields', () => {
    const city = makeCity({ townFocus: 'growing' });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const base = calculateCityYields(makeCity(), state);   // absent / undefined
    const focused = calculateCityYields(city, state);
    // 'growing' mode has no extra yield bonus; both should be equal
    expect(focused.food).toBe(base.food);
    expect(focused.production).toBe(base.production);
    expect(focused.science).toBe(base.science);
  });

  it('undefined townFocus — same as growing (no bonus, no penalty)', () => {
    const city = makeCity({ townFocus: undefined });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const yields = calculateCityYields(city, state);
    // 3 grassland × 2F + 2F city-center = 8 food — independent of civ abilities
    expect(yields.food).toBe(8);
    // science and gold base are 0 (civ abilities don't add either)
    expect(yields.science).toBe(0);
    expect(yields.gold).toBe(0);
    // production is >0 (city center +1, plus potential civ ability — not clamped to exact 1)
    expect(yields.production).toBeGreaterThanOrEqual(1);
  });

  it('production focus — +1 production per 2 territory tiles (floor)', () => {
    // 3 territory tiles → floor(3/2) = 1 additional production
    const city = makeCity({ townFocus: 'production' });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const base = calculateCityYields(makeCity({ townFocus: 'growing' }), state);
    const focused = calculateCityYields(city, state);
    expect(focused.production).toBe(base.production + 1);
    // food should be unchanged by production focus
    expect(focused.food).toBe(base.food);
  });

  it('production focus with 6 territory tiles — +3 production', () => {
    // 6 tiles → floor(6/2) = 3 additional production
    const territory = [
      coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }), coordToKey({ q: 5, r: 3 }),
      coordToKey({ q: 2, r: 3 }), coordToKey({ q: 3, r: 2 }),
    ];
    const city = makeCity({ townFocus: 'production', territory });
    const baseCity = makeCity({ townFocus: undefined, territory });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const focused = calculateCityYields(city, state);
    const base = calculateCityYields(baseCity, state);
    expect(focused.production).toBe(base.production + 3);
  });

  it('science focus — +1 science per population point', () => {
    // population = 2 → +2 science
    const city = makeCity({ townFocus: 'science', population: 2 });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const base = calculateCityYields(makeCity({ townFocus: 'growing', population: 2 }), state);
    const focused = calculateCityYields(city, state);
    expect(focused.science).toBe(base.science + 2);
  });

  it('science focus pop 4 — +4 science', () => {
    const city = makeCity({ townFocus: 'science', population: 4 });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const base = calculateCityYields(makeCity({ townFocus: undefined, population: 4 }), state);
    const focused = calculateCityYields(city, state);
    expect(focused.science).toBe(base.science + 4);
  });

  it('farming focus — +1 food per territory tile', () => {
    // 3 territory tiles → +3 food
    const city = makeCity({ townFocus: 'farming' });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const base = calculateCityYields(makeCity({ townFocus: undefined }), state);
    const focused = calculateCityYields(city, state);
    expect(focused.food).toBe(base.food + 3);
  });

  it('trade focus with no trade routes — +0 gold', () => {
    const city = makeCity({ townFocus: 'trade' });
    // state has no trade routes by default
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const base = calculateCityYields(makeCity({ townFocus: undefined }), state);
    const focused = calculateCityYields(city, state);
    // No routes from this city → no bonus gold
    expect(focused.gold).toBe(base.gold);
  });

  it('trade focus with one trade route from this city — +1 gold', () => {
    const city = makeCity({ townFocus: 'trade' });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      tradeRoutes: new Map([
        ['r1', { id: 'r1', from: 'c1', to: 'c2', gold: 2, turnsRemaining: 10 }],
      ]),
    });
    const base = calculateCityYields(makeCity({ townFocus: undefined }), state);
    const focused = calculateCityYields(city, state);
    expect(focused.gold).toBe(base.gold + 1);
  });

  it('non-town city with townFocus set — focus is ignored (no bonus)', () => {
    // CityState with settlementType=city should not get focus yields
    const city = makeCity({ settlementType: 'city', isTown: false, townFocus: 'science' as TownFocus, population: 3 });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const yields = calculateCityYields(city, state);
    // science from 3 specialists worth of focus should NOT appear — city ignores focus
    // Base: 3 grassland + center = 8 food, 1 prod, 0 sci
    expect(yields.science).toBe(0);
  });
});
