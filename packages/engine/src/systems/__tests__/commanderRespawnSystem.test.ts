import { describe, it, expect } from 'vitest';
import { commanderRespawnSystem } from '../commanderRespawnSystem';
import {
  COMMANDER_RESPAWN_TURNS_STANDARD,
  markCommanderDefeated,
} from '../../state/CommanderRespawn';
import { createTestCity, createTestState, createTestUnit } from './helpers';
import type { CommanderPromotionDef, CommanderState } from '../../types/Commander';

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

function makeRecoveryPromotion(id: string, value: number): CommanderPromotionDef {
  return {
    id,
    name: id,
    description: 'Test recovery-time reduction.',
    tree: 'leadership',
    tier: 3,
    prerequisites: ['leadership_field_commission'],
    aura: {
      type: 'AURA_COMMANDER_RECOVERY_TIME_REDUCTION_PERCENT',
      value,
    },
  };
}

describe('commanderRespawnSystem', () => {
  it('halves initial recovery when CommanderState has Leadership Resilience', () => {
    const commander = makeRespawningCommander({
      promotions: ['leadership_resilience'],
      respawnTurnsRemaining: undefined,
      respawnUnitState: undefined,
    });
    const defeatedUnit = createTestUnit({
      id: 'cmd1',
      owner: 'p1',
      typeId: 'captain',
      health: 0,
      promotions: [],
    });
    const state = createTestState({
      units: new Map([['cmd1', defeatedUnit]]),
      commanders: new Map([['cmd1', commander]]),
    });

    const nextCommanders = markCommanderDefeated(state, defeatedUnit, null);

    expect(nextCommanders!.get('cmd1')!.respawnTurnsRemaining).toBe(10);
  });

  it('halves initial recovery when only legacy UnitState promotions include Leadership Resilience', () => {
    const commander = makeRespawningCommander({
      promotions: [],
      respawnTurnsRemaining: undefined,
      respawnUnitState: undefined,
    });
    const defeatedUnit = createTestUnit({
      id: 'cmd1',
      owner: 'p1',
      typeId: 'captain',
      health: 0,
      promotions: ['leadership_resilience'],
    });
    const state = createTestState({
      units: new Map([['cmd1', defeatedUnit]]),
      commanders: new Map([['cmd1', commander]]),
    });

    const nextCommanders = markCommanderDefeated(state, defeatedUnit, null);

    expect(nextCommanders!.get('cmd1')!.respawnTurnsRemaining).toBe(10);
  });

  it('uses injected recovery definitions and clamps reductions above 100% to one turn', () => {
    const promotion = makeRecoveryPromotion('test_recovery_overflow', 150);
    const commander = makeRespawningCommander({
      promotions: [promotion.id],
      respawnTurnsRemaining: undefined,
      respawnUnitState: undefined,
    });
    const defeatedUnit = createTestUnit({
      id: 'cmd1',
      owner: 'p1',
      typeId: 'captain',
      health: 0,
      promotions: [],
    });
    const base = createTestState({
      units: new Map([['cmd1', defeatedUnit]]),
      commanders: new Map([['cmd1', commander]]),
    });
    const state = {
      ...base,
      config: {
        ...base.config,
        commanderPromotions: new Map([[promotion.id, promotion]]),
      },
    };

    const nextCommanders = markCommanderDefeated(state, defeatedUnit, null);

    expect(nextCommanders!.get('cmd1')!.respawnTurnsRemaining).toBe(1);
  });

  it('ignores invalid or negative injected recovery reductions and keeps standard recovery', () => {
    const negative = makeRecoveryPromotion('test_recovery_negative', -25);
    const invalid = makeRecoveryPromotion('test_recovery_invalid', Number.NaN);
    const commander = makeRespawningCommander({
      promotions: [negative.id, invalid.id],
      respawnTurnsRemaining: undefined,
      respawnUnitState: undefined,
    });
    const defeatedUnit = createTestUnit({
      id: 'cmd1',
      owner: 'p1',
      typeId: 'captain',
      health: 0,
      promotions: [],
    });
    const base = createTestState({
      units: new Map([['cmd1', defeatedUnit]]),
      commanders: new Map([['cmd1', commander]]),
    });
    const state = {
      ...base,
      config: {
        ...base.config,
        commanderPromotions: new Map([
          [negative.id, negative],
          [invalid.id, invalid],
        ]),
      },
    };

    const nextCommanders = markCommanderDefeated(state, defeatedUnit, null);

    expect(nextCommanders!.get('cmd1')!.respawnTurnsRemaining).toBe(
      COMMANDER_RESPAWN_TURNS_STANDARD,
    );
  });

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
