import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { createTestState, createTestPlayer } from '../systems/__tests__/helpers';
import type { GameState } from '../types/GameState';

/**
 * M12 Integration smoke test.
 *
 * Confirms that the four newly-wired systems (religion, government,
 * urban building, commander promotion) flow through the default
 * `GameEngine` pipeline without crashing and without corrupting state
 * for actions they cannot apply.
 *
 * Full behavioural coverage lives in each system's dedicated test file.
 * Here we only care that:
 *   - dispatching a new M12 action through the engine does not throw;
 *   - the engine returns a valid `GameState` shape;
 *   - a successful `ADOPT_PANTHEON` mutates player faith as expected,
 *     proving pipeline wiring actually reaches `religionSystem`.
 */
describe('integration-m12: standalone systems wired into pipeline', () => {
  function seedState(): GameState {
    return createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', name: 'Faithful', faith: 100 })],
      ]),
    });
  }

  it('engine handles ADOPT_PANTHEON end-to-end without crashing', () => {
    const engine = new GameEngine();
    const state = seedState();

    const next = engine.applyAction(state, {
      type: 'ADOPT_PANTHEON',
      playerId: 'p1',
      pantheonId: 'god_of_healing',
    });

    // Pipeline returned a fresh state, not a thrown error.
    expect(next).not.toBeUndefined();
    expect(next.players.size).toBe(1);

    // religionSystem actually ran: faith was deducted by the pantheon's
    // faithCost (25), and the player record is otherwise intact.
    const updated = next.players.get('p1');
    expect(updated).toBeDefined();
    expect(updated!.faith).toBe(75);
    expect(updated!.id).toBe('p1');
  });

  it('engine passes unknown pantheon through without crashing', () => {
    const engine = new GameEngine();
    const state = seedState();

    const next = engine.applyAction(state, {
      type: 'ADOPT_PANTHEON',
      playerId: 'p1',
      pantheonId: 'does_not_exist',
    });

    // No crash, faith unchanged (graceful no-op from religionSystem).
    expect(next.players.get('p1')!.faith).toBe(100);
  });

  it('engine handles SET_GOVERNMENT through the pipeline without crashing', () => {
    const engine = new GameEngine();
    const state = seedState();

    // Player has not researched any civic, so governmentSystem no-ops,
    // but we only require that the pipeline does not throw.
    const next = engine.applyAction(state, {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'chiefdom',
    });

    expect(next.players.size).toBe(1);
  });

  it('engine handles PLACE_URBAN_BUILDING without crashing on empty city map', () => {
    const engine = new GameEngine();
    const state = seedState();

    const next = engine.applyAction(state, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'does_not_exist',
      tile: { q: 0, r: 0 },
      buildingId: 'granary',
    });

    // No city exists — urbanBuildingSystem no-ops; pipeline returns
    // a state object (may or may not be identical reference depending
    // on downstream systems).
    expect(next.cities.size).toBe(0);
  });

  it('engine handles GAIN_COMMANDER_XP without crashing when unit is absent', () => {
    const engine = new GameEngine();
    const state = seedState();

    const next = engine.applyAction(state, {
      type: 'GAIN_COMMANDER_XP',
      commanderId: 'does_not_exist',
      amount: 50,
    });

    expect(next.units.size).toBe(0);
  });

  it('engine handles ASSIGN_RESOURCE without crashing when city is absent', () => {
    const engine = new GameEngine();
    const state = seedState();

    const next = engine.applyAction(state, {
      type: 'ASSIGN_RESOURCE',
      resourceId: 'wheat',
      cityId: 'does_not_exist',
      playerId: 'p1',
    });

    // No city exists — resourceAssignmentSystem no-ops; pipeline returns
    // a valid state object with no cities.
    expect(next.cities.size).toBe(0);
  });

  it('engine handles UNASSIGN_RESOURCE without crashing when city is absent', () => {
    const engine = new GameEngine();
    const state = seedState();

    const next = engine.applyAction(state, {
      type: 'UNASSIGN_RESOURCE',
      resourceId: 'wheat',
      cityId: 'does_not_exist',
      playerId: 'p1',
    });

    expect(next.cities.size).toBe(0);
  });
});
