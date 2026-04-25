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
 * Helper — attach an initial `religion` slot to a GameState. The slot
 * is now a first-class optional field on GameState (cycle E); this
 * helper is a thin convenience for tests that want to seed pre-existing
 * religions.
 */
function withReligionSlot(
  state: GameState,
  religions: ReadonlyArray<ReligionRecord>,
): GameState {
  return { ...state, religion: { religions } };
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

    it('passes through FOUND_RELIGION when no city matches (invalid state, pass-through)', () => {
      const state = createTestState();
      // No city c1 in state → system returns unchanged state.
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1_nonexistent',
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
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 40, researchedCivics: ['mysticism'] })]]),
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
        players: new Map([['p1', createTestPlayer({ id: 'p1', name: 'Rome', faith: 100, researchedCivics: ['mysticism'] })]]),
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
    // F-03 (W2-04): pantheon is NO LONGER a prerequisite. This test was
    // renamed from "returns state unchanged when player has no pantheon" —
    // that scenario now SUCCEEDS per Civ VII §18 (with Piety + Temple gates).
    it('religion can be founded without a pantheon (F-03 — Civ VII §18)', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1', buildings: ['temple'] });
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, pantheonId: null, researchedCivics: ['piety'] })],
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
      // Must SUCCEED — pantheon is not required in VII.
      expect(next).not.toBe(state);
      // F-04: No faith cost to found a religion in Civ VII
      expect(next.players.get('p1')!.faith).toBe(500);
      expect(next.religion).toBeDefined();
      expect(next.religion!.religions.length).toBe(1);
      expect(next.religion!.religions[0].name).toBe('Zen');
    });

    // X4.3: Piety civic gate
    it('returns state unchanged when player lacks Piety civic (X4.3)', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1', buildings: ['temple'] });
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, researchedCivics: [] })],
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

    // X4.3: Temple gate
    it('returns state unchanged when holy city has no Temple (X4.3)', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1', buildings: [] });
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, researchedCivics: ['piety'] })],
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

    it('founds religion even with low faith — F-04 removed faith cost (Civ VII)', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1', buildings: ['temple'] });
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 150, pantheonId: 'god_of_healing', researchedCivics: ['piety'] })],
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
      // F-04: No faith cost — founding succeeds regardless of faith amount
      expect(next).not.toBe(state);
      expect(next.players.get('p1')!.faith).toBe(150);
      expect(next.religion).toBeDefined();
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
    it('appends a ReligionRecord — F-04 no faith deduction (Civ VII)', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1', name: 'Rome', buildings: ['temple'] });
      const base = createTestState({
        turn: 12,
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, pantheonId: 'god_of_healing', researchedCivics: ['piety'] })],
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
      // F-04: No faith deduction — founding a religion is free in Civ VII
      expect(next.players.get('p1')!.faith).toBe(500);
      expect(next.religion.religions.length).toBe(1);
      const record = next.religion.religions[0];
      expect(record.name).toBe('Pax Romana');
      expect(record.founderPlayerId).toBe('p1');
      expect(record.founderBeliefId).toBe('world_church'); // DD2: founderBelief from action, no pantheon override
      expect(record.followerBeliefId).toBe('jesuit_education');
      expect(record.holyCityId).toBe('c1');
      expect(record.foundedOnTurn).toBe(12);
      // W7: FOUND_RELIGION now emits 2 events — religion-founded + starting-relic-awarded
      expect(next.log.length).toBe(state.log.length + 2);
    });

    it('lazily initializes state.religion when absent on first successful FOUND_RELIGION', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1', buildings: ['temple'] });
      const state = createTestState({
        turn: 4,
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 500, pantheonId: 'god_of_healing', researchedCivics: ['piety'] })],
        ]),
        cities: new Map([['c1', city]]),
      });
      // Precondition: state has no religion slot.
      expect(state.religion).toBeUndefined();
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      };
      const next = religionSystem(state, action);
      // Slot now exists, single record appended, no faith deducted (F-04).
      expect(next.religion).toBeDefined();
      expect(next.religion!.religions.length).toBe(1);
      expect(next.religion!.religions[0].name).toBe('Zen');
      expect(next.religion!.religions[0].foundedOnTurn).toBe(4);
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
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 25, researchedCivics: ['mysticism'] })]]),
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

  // ── W7: EARN_RELIC handler ──────────────────────────────────────────────
  describe('EARN_RELIC', () => {
    it('appends relicId to player.relics when player has no relics yet', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      });
      const next = religionSystem(state, {
        type: 'EARN_RELIC',
        playerId: 'p1',
        relicId: 'ark_of_the_covenant',
      });
      expect(next.players.get('p1')!.relics).toEqual(['ark_of_the_covenant']);
    });

    it('appends relicId when player already has other relics', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', relics: ['shroud_of_turin'] })]]),
      });
      const next = religionSystem(state, {
        type: 'EARN_RELIC',
        playerId: 'p1',
        relicId: 'ark_of_the_covenant',
      });
      expect(next.players.get('p1')!.relics).toEqual(['shroud_of_turin', 'ark_of_the_covenant']);
    });

    it('appends a legacy log event describing the acquisition', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', name: 'Rome' })]]),
      });
      const next = religionSystem(state, {
        type: 'EARN_RELIC',
        playerId: 'p1',
        relicId: 'ark_of_the_covenant',
      });
      expect(next.log.length).toBe(state.log.length + 1);
      const last = next.log[next.log.length - 1];
      expect(last.type).toBe('legacy');
      expect(last.playerId).toBe('p1');
      expect(last.message).toContain('Ark of the Covenant');
    });

    it('returns state unchanged when relicId is not in state.config.relics', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      });
      const next = religionSystem(state, {
        type: 'EARN_RELIC',
        playerId: 'p1',
        relicId: 'nonexistent_relic',
      });
      expect(next).toBe(state);
    });

    it('returns state unchanged when player already has the relic (no duplicates)', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', relics: ['ark_of_the_covenant'] })]]),
      });
      const next = religionSystem(state, {
        type: 'EARN_RELIC',
        playerId: 'p1',
        relicId: 'ark_of_the_covenant',
      });
      expect(next).toBe(state);
      expect(next.players.get('p1')!.relics).toEqual(['ark_of_the_covenant']);
    });

    it('returns state unchanged when playerId is unknown', () => {
      const state = createTestState();
      const next = religionSystem(state, {
        type: 'EARN_RELIC',
        playerId: 'ghost',
        relicId: 'ark_of_the_covenant',
      });
      expect(next).toBe(state);
    });

    it('does not mutate the original state (immutability)', () => {
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      });
      const frozenRelics = state.players.get('p1')!.relics;
      religionSystem(state, {
        type: 'EARN_RELIC',
        playerId: 'p1',
        relicId: 'ark_of_the_covenant',
      });
      expect(state.players.get('p1')!.relics).toBe(frozenRelics);
    });
  });

  // ── W7: FOUND_RELIGION starting relic ──────────────────────────────────
  describe('FOUND_RELIGION — starting relic (W7)', () => {
    it('auto-awards the first unclaimed relic to the founding player', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1', name: 'Rome', buildings: ['temple'] });
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 500, researchedCivics: ['piety'] })]]),
        cities: new Map([['c1', city]]),
      });
      const next = religionSystem(state, {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      });
      const relics = next.players.get('p1')!.relics ?? [];
      expect(relics.length).toBe(1);
      const validRelicIds = [
        'ark_of_the_covenant', 'shroud_of_turin', 'sacred_tooth',
        'staff_of_moses', 'spear_of_destiny', 'holy_grail',
      ];
      expect(validRelicIds).toContain(relics[0]);
    });

    it('does not award the same relic twice if another player already has it', () => {
      const cityA = createTestCity({ id: 'cA', owner: 'p1', name: 'Rome', position: { q: 0, r: 0 }, buildings: ['temple'] });
      const cityB = createTestCity({ id: 'cB', owner: 'p2', name: 'Athens', position: { q: 5, r: 0 }, buildings: ['temple'] });
      const p1AllButShroud = [
        'ark_of_the_covenant', 'sacred_tooth', 'staff_of_moses',
        'spear_of_destiny', 'holy_grail',
      ];
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', relics: p1AllButShroud, researchedCivics: ['piety'] })],
          ['p2', createTestPlayer({ id: 'p2', faith: 500, researchedCivics: ['piety'] })],
        ]),
        cities: new Map([
          ['cA', cityA],
          ['cB', cityB],
        ]),
      });
      const next = religionSystem(state, {
        type: 'FOUND_RELIGION',
        playerId: 'p2',
        cityId: 'cB',
        religionName: 'Olympism',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      });
      const p2Relics = next.players.get('p2')!.relics ?? [];
      expect(p2Relics).toEqual(['shroud_of_turin']);
    });

    it('emits a second log event for the relic award', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1', name: 'Rome', buildings: ['temple'] });
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 500, researchedCivics: ['piety'] })]]),
        cities: new Map([['c1', city]]),
      });
      const next = religionSystem(state, {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      });
      expect(next.log.length).toBe(state.log.length + 2);
      const relicEvent = next.log[next.log.length - 1];
      expect(relicEvent.type).toBe('legacy');
      expect(relicEvent.playerId).toBe('p1');
    });

    it('gracefully skips relic award when all relics are already owned', () => {
      const city = createTestCity({ id: 'c1', owner: 'p1', name: 'Rome', buildings: ['temple'] });
      const allRelicIds = [
        'ark_of_the_covenant', 'shroud_of_turin', 'sacred_tooth',
        'staff_of_moses', 'spear_of_destiny', 'holy_grail',
      ];
      const state = createTestState({
        players: new Map([['p1', createTestPlayer({ id: 'p1', faith: 500, relics: allRelicIds, researchedCivics: ['piety'] })]]),
        cities: new Map([['c1', city]]),
      });
      const next = religionSystem(state, {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Zen',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      });
      expect(next.log.length).toBe(state.log.length + 1);
      expect(next.players.get('p1')!.relics).toEqual(allRelicIds);
    });
  });

  // ── Y5.4: Religion F-03 — FOUND_RELIGION must NOT deduct player.faith ──────
  describe('Y5.4: FOUND_RELIGION does NOT deduct player.faith (VII has no Faith currency cost)', () => {
    it('founding a religion leaves player.faith unchanged', () => {
      // R5 verifier flagged that player.faith deduction was still present in
      // FOUND_RELIGION. This test confirms the handler is faith-cost-free:
      // player.faith before and after FOUND_RELIGION must be identical.
      const city = createTestCity({ id: 'c1', owner: 'p1', buildings: ['temple'] });
      const startingFaith = 250;
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: startingFaith, researchedCivics: ['piety'] })],
        ]),
        cities: new Map([['c1', city]]),
      });
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Buddhism',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      };
      const next = religionSystem(state, action);
      // Religion must have been founded successfully
      expect(next.religion?.religions.length).toBe(1);
      // Faith must not have been deducted — VII founding cost is zero
      expect(next.players.get('p1')!.faith).toBe(startingFaith);
    });
  });

  // ── AA5.3: player.faith field is NOT dead (R7 / Y5.4 finding) ──────────────
  describe('AA5.3: player.faith is alive — used for ADOPT_PANTHEON, not deducted by FOUND_RELIGION', () => {
    it('FOUND_RELIGION succeeds with faith=0 (no faith cost per F-04)', () => {
      // AA5.3 confirmed player.faith remains active: ADOPT_PANTHEON deducts it.
      // FOUND_RELIGION does NOT deduct faith (Y5.4/F-04).
      // This test is the required pure verification that founding works
      // regardless of faith balance.
      const city = createTestCity({ id: 'c1', owner: 'p1', buildings: ['temple'] });
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 0, researchedCivics: ['piety'] })],
        ]),
        cities: new Map([['c1', city]]),
      });
      const action: ReligionAction = {
        type: 'FOUND_RELIGION',
        playerId: 'p1',
        cityId: 'c1',
        religionName: 'Buddhism',
        founderBelief: 'world_church',
        followerBelief: 'jesuit_education',
      };
      const next = religionSystem(state, action);
      // Religion founding must succeed even with faith=0
      expect(next.religion?.religions.length).toBe(1);
      // Faith stays at 0 — no deduction occurred
      expect(next.players.get('p1')!.faith).toBe(0);
    });
  });
});
