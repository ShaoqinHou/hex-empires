import { describe, it, expect } from 'vitest';
import { serializeState, deserializeState } from '../SaveLoad';
import type { GameState, PlayerState, CityState } from '../../types/GameState';

/**
 * SaveLoad — pre-Civ-VII-parity legacy-save migration.
 *
 * Mirrors the M17 religion-migration pattern (see SaveLoad-religion.test.ts).
 *
 * Pre-parity saves do not contain the optional fields added during the
 * Civ VII parity cycles:
 *   - PlayerState.governmentId
 *   - PlayerState.slottedPolicies (Map)
 *   - PlayerState.pantheonId
 *   - CityState.assignedResources
 *   - CityState.urbanTiles / ruralAssignments / quarters
 *
 * These tests pin the contract that legacy saves (JSON without these keys)
 * load cleanly with all of these fields becoming `undefined`, and that the
 * new shapes round-trip safely through serialize/deserialize — including
 * Maps (slottedPolicies, pantheonClaims) which need the generic __type
 * Map handling in SaveLoad.ts.
 *
 * Commander promotions land on the existing `UnitState.promotions` array
 * (no new PlayerState bookkeeping) so we test that pre-parity unit shapes
 * survive round-tripping without spurious fields being introduced.
 */

// ── Test-state builders ──

type MutablePlayer = Partial<PlayerState> & Pick<PlayerState, 'id' | 'name'>;
type MutableCity = Partial<CityState> & Pick<CityState, 'id' | 'name' | 'owner'>;

interface StateOverrides {
  readonly players?: ReadonlyArray<MutablePlayer>;
  readonly cities?: ReadonlyArray<MutableCity>;
}

function createTestPlayer(overrides: MutablePlayer): PlayerState {
  const base = {
    id: overrides.id,
    name: overrides.name,
    isHuman: true,
    civilizationId: 'rome',
    leaderId: 'augustus',
    age: 'antiquity' as const,
    researchedTechs: [],
    currentResearch: null,
    researchProgress: 0,
    researchedCivics: [],
    currentCivic: null,
    civicProgress: 0,
    gold: 100,
    science: 10,
    culture: 10,
    faith: 10,
    influence: 0,
    ageProgress: 0,
    legacyBonuses: [],
    legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
    legacyPoints: 0,
    totalGoldEarned: 0,
    totalKills: 0,
    visibility: new Set<string>(),
    explored: new Set<string>(),
    celebrationCount: 0,
    celebrationBonus: 0,
    celebrationTurnsLeft: 0,
    masteredTechs: [],
    currentMastery: null,
    masteryProgress: 0,
    masteredCivics: [],
    currentCivicMastery: null,
    civicMasteryProgress: 0,
    governors: [],
  };
  return { ...base, ...overrides } as unknown as PlayerState;
}

function createTestCity(overrides: MutableCity): CityState {
  const base = {
    id: overrides.id,
    name: overrides.name,
    owner: overrides.owner,
    position: { q: 0, r: 0 },
    population: 1,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: ['0,0'],
    settlementType: 'city' as const,
    happiness: 0,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
  };
  return { ...base, ...overrides } as unknown as CityState;
}

function createTestState(overrides: StateOverrides = {}): GameState {
  const players = (overrides.players ?? [{ id: 'p1', name: 'Alice' }]).map(createTestPlayer);
  const cities = (overrides.cities ?? []).map(createTestCity);
  const playerMap = new Map(players.map((p) => [p.id, p] as const));
  const cityMap = new Map(cities.map((c) => [c.id, c] as const));

  const base = {
    turn: 3,
    currentPlayerId: players[0].id,
    phase: 'actions' as const,
    players: playerMap,
    map: {
      width: 3,
      height: 3,
      tiles: new Map([[
        '0,0',
        {
          coord: { q: 0, r: 0 },
          terrain: 'grassland',
          feature: null,
          resource: null,
          improvement: null,
          building: null,
          river: [],
          elevation: 0.3,
          continent: 1,
        },
      ]]),
      wrapX: false,
    },
    units: new Map(),
    cities: cityMap,
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    diplomacy: { relations: new Map() },
    age: { currentAge: 'antiquity' as const, ageThresholds: { exploration: 50, modern: 100 } },
    builtWonders: [],
    crises: [],
    victory: { winner: null, winType: null, progress: new Map() },
    log: [],
    rng: { seed: 1, counter: 0 },
  };
  return base as unknown as GameState;
}

