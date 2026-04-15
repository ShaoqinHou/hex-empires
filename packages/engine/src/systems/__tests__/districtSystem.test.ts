import { describe, it, expect } from 'vitest';
import { districtSystem } from '../districtSystem';
import { createTestState, createTestPlayer, setTile } from './helpers';
import type { CityState, GameState } from '../../types/GameState';
import type { DistrictSlot } from '../../types/District';
import { coordToKey } from '../../hex/HexMath';

// ── helpers ────────────────────────────────────────────────────────────────────

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 5,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    districts: [],
    territory: [
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
      coordToKey({ q: 2, r: 4 }),
      coordToKey({ q: 2, r: 3 }),
      coordToKey({ q: 4, r: 2 }),
      coordToKey({ q: 3, r: 2 }),
    ],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    ...overrides,
  };
}

/** Build a district slot already placed on the map */
function createPlacedDistrict(overrides: Partial<DistrictSlot> = {}): DistrictSlot {
  return {
    id: 'district_1_c1_t1',
    type: 'encampment',
    position: { q: 4, r: 3 },
    cityId: 'c1',
    level: 1,
    buildings: [],
    adjacencyBonus: 0,
    ...overrides,
  };
}

/** State with a city that already has the required tech for campus */
function stateWithCity(cityOverrides: Partial<CityState> = {}, techOverrides: string[] = []): GameState {
  const city = createTestCity(cityOverrides);
  return createTestState({
    cities: new Map([['c1', city]]),
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: techOverrides })],
    ]),
  });
}

// ── PLACE_DISTRICT ─────────────────────────────────────────────────────────────

