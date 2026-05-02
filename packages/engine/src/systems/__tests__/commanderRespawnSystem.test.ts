import { describe, it, expect } from 'vitest';
import { commanderRespawnSystem } from '../commanderRespawnSystem';
import { COMMANDER_RESPAWN_TURNS_STANDARD } from '../../state/CommanderRespawn';
import { createTestCity, createTestState, createTestUnit } from './helpers';
import type { CommanderState } from '../../types/Commander';

function makeRespawningCommander(overrides: Partial<CommanderState> = {}): CommanderState {
  return {
    unitId: 'cmd1',
    xp: 80,
    commanderLevel: 2,
    unspentPromotionPicks: 0,
    promotions: ['assault_initiative'],
    tree: 'assault',
    attachedUnits: [],
    packed: false,
    respawnTurnsRemaining: COMMANDER_RESPAWN_TURNS_STANDARD,
    respawnUnitState: createTestUnit({
      id: 'cmd1',
      owner: 'p1',
      typeId: 'captain',
      position: { q: 8, r: 8 },
      health: 100,
      movementLeft: 0,
    }),
    ...overrides,
  };
}

describe('commanderRespawnSystem', () => {
  it('counts down respawning commanders only on the owner start turn', () => {
    const commander = makeRespawningCommander({ respawnTurnsRemaining: 2 });
    const state = createTestState({
      currentPlayerId: 'p1',
      units: new Map(),
      commanders: new Map([['cmd1', commander]]),
    });

    const next = commanderRespawnSystem(state, { type: 'START_TURN' });

    expect(next.commanders!.get('cmd1')!.respawnTurnsRemaining).toBe(1);
    expect(next.units.has('cmd1')).toBe(false);
  });

  it('does not tick a commander on another player turn', () => {
    const commander = makeRespawningCommander({ respawnTurnsRemaining: 2 });
    const state = createTestState({
      currentPlayerId: 'p2',
      units: new Map(),
      commanders: new Map([['cmd1', commander]]),
    });

    const next = commanderRespawnSystem(state, { type: 'START_TURN' });

    expect(next).toBe(state);
    expect(next.commanders!.get('cmd1')!.respawnTurnsRemaining).toBe(2);
  });

  it('respawns recovered commanders at the owner capital with progress preserved', () => {
    const commander = makeRespawningCommander({ respawnTurnsRemaining: 1 });
    const capital = createTestCity({
      id: 'cap',
      owner: 'p1',
      position: { q: 2, r: 2 },
      isCapital: true,
    });
    const state = createTestState({
      currentPlayerId: 'p1',
      units: new Map(),
      cities: new Map([['cap', capital]]),
      commanders: new Map([['cmd1', commander]]),
    });

    const next = commanderRespawnSystem(state, { type: 'START_TURN' });

    expect(next.units.get('cmd1')).toMatchObject({
      id: 'cmd1',
      owner: 'p1',
      typeId: 'captain',
      position: { q: 2, r: 2 },
      health: 100,
      movementLeft: 0,
      promotions: [],
      packedInCommanderId: null,
    });
    expect(next.commanders!.get('cmd1')).toMatchObject({
      xp: 80,
      commanderLevel: 2,
      promotions: ['assault_initiative'],
      packed: false,
      attachedUnits: [],
      packedUnitStates: [],
    });
    expect(next.commanders!.get('cmd1')!.respawnTurnsRemaining).toBeUndefined();
    expect(next.commanders!.get('cmd1')!.respawnUnitState).toBeUndefined();
  });

  it('keeps a recovered commander queued when no owned settlement can receive it', () => {
    const commander = makeRespawningCommander({ respawnTurnsRemaining: 1 });
    const state = createTestState({
      currentPlayerId: 'p1',
      units: new Map(),
      cities: new Map(),
      commanders: new Map([['cmd1', commander]]),
    });

    const next = commanderRespawnSystem(state, { type: 'START_TURN' });

    expect(next.units.has('cmd1')).toBe(false);
    expect(next.commanders!.get('cmd1')!.respawnTurnsRemaining).toBe(1);
  });
});