/**
 * Strip a top-level-or-nested field from the serialized save JSON.
 * We re-parse, drop the key at the requested dotted path, then
 * re-serialize so the final string is a legitimate save shape except
 * for the surgically-removed field (simulating a genuine legacy save
 * that never wrote that key).
 */
function stripFieldFromPlayer(json: string, playerId: string, field: string): string {
  const parsed = JSON.parse(json) as {
    players: { __type: 'Map'; entries: Array<[string, Record<string, unknown>]> };
  };
  for (const [pid, pdata] of parsed.players.entries) {
    if (pid === playerId) {
      delete pdata[field];
    }
  }
  return JSON.stringify(parsed);
}

function stripFieldFromCity(json: string, cityId: string, field: string): string {
  const parsed = JSON.parse(json) as {
    cities: { __type: 'Map'; entries: Array<[string, Record<string, unknown>]> };
  };
  for (const [cid, cdata] of parsed.cities.entries) {
    if (cid === cityId) {
      delete cdata[field];
    }
  }
  return JSON.stringify(parsed);
}

// ── Tests ──

describe('SaveLoad — pre-parity legacy-save migration', () => {
  it('migrates save with no governmentId on players → undefined', () => {
    const state = createTestState({
      players: [{ id: 'p1', name: 'Alice', governmentId: 'classical-republic' }],
    });
    const json = serializeState(state);
    const legacyJson = stripFieldFromPlayer(json, 'p1', 'governmentId');

    // Confirm the legacy JSON actually lacks the governmentId key.
    const parsed = JSON.parse(legacyJson) as {
      players: { entries: Array<[string, Record<string, unknown>]> };
    };
    const playerEntry = parsed.players.entries.find(([pid]) => pid === 'p1')?.[1];
    expect(playerEntry && 'governmentId' in playerEntry).toBe(false);

    const restored = deserializeState(legacyJson);
    const player = restored.players.get('p1')!;
    expect(player.governmentId).toBeUndefined();
    expect(player.name).toBe('Alice');
  });

  it('migrates save with no slottedPolicies on players → undefined', () => {
    const state = createTestState({
      players: [{
        id: 'p1',
        name: 'Alice',
        slottedPolicies: new Map([['military', ['legion-tradition']]]),
      }],
    });
    const json = serializeState(state);
    const legacyJson = stripFieldFromPlayer(json, 'p1', 'slottedPolicies');

    const restored = deserializeState(legacyJson);
    expect(restored.players.get('p1')!.slottedPolicies).toBeUndefined();
  });

  it('migrates save with no pantheonId on players → undefined', () => {
    const state = createTestState({
      players: [{ id: 'p1', name: 'Alice', pantheonId: 'pantheon.sun_god' }],
    });
    const json = serializeState(state);
    const legacyJson = stripFieldFromPlayer(json, 'p1', 'pantheonId');

    const restored = deserializeState(legacyJson);
    expect(restored.players.get('p1')!.pantheonId).toBeUndefined();
  });

  it('migrates save with no assignedResources on cities → undefined', () => {
    const state = createTestState({
      cities: [{
        id: 'c1',
        name: 'Rome',
        owner: 'p1',
        assignedResources: ['iron', 'horses'],
      }],
    });
    const json = serializeState(state);
    const legacyJson = stripFieldFromCity(json, 'c1', 'assignedResources');

    const restored = deserializeState(legacyJson);
    expect(restored.cities.get('c1')!.assignedResources).toBeUndefined();
  });

  it('migrates save with no urbanTiles / ruralAssignments / quarters on cities → undefined', () => {
    const state = createTestState({
      cities: [{
        id: 'c1',
        name: 'Rome',
        owner: 'p1',
        urbanTiles: new Map(),
        ruralAssignments: new Map(),
        quarters: [],
      }],
    });
    let json = serializeState(state);
    json = stripFieldFromCity(json, 'c1', 'urbanTiles');
    json = stripFieldFromCity(json, 'c1', 'ruralAssignments');
    json = stripFieldFromCity(json, 'c1', 'quarters');

    const restored = deserializeState(json);
    const city = restored.cities.get('c1')!;
    expect(city.urbanTiles).toBeUndefined();
    expect(city.ruralAssignments).toBeUndefined();
    expect(city.quarters).toBeUndefined();
    // Unrelated city fields still intact — proves selective strip.
    expect(city.name).toBe('Rome');
    expect(city.population).toBe(1);
  });

  it('round-trips assignedResources array preserving order and values', () => {
    const state = createTestState({
      cities: [{
        id: 'c1',
        name: 'Rome',
        owner: 'p1',
        assignedResources: ['iron', 'horses', 'marble'],
      }],
    });
    const json = serializeState(state);
    const restored = deserializeState(json);

    const city = restored.cities.get('c1')!;
    expect(city.assignedResources).toEqual(['iron', 'horses', 'marble']);
  });

  it('round-trips slottedPolicies Map preserving instance type and contents', () => {
    const policies = new Map<string, ReadonlyArray<string | null>>([
      ['military', ['legion-tradition', null]],
      ['economic', ['free-market']],
      ['wildcard', [null]],
    ]);
    const state = createTestState({
      players: [{ id: 'p1', name: 'Alice', slottedPolicies: policies }],
    });
    const json = serializeState(state);
    const restored = deserializeState(json);

    const restoredPolicies = restored.players.get('p1')!.slottedPolicies;
    expect(restoredPolicies).toBeInstanceOf(Map);
    expect(restoredPolicies!.size).toBe(3);
    expect(restoredPolicies!.get('military')).toEqual(['legion-tradition', null]);
    expect(restoredPolicies!.get('economic')).toEqual(['free-market']);
    expect(restoredPolicies!.get('wildcard')).toEqual([null]);
  });

  it('round-trips pantheonClaims Map in religion slot (shared Map handling)', () => {
    const claims = new Map<string, string>([
      ['pantheon.sun_god', 'p1'],
      ['pantheon.dance_of_aurora', 'p2'],
    ]);
    const state = createTestState();
    const withReligion = { ...state, religion: { religions: [], pantheonClaims: claims } } as unknown as GameState;

    const json = serializeState(withReligion);
    const restored = deserializeState(json);

    expect(restored.religion!.pantheonClaims).toBeInstanceOf(Map);
    expect(restored.religion!.pantheonClaims!.size).toBe(2);
    expect(restored.religion!.pantheonClaims!.get('pantheon.sun_god')).toBe('p1');
    expect(restored.religion!.pantheonClaims!.get('pantheon.dance_of_aurora')).toBe('p2');
  });

  it('save+load+save+load is idempotent — second round-trip equals first', () => {
    const state = createTestState({
      players: [{
        id: 'p1',
        name: 'Alice',
        governmentId: 'classical-republic',
        pantheonId: 'pantheon.sun_god',
        slottedPolicies: new Map([['military', ['legion-tradition']]]),
      }],
      cities: [{
        id: 'c1',
        name: 'Rome',
        owner: 'p1',
        assignedResources: ['iron'],
      }],
    });

    const json1 = serializeState(state);
    const restored1 = deserializeState(json1);
    const json2 = serializeState(restored1);
    const restored2 = deserializeState(json2);

    // The JSON outputs on each pass should be byte-identical — if they
    // aren't, something is being re-shaped unstably across cycles.
    expect(json2).toBe(json1);

    // And the rehydrated state objects should deep-equal each other.
    expect(restored2).toEqual(restored1);

    // Spot-check that the Map instances survived both round-trips.
    expect(restored2.players.get('p1')!.slottedPolicies).toBeInstanceOf(Map);
    expect(restored2.players.get('p1')!.slottedPolicies!.get('military')).toEqual(['legion-tradition']);
    expect(restored2.cities.get('c1')!.assignedResources).toEqual(['iron']);
  });

  it('handles a mid-game save with mixed legacy + new shapes per player', () => {
    // p1 has fully-populated parity fields; p2 never adopted any of them.
    const state = createTestState({
      players: [
        {
          id: 'p1',
          name: 'Alice',
          governmentId: 'classical-republic',
          pantheonId: 'pantheon.sun_god',
          slottedPolicies: new Map([['military', ['legion-tradition']]]),
        },
        { id: 'p2', name: 'Bob' },
      ],
    });
    let json = serializeState(state);
    // Simulate p2 coming from a pre-parity save by stripping any stray
    // parity keys from their record (builder omits them already, but
    // be explicit so the test survives any future default-field drift).
    json = stripFieldFromPlayer(json, 'p2', 'governmentId');
    json = stripFieldFromPlayer(json, 'p2', 'pantheonId');
    json = stripFieldFromPlayer(json, 'p2', 'slottedPolicies');

    const restored = deserializeState(json);
    const p1 = restored.players.get('p1')!;
    const p2 = restored.players.get('p2')!;

    // p1 carries parity state intact.
    expect(p1.governmentId).toBe('classical-republic');
    expect(p1.pantheonId).toBe('pantheon.sun_god');
    expect(p1.slottedPolicies).toBeInstanceOf(Map);
    expect(p1.slottedPolicies!.get('military')).toEqual(['legion-tradition']);

    // p2 is the legacy shape — all parity fields undefined.
    expect(p2.governmentId).toBeUndefined();
    expect(p2.pantheonId).toBeUndefined();
    expect(p2.slottedPolicies).toBeUndefined();
    // And p2's non-parity state is untouched.
    expect(p2.name).toBe('Bob');
    expect(p2.gold).toBe(100);
  });

  it('round-trips commander promotions on UnitState.promotions (pre-parity shape unchanged)', () => {
    // Commander promotions piggyback on the pre-existing promotions array,
    // so a legacy save with a unit + promotions should round-trip without
    // the new parity fields sneaking onto the unit record.
    const state = createTestState();
    const unit = {
      id: 'u1',
      typeId: 'commander',
      owner: 'p1',
      position: { q: 0, r: 0 },
      movementLeft: 2,
      health: 100,
      experience: 15,
      promotions: ['promotion.commander.leadership', 'promotion.commander.logistics'],
      fortified: false,
    };
    const withUnit = {
      ...state,
      units: new Map([['u1', unit]]),
    } as unknown as GameState;

    const json = serializeState(withUnit);
    const restored = deserializeState(json);

    const restoredUnit = restored.units.get('u1')!;
    expect(restoredUnit.promotions).toEqual([
      'promotion.commander.leadership',
      'promotion.commander.logistics',
    ]);
    expect(restoredUnit.experience).toBe(15);

    // No spurious parity field should have been introduced on the unit.
    const parsed = JSON.parse(json) as {
      units: { entries: Array<[string, Record<string, unknown>]> };
    };
    const unitRecord = parsed.units.entries.find(([uid]) => uid === 'u1')?.[1];
    expect(unitRecord && Object.keys(unitRecord).sort()).toEqual(
      ['id', 'typeId', 'owner', 'position', 'movementLeft', 'health', 'experience', 'promotions', 'fortified'].sort(),
    );
  });
});
