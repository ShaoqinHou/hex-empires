import { describe, it, expect } from 'vitest';
import { religionSystem, canAdoptPantheon } from '../religionSystem';
import type { ReligionAction, ReligionRecord } from '../../types/Religion';
import type { CityState, GameState } from '../../types/GameState';
import { createTestState, createTestPlayer } from './helpers';

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
    territory: [],
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

/**
 * Helper — tack the (out-of-scope-to-widen) `religion` slot onto a
 * GameState via structural cast. Lets tests exercise the "valid"
 * branch of FOUND_RELIGION.
 */
function withReligionSlot(
  state: GameState,
  religions: ReadonlyArray<ReligionRecord>,
): GameState {
  return { ...state, religion: { religions } } as GameState & {
    readonly religion: { readonly religions: ReadonlyArray<ReligionRecord> };
  };
}

describe('religionSystem', () => {
  describe('purity / pass-through', () => {
    it('returns the identical state reference for non-religion actions', () => {
      const state = createTestState();
      const next = religionSystem(state, { type: 'START_TURN' });
      expect(next).toBe(state);
    });

    it('returns identical state for END_TURN (another pass-through action)', () => {
      const state = createTestState();
      const next = religionSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });

    it('is deterministic: same input yields equal output', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 30 })]]),
      });
      const action: ReligionAction = {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_healing',
      };
      const a = religionSystem(state, action);
      const b = religionSystem(state, action);
      expect(a.players.get('p1')!.faith).toBe(b.players.get('p1')!.faith);
      expect(a.log.length).toBe(b.log.length);
    });

    it('passes through non-ADOPT_PANTHEON religion actions (e.g. FOUND_RELIGION)', () => {
      const state = createTestState();
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'b1',
        followerBelief: 'b2',
      };
      const next = religionSystem(state, action);
      expect(next).toBe(state);
    });
  });

  describe('ADOPT_PANTHEON — valid', () => {
    it('deducts faithCost from the player when faith is sufficient', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 40 })]]),
      });
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_healing', // faithCost 25
      });
      expect(next.players.get('p1')!.faith).toBe(15);
    });

    it('appends a legacy-type log event describing the adoption', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', name: 'Rome', faith: 100 })]]),
      });
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_war',
      });
      expect(next.log.length).toBe(state.log.length + 1);
      const last = next.log[next.log.length - 1];
      expect(last.type).toBe('legacy');
      expect(last.playerId).toBe('p1');
      expect(last.message).toContain('God of War');
    });

    it('does not mutate the original state (immutability)', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 50 })]]),
      });
      const frozenFaith = state.players.get('p1')!.faith;
      const frozenLogLen = state.log.length;
      religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_craftsmen',
      });
      expect(state.players.get('p1')!.faith).toBe(frozenFaith);
      expect(state.log.length).toBe(frozenLogLen);
    });

    it('leaves unrelated state fields (turn, phase, map) untouched', () => {
      const state = createTestState({
        turn: 7,
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 60 })]]),
      });
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_healing',
      });
      expect(next.turn).toBe(7);
      expect(next.phase).toBe(state.phase);
      expect(next.map).toBe(state.map);
    });
  });

  describe('ADOPT_PANTHEON — invalid (state unchanged)', () => {
    it('returns state unchanged when pantheonId is not in the catalog', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 100 })]]),
      });
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'does_not_exist',
      });
      expect(next).toBe(state);
      expect(next.players.get('p1')!.faith).toBe(100);
    });

    it('returns state unchanged when player has insufficient faith', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 10 })]]),
      });
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_healing', // cost 25 > 10
      });
      expect(next).toBe(state);
      expect(next.players.get('p1')!.faith).toBe(10);
    });

    it('returns state unchanged when the player id is unknown', () => {
      const state = createTestState();
      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'ghost',
        pantheonId: 'god_of_healing',
      });
      expect(next).toBe(state);
    });
  });

  describe('FOUND_RELIGION — invalid (state unchanged)', () => {
    it('returns state unchanged when player has no pantheon', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1' });
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, pantheonId: null })],
        ]),
        cities: new Map([['c1', city]]),
      });
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      };
      const next = religionSystem(state, action);
      expect(next).toBe(state);
      expect(next.players.get('p1')!.faith).toBe(500);
    });

    it('returns state unchanged when founder belief is not in catalog', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1' });
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, pantheonId: 'god_of_healing' })],
        ]),
        cities: new Map([['c1', city]]),
      });
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'not_a_real_belief',
        followerBelief: 'jesuit_education',
      };
      const next = religionSystem(state, action);
      expect(next).toBe(state);
      expect(next.players.get('p1')!.faith).toBe(500);
    });

    it('returns state unchanged when follower belief is not in catalog', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1' });
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, pantheonId: 'god_of_healing' })],
        ]),
        cities: new Map([['c1', city]]),
      });
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'world_church',
        followerBelief: 'phantom_follower_belief',
      };
      const next = religionSystem(state, action);
      expect(next).toBe(state);
    });

    it('returns state unchanged when player has insufficient faith (<200)', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1' });
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 150, pantheonId: 'god_of_healing' })],
        ]),
        cities: new Map([['c1', city]]),
      });
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      };
      const next = religionSystem(state, action);
      expect(next).toBe(state);
      expect(next.players.get('p1')!.faith).toBe(150);
    });

    it('returns state unchanged when holy city id is unknown', () => {
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, pantheonId: 'god_of_healing' })],
        ]),
        cities: new Map(),
      });
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'ghost_city',
        religionName: 'Zen',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      };
      const next = religionSystem(state, action);
      expect(next).toBe(state);
    });

    it('returns state unchanged when holy city is owned by another player', () => {
      const city = createTestCity({ id: 'c1', owner: 'p2' });
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, pantheonId: 'god_of_healing' })],
        ]),
        cities: new Map([['c1', city]]),
      });
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      };
      const next = religionSystem(state, action);
      expect(next).toBe(state);
    });
  });

  describe('FOUND_RELIGION — valid (with religion slot)', () => {
    it('appends a ReligionRecord and deducts 200 faith when state has a religion slot', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1', name: 'Rome' });
      const base = createTestState({
        turn: 12,
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, pantheonId: 'god_of_healing' })],
        ]),
        cities: new Map([['c1', city]]),
      });
      const state = withReligionSlot(base, []);
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Pax Romana',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      };
      const next = religionSystem(state, action) as GameState & {
        readonly religion: { readonly religions: ReadonlyArray<ReligionRecord> };
      };
      expect(next.players.get('p1')!.faith).toBe(300);
      expect(next.religion.religions.length).toBe(1);
      const record = next.religion.religions[0];
      expect(record.name).toBe('Pax Romana');
      expect(record.founderPlayerId).toBe('p1');
      expect(record.founderBeliefId).toBe('world_church');
      expect(record.followerBeliefId).toBe('jesuit_education');
      expect(record.holyCityId).toBe('c1');
      expect(record.foundedOnTurn).toBe(12);
      expect(next.log.length).toBe(state.log.length + 1);
    });

    it('graceful no-op: valid action without a religion slot returns state unchanged', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1' });
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, pantheonId: 'god_of_healing' })],
        ]),
        cities: new Map([['c1', city]]),
      });
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      };
      const next = religionSystem(state, action);
      expect(next).toBe(state);
      expect(next.players.get('p1')!.faith).toBe(500);
    });
  });

  describe('FOUND_RELIGION — belief uniqueness', () => {
    it('a second player cannot claim a founder belief already taken by another religion', () => {
      const cityA = createTestCity({ id: 'cA', owner: 'p1', name: 'Athens' });
      const cityB = createTestCity({
        id: 'cB',
        owner: 'p2',
        name: 'Sparta',
        position: { q: 5, r: 5 },
      });
      const existing: ReligionRecord = {
        id: 'religion.p1.world_church',
        name: 'First Faith',
        founderPlayerId: 'p1',
        founderBeliefId: 'world_church',
        followerBeliefId: 'jesuit_education',
        holyCityId: 'cA',
        foundedOnTurn: 5,
      };
      const base = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 0, pantheonId: 'god_of_healing' })],
          ['p2', createTestPlayer({ id: 'p2', faith: 500, pantheonId: 'god_of_war' })],
        ]),
        cities: new Map([
          ['cA', cityA],
          ['cB', cityB],
        ]),
      });
      const state = withReligionSlot(base, [existing]);

      // p2 tries to claim the same founder belief ('world_church').
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p2',
        cityId: 'cB',
        religionName: 'Second Faith',
        founderBelief: 'world_church', // already taken by p1
        followerBelief: 'choral_music',
      };
      const next = religionSystem(state, action) as GameState & {
        readonly religion: { readonly religions: ReadonlyArray<ReligionRecord> };
      };
      // Still exactly one religion; p2 faith untouched.
      expect(next).toBe(state);
      expect(next.religion.religions.length).toBe(1);
      expect(next.players.get('p2')!.faith).toBe(500);
    });
  });

  describe('canAdoptPantheon helper', () => {
    it('returns true for a known pantheon with enough faith', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 25 })]]),
      });
      expect(canAdoptPantheon(state, 'p1', 'god_of_healing')).toBe(true);
    });

    it('returns false for insufficient faith', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 24 })]]),
      });
      expect(canAdoptPantheon(state, 'p1', 'god_of_healing')).toBe(false);
    });

    it('returns false for an unknown pantheon id', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 9999 })]]),
      });
      expect(canAdoptPantheon(state, 'p1', 'nonexistent_god')).toBe(false);
    });

    it('returns false for an unknown player id', () => {
      const state = createTestState();
      expect(canAdoptPantheon(state, 'missing', 'god_of_healing')).toBe(false);
    });
  });
});
