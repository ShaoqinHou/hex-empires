/**
 * Town specialization tests (settlements F-10).
 *
 * Civ VII towns choose one non-Growing specialization per age. They can toggle
 * between that locked specialization and Growing Town, but cannot switch to a
 * different non-Growing focus until age transition resets the lock.
 */
import { describe, it, expect } from 'vitest';
import { growthSystem } from '../growthSystem';
import { citySystem, calculateSettlementUpgradeCost } from '../citySystem';
import { ageSystem } from '../ageSystem';
import { calculateCityYields } from '../../state/YieldCalculator';
import { createTestPlayer, createTestState } from './helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function makeTown(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'TestTown',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 7,
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
    lockedTownSpecialization: null,
    specialists: 0,
    districts: [],
    ...overrides,
  };
}

describe('SET_SPECIALIZATION town focus lock', () => {
  it('rejects specialization before population 7', () => {
    const town = makeTown({ population: 6 });
    const state = createTestState({ cities: new Map([['c1', town]]) });

    const next = growthSystem(state, {
      type: 'SET_SPECIALIZATION',
      cityId: 'c1',
      specialization: 'farming_town',
    });

    expect(next).toBe(state);
  });

  it('locks the first non-Growing specialization for the age', () => {
    const town = makeTown();
    const state = createTestState({ cities: new Map([['c1', town]]) });

    const next = growthSystem(state, {
      type: 'SET_SPECIALIZATION',
      cityId: 'c1',
      specialization: 'farming_town',
    });

    const updated = next.cities.get('c1')!;
    expect(updated.specialization).toBe('farming_town');
    expect(updated.lockedTownSpecialization).toBe('farming_town');
  });

  it('allows toggling from a locked specialization to Growing Town and back', () => {
    const town = makeTown();
    const state = createTestState({ cities: new Map([['c1', town]]) });

    const focused = growthSystem(state, {
      type: 'SET_SPECIALIZATION',
      cityId: 'c1',
      specialization: 'mining_town',
    });
    const growing = growthSystem(focused, {
      type: 'SET_SPECIALIZATION',
      cityId: 'c1',
      specialization: 'growing_town',
    });
    const restored = growthSystem(growing, {
      type: 'SET_SPECIALIZATION',
      cityId: 'c1',
      specialization: 'mining_town',
    });

    expect(growing.cities.get('c1')!.specialization).toBe('growing_town');
    expect(growing.cities.get('c1')!.lockedTownSpecialization).toBe('mining_town');
    expect(restored.cities.get('c1')!.specialization).toBe('mining_town');
    expect(restored.cities.get('c1')!.lockedTownSpecialization).toBe('mining_town');
  });

  it('rejects switching between two non-Growing specializations', () => {
    const town = makeTown({
      specialization: 'farming_town',
      lockedTownSpecialization: 'farming_town',
    });
    const state = createTestState({ cities: new Map([['c1', town]]) });

    const next = growthSystem(state, {
      type: 'SET_SPECIALIZATION',
      cityId: 'c1',
      specialization: 'mining_town',
    });

    expect(next).toBe(state);
  });

  it('applies Fort Town defense HP once when first locked', () => {
    const town = makeTown({ defenseHP: 100 });
    const state = createTestState({ cities: new Map([['c1', town]]) });

    const fort = growthSystem(state, {
      type: 'SET_SPECIALIZATION',
      cityId: 'c1',
      specialization: 'fort_town',
    });
    const growing = growthSystem(fort, {
      type: 'SET_SPECIALIZATION',
      cityId: 'c1',
      specialization: 'growing_town',
    });
    const restored = growthSystem(growing, {
      type: 'SET_SPECIALIZATION',
      cityId: 'c1',
      specialization: 'fort_town',
    });

    expect(fort.cities.get('c1')!.defenseHP).toBe(105);
    expect(growing.cities.get('c1')!.defenseHP).toBe(100);
    expect(restored.cities.get('c1')!.defenseHP).toBe(105);
  });
});

describe('town specialization lifecycle', () => {
  it('does not apply town specialization yields to a city-tier settlement', () => {
    const city = makeTown({
      settlementType: 'city',
      isTown: false,
      specialization: 'farming_town',
      lockedTownSpecialization: 'farming_town',
    });
    const town = makeTown({ specialization: 'farming_town' });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const cityYields = calculateCityYields(city, state);
    const townYields = calculateCityYields(town, state);

    expect(townYields.food).toBe(cityYields.food + 2);
  });

  it('clears town-only state when upgrading a town to a city', () => {
    const town = makeTown({
      defenseHP: 105,
      specialization: 'fort_town',
      lockedTownSpecialization: 'fort_town',
    });
    const state = createTestState({
      cities: new Map([['c1', town]]),
      players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 300 })]]),
    });

    const next = citySystem(state, { type: 'UPGRADE_SETTLEMENT', cityId: 'c1' });
    const upgraded = next.cities.get('c1')!;

    expect(upgraded.settlementType).toBe('city');
    expect(upgraded.isTown).toBe(false);
    expect(upgraded.specialization).toBeNull();
    expect(upgraded.lockedTownSpecialization).toBeNull();
    expect(upgraded.defenseHP).toBe(100);
  });

  it('calculates the same dynamic upgrade cost used by UPGRADE_SETTLEMENT', () => {
    const town = makeTown({ population: 7 });
    const capital = makeTown({
      id: 'cap',
      settlementType: 'city',
      isTown: false,
      isCapital: true,
      position: { q: 0, r: 0 },
    });
    const state = createTestState({
      cities: new Map([['cap', capital], ['c1', town]]),
    });

    expect(calculateSettlementUpgradeCost(state, 'p1', town)).toBe(200);
  });

  it('clears existing town specialization locks on age transition', () => {
    const player = createTestPlayer({
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
    });
    const town = makeTown({
      defenseHP: 105,
      specialization: 'fort_town',
      lockedTownSpecialization: 'fort_town',
      food: 12,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', town]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });

    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const updated = next.cities.get('c1')!;

    expect(updated.specialization).toBeNull();
    expect(updated.lockedTownSpecialization).toBeNull();
    expect(updated.defenseHP).toBe(100);
    expect(updated.food).toBe(0);
  });
});
