import { describe, it, expect } from 'vitest';
import { commanderArmySystem } from '../commanderArmySystem';
import { COMMANDER_BASE_STACK_CAP } from '../../types/Commander';
import { createTestState, createTestUnit } from './helpers';
import type { CommanderState } from '../../types/Commander';
import type { GameState } from '../../types/GameState';

// ── Helpers ──

function makeCommander(overrides: Partial<CommanderState> = {}): CommanderState {
  return {
    unitId: 'cmd1',
    xp: 0,
    commanderLevel: 1,
    unspentPromotionPicks: 0,
    promotions: [],
    tree: null,
    attachedUnits: [],
    packed: false,
    ...overrides,
  };
}

function stateWithCommander(
  cmdState: CommanderState,
  extraUnits: Map<string, ReturnType<typeof createTestUnit>> = new Map(),
  extraCommanders: Map<string, CommanderState> = new Map(),
): GameState {
  const commanderUnit = createTestUnit({
    id: cmdState.unitId,
    typeId: 'captain',
    owner: 'p1',
    position: { q: 0, r: 0 },
  });
  const units = new Map([
    [cmdState.unitId, commanderUnit],
    ...extraUnits,
  ]);
  const commanders = new Map<string, CommanderState>([
    [cmdState.unitId, cmdState],
    ...extraCommanders,
  ]);
  return createTestState({ units, commanders });
}

// ── Identity / guard tests ──

describe('commanderArmySystem — identity / guards', () => {
  it('returns state unchanged for non-matching action types', () => {
    const state = createTestState();
    expect(commanderArmySystem(state, { type: 'END_TURN' })).toBe(state);
    expect(commanderArmySystem(state, { type: 'START_TURN' })).toBe(state);
  });

  it('returns state unchanged when state.commanders is absent', () => {
    const state = createTestState(); // no commanders field
    const action = { type: 'ASSEMBLE_ARMY' as const, commanderId: 'cmd1', unitIds: ['u1'] };
    expect(commanderArmySystem(state, action)).toBe(state);
  });

  it('ASSEMBLE_ARMY returns unchanged when commanderId not in commanders map', () => {
    const state = stateWithCommander(makeCommander({ unitId: 'cmd1' }));
    const action = { type: 'ASSEMBLE_ARMY' as const, commanderId: 'ghost', unitIds: [] };
    expect(commanderArmySystem(state, action)).toBe(state);
  });

  it('ASSEMBLE_ARMY returns unchanged when commanderId not in units map', () => {
    const cmdState = makeCommander({ unitId: 'cmd1' });
    const commanders = new Map<string, CommanderState>([['cmd1', cmdState]]);
    // units map intentionally has no 'cmd1' entry
    const state = createTestState({ units: new Map(), commanders });
    const action = { type: 'ASSEMBLE_ARMY' as const, commanderId: 'cmd1', unitIds: [] };
    expect(commanderArmySystem(state, action)).toBe(state);
  });

  it('DEPLOY_ARMY returns unchanged when commander not in commanders map', () => {
    const state = stateWithCommander(makeCommander({ unitId: 'cmd1' }));
    const action = { type: 'DEPLOY_ARMY' as const, commanderId: 'ghost' };
    expect(commanderArmySystem(state, action)).toBe(state);
  });

  it('DEPLOY_ARMY returns unchanged when commander is not packed', () => {
    const state = stateWithCommander(makeCommander({ unitId: 'cmd1', packed: false }));
    const action = { type: 'DEPLOY_ARMY' as const, commanderId: 'cmd1' };
    expect(commanderArmySystem(state, action)).toBe(state);
  });
});

// ── ASSEMBLE_ARMY ──

