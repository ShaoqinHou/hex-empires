/**
 * resourceSystem-acquisition-notification.test.ts
 *
 * F-10 (resources): When a city's border expands onto a tile containing a
 * resource, the engine emits a log event so the player sees a
 * "You gained access to X" notification.
 *
 * Tests:
 * 1. Border expansion onto a resource tile appends a log event
 *    with the correct resourceId message.
 * 2. Border expansion onto a plain (non-resource) tile emits no resource log.
 * 3. Acquiring two different resources in one turn produces two log entries.
 */

import { describe, it, expect } from 'vitest';
import type { GameState, HexTile, CityState } from '../../types/GameState';
import type { ResourceId } from '../../types/Ids';
import { createTestState, createTestPlayer } from './helpers';
import { coordToKey } from '../../hex/HexMath';
import { growthSystem } from '../growthSystem';

// ── Helper — build a state where a city is about to grow into a resource tile ─

interface ExpandFixtureOpts {
  readonly resourceOnExpansionTile: ResourceId | null;
  readonly existingOwnedResources?: ReadonlyArray<ResourceId>;
}

function buildExpandState(opts: ExpandFixtureOpts): GameState {
  const cityCoord = { q: 0, r: 0 };
  const resourceCoord = { q: 1, r: 0 };
  const cityKey = coordToKey(cityCoord);
  const resourceKey = coordToKey(resourceCoord);

  const cityTile: HexTile = {
    coord: cityCoord,
    terrain: 'grassland',
    feature: null,
    resource: null,
    improvement: null,
    building: null,
    river: [],
    elevation: 0,
    continent: 0,
  };

  const expansionTile: HexTile = {
    coord: resourceCoord,
    terrain: 'grassland',
    feature: null,
    resource: opts.resourceOnExpansionTile,
    improvement: null,
    building: null,
    river: [],
    elevation: 0,
    continent: 0,
  };

  // City has enough food to trigger a growth event this turn.
  // Growth threshold at pop=3 in antiquity: 30 + 3*2 + 2^3.3 ≈ 45. Use food=200.
  const city: CityState = {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: cityCoord,
    population: 3,
    food: 200,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [cityKey],
    settlementType: 'city',
    happiness: 5,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
  };

  const ownedResources = opts.existingOwnedResources ?? [];
  const player = {
    ...createTestPlayer({ id: 'p1' }),
    ownedResources,
  } as ReturnType<typeof createTestPlayer> & { ownedResources: ReadonlyArray<ResourceId> };

  // Build a map with the city tile, the expansion tile, plus enough surrounding
  // tiles so border expansion logic has valid neighbors to evaluate.
  const surroundingTiles: [string, HexTile][] = Array.from({ length: 50 }, (_, i) => {
    const q = (i % 10) - 2;
    const r = Math.floor(i / 10) - 2;
    const k = coordToKey({ q, r });
    if (k === cityKey || k === resourceKey) return null;
    const t: HexTile = {
      coord: { q, r },
      terrain: 'grassland',
      feature: null,
      resource: null,
      improvement: null,
      building: null,
      river: [],
      elevation: 0,
      continent: 0,
    };
    return [k, t] as [string, HexTile];
  }).filter((e): e is [string, HexTile] => e !== null);

  return createTestState({
    currentPlayerId: 'p1',
    players: new Map([['p1', player]]),
    cities: new Map([['c1', city]]),
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    map: {
      width: 10,
      height: 10,
      tiles: new Map([
        [cityKey, cityTile],
        [resourceKey, expansionTile],
        ...surroundingTiles,
      ]),
      wrapX: false,
    },
    log: [],
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('F-10 (resources): resource acquisition log notification', () => {
  it('border expansion onto a HORSES tile appends a log event mentioning Horses', () => {
    const state = buildExpandState({ resourceOnExpansionTile: 'horses' });
    const next = growthSystem(state, { type: 'END_TURN' });

    // The city should have grown
    const updatedCity = next.cities.get('c1')!;
    expect(updatedCity.population).toBe(4);

    // A log event should be present for resource acquisition
    const resourceLogEntry = next.log.find(
      (e) => e.type === 'city' && e.category === 'info' && e.message.includes('Horses'),
    );
    expect(resourceLogEntry).toBeDefined();
    expect(resourceLogEntry!.message).toBe('You gained access to Horses.');
    expect(resourceLogEntry!.playerId).toBe('p1');
    expect(resourceLogEntry!.turn).toBe(1);
  });

  it('border expansion onto a plain tile (no resource) emits no resource log event', () => {
    const state = buildExpandState({ resourceOnExpansionTile: null });
    const next = growthSystem(state, { type: 'END_TURN' });

    // City should still grow
    const updatedCity = next.cities.get('c1')!;
    expect(updatedCity.population).toBe(4);

    // No resource acquisition log entry
    const resourceLogEntry = next.log.find(
      (e) => e.type === 'city' && e.category === 'info' && e.message.startsWith('You gained access to'),
    );
    expect(resourceLogEntry).toBeUndefined();
  });

  it('acquiring a resource already owned does not emit a log event (no duplicate)', () => {
    // Player already owns HORSES — expanding onto horses tile should be a no-op for ownedResources
    const state = buildExpandState({
      resourceOnExpansionTile: 'horses',
      existingOwnedResources: ['horses'],
    });
    const next = growthSystem(state, { type: 'END_TURN' });

    // No new log event for horses since it was already owned
    const resourceLogEntries = next.log.filter(
      (e) => e.type === 'city' && e.category === 'info' && e.message.startsWith('You gained access to'),
    );
    expect(resourceLogEntries).toHaveLength(0);
  });

  it('log event message contains the resource display name from config', () => {
    // Use WHEAT (display name "Wheat") to confirm name comes from config, not ID
    const state = buildExpandState({ resourceOnExpansionTile: 'wheat' });
    const next = growthSystem(state, { type: 'END_TURN' });

    const resourceLogEntry = next.log.find(
      (e) => e.type === 'city' && e.category === 'info' && e.message.includes('Wheat'),
    );
    expect(resourceLogEntry).toBeDefined();
    expect(resourceLogEntry!.message).toBe('You gained access to Wheat.');
  });
});
