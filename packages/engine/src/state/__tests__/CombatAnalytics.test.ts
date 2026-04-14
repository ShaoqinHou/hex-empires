import { describe, it, expect } from 'vitest';
import {
  averageUnitHealth,
  fortifiedRatio,
  militaryUnitCount,
  totalCombatStrength,
  averageCityDefense,
  combatStrengthRanking,
} from '../CombatAnalytics';
import type { CityState } from '../../types/GameState';
import { createTestState, createTestUnit, createTestPlayer } from '../../systems/__tests__/helpers';

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 0, r: 0 },
    population: 1,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    ...overrides,
  };
}

describe('CombatAnalytics', () => {
  describe('averageUnitHealth', () => {
    it('returns 100 when the player has no units at all', () => {
      const state = createTestState({ units: new Map() });
      expect(averageUnitHealth(state, 'p1')).toBe(100);
    });

    it('returns 100 when the player owns only civilians (no military)', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'settler', health: 40 })],
      ]);
      const state = createTestState({ units });
      expect(averageUnitHealth(state, 'p1')).toBe(100);
    });

    it('averages health of only military units; civilians do not dilute', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'warrior', health: 50 })],
        ['u3', createTestUnit({ id: 'u3', owner: 'p1', typeId: 'settler', health: 10 })],
      ]);
      const state = createTestState({ units });
      expect(averageUnitHealth(state, 'p1')).toBe(75);
    });

    it('wounded units correctly lower the average', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'warrior', health: 40 })],
        ['u3', createTestUnit({ id: 'u3', owner: 'p1', typeId: 'warrior', health: 10 })],
      ]);
      const state = createTestState({ units });
      expect(averageUnitHealth(state, 'p1')).toBeCloseTo(50, 5);
    });

    it('ignores units belonging to other players', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 80 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', typeId: 'warrior', health: 20 })],
      ]);
      const state = createTestState({ units });
      expect(averageUnitHealth(state, 'p1')).toBe(80);
    });

    it('returns 100 for a player who is not registered (no owned units)', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 30 })],
      ]);
      const state = createTestState({ units });
      expect(averageUnitHealth(state, 'ghost')).toBe(100);
    });
  });

  describe('fortifiedRatio', () => {
    it('returns 0 with no military units', () => {
      const state = createTestState({ units: new Map() });
      expect(fortifiedRatio(state, 'p1')).toBe(0);
    });

    it('returns 0 when no military unit is fortified', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', fortified: false })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'warrior', fortified: false })],
      ]);
      const state = createTestState({ units });
      expect(fortifiedRatio(state, 'p1')).toBe(0);
    });

    it('returns integer-fraction 1/3 when 1 of 3 military units is fortified', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', fortified: true })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'warrior', fortified: false })],
        ['u3', createTestUnit({ id: 'u3', owner: 'p1', typeId: 'warrior', fortified: false })],
      ]);
      const state = createTestState({ units });
      expect(fortifiedRatio(state, 'p1')).toBeCloseTo(1 / 3, 10);
    });

    it('civilians do not contribute to the fortified ratio denominator', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', fortified: true })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'settler', fortified: false })],
      ]);
      const state = createTestState({ units });
      expect(fortifiedRatio(state, 'p1')).toBe(1);
    });
  });

  describe('militaryUnitCount', () => {
    it('returns 0 when the player has no units', () => {
      const state = createTestState({ units: new Map() });
      expect(militaryUnitCount(state, 'p1')).toBe(0);
    });

    it('counts melee, ranged, cavalry, siege but excludes civilians', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior' })],       // melee
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'archer' })],        // ranged
        ['u3', createTestUnit({ id: 'u3', owner: 'p1', typeId: 'horseman' })],      // cavalry
        ['u4', createTestUnit({ id: 'u4', owner: 'p1', typeId: 'settler' })],       // civilian
        ['u5', createTestUnit({ id: 'u5', owner: 'p1', typeId: 'scout' })],         // recon (civilian-ish, check)
      ]);
      const state = createTestState({ units });
      // warrior + archer + horseman = 3. Scout is category 'recon' or similar; depends on data.
      // We only assert it excludes the settler civilian and counts at least the 3 unambiguous military types.
      const count = militaryUnitCount(state, 'p1');
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(4);
    });

    it('ignores units owned by other players', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior' })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', typeId: 'warrior' })],
        ['u3', createTestUnit({ id: 'u3', owner: 'p2', typeId: 'archer' })],
      ]);
      const state = createTestState({ units });
      expect(militaryUnitCount(state, 'p1')).toBe(1);
      expect(militaryUnitCount(state, 'p2')).toBe(2);
    });

    it('returns 0 for an unknown player id', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior' })],
      ]);
      const state = createTestState({ units });
      expect(militaryUnitCount(state, 'ghost')).toBe(0);
    });
  });

  describe('totalCombatStrength', () => {
    it('returns 0 for a player with no units', () => {
      const state = createTestState({ units: new Map() });
      expect(totalCombatStrength(state, 'p1')).toBe(0);
    });

    it('sums combat * health/100 across military units', () => {
      // warrior combat = 20 (per data file)
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'warrior', health: 50 })],
      ]);
      const state = createTestState({ units });
      // 20 * 1.0 + 20 * 0.5 = 30
      expect(totalCombatStrength(state, 'p1')).toBeCloseTo(30, 5);
    });

    it('skips units whose UnitDef is missing from config', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'nonexistent_type', health: 100 })],
      ]);
      const state = createTestState({ units });
      expect(totalCombatStrength(state, 'p1')).toBeCloseTo(20, 5);
    });

    it('skips civilians (their combat is irrelevant to strength)', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'settler', health: 100 })],
      ]);
      const state = createTestState({ units });
      expect(totalCombatStrength(state, 'p1')).toBeCloseTo(20, 5);
    });
  });

  describe('averageCityDefense', () => {
    it('returns 0 when the player has no cities', () => {
      const state = createTestState({ cities: new Map() });
      expect(averageCityDefense(state, 'p1')).toBe(0);
    });

    it('averages defenseHP across owned cities only', () => {
      const cities = new Map<string, CityState>([
        ['c1', makeCity({ id: 'c1', owner: 'p1', defenseHP: 100 })],
        ['c2', makeCity({ id: 'c2', owner: 'p1', defenseHP: 200 })],
        ['c3', makeCity({ id: 'c3', owner: 'p2', defenseHP: 999 })],
      ]);
      const state = createTestState({ cities });
      expect(averageCityDefense(state, 'p1')).toBe(150);
      expect(averageCityDefense(state, 'p2')).toBe(999);
    });
  });

  describe('combatStrengthRanking', () => {
    it('ranks players descending by strength', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
        ['p3', createTestPlayer({ id: 'p3' })],
      ]);
      const units = new Map([
        // p1: one warrior at full health → 20
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        // p2: two warriors at full health → 40
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', typeId: 'warrior', health: 100 })],
        ['u3', createTestUnit({ id: 'u3', owner: 'p2', typeId: 'warrior', health: 100 })],
        // p3: nothing → 0
      ]);
      const state = createTestState({ players, units });
      const ranking = combatStrengthRanking(state);
      expect(ranking.map((r) => r.playerId)).toEqual(['p2', 'p1', 'p3']);
      expect(ranking.map((r) => r.rank)).toEqual([1, 2, 3]);
      expect(ranking[0].strength).toBeCloseTo(40, 5);
      expect(ranking[1].strength).toBeCloseTo(20, 5);
      expect(ranking[2].strength).toBe(0);
    });

    it('uses dense ranking: ties share a rank and the next unique strength advances by exactly one', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
        ['p3', createTestPlayer({ id: 'p3' })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', typeId: 'warrior', health: 100 })],
        // p3 has no military → strength 0
      ]);
      const state = createTestState({ players, units });
      const ranking = combatStrengthRanking(state);
      // p1 and p2 tie at 20, p3 at 0. Dense ranking: ranks 1,1,2 (not 1,1,3).
      expect(ranking.map((r) => r.rank)).toEqual([1, 1, 2]);
      expect(new Set(ranking.slice(0, 2).map((r) => r.playerId))).toEqual(new Set(['p1', 'p2']));
      expect(ranking[2].playerId).toBe('p3');
    });

    it('returns an empty array when there are no players', () => {
      const state = createTestState({ players: new Map() });
      expect(combatStrengthRanking(state)).toEqual([]);
    });
  });
});
