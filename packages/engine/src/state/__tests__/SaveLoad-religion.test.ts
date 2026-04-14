import { describe, it, expect } from 'vitest';
import { serializeState, deserializeState } from '../SaveLoad';
import type { GameState } from '../../types/GameState';
import type { ReligionRecord, ReligionSlotState } from '../../types/Religion';

/**
 * SaveLoad — religion-slot round-trip and pre-M17 legacy-save migration.
 *
 * The generic Map/Set replacer+reviver in SaveLoad.ts is expected to
 * handle `state.religion.pantheonClaims` (a ReadonlyMap) without any
 * religion-specific carve-out; these tests pin that behavior and also
 * guard the pre-religion legacy save path (no `religion` key in JSON)
 * so religionSystem can continue lazy-initializing on first action.
 */

function createMinimalState(religion?: ReligionSlotState): GameState {
  const base = {
    turn: 7,
    currentPlayerId: 'p1',
    phase: 'actions' as const,
    players: new Map([['p1', {
      id: 'p1', name: 'Test', isHuman: true, civilizationId: 'rome', leaderId: 'augustus',
      age: 'antiquity' as const, researchedTechs: ['pottery'],
      currentResearch: 'archery', researchProgress: 10, gold: 100,
      science: 20, culture: 10, faith: 50, influence: 0, ageProgress: 5,
      legacyBonuses: [], visibility: new Set(['0,0']), explored: new Set(['0,0']),
    }]]),
    map: { width: 3, height: 3, tiles: new Map([['0,0', {
      coord: { q: 0, r: 0 }, terrain: 'grassland', feature: null,
      resource: null, river: [], elevation: 0.3, continent: 1,
    }]]), wrapX: false },
    units: new Map(),
    cities: new Map(),
    tradeRoutes: new Map(),
    diplomacy: { relations: new Map() },
    age: { currentAge: 'antiquity' as const, ageThresholds: { exploration: 50, modern: 100 } },
    crises: [],
    victory: { winner: null, winType: null, progress: new Map() },
    log: [],
    rng: { seed: 1, counter: 0 },
  };
  const withReligion = religion === undefined ? base : { ...base, religion };
  return withReligion as unknown as GameState;
}

const sampleRecord: ReligionRecord = {
  id: 'religion.p1.buddhism',
  name: 'Buddhism',
  founderPlayerId: 'p1',
  founderBeliefId: 'belief.founder.tithe',
  followerBeliefId: 'belief.follower.pagodas',
  holyCityId: 'city.p1.0',
  foundedOnTurn: 42,
};

