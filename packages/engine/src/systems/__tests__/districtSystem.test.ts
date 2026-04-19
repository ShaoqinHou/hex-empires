import { describe, it, expect } from 'vitest';
import { districtSystem } from '../districtSystem';
import { createTestState, createTestPlayer, setTile } from './helpers';
import type { CityState } from '../../types/GameState';
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

describe('districtSystem', () => {
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
      expect((next.lastValidation as { valid: false; reason: string }).reason).toContain('District not found');
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
      expect((next.lastValidation as { valid: false; reason: string }).reason).toContain('max level');
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
      expect((next.lastValidation as { valid: false; reason: string }).reason).toContain('population');
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
      expect((next.lastValidation as { valid: false; reason: string }).reason).toContain('Not your district');
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
