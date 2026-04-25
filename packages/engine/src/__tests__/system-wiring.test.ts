/**
 * system-wiring.test.ts — X2.4
 *
 * Integration tests confirming that urbanBuildingSystem,
 * resourceAssignmentSystem, and governmentSystem are wired into the
 * GameEngine DEFAULT_SYSTEMS pipeline and produce actual state changes
 * (not just no-crashes) when their primary actions are dispatched.
 *
 * These tests complement integration-m12.test.ts which covers smoke /
 * no-crash; here we require concrete assertion on mutated state.
 */
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { createTestState, createTestPlayer, createTestCity } from '../systems/__tests__/helpers';
import type { CityState, PlayerState } from '../types/GameState';

// ── Test helpers (local — mirroring patterns from dedicated system tests) ────

/**
 * Augment a PlayerState with the optional Government runtime fields.
 * Mirrors the helper in governmentSystem.test.ts.
 */
function withGovernmentFields(
  player: PlayerState,
  overrides: {
    governmentId?: string | null;
    slottedPolicies?: Array<string | null>;
    governmentLockedForAge?: boolean;
    policySwapWindowOpen?: boolean;
  } = {},
): PlayerState {
  return {
    ...player,
    governmentId: overrides.governmentId ?? null,
    slottedPolicies: overrides.slottedPolicies ?? [],
    governmentLockedForAge: overrides.governmentLockedForAge ?? false,
    policySwapWindowOpen: overrides.policySwapWindowOpen ?? false,
  } as unknown as PlayerState;
}

/**
 * Augment a PlayerState with the optional ownedResources field.
 */
function withOwnedResources(
  player: PlayerState,
  owned: ReadonlyArray<string>,
): PlayerState {
  return { ...player, ownedResources: owned } as unknown as PlayerState;
}

/**
 * Augment a CityState with the optional assignedResources field.
 */
function withAssignedResources(
  city: CityState,
  assigned: ReadonlyArray<string>,
): CityState {
  return { ...city, assignedResources: assigned } as CityState;
}

// ─────────────────────────────────────────────────────────────────────────────

const engine = new GameEngine();

describe('system-wiring — urbanBuildingSystem', () => {
  it('PLACE_URBAN_BUILDING through pipeline appends building to urbanTiles', () => {
    // City at origin (q:0, r:0), tile to build on at (q:1, r:0) — distance 1 ≤ 3.
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      position: { q: 0, r: 0 },
    });

    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      cities: new Map([['c1', city]]),
    });

    const next = engine.applyAction(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile: { q: 1, r: 0 },
      buildingId: 'granary',
    });

    const updatedCity = next.cities.get('c1');
    expect(updatedCity).toBeDefined();

    // urbanTiles must now contain the placed building.
    const tileEntry = updatedCity!.urbanTiles?.get('1,0');
    expect(tileEntry).toBeDefined();
    expect(tileEntry!.buildings).toContain('granary');
    expect(tileEntry!.buildings).toHaveLength(1);
  });
});

describe('system-wiring — governmentSystem', () => {
  it('SET_GOVERNMENT through pipeline sets governmentId on player', () => {
    // 'despotism' requires 'mysticism' civic (from governments.ts).
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['mysticism'],
      }),
      {
        governmentId: null,
        governmentLockedForAge: false,
      },
    );

    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', player]]),
    });

    const next = engine.applyAction(state, {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'despotism',
    });

    const updated = next.players.get('p1') as PlayerState & {
      governmentId: string | null;
      governmentLockedForAge: boolean;
    };
    expect(updated).toBeDefined();
    expect(updated.governmentId).toBe('despotism');
    // Per W2-03: adopting a government locks it for the age.
    expect(updated.governmentLockedForAge).toBe(true);
  });
});

describe('system-wiring — resourceAssignmentSystem', () => {
  it('ASSIGN_RESOURCE through pipeline appends resource to city assignedResources', () => {
    const city = withAssignedResources(
      createTestCity({
        id: 'c1',
        owner: 'p1',
        settlementType: 'city', // base 2 slots
        buildings: [],
      }),
      [], // no resources assigned yet
    );

    const player = withOwnedResources(
      createTestPlayer({ id: 'p1' }),
      ['wheat'],
    );

    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
    });

    const next = engine.applyAction(state, {
      type: 'ASSIGN_RESOURCE',
      resourceId: 'wheat',
      cityId: 'c1',
      playerId: 'p1',
    });

    const updatedCity = next.cities.get('c1') as CityState & {
      assignedResources: ReadonlyArray<string>;
    };
    expect(updatedCity).toBeDefined();
    expect(updatedCity.assignedResources).toContain('wheat');
    expect(updatedCity.assignedResources).toHaveLength(1);
  });
});