describe('SaveLoad — religion slot', () => {
  it('round-trips state with religion === undefined (absent slot)', () => {
    const state = createMinimalState(undefined);
    const json = serializeState(state);
    const restored = deserializeState(json);
    expect(restored.religion).toBeUndefined();
  });

  it('round-trips empty religion slot (no records, no pantheon map)', () => {
    const state = createMinimalState({ religions: [] });
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.religion).toBeDefined();
    expect(restored.religion!.religions).toEqual([]);
    expect(restored.religion!.pantheonClaims).toBeUndefined();
  });

  it('round-trips empty religion slot with empty pantheonClaims Map', () => {
    const state = createMinimalState({ religions: [], pantheonClaims: new Map() });
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.religion).toBeDefined();
    expect(restored.religion!.religions).toEqual([]);
    expect(restored.religion!.pantheonClaims).toBeInstanceOf(Map);
    expect(restored.religion!.pantheonClaims!.size).toBe(0);
  });

  it('preserves ReligionRecord fields exactly through a round-trip', () => {
    const state = createMinimalState({ religions: [sampleRecord] });
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.religion!.religions).toHaveLength(1);
    const record = restored.religion!.religions[0];
    expect(record.id).toBe('religion.p1.buddhism');
    expect(record.name).toBe('Buddhism');
    expect(record.founderPlayerId).toBe('p1');
    expect(record.founderBeliefId).toBe('belief.founder.tithe');
    expect(record.followerBeliefId).toBe('belief.follower.pagodas');
    expect(record.holyCityId).toBe('city.p1.0');
    expect(record.foundedOnTurn).toBe(42);
  });

  it('preserves pantheonClaims Map contents and type', () => {
    const claims = new Map<string, string>([
      ['pantheon.dance_of_aurora', 'p1'],
      ['pantheon.sun_god', 'p2'],
    ]);
    const state = createMinimalState({ religions: [], pantheonClaims: claims });
    const json = serializeState(state);
    const restored = deserializeState(json);

    const restoredClaims = restored.religion!.pantheonClaims;
    expect(restoredClaims).toBeInstanceOf(Map);
    expect(restoredClaims!.size).toBe(2);
    expect(restoredClaims!.get('pantheon.dance_of_aurora')).toBe('p1');
    expect(restoredClaims!.get('pantheon.sun_god')).toBe('p2');
  });

  it('serializes Map entries with the __type marker (shared Map handling)', () => {
    const claims = new Map<string, string>([['pantheon.sun_god', 'p1']]);
    const state = createMinimalState({ religions: [], pantheonClaims: claims });
    const json = serializeState(state);
    const parsed = JSON.parse(json) as { religion: { pantheonClaims: { __type: string; entries: ReadonlyArray<readonly [string, string]> } } };

    expect(parsed.religion.pantheonClaims.__type).toBe('Map');
    expect(parsed.religion.pantheonClaims.entries).toEqual([['pantheon.sun_god', 'p1']]);
  });

  it('round-trips multiple religions preserving order', () => {
    const second: ReligionRecord = {
      id: 'religion.p2.hinduism',
      name: 'Hinduism',
      founderPlayerId: 'p2',
      founderBeliefId: 'belief.founder.dharma',
      followerBeliefId: 'belief.follower.stepwell',
      holyCityId: 'city.p2.0',
      foundedOnTurn: 55,
    };
    const state = createMinimalState({ religions: [sampleRecord, second] });
    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.religion!.religions).toHaveLength(2);
    expect(restored.religion!.religions[0].id).toBe('religion.p1.buddhism');
    expect(restored.religion!.religions[1].id).toBe('religion.p2.hinduism');
    expect(restored.religion!.religions[1].foundedOnTurn).toBe(55);
  });

  it('migrates pre-M17 legacy saves (no religion key in JSON) to undefined', () => {
    // Simulate a pre-M17 save by emitting JSON that omits the religion
    // field entirely. deserializeState must still succeed and the
    // resulting state.religion must be strictly undefined so
    // religionSystem can lazy-init on first action.
    const legacyState = createMinimalState(undefined);
    const legacyJson = serializeState(legacyState);

    // Confirm the legacy JSON actually lacks the religion key.
    const parsed = JSON.parse(legacyJson) as Record<string, unknown>;
    expect('religion' in parsed).toBe(false);

    const restored = deserializeState(legacyJson);
    expect(restored.religion).toBeUndefined();
    // Non-religion state still intact — proves deserialization did not
    // throw and unrelated fields migrate cleanly.
    expect(restored.turn).toBe(7);
    expect(restored.players.get('p1')!.faith).toBe(50);
  });

  it('round-trips religion slot alongside unrelated Maps without interference', () => {
    const claims = new Map<string, string>([['pantheon.sun_god', 'p1']]);
    const state = createMinimalState({ religions: [sampleRecord], pantheonClaims: claims });
    const json = serializeState(state);
    const restored = deserializeState(json);

    // Religion slot intact
    expect(restored.religion!.religions[0].id).toBe('religion.p1.buddhism');
    expect(restored.religion!.pantheonClaims!.get('pantheon.sun_god')).toBe('p1');

    // Unrelated Maps still restored as Map instances
    expect(restored.players).toBeInstanceOf(Map);
    expect(restored.units).toBeInstanceOf(Map);
    expect(restored.map.tiles).toBeInstanceOf(Map);
  });
});
