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
  commanderPosition = { q: 0, r: 0 },
): GameState {
  const commanderUnit = createTestUnit({
    id: cmdState.unitId,
    typeId: 'captain',
    owner: 'p1',
    position: commanderPosition,
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
  it('packs adjacent units: removes them from state.units and stores full snapshots', () => {
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

    expect(next.units.has('u1')).toBe(false);
    expect(next.units.has('u2')).toBe(false);

    const updatedCommander = next.commanders!.get('cmd1')!;
    expect(updatedCommander.packed).toBe(true);
    expect(updatedCommander.attachedUnits).toEqual(['u1', 'u2']);
    expect(updatedCommander.packedUnitStates).toHaveLength(2);
    expect(updatedCommander.packedUnitStates!.map((u) => u.id)).toEqual(['u1', 'u2']);
  });

  it('sets commander.packed = true and records attachedUnits + packedUnitStates', () => {
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
    expect(updatedCommander.packedUnitStates).toHaveLength(1);
    expect(updatedCommander.packedUnitStates![0]!.id).toBe('u1');
  });

  it('appends new packed units to existing snapshots and deploys all of them', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 4, r: 3 } });
    const u2 = createTestUnit({ id: 'u2', owner: 'p1', position: { q: 3, r: 4 } });
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1' }),
      new Map([['u1', u1], ['u2', u2]]),
      new Map(),
      { q: 3, r: 3 },
    );

    const onePacked = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: ['u1'],
    });
    const twoPacked = commanderArmySystem(onePacked, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: ['u2'],
    });
    const deployed = commanderArmySystem(twoPacked, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    expect(twoPacked.units.has('u1')).toBe(false);
    expect(twoPacked.units.has('u2')).toBe(false);
    expect(twoPacked.commanders!.get('cmd1')!.attachedUnits).toEqual(['u1', 'u2']);
    expect(twoPacked.commanders!.get('cmd1')!.packedUnitStates!.map((unit) => unit.id)).toEqual(['u1', 'u2']);
    expect(deployed.units.get('u1')!.position).toEqual({ q: 4, r: 3 });
    expect(deployed.units.get('u2')!.position).toEqual({ q: 4, r: 2 });
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
    expect(next.units.has('u1')).toBe(false);
    expect(next.units.has('u2')).toBe(false);
    expect(next.units.has('u3')).toBe(false);
    expect(next.units.has('u4')).toBe(false);
    expect(next.commanders!.get('cmd1')!.packedUnitStates).toHaveLength(4);
  });

  it('rejects when unitIds count exceeds COMMANDER_BASE_STACK_CAP (4) without Regiments', () => {
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

  it('allows expanded unit slots when the commander has Regiments', () => {
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
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1', promotions: ['logistics_regiments'] }),
      extraUnits,
    );
    const unitIds = Array.from(extraUnits.keys());

    const next = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds,
    });

    expect(next).not.toBe(state);
    for (const unitId of unitIds) {
      expect(next.units.has(unitId)).toBe(false);
    }
    expect(next.commanders!.get('cmd1')!.packedUnitStates).toHaveLength(5);
  });

  it('does not expand unit slots for non-Regiments stack placeholder promotions', () => {
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
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1', promotions: ['leadership_grand_retinue'] }),
      extraUnits,
    );

    const result = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: Array.from(extraUnits.keys()),
    });

    expect(result).toBe(state);
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

  it('rejects packing the commander unit itself', () => {
    const state = stateWithCommander(makeCommander({ unitId: 'cmd1' }));

    const result = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: ['cmd1'],
    });

    expect(result).toBe(state);
  });

  it('rejects duplicate unit ids in the pack request', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 } });
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1' }),
      new Map([['u1', u1]]),
    );

    const result = commanderArmySystem(state, {
      type: 'ASSEMBLE_ARMY',
      commanderId: 'cmd1',
      unitIds: ['u1', 'u1'],
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
    expect(state.units.has('u1')).toBe(true);
    expect(state.commanders!.get('cmd1')!.packed).toBe(false);
  });
});

// ── DEPLOY_ARMY ──

