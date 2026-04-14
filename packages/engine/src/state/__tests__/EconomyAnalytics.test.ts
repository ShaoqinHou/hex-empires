import { describe, it, expect } from 'vitest';
import {
  totalOwnedUnits,
  totalOwnedCities,
  totalPopulation,
  playerRanking,
  economicLead,
} from '../EconomyAnalytics';
import { createTestState, createTestUnit, createTestPlayer } from '../../systems/__tests__/helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'TestCity',
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
    ...overrides,
  };
}

describe('totalOwnedUnits', () => {
  it('returns 0 when there are no units at all', () => {
    const state = createTestState();
    expect(totalOwnedUnits(state, 'p1')).toBe(0);
  });

  it('returns 0 for a player that does not exist', () => {
    const state = createTestState({
      units: new Map([['u1', createTestUnit({ id: 'u1', owner: 'p1' })]]),
    });
    expect(totalOwnedUnits(state, 'ghost')).toBe(0);
  });

  it('counts only units owned by the requested player', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1' })],
      ['u2', createTestUnit({ id: 'u2', owner: 'p1' })],
      ['u3', createTestUnit({ id: 'u3', owner: 'p2' })],
    ]);
    const state = createTestState({ units });
    expect(totalOwnedUnits(state, 'p1')).toBe(2);
    expect(totalOwnedUnits(state, 'p2')).toBe(1);
  });
});

describe('totalOwnedCities', () => {
  it('returns 0 when there are no cities at all', () => {
    const state = createTestState();
    expect(totalOwnedCities(state, 'p1')).toBe(0);
  });

  it('counts only cities owned by the requested player', () => {
    const cities = new Map([
      ['c1', createTestCity({ id: 'c1', owner: 'p1' })],
      ['c2', createTestCity({ id: 'c2', owner: 'p2' })],
      ['c3', createTestCity({ id: 'c3', owner: 'p1' })],
    ]);
    const state = createTestState({ cities });
    expect(totalOwnedCities(state, 'p1')).toBe(2);
    expect(totalOwnedCities(state, 'p2')).toBe(1);
    expect(totalOwnedCities(state, 'p3')).toBe(0);
  });
});

describe('totalPopulation', () => {
  it('returns 0 when player has no cities', () => {
    const state = createTestState();
    expect(totalPopulation(state, 'p1')).toBe(0);
  });

  it('sums population across all owned cities only', () => {
    const cities = new Map([
      ['c1', createTestCity({ id: 'c1', owner: 'p1', population: 4 })],
      ['c2', createTestCity({ id: 'c2', owner: 'p1', population: 7 })],
      ['c3', createTestCity({ id: 'c3', owner: 'p2', population: 10 })],
    ]);
    const state = createTestState({ cities });
    expect(totalPopulation(state, 'p1')).toBe(11);
    expect(totalPopulation(state, 'p2')).toBe(10);
  });
});