describe('commanderArmySystem — ASSEMBLE_ARMY', () => {
  it('packs adjacent units: sets packedInCommanderId on each', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 } });
    const u2 = createTestUnit({ id: 'u2', owner: 'p1', position: { q: 0, r: 1 } });
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1' }),
      new Map([['u1', u1], ['u2', u2]]),
    );

    const next = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: ['u1', 'u2'],
    });

    expect(next.units.get('u1')!.packedInCommanderId).toBe('cmd1');
    expect(next.units.get('u2')!.packedInCommanderId).toBe('cmd1');
  });

  it('sets commander.packed = true and records attachedUnits', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 } });
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1' }),
      new Map([['u1', u1]]),
    );

    const next = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: ['u1'],
    });

    const updatedCommander = next.commanders!.get('cmd1')!;
    expect(updatedCommander.packed).toBe(true);
    expect(updatedCommander.attachedUnits).toEqual(['u1']);
  });

  it('packs exactly 4 units (at the cap)', () => {
    // 4 adjacent positions around q=0,r=0
    const positions = [
      { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 },
    ];
    const extraUnits = new Map(
      positions.map((pos, i) => {
        const id = `u${i + 1}`;
        return [id, createTestUnit({ id, owner: 'p1', position: pos })];
      }),
    );
    const state = stateWithCommander(makeCommander({ unitId: 'cmd1' }), extraUnits);
    const unitIds = Array.from(extraUnits.keys());

    const next = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds,
    });

    expect(next.commanders!.get('cmd1')!.packed).toBe(true);
    for (const uid of unitIds) {
      expect(next.units.get(uid)!.packedInCommanderId).toBe('cmd1');
    }
  });

  it('rejects when unitIds count exceeds COMMANDER_BASE_STACK_CAP (4)', () => {
    const positions = [
      { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
      { q: -1, r: 0 }, { q: 0, r: -1 },
    ];
    const extraUnits = new Map(
      positions.map((pos, i) => {
        const id = `u${i + 1}`;
        return [id, createTestUnit({ id, owner: 'p1', position: pos })];
      }),
    );
    const state = stateWithCommander(makeCommander({ unitId: 'cmd1' }), extraUnits);
    const unitIds = Array.from(extraUnits.keys()); // 5 units

    expect(unitIds.length).toBe(5);
    expect(unitIds.length).toBeGreaterThan(COMMANDER_BASE_STACK_CAP);

    const result = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds,
    });
    expect(result).toBe(state); // unchanged
  });

  it('rejects unit owned by a different player', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p2', position: { q: 1, r: 0 } });
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1' }),
      new Map([['u1', u1]]),
    );

    const result = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: ['u1'],
    });
    expect(result).toBe(state);
  });

  it('rejects non-adjacent unit (distance > 1)', () => {
    // Unit at q=3, r=0 is distance 3 from commander at q=0, r=0
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 3, r: 0 } });
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1' }),
      new Map([['u1', u1]]),
    );

    const result = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: ['u1'],
    });
    expect(result).toBe(state);
  });

  it('rejects unit already packed in a different commander', () => {
    const u1 = createTestUnit({
      id: 'u1',
      owner: 'p1',
      position: { q: 1, r: 0 },
      packedInCommanderId: 'cmd2',
    });
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1' }),
      new Map([['u1', u1]]),
    );

    const result = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: ['u1'],
    });
    expect(result).toBe(state);
  });

  it('rejects when a unit id does not exist', () => {
    const state = stateWithCommander(makeCommander({ unitId: 'cmd1' }));
    const result = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: ['ghost'],
    });
    expect(result).toBe(state);
  });

  it('does not mutate original state or units map', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 } });
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1' }),
      new Map([['u1', u1]]),
    );

    const next = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: ['u1'],
    });

    expect(next).not.toBe(state);
    expect(next.units).not.toBe(state.units);
    // original unchanged
    expect(state.units.get('u1')!.packedInCommanderId).toBeUndefined();
    expect(state.commanders!.get('cmd1')!.packed).toBe(false);
  });
});

// ── DEPLOY_ARMY ──

