import { describe, it, expect } from 'vitest';
import { specialistSystem, canAssignSpecialist } from '../specialistSystem';
import { calculateCityYields } from '../../state/YieldCalculator';
import { calculateCityHappiness } from '../resourceSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState } from '../../types/GameState';
import type { UrbanTileV2 } from '../../types/DistrictOverhaul';
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

  describe('ASSIGN_SPECIALIST_FROM_GROWTH', () => {
    it('clears pending growth choice and stale validation on success', () => {
      const city = createTestCity({ population: 3, specialists: 0 });
      const player = createTestPlayer({
        id: 'p1',
        pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
        lastValidation: {
          valid: false,
          reason: 'Resolve pending city growth choices before ending your turn.',
          category: 'general',
        },
      });

      const next = specialistSystem(state, {
        type: 'ASSIGN_SPECIALIST_FROM_GROWTH',
        cityId: 'c1',
      });

      expect(next.cities.get('c1')!.specialists).toBe(1);
      expect(next.players.get('p1')?.pendingGrowthChoices ?? []).toHaveLength(0);
      expect(next.lastValidation).toBeNull();
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

      // KK3.1: food cost now in YieldCalculator (F-02) — deducted from yields
      expect(yieldsNone.food - yieldsOne.food).toBe(2);  // 1 specialist: -2 food
      expect(yieldsNone.food - yieldsTwo.food).toBe(4);  // 2 specialists: -4 food
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

  describe('W3-02: per-tile spatial model', () => {
    const TILE_KEY = coordToKey({ q: 3, r: 3 });

    function createCityWithUrbanTile(specialistCount = 0, cap = 1): CityState {
      const urbanTile: UrbanTileV2 = {
        cityId: 'c1',
        coord: { q: 3, r: 3 },
        buildings: [],
        specialistCount,
        specialistCapPerTile: cap,
        walled: false,
      };
      return createTestCity({
        population: 3,
        specialists: specialistCount,
        urbanTiles: new Map([[TILE_KEY, urbanTile]]),
      });
    }

    it('ASSIGN_SPECIALIST with tileId increments urbanTile.specialistCount', () => {
      const city = createCityWithUrbanTile(0, 1);
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, {
        type: 'ASSIGN_SPECIALIST',
        cityId: 'c1',
        tileId: TILE_KEY,
      });
      expect(next.cities.get('c1')!.specialists).toBe(1);
      expect(next.cities.get('c1')!.urbanTiles!.get(TILE_KEY)!.specialistCount).toBe(1);
    });

    it('ASSIGN_SPECIALIST with tileId also updates specialistsByTile', () => {
      const city = createCityWithUrbanTile(0, 1);
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, {
        type: 'ASSIGN_SPECIALIST',
        cityId: 'c1',
        tileId: TILE_KEY,
      });
      expect(next.cities.get('c1')!.specialistsByTile?.get(TILE_KEY)).toBe(1);
    });

    it('ASSIGN_SPECIALIST is blocked when per-tile cap is reached', () => {
      const city = createCityWithUrbanTile(1, 1); // already at cap
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, {
        type: 'ASSIGN_SPECIALIST',
        cityId: 'c1',
        tileId: TILE_KEY,
      });
      // Should return unchanged state — cap enforced
      expect(next).toBe(state);
    });

    it('ASSIGN_SPECIALIST allows multiple specialists when cap > 1', () => {
      const city = createCityWithUrbanTile(1, 2); // cap = 2, currently 1
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, {
        type: 'ASSIGN_SPECIALIST',
        cityId: 'c1',
        tileId: TILE_KEY,
      });
      expect(next.cities.get('c1')!.urbanTiles!.get(TILE_KEY)!.specialistCount).toBe(2);
    });

    it('UNASSIGN_SPECIALIST with tileId decrements urbanTile.specialistCount', () => {
      const city = createCityWithUrbanTile(1, 1);
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, {
        type: 'UNASSIGN_SPECIALIST',
        cityId: 'c1',
        tileId: TILE_KEY,
      });
      expect(next.cities.get('c1')!.specialists).toBe(0);
      expect(next.cities.get('c1')!.urbanTiles!.get(TILE_KEY)!.specialistCount).toBe(0);
    });

    it('UNASSIGN_SPECIALIST with tileId clears entry from specialistsByTile when count reaches 0', () => {
      const city = {
        ...createCityWithUrbanTile(1, 1),
        specialistsByTile: new Map([[TILE_KEY, 1]]),
      };
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = specialistSystem(state, {
        type: 'UNASSIGN_SPECIALIST',
        cityId: 'c1',
        tileId: TILE_KEY,
      });
      expect(next.cities.get('c1')!.specialistsByTile?.has(TILE_KEY)).toBe(false);
    });

    it('canAssignSpecialist returns false when total headcount at cap', () => {
      const city = createTestCity({ population: 2, specialists: 1 });
      expect(canAssignSpecialist(city)).toBe(false);
    });

    it('canAssignSpecialist returns false when per-tile cap reached', () => {
      const city = createCityWithUrbanTile(1, 1);
      expect(canAssignSpecialist(city, TILE_KEY)).toBe(false);
    });

    it('canAssignSpecialist returns true when both caps have room', () => {
      const city = createCityWithUrbanTile(0, 1);
      expect(canAssignSpecialist(city, TILE_KEY)).toBe(true);
    });

    it('total specialist count is sum of tile counts', () => {
      const tile1Key = coordToKey({ q: 3, r: 3 });
      const tile2Key = coordToKey({ q: 4, r: 3 });
      const urban1: UrbanTileV2 = {
        cityId: 'c1', coord: { q: 3, r: 3 }, buildings: [],
        specialistCount: 1, specialistCapPerTile: 1, walled: false,
      };
      const urban2: UrbanTileV2 = {
        cityId: 'c1', coord: { q: 4, r: 3 }, buildings: [],
        specialistCount: 1, specialistCapPerTile: 1, walled: false,
      };
      const city = createTestCity({
        population: 5,
        specialists: 2,
        specialistsByTile: new Map([[tile1Key, 1], [tile2Key, 1]]),
        urbanTiles: new Map([[tile1Key, urban1], [tile2Key, urban2]]),
      });
      // Verify specialists = sum of tile counts = 2
      const total = [...(city.specialistsByTile?.values() ?? [])].reduce((a, b) => a + b, 0);
      expect(total).toBe(city.specialists);
    });
  });
});