describe('playerRanking', () => {
  it('returns an empty array when there are no players', () => {
    const state = createTestState({ players: new Map() });
    expect(playerRanking(state, 'gold')).toEqual([]);
  });

  it('ranks players by gold descending with rank 1 for the richest', () => {
    const players = new Map([
      ['a', createTestPlayer({ id: 'a', gold: 300 })],
      ['b', createTestPlayer({ id: 'b', gold: 200 })],
      ['c', createTestPlayer({ id: 'c', gold: 100 })],
    ]);
    const state = createTestState({ players });
    const ranking = playerRanking(state, 'gold');
    expect(ranking).toEqual([
      { playerId: 'a', value: 300, rank: 1 },
      { playerId: 'b', value: 200, rank: 2 },
      { playerId: 'c', value: 100, rank: 3 },
    ]);
  });

  it('assigns dense ranks so ties share a rank and the next player gets rank+1', () => {
    const players = new Map([
      ['a', createTestPlayer({ id: 'a', gold: 300 })],
      ['b', createTestPlayer({ id: 'b', gold: 200 })],
      ['c', createTestPlayer({ id: 'c', gold: 200 })],
      ['d', createTestPlayer({ id: 'd', gold: 50 })],
    ]);
    const state = createTestState({ players });
    const ranking = playerRanking(state, 'gold');
    const byId = new Map(ranking.map((e) => [e.playerId, e.rank] as const));
    expect(byId.get('a')).toBe(1);
    expect(byId.get('b')).toBe(2);
    expect(byId.get('c')).toBe(2);
    expect(byId.get('d')).toBe(3);
  });

  it('ranks by city count for the "cities" metric', () => {
    const players = new Map([
      ['a', createTestPlayer({ id: 'a' })],
      ['b', createTestPlayer({ id: 'b' })],
    ]);
    const cities = new Map([
      ['c1', createTestCity({ id: 'c1', owner: 'a' })],
      ['c2', createTestCity({ id: 'c2', owner: 'a' })],
      ['c3', createTestCity({ id: 'c3', owner: 'b' })],
    ]);
    const state = createTestState({ players, cities });
    const ranking = playerRanking(state, 'cities');
    expect(ranking[0]).toEqual({ playerId: 'a', value: 2, rank: 1 });
    expect(ranking[1]).toEqual({ playerId: 'b', value: 1, rank: 2 });
  });

  it('ranks by unit count for the "units" metric', () => {
    const players = new Map([
      ['a', createTestPlayer({ id: 'a' })],
      ['b', createTestPlayer({ id: 'b' })],
    ]);
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'a' })],
      ['u2', createTestUnit({ id: 'u2', owner: 'b' })],
      ['u3', createTestUnit({ id: 'u3', owner: 'b' })],
      ['u4', createTestUnit({ id: 'u4', owner: 'b' })],
    ]);
    const state = createTestState({ players, units });
    const ranking = playerRanking(state, 'units');
    expect(ranking[0]).toEqual({ playerId: 'b', value: 3, rank: 1 });
    expect(ranking[1]).toEqual({ playerId: 'a', value: 1, rank: 2 });
  });

  it('ranks by summed population for the "population" metric', () => {
    const players = new Map([
      ['a', createTestPlayer({ id: 'a' })],
      ['b', createTestPlayer({ id: 'b' })],
    ]);
    const cities = new Map([
      ['c1', createTestCity({ id: 'c1', owner: 'a', population: 3 })],
      ['c2', createTestCity({ id: 'c2', owner: 'a', population: 3 })],
      ['c3', createTestCity({ id: 'c3', owner: 'b', population: 5 })],
    ]);
    const state = createTestState({ players, cities });
    const ranking = playerRanking(state, 'population');
    expect(ranking[0]).toEqual({ playerId: 'a', value: 6, rank: 1 });
    expect(ranking[1]).toEqual({ playerId: 'b', value: 5, rank: 2 });
  });

  it('treats missing "score" field as 0 for every player without regression', () => {
    const players = new Map([
      ['a', createTestPlayer({ id: 'a' })],
      ['b', createTestPlayer({ id: 'b' })],
    ]);
    const state = createTestState({ players });
    const ranking = playerRanking(state, 'score');
    expect(ranking).toHaveLength(2);
    for (const entry of ranking) {
      expect(entry.value).toBe(0);
      expect(entry.rank).toBe(1); // all tied at zero under dense ranking
    }
  });
});

describe('economicLead', () => {
  it('returns -1 for a non-existent player', () => {
    const state = createTestState();
    expect(economicLead(state, 'ghost')).toBe(-1);
  });

  it('returns 0 for the leader in gold', () => {
    const players = new Map([
      ['a', createTestPlayer({ id: 'a', gold: 500 })],
      ['b', createTestPlayer({ id: 'b', gold: 200 })],
    ]);
    const state = createTestState({ players });
    expect(economicLead(state, 'a')).toBe(0);
  });

  it('returns rank-1 for trailing players', () => {
    const players = new Map([
      ['a', createTestPlayer({ id: 'a', gold: 500 })],
      ['b', createTestPlayer({ id: 'b', gold: 300 })],
      ['c', createTestPlayer({ id: 'c', gold: 100 })],
    ]);
    const state = createTestState({ players });
    expect(economicLead(state, 'b')).toBe(1);
    expect(economicLead(state, 'c')).toBe(2);
  });

  it('returns 0 when the player is tied for first', () => {
    const players = new Map([
      ['a', createTestPlayer({ id: 'a', gold: 400 })],
      ['b', createTestPlayer({ id: 'b', gold: 400 })],
      ['c', createTestPlayer({ id: 'c', gold: 100 })],
    ]);
    const state = createTestState({ players });
    expect(economicLead(state, 'a')).toBe(0);
    expect(economicLead(state, 'b')).toBe(0);
    expect(economicLead(state, 'c')).toBe(1);
  });
});