describe('districtSystem', () => {
  describe('PLACE_DISTRICT', () => {
    it('places an encampment district when all conditions are met', () => {
      // encampment requires bronze_working tech and population cost 1
      const state = stateWithCity({}, ['bronze_working']);
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'encampment',
        tile: { q: 4, r: 3 }, // in city territory, not the city center
      });

      expect(next.districts.size).toBe(1);
      const district = [...next.districts.values()][0];
      expect(district.type).toBe('encampment');
      expect(district.position).toEqual({ q: 4, r: 3 });
      expect(district.cityId).toBe('c1');
      expect(district.level).toBe(1);
      expect(district.buildings).toEqual([]);
    });

    it('adds district id to city.districts array', () => {
      const state = stateWithCity({}, ['bronze_working']);
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'encampment',
        tile: { q: 4, r: 3 },
      });

      const city = next.cities.get('c1')!;
      expect(city.districts.length).toBe(1);
      const districtId = city.districts[0];
      expect(next.districts.has(districtId)).toBe(true);
    });

    it('adds a log entry on successful placement', () => {
      const state = stateWithCity({}, ['bronze_working']);
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'encampment',
        tile: { q: 4, r: 3 },
      });

      expect(next.log.length).toBe(1);
      expect(next.log[0].type).toBe('production');
      expect(next.log[0].message).toContain('Rome');
      expect(next.log[0].message).toContain('Encampment');
    });

    it('clears lastValidation on success', () => {
      const state = stateWithCity({}, ['bronze_working']);
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'encampment',
        tile: { q: 4, r: 3 },
      });

      expect(next.lastValidation).toBeNull();
    });

    it('generates deterministic district id', () => {
      const state = stateWithCity({}, ['bronze_working']);
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'encampment',
        tile: { q: 4, r: 3 },
      });

      // ID pattern: district_{size+1}_{cityId}_t{turn}
      const district = [...next.districts.values()][0];
      expect(district.id).toBe('district_1_c1_t1');
    });

    it('places a campus district when writing tech is researched', () => {
      const state = stateWithCity({}, ['writing']);
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'campus',
        tile: { q: 4, r: 3 },
      });

      expect(next.districts.size).toBe(1);
      expect([...next.districts.values()][0].type).toBe('campus');
    });

    it('places a theater district when drama_poetry civic is researched', () => {
      const state = stateWithCity({ population: 5 }, []);
      const stateWithCivic = {
        ...state,
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', researchedCivics: ['drama_poetry'] })],
        ]),
      };
      const next = districtSystem(stateWithCivic, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'theater',
        tile: { q: 4, r: 3 },
      });

      expect(next.districts.size).toBe(1);
      expect([...next.districts.values()][0].type).toBe('theater');
    });

    // ── Invalid cases ──────────────────────────────────────────────────────────

    it('rejects placement when city does not exist', () => {
      const state = createTestState(); // no cities
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'nonexistent',
        districtId: 'encampment',
        tile: { q: 4, r: 3 },
      });

      expect(next.districts.size).toBe(0);
      expect(next.lastValidation).not.toBeNull();
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('City not found');
    });

    it('rejects placement when city belongs to another player', () => {
      const city = createTestCity({ owner: 'p2' });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['bronze_working'] })],
          ['p2', createTestPlayer({ id: 'p2', name: 'Player 2' })],
        ]),
      });
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'encampment',
        tile: { q: 4, r: 3 },
      });

      expect(next.districts.size).toBe(0);
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('Not your city');
    });

    it('rejects placement when district definition does not exist', () => {
      const state = stateWithCity({}, ['bronze_working']);
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'nonexistent_district',
        tile: { q: 4, r: 3 },
      });

      expect(next.districts.size).toBe(0);
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('District definition not found');
    });

    it('rejects placement when required tech is not researched', () => {
      const state = stateWithCity({}, []); // no techs
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'encampment', // requires bronze_working
        tile: { q: 4, r: 3 },
      });

      expect(next.districts.size).toBe(0);
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('bronze_working');
    });

    it('rejects placement when required civic is not researched', () => {
      // commercial district requires state_workforce civic (audit 1A: drama_poetry was removed as broken ref)
      const state = stateWithCity({}, []); // no civics
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'commercial', // requires state_workforce civic
        tile: { q: 4, r: 3 },
      });

      expect(next.districts.size).toBe(0);
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('state_workforce');
    });

    it('rejects placement when city population is insufficient', () => {
      // encampment costs 1 population; city has pop 1 but already has a district costing 1
      const existingDistrict = createPlacedDistrict({
        id: 'district_1_c1_t1',
        type: 'encampment',
        position: { q: 4, r: 3 },
      });
      const city = createTestCity({
        population: 1,
        districts: ['district_1_c1_t1'],
      });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        districts: new Map([['district_1_c1_t1', existingDistrict]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['writing'] })],
        ]),
      });
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'campus', // another pop-1 district; total would be 2 > pop 1
        tile: { q: 3, r: 2 },
      });

      expect(next.districts.size).toBe(1); // still just the existing one
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('population');
    });

    it('rejects placement when tile is outside city territory', () => {
      const state = stateWithCity({}, ['bronze_working']);
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'encampment',
        tile: { q: 9, r: 9 }, // far outside territory
      });

      expect(next.districts.size).toBe(0);
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('territory');
    });

    it('rejects placement when tile already has a district', () => {
      const existingDistrict = createPlacedDistrict({
        id: 'district_1_c1_t1',
        type: 'encampment',
        position: { q: 4, r: 3 },
      });
      const city = createTestCity({ districts: ['district_1_c1_t1'] });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        districts: new Map([['district_1_c1_t1', existingDistrict]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['writing'] })],
        ]),
      });
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'campus',
        tile: { q: 4, r: 3 }, // same tile as existing district
      });

      expect(next.districts.size).toBe(1); // no new district added
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('already has a district');
    });

    it('rejects placing the same district type twice in the same city', () => {
      const existingDistrict = createPlacedDistrict({
        id: 'district_1_c1_t1',
        type: 'encampment',
        position: { q: 4, r: 3 },
      });
      const city = createTestCity({
        population: 5,
        districts: ['district_1_c1_t1'],
      });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        districts: new Map([['district_1_c1_t1', existingDistrict]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['bronze_working'] })],
        ]),
      });
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'encampment', // same type already exists
        tile: { q: 3, r: 2 },
      });

      expect(next.districts.size).toBe(1); // no new district
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('already has this district type');
    });

    it('rejects waterfront district on non-coastal tile', () => {
      // Tile at (4,3) is grassland (flat map), not coastal
      const state = stateWithCity({ population: 5 }, ['sailing']);
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'waterfront',
        tile: { q: 4, r: 3 },
      });

      expect(next.districts.size).toBe(0);
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('water');
    });

    it('accepts waterfront district on a coastal tile (adjacent to ocean)', () => {
      // Place coast tile adjacent to the placement tile so the coast check passes
      const state = stateWithCity({ population: 5 }, ['sailing']);
      const tiles = new Map(state.map.tiles);
      // tile at (4,3) is where we place — make (5,3) an ocean tile so (4,3) is "coastal"
      setTile(tiles, { q: 5, r: 3 }, 'ocean');
      // Also add (4,3) to territory if not already there
      const city = createTestCity({
        population: 5,
        territory: [
          coordToKey({ q: 3, r: 3 }),
          coordToKey({ q: 4, r: 3 }),
          coordToKey({ q: 3, r: 4 }),
          coordToKey({ q: 2, r: 4 }),
          coordToKey({ q: 2, r: 3 }),
          coordToKey({ q: 4, r: 2 }),
          coordToKey({ q: 3, r: 2 }),
        ],
      });
      const nextState = {
        ...state,
        map: { ...state.map, tiles },
        cities: new Map([['c1', city]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['sailing'] })],
        ]),
      };

      const next = districtSystem(nextState, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'waterfront',
        tile: { q: 4, r: 3 },
      });

      expect(next.districts.size).toBe(1);
      expect([...next.districts.values()][0].type).toBe('waterfront');
    });
  });

  // ── adjacency bonus ────────────────────────────────────────────────────────

  describe('adjacency bonus calculation', () => {
    it('calculates adjacency bonus of 0 for isolated district', () => {
      const state = stateWithCity({}, ['bronze_working']);
      const next = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'encampment',
        tile: { q: 4, r: 3 },
      });

      const district = [...next.districts.values()][0];
      expect(district.adjacencyBonus).toBe(0);
    });

    it('calculates adjacency bonus of 1 when placed next to existing district', () => {
      // First place an encampment
      const state = stateWithCity({ population: 5 }, ['bronze_working', 'writing']);
      const afterFirst = districtSystem(state, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'encampment',
        tile: { q: 4, r: 3 },
      });

      // Now the city has an encampment; place campus adjacent to it
      // q:4,r:3 neighbour in axial: q:4,r:2 (one of the hex neighbours)
      // We need q:4,r:2 in city territory — it is (coordToKey({q:4,r:2}) may not be in territory)
      // Add it explicitly
      const city2 = afterFirst.cities.get('c1')!;
      const withExtraTerritory = {
        ...city2,
        territory: [
          ...city2.territory,
          coordToKey({ q: 4, r: 2 }),
        ],
      };
      const stateForSecond = {
        ...afterFirst,
        cities: new Map([['c1', withExtraTerritory]]),
      };

      const afterSecond = districtSystem(stateForSecond, {
        type: 'PLACE_DISTRICT',
        cityId: 'c1',
        districtId: 'campus',
        tile: { q: 4, r: 2 }, // adjacent to encampment at (4,3)
      });

      // The campus at (4,2) should have adjacency bonus 1 (adjacent to encampment)
      const campusDistrict = [...afterSecond.districts.values()].find(d => d.type === 'campus');
      expect(campusDistrict).toBeDefined();
      expect(campusDistrict!.adjacencyBonus).toBe(1);
    });
  });

  // ── UPGRADE_DISTRICT ───────────────────────────────────────────────────────

  describe('UPGRADE_DISTRICT', () => {
    it('upgrades a district level by 1', () => {
      const district = createPlacedDistrict({ level: 1 });
      const city = createTestCity({ districts: ['district_1_c1_t1'], population: 3 });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        districts: new Map([['district_1_c1_t1', district]]),
      });

      const next = districtSystem(state, {
        type: 'UPGRADE_DISTRICT',
        districtId: 'district_1_c1_t1',
      });

      expect(next.districts.get('district_1_c1_t1')!.level).toBe(2);
    });

    it('adds a log entry on upgrade', () => {
      const district = createPlacedDistrict({ level: 1 });
      const city = createTestCity({ districts: ['district_1_c1_t1'], population: 3 });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        districts: new Map([['district_1_c1_t1', district]]),
      });

      const next = districtSystem(state, {
        type: 'UPGRADE_DISTRICT',
        districtId: 'district_1_c1_t1',
      });

      expect(next.log.length).toBe(1);
      expect(next.log[0].type).toBe('production');
      expect(next.log[0].message).toContain('level 2');
    });

    it('rejects upgrade when district does not exist', () => {
      const state = createTestState();
      const next = districtSystem(state, {
        type: 'UPGRADE_DISTRICT',
        districtId: 'nonexistent',
      });

      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('District not found');
    });

    it('rejects upgrade when district is already at max level', () => {
      // encampment has maxLevel 2
      const district = createPlacedDistrict({ level: 2 });
      const city = createTestCity({ districts: ['district_1_c1_t1'], population: 5 });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        districts: new Map([['district_1_c1_t1', district]]),
      });

      const next = districtSystem(state, {
        type: 'UPGRADE_DISTRICT',
        districtId: 'district_1_c1_t1',
      });

      expect(next.districts.get('district_1_c1_t1')!.level).toBe(2); // unchanged
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('max level');
    });

    it('rejects upgrade when city population is insufficient', () => {
      // To upgrade to level 2, city needs population >= 2
      const district = createPlacedDistrict({ level: 1 });
      const city = createTestCity({ districts: ['district_1_c1_t1'], population: 1 });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        districts: new Map([['district_1_c1_t1', district]]),
      });

      const next = districtSystem(state, {
        type: 'UPGRADE_DISTRICT',
        districtId: 'district_1_c1_t1',
      });

      expect(next.districts.get('district_1_c1_t1')!.level).toBe(1); // unchanged
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('population');
    });

    it('rejects upgrade when district belongs to another player', () => {
      const district = createPlacedDistrict({ level: 1 });
      const city = createTestCity({ owner: 'p2', districts: ['district_1_c1_t1'], population: 5 });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        districts: new Map([['district_1_c1_t1', district]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1' })],
          ['p2', createTestPlayer({ id: 'p2', name: 'Player 2' })],
        ]),
      });

      const next = districtSystem(state, {
        type: 'UPGRADE_DISTRICT',
        districtId: 'district_1_c1_t1',
      });

      expect(next.districts.get('district_1_c1_t1')!.level).toBe(1);
      expect(next.lastValidation!.valid).toBe(false);
      expect(next.lastValidation!.reason).toContain('Not your district');
    });
  });

  // ── pass-through ───────────────────────────────────────────────────────────

  describe('pass-through', () => {
    it('returns state unchanged for unrelated actions', () => {
      const state = createTestState();
      const next = districtSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });

    it('returns state unchanged for START_TURN', () => {
      const state = createTestState();
      const next = districtSystem(state, { type: 'START_TURN' });
      expect(next).toBe(state);
    });
  });
});
