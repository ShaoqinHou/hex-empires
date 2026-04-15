import { describe, it, expect } from 'vitest';
import { specialistSystem } from '../specialistSystem';
import { calculateCityYields } from '../../state/YieldCalculator';
import { calculateCityHappiness } from '../resourceSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 3,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 })],
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

describe('specialistSystem', () => {
  describe('ASSIGN_SPECIALIST', () => {
    it('assigns one specialist when population allows', () => {
      const city = createTestCity({ population: 3, specialists: 0 });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, { type: 'ASSIGN_SPECIALIST', cityId: 'c1' });
      expect(next.cities.get('c1')!.specialists).toBe(1);
    });

    it('can assign multiple specialists up to population - 1', () => {
      const city = createTestCity({ population: 4, specialists: 0 });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      // Assign first
      const s1 = specialistSystem(state, { type: 'ASSIGN_SPECIALIST', cityId: 'c1' });
      expect(s1.cities.get('c1')!.specialists).toBe(1);
      // Assign second
      const s2 = specialistSystem(s1, { type: 'ASSIGN_SPECIALIST', cityId: 'c1' });
      expect(s2.cities.get('c1')!.specialists).toBe(2);
      // Assign third
      const s3 = specialistSystem(s2, { type: 'ASSIGN_SPECIALIST', cityId: 'c1' });
      expect(s3.cities.get('c1')!.specialists).toBe(3);
    });

    it('cannot exceed population - 1 (at least 1 pop must work tiles)', () => {
      const city = createTestCity({ population: 3, specialists: 2 }); // already at cap
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, { type: 'ASSIGN_SPECIALIST', cityId: 'c1' });
      // Should not change — specialists == population - 1 already
      expect(next.cities.get('c1')!.specialists).toBe(2);
      expect(next).toBe(state);
    });

    it('cannot assign if population is 1 (no pop available for specialist)', () => {
      const city = createTestCity({ population: 1, specialists: 0 });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, { type: 'ASSIGN_SPECIALIST', cityId: 'c1' });
      expect(next.cities.get('c1')!.specialists).toBe(0);
      expect(next).toBe(state);
    });

    it('only affects the city owned by the current player', () => {
      const city = createTestCity({ population: 3, specialists: 0, owner: 'p2' });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1' })],
          ['p2', createTestPlayer({ id: 'p2' })],
        ]),
      });
      // p1 is current player, but city is owned by p2
      const next = specialistSystem(state, { type: 'ASSIGN_SPECIALIST', cityId: 'c1' });
      expect(next.cities.get('c1')!.specialists).toBe(0);
      expect(next).toBe(state);
    });

    it('returns state unchanged for unknown cityId', () => {
      const state = createTestState();
      const next = specialistSystem(state, { type: 'ASSIGN_SPECIALIST', cityId: 'nonexistent' });
      expect(next).toBe(state);
    });

    it('adds a log entry when specialist is assigned', () => {
      const city = createTestCity({ population: 3, specialists: 0 });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, { type: 'ASSIGN_SPECIALIST', cityId: 'c1' });
      expect(next.log.length).toBe(1);
      expect(next.log[0].type).toBe('city');
      expect(next.log[0].message).toContain('Rome');
    });
  });

  describe('UNASSIGN_SPECIALIST', () => {
    it('unassigns one specialist', () => {
      const city = createTestCity({ population: 3, specialists: 2 });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, { type: 'UNASSIGN_SPECIALIST', cityId: 'c1' });
      expect(next.cities.get('c1')!.specialists).toBe(1);
    });

    it('cannot go below 0 specialists', () => {
      const city = createTestCity({ population: 3, specialists: 0 });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, { type: 'UNASSIGN_SPECIALIST', cityId: 'c1' });
      expect(next.cities.get('c1')!.specialists).toBe(0);
      expect(next).toBe(state);
    });

    it('adds a log entry when specialist is unassigned', () => {
      const city = createTestCity({ population: 3, specialists: 1 });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, { type: 'UNASSIGN_SPECIALIST', cityId: 'c1' });
      expect(next.log.length).toBe(1);
      expect(next.log[0].type).toBe('city');
    });
  });

  describe('yield contributions', () => {
    it('each specialist adds +2 science and +2 culture to city yields', () => {
      const cityNoSpec = createTestCity({ population: 3, specialists: 0 });
      const cityOneSpec = createTestCity({ population: 3, specialists: 1 });
      const cityTwoSpec = createTestCity({ population: 3, specialists: 2 });
      const state = createTestState({ cities: new Map([['c1', cityNoSpec]]) });

      const yieldsNone = calculateCityYields(cityNoSpec, state);
      const yieldsOne = calculateCityYields(cityOneSpec, state);
      const yieldsTwo = calculateCityYields(cityTwoSpec, state);

      // +2 science per specialist
      expect(yieldsOne.science).toBe(yieldsNone.science + 2);
      expect(yieldsTwo.science).toBe(yieldsNone.science + 4);

      // +2 culture per specialist
      expect(yieldsOne.culture).toBe(yieldsNone.culture + 2);
      expect(yieldsTwo.culture).toBe(yieldsNone.culture + 4);

      // B3: each specialist costs -2 food
      expect(yieldsOne.food).toBe(yieldsNone.food - 2);
      expect(yieldsTwo.food).toBe(yieldsNone.food - 4);
      // Production unaffected
      expect(yieldsOne.production).toBe(yieldsNone.production);
    });
  });

  describe('happiness penalty', () => {
    it('each specialist reduces happiness by 2 (B2 fix: -2 per specialist)', () => {
      const cityNoSpec = createTestCity({ population: 4, specialists: 0 });
      const cityOneSpec = createTestCity({ population: 4, specialists: 1 });
      const cityTwoSpec = createTestCity({ population: 4, specialists: 2 });
      const state = createTestState();

      const happinessNone = calculateCityHappiness(cityNoSpec, state);
      const happinessOne = calculateCityHappiness(cityOneSpec, state);
      const happinessTwo = calculateCityHappiness(cityTwoSpec, state);

      expect(happinessOne).toBe(happinessNone - 2);
      expect(happinessTwo).toBe(happinessNone - 4);
    });
  });

  describe('pass-through', () => {
    it('ignores actions it does not handle', () => {
      const state = createTestState();
      const next = specialistSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });
  });
});