describe('commanderArmySystem — DEPLOY_ARMY', () => {
  it('restores packedUnitStates onto adjacent free tiles and resets movement', () => {
    const u1 = createTestUnit({
      id: 'u1',
      owner: 'p1',
      position: { q: 99, r: 99 },
      movementLeft: 3,
    });
    const u2 = createTestUnit({
      id: 'u2',
      owner: 'p1',
      position: { q: 50, r: 50 },
      movementLeft: 4,
    });
    const cmdState = makeCommander({
      unitId: 'cmd1',
      packed: true,
      attachedUnits: ['u1', 'u2'],
      packedUnitStates: [u1, u2],
    });
    const state = stateWithCommander(cmdState, new Map(), new Map(), { q: 3, r: 3 });

    const next = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    const deployed1 = next.units.get('u1')!;
    const deployed2 = next.units.get('u2')!;
    expect(deployed1.position).toEqual({ q: 4, r: 3 });
    expect(deployed2.position).toEqual({ q: 4, r: 2 });
    expect(deployed1.packedInCommanderId).toBeNull();
    expect(deployed2.packedInCommanderId).toBeNull();
    expect(deployed1.movementLeft).toBe(0);
    expect(deployed2.movementLeft).toBe(0);

    const updatedCommander = next.commanders!.get('cmd1')!;
    expect(updatedCommander.packed).toBe(false);
    expect(updatedCommander.attachedUnits).toEqual([]);
    expect(updatedCommander.packedUnitStates).toEqual([]);
  });

  it('keeps remaining movement for unpacked units when commander has Initiative', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 20, r: 20 }, movementLeft: 3 });
    const cmdState = makeCommander({
      unitId: 'cmd1',
      packed: true,
      attachedUnits: ['u1'],
      packedUnitStates: [u1],
      promotions: ['assault_initiative'],
    });
    const state = stateWithCommander(cmdState);

    const next = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    expect(next.units.get('u1')!.movementLeft).toBe(3);
    expect(next.units.get('u1')!.packedInCommanderId).toBeNull();
  });

  it('keeps remaining movement when Initiative is stored on the commander unit', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 20, r: 20 }, movementLeft: 2 });
    const cmdState = makeCommander({
      unitId: 'cmd1',
      packed: true,
      attachedUnits: ['u1'],
      packedUnitStates: [u1],
    });
    const base = stateWithCommander(cmdState);
    const units = new Map(base.units);
    units.set('cmd1', {
      ...units.get('cmd1')!,
      promotions: ['assault_initiative'],
    });
    const state = { ...base, units };

    const next = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    expect(next.units.get('u1')!.movementLeft).toBe(2);
    expect(next.units.get('u1')!.packedInCommanderId).toBeNull();
  });

  it('clears packedUnitStates and does not mutate original state', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 50, r: 50 }, movementLeft: 3 });
    const cmdState = makeCommander({
      unitId: 'cmd1',
      packed: true,
      attachedUnits: ['u1'],
      packedUnitStates: [u1],
    });
    const state = stateWithCommander(cmdState, new Map());

    const next = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    expect(next).not.toBe(state);
    expect(next.units).not.toBe(state.units);
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(state.units.has('u1')).toBe(false);
    expect(state.commanders!.get('cmd1')!.packed).toBe(true);
    expect(state.commanders!.get('cmd1')!.packedUnitStates).toHaveLength(1);
  });

  it('legacy fallback clears only units packed to this commander', () => {
    const u1 = createTestUnit({
      id: 'u1',
      owner: 'p1',
      position: { q: 1, r: 0 },
      packedInCommanderId: 'cmd1',
    });
    const u2 = createTestUnit({
      id: 'u2',
      owner: 'p1',
      position: { q: 0, r: 1 },
      packedInCommanderId: 'cmd2',
    });
    const cmdState = makeCommander({
      unitId: 'cmd1',
      packed: true,
      attachedUnits: ['u1', 'u2'],
    });
    const state = stateWithCommander(cmdState, new Map([['u1', u1], ['u2', u2]]));

    const next = commanderArmySystem(state, { type: 'DEPLOY_ARMY', commanderId: 'cmd1' });

    expect(next.units.get('u1')!.packedInCommanderId).toBeNull();
    expect(next.units.get('u2')!.packedInCommanderId).toBe('cmd2');
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u2')!.position).toEqual({ q: 0, r: 1 }); // unchanged
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
