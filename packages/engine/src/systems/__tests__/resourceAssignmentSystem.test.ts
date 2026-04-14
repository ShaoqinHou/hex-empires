import { describe, it, expect } from 'vitest';
import {
  resourceAssignmentSystem,
  getResourceSlotCapacity,
} from '../resourceAssignmentSystem';
import type {
  CityState,
  GameState,
  PlayerState,
} from '../../types/GameState';
import type { ResourceId } from '../../types/Ids';
import { createTestState, createTestPlayer } from './helpers';

/**
 * Build a CityState with optional `assignedResources` attached
 * structurally. The field is not yet declared on `CityState`, so we
 * build through the shared test helper shape then spread on the extra
 * key via an intermediate object type.
 */
function createTestCity(
  overrides: Partial<CityState> & {
    readonly assignedResources?: ReadonlyArray<ResourceId>;
  } = {},
): CityState {
  const base: CityState = {
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
  // Attach the optional field if explicitly provided (including []).
  if (Object.prototype.hasOwnProperty.call(overrides, 'assignedResources')) {
    return {
      ...base,
      assignedResources: overrides.assignedResources,
    } as CityState;
  }
  return base;
}

/**
 * Attach a structural `ownedResources` field to a PlayerState so the
 * system can verify ownership. Mirrors the same pattern religion/government
 * tests use for their optional fields.
 */
function playerWithOwned(
  base: PlayerState,
  owned: ReadonlyArray<ResourceId>,
): PlayerState {
  return { ...base, ownedResources: owned } as PlayerState;
}

function stateWith(
  city: CityState,
  player: PlayerState = playerWithOwned(
    createTestPlayer({ id: 'p1' }),
    [],
  ),
): GameState {
  return createTestState({
    players: new Map([[player.id, player]]),
    cities: new Map([[city.id, city]]),
  });
}

describe('resourceAssignmentSystem', () => {
  describe('purity / pass-through', () => {
    it('returns identical state for non-matching actions', () => {
      const state = createTestState();
      const next = resourceAssignmentSystem(state, { type: 'START_TURN' });
      expect(next).toBe(state);
    });

    it('returns identical state for END_TURN (another pass-through)', () => {
      const state = createTestState();
      const next = resourceAssignmentSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });
  });

  describe('graceful no-op when schema lacks fields', () => {
    it('ASSIGN_RESOURCE is a no-op when city has no assignedResources field', () => {
      const city = createTestCity(); // no assignedResources
      const player = playerWithOwned(createTestPlayer({ id: 'p1' }), ['wheat']);
      const state = stateWith(city, player);

      const next = resourceAssignmentSystem(state, {
        type: 'ASSIGN_RESOURCE',
        resourceId: 'wheat',
        cityId: 'c1',
        playerId: 'p1',
      });

      expect(next).toBe(state);
    });

    it('ASSIGN_RESOURCE is a no-op when player has no ownedResources field', () => {
      const city = createTestCity({ assignedResources: [] });
      const player = createTestPlayer({ id: 'p1' }); // no ownedResources
      const state = stateWith(city, player);

      const next = resourceAssignmentSystem(state, {
        type: 'ASSIGN_RESOURCE',
        resourceId: 'wheat',
        cityId: 'c1',
        playerId: 'p1',
      });

      expect(next).toBe(state);
    });
  });

  describe('ASSIGN_RESOURCE (happy path + validation)', () => {
    it('adds an owned resource to a city with a free slot', () => {
      const city = createTestCity({
        settlementType: 'city',
        assignedResources: [],
      });
      const player = playerWithOwned(createTestPlayer({ id: 'p1' }), ['wheat']);
      const state = stateWith(city, player);

      const next = resourceAssignmentSystem(state, {
        type: 'ASSIGN_RESOURCE',
        resourceId: 'wheat',
        cityId: 'c1',
        playerId: 'p1',
      });

      const updated = next.cities.get('c1') as CityState & {
        readonly assignedResources: ReadonlyArray<ResourceId>;
      };
      expect(updated.assignedResources).toEqual(['wheat']);
      expect(next).not.toBe(state);
    });

    it('returns state unchanged when slot count is exceeded (city: 2 base)', () => {
      const city = createTestCity({
        settlementType: 'city',
        assignedResources: ['wheat', 'iron'],
      });
      const player = playerWithOwned(createTestPlayer({ id: 'p1' }), [
        'wheat',
        'iron',
        'silk',
      ]);
      const state = stateWith(city, player);

      const next = resourceAssignmentSystem(state, {
        type: 'ASSIGN_RESOURCE',
        resourceId: 'silk',
        cityId: 'c1',
        playerId: 'p1',
      });

      expect(next).toBe(state);
    });

    it('returns state unchanged when slot count is exceeded for a town (base 1)', () => {
      const city = createTestCity({
        settlementType: 'town',
        assignedResources: ['wheat'],
      });
      const player = playerWithOwned(createTestPlayer({ id: 'p1' }), [
        'wheat',
        'iron',
      ]);
      const state = stateWith(city, player);

      const next = resourceAssignmentSystem(state, {
        type: 'ASSIGN_RESOURCE',
        resourceId: 'iron',
        cityId: 'c1',
        playerId: 'p1',
      });

      expect(next).toBe(state);
    });

    it('returns state unchanged for an unknown cityId', () => {
      const city = createTestCity({ assignedResources: [] });
      const player = playerWithOwned(createTestPlayer({ id: 'p1' }), ['wheat']);
      const state = stateWith(city, player);

      const next = resourceAssignmentSystem(state, {
        type: 'ASSIGN_RESOURCE',
        resourceId: 'wheat',
        cityId: 'c_unknown',
        playerId: 'p1',
      });

      expect(next).toBe(state);
    });

    it('returns state unchanged for an unknown resourceId (not in config.resources)', () => {
      const city = createTestCity({ assignedResources: [] });
      const player = playerWithOwned(createTestPlayer({ id: 'p1' }), [
        'phlogiston',
      ]);
      const state = stateWith(city, player);

      const next = resourceAssignmentSystem(state, {
        type: 'ASSIGN_RESOURCE',
        resourceId: 'phlogiston',
        cityId: 'c1',
        playerId: 'p1',
      });

      expect(next).toBe(state);
    });

    it('returns state unchanged when player does not own the resource', () => {
      const city = createTestCity({ assignedResources: [] });
      // Player owns iron, tries to assign wheat.
      const player = playerWithOwned(createTestPlayer({ id: 'p1' }), ['iron']);
      const state = stateWith(city, player);

      const next = resourceAssignmentSystem(state, {
        type: 'ASSIGN_RESOURCE',
        resourceId: 'wheat',
        cityId: 'c1',
        playerId: 'p1',
      });

      expect(next).toBe(state);
    });

    it('returns state unchanged when the target city is owned by another player', () => {
      const city = createTestCity({
        owner: 'p2',
        assignedResources: [],
      });
      const player = playerWithOwned(createTestPlayer({ id: 'p1' }), ['wheat']);
      const state = stateWith(city, player);

      const next = resourceAssignmentSystem(state, {
        type: 'ASSIGN_RESOURCE',
        resourceId: 'wheat',
        cityId: 'c1',
        playerId: 'p1',
      });

      expect(next).toBe(state);
    });
  });

  describe('UNASSIGN_RESOURCE', () => {
    it('removes a resource present on the city', () => {
      const city = createTestCity({
        assignedResources: ['wheat', 'iron'],
      });
      const player = playerWithOwned(createTestPlayer({ id: 'p1' }), [
        'wheat',
        'iron',
      ]);
      const state = stateWith(city, player);

      const next = resourceAssignmentSystem(state, {
        type: 'UNASSIGN_RESOURCE',
        resourceId: 'wheat',
        cityId: 'c1',
        playerId: 'p1',
      });

      const updated = next.cities.get('c1') as CityState & {
        readonly assignedResources: ReadonlyArray<ResourceId>;
      };
      expect(updated.assignedResources).toEqual(['iron']);
      expect(next).not.toBe(state);
    });

    it('returns state unchanged when the resource is not in the city list', () => {
      const city = createTestCity({ assignedResources: ['iron'] });
      const player = playerWithOwned(createTestPlayer({ id: 'p1' }), ['iron']);
      const state = stateWith(city, player);

      const next = resourceAssignmentSystem(state, {
        type: 'UNASSIGN_RESOURCE',
        resourceId: 'wheat',
        cityId: 'c1',
        playerId: 'p1',
      });

      expect(next).toBe(state);
    });
  });

  describe('slot capacity helper', () => {
    it('returns 1 for a plain town', () => {
      const city = createTestCity({ settlementType: 'town' });
      expect(getResourceSlotCapacity(city)).toBe(1);
    });

    it('returns 2 for a plain city', () => {
      const city = createTestCity({ settlementType: 'city' });
      expect(getResourceSlotCapacity(city)).toBe(2);
    });

    it('adds +1 for a Market and +2 for a Lighthouse', () => {
      const city = createTestCity({
        settlementType: 'city',
        buildings: ['market', 'lighthouse'],
      });
      // 2 (city) + 1 (market) + 2 (lighthouse) = 5
      expect(getResourceSlotCapacity(city)).toBe(5);
    });

    it('adds +1 for the factory_town specialization', () => {
      const city = createTestCity({
        settlementType: 'town',
        specialization: 'factory_town',
      });
      expect(getResourceSlotCapacity(city)).toBe(2);
    });
  });
});