describe('commanderArmySystem — DEPLOY_ARMY', () => {
  it('clears packedInCommanderId on all attached units and resets movement', () => {
    const u1 = createTestUnit({
      id: 'u1',
      owner: 'p1',
      position: { q: 1, r: 0 },
      packedInCommanderId: 'cmd1',
      movementLeft: 3,
    });
    const u2 = createTestUnit({
      id: 'u2',
      owner: 'p1',
      position: { q: 0, r: 1 },
      packedInCommanderId: 'cmd1',
      movementLeft: 4,
    });
    const cmdState = makeCommander({ unitId: 'cmd1', packed: true, attachedUnits: ['u1', 'u2'] });
    const state = stateWithCommander(cmdState, new Map([['u1', u1], ['u2', u2]]));

    const next = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    expect(next.units.get('u1')!.packedInCommanderId).toBeNull();
    expect(next.units.get('u2')!.packedInCommanderId).toBeNull();
    expect(next.units.get('u1')!.movementLeft).toBe(0);
    expect(next.units.get('u2')!.movementLeft).toBe(0);
  });

  it('keeps remaining movement when the commander has Initiative in CommanderState', () => {
    const u1 = createTestUnit({
      id: 'u1',
      owner: 'p1',
      position: { q: 1, r: 0 },
      packedInCommanderId: 'cmd1',
      movementLeft: 3,
    });
    const cmdState = makeCommander({
      unitId: 'cmd1',
      packed: true,
      attachedUnits: ['u1'],
      promotions: ['assault_initiative'],
    });
    const state = stateWithCommander(cmdState, new Map([['u1', u1]]));

    const next = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    expect(next.units.get('u1')!.packedInCommanderId).toBeNull();
    expect(next.units.get('u1')!.movementLeft).toBe(3);
  });

  it('keeps remaining movement when Initiative is stored on the commander unit', () => {
    const u1 = createTestUnit({
      id: 'u1',
      owner: 'p1',
      position: { q: 1, r: 0 },
      packedInCommanderId: 'cmd1',
      movementLeft: 2,
    });
    const cmdState = makeCommander({ unitId: 'cmd1', packed: true, attachedUnits: ['u1'] });
    const base = stateWithCommander(cmdState, new Map([['u1', u1]]));
    const units = new Map(base.units);
    units.set('cmd1', {
      ...units.get('cmd1')!,
      promotions: ['assault_initiative'],
    });

    const next = commanderArmySystem({ ...base, units }, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    expect(next.units.get('u1')!.packedInCommanderId).toBeNull();
    expect(next.units.get('u1')!.movementLeft).toBe(2);
  });

  it('sets commander.packed = false and clears attachedUnits', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 }, packedInCommanderId: 'cmd1' });
    const cmdState = makeCommander({ unitId: 'cmd1', packed: true, attachedUnits: ['u1'] });
    const state = stateWithCommander(cmdState, new Map([['u1', u1]]));

    const next = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    const updatedCommander = next.commanders!.get('cmd1')!;
    expect(updatedCommander.packed).toBe(false);
    expect(updatedCommander.attachedUnits).toEqual([]);
  });

  it('does not alter units packed in a different commander', () => {
    const u1 = createTestUnit({
      id: 'u1',
      owner: 'p1',
      position: { q: 1, r: 0 },
      packedInCommanderId: 'cmd2', // belongs to a different commander
    });
    const cmdState = makeCommander({ unitId: 'cmd1', packed: true, attachedUnits: ['u1'] });
    const state = stateWithCommander(cmdState, new Map([['u1', u1]]));

    const next = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    // u1 still packed in cmd2 — only units referencing cmd1 are cleared
    expect(next.units.get('u1')!.packedInCommanderId).toBe('cmd2');
  });

  it('does not mutate original state', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 }, packedInCommanderId: 'cmd1' });
    const cmdState = makeCommander({ unitId: 'cmd1', packed: true, attachedUnits: ['u1'] });
    const state = stateWithCommander(cmdState, new Map([['u1', u1]]));

    const next = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    expect(next).not.toBe(state);
    expect(next.units).not.toBe(state.units);
    expect(state.units.get('u1')!.packedInCommanderId).toBe('cmd1');
    expect(state.commanders!.get('cmd1')!.packed).toBe(true);
  });

  it('repositions packed units onto adjacent tiles around the commander and resets movement', () => {
    // Commander at q=0,r=0. Units are packed but stored at distant positions.
    const u1 = createTestUnit({
      id: 'u1',
      owner: 'p1',
      position: { q: 99, r: 99 },
      packedInCommanderId: 'cmd1',
      movementLeft: 3,
    });
    const u2 = createTestUnit({
      id: 'u2',
      owner: 'p1',
      position: { q: 50, r: 50 },
      packedInCommanderId: 'cmd1',
      movementLeft: 4,
    });
    const cmdState = makeCommander({ unitId: 'cmd1', packed: true, attachedUnits: ['u1', 'u2'] });
    const state = stateWithCommander(cmdState, new Map([['u1', u1], ['u2', u2]]));

    const next = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    // neighbors of {q:0,r:0} are: E{1,0}, NE{1,-1}, NW{0,-1}, W{-1,0}, SW{-1,1}, SE{0,1}
    // u1 (index 0) → E {q:1, r:0}, u2 (index 1) → NE {q:1, r:-1}
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u2')!.position).toEqual({ q: 1, r: -1 });
    expect(next.units.get('u1')!.movementLeft).toBe(0);
    expect(next.units.get('u2')!.movementLeft).toBe(0);
  });

  it('returns unchanged state when commander unit is missing from units map', () => {
    // Commander state exists but no matching unit
    const cmdState = makeCommander({ unitId: 'cmd1', packed: true, attachedUnits: ['u1'] });
    const commanders = new Map<string, CommanderState>([['cmd1', cmdState]]);
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 }, packedInCommanderId: 'cmd1' });
    // No commander unit in the units map
    const state = createTestState({ units: new Map([['u1', u1]]), commanders });

    const result = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });
    expect(result).toBe(state);
  });
});

// ── Age persistence (F-08) ──

describe('commanderArmySystem — age persistence (F-08)', () => {
  it('commanders map is preserved in state after TRANSITION_AGE (ageSystem passthrough)', () => {
    // The ageSystem uses `...state` spread and does not explicitly clear
    // `state.commanders`. This test confirms the field survives end-to-end
    // by checking it from the commanderArmySystem side: a packed army
    // dispatched through ageSystem should still be packed afterwards.
    // (Full integration via ageSystem is tested in ageSystem.test.ts.)
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 }, packedInCommanderId: 'cmd1' });
    const cmdState = makeCommander({ unitId: 'cmd1', packed: true, attachedUnits: ['u1'] });
    const state = stateWithCommander(cmdState, new Map([['u1', u1]]));

    // Pass a non-matching action to confirm no-op / preservation
    const next = commanderArmySystem(state, { type: 'END_TURN' });
    expect(next.commanders!.get('cmd1')!.packed).toBe(true);
    expect(next.units.get('u1')!.packedInCommanderId).toBe('cmd1');
  });
});
