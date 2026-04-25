/**
 * Tests for PACK_ARMY / UNPACK_ARMY actions (X4.1).
 *
 * PACK_ARMY removes packed units from state.units and stores full UnitState
 * snapshots in CommanderState.packedUnitStates.
 * UNPACK_ARMY restores them to adjacent free tiles.
 */

import { describe, it, expect } from 'vitest';
import { commanderArmySystem } from '../commanderArmySystem';
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
  ]);
  return createTestState({ units, commanders });
}

// ── PACK_ARMY tests ──

describe('commanderArmySystem — PACK_ARMY (X4.1)', () => {
  it('packs 3 units: removes them from state.units, records them in commander', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 } });
    const u2 = createTestUnit({ id: 'u2', owner: 'p1', position: { q: 0, r: 1 } });
    const u3 = createTestUnit({ id: 'u3', owner: 'p1', position: { q: -1, r: 1 } });
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1' }),
      new Map([['u1', u1], ['u2', u2], ['u3', u3]]),
    );

    const next = commanderArmySystem(state, {
      type: 'PACK_ARMY',
      commanderId: 'cmd1',
      unitsToPack: ['u1', 'u2', 'u3'],
    });

    // Units removed from state.units
    expect(next.units.has('u1')).toBe(false);
    expect(next.units.has('u2')).toBe(false);
    expect(next.units.has('u3')).toBe(false);
    // Commander still present
    expect(next.units.has('cmd1')).toBe(true);

    // Commander state updated
    const cmd = next.commanders!.get('cmd1')!;
    expect(cmd.packed).toBe(true);
    expect(cmd.attachedUnits).toEqual(['u1', 'u2', 'u3']);
    // Snapshots stored
    expect(cmd.packedUnitStates).toBeDefined();
    expect(cmd.packedUnitStates!.length).toBe(3);
    const packedIds = cmd.packedUnitStates!.map(u => u.id);
    expect(packedIds).toContain('u1');
    expect(packedIds).toContain('u2');
    expect(packedIds).toContain('u3');
  });

  it('rejects packing 7 units (exceeds PACK_ARMY_CAP of 6)', () => {
    // Create 7 units adjacent to commander at q=0,r=0
    const positions = [
      { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
      { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
      // 7th unit: put it at distance 1 (one of the duplicated positions since we've exhausted 6-ring)
      // Actually all 6 unique neighbors used, 7th has to be at the commander's own hex
    ];
    // Use 6 neighbors for 6 valid units + commander hex (distance 0) for u7
    const extraUnits = new Map<string, ReturnType<typeof createTestUnit>>();
    for (let i = 0; i < 6; i++) {
      const id = `u${i + 1}`;
      extraUnits.set(id, createTestUnit({ id, owner: 'p1', position: positions[i] }));
    }
    // 7th unit at same hex as commander (distance 0, still ≤ 1)
    extraUnits.set('u7', createTestUnit({ id: 'u7', owner: 'p1', position: { q: 0, r: 0 } }));

    const state = stateWithCommander(makeCommander({ unitId: 'cmd1' }), extraUnits);
    const unitIds = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'];

    const result = commanderArmySystem(state, {
      type: 'PACK_ARMY',
      commanderId: 'cmd1',
      unitsToPack: unitIds,
    });
    expect(result).toBe(state); // unchanged — cap exceeded
  });

  it('rejects packing when commander does not exist in commanders map', () => {
    const state = createTestState();
    const result = commanderArmySystem(state, {
      type: 'PACK_ARMY',
      commanderId: 'ghost',
      unitsToPack: ['u1'],
    });
    expect(result).toBe(state);
  });

  it('does not mutate the original state', () => {
    const u1 = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 } });
    const state = stateWithCommander(
      makeCommander({ unitId: 'cmd1' }),
      new Map([['u1', u1]]),
    );
    const frozenUnitsSize = state.units.size;

    commanderArmySystem(state, {
      type: 'PACK_ARMY',
      commanderId: 'cmd1',
      unitsToPack: ['u1'],
    });

    expect(state.units.size).toBe(frozenUnitsSize);
    expect(state.units.has('u1')).toBe(true);
    expect(state.commanders!.get('cmd1')!.packed).toBe(false);
  });
});

// ── UNPACK_ARMY tests ──

describe('commanderArmySystem — UNPACK_ARMY (X4.1)', () => {
  it('unpacks 3 units: restores them to state.units at adjacent tiles', () => {
    const u1Snapshot = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 1, r: 0 } });
    const u2Snapshot = createTestUnit({ id: 'u2', owner: 'p1', position: { q: 0, r: 1 } });
    const u3Snapshot = createTestUnit({ id: 'u3', owner: 'p1', position: { q: -1, r: 1 } });

    // Commander in packed state with 3 unit snapshots
    const cmdState = makeCommander({
      unitId: 'cmd1',
      packed: true,
      attachedUnits: ['u1', 'u2', 'u3'],
      packedUnitStates: [u1Snapshot, u2Snapshot, u3Snapshot],
    });
    // Only commander in units map (packed units are gone)
    const state = stateWithCommander(cmdState);

    const next = commanderArmySystem(state, {
      type: 'UNPACK_ARMY',
      commanderId: 'cmd1',
    });

    // All 3 units restored
    expect(next.units.has('u1')).toBe(true);
    expect(next.units.has('u2')).toBe(true);
    expect(next.units.has('u3')).toBe(true);

    // Commander state reset
    const cmd = next.commanders!.get('cmd1')!;
    expect(cmd.packed).toBe(false);
    expect(cmd.attachedUnits).toEqual([]);
    expect(cmd.packedUnitStates).toEqual([]);
  });

  it('fails to unpack when there is no adjacent room (all tiles occupied)', () => {
    // Commander at q=0,r=0. Place units on all 6 adjacent tiles to block room.
    const adjacentPositions = [
      { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
      { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
    ];
    const blockingUnits = new Map<string, ReturnType<typeof createTestUnit>>();
    for (let i = 0; i < 6; i++) {
      const id = `blocker${i + 1}`;
      blockingUnits.set(id, createTestUnit({ id, owner: 'p2', position: adjacentPositions[i] }));
    }

    const u1Snapshot = createTestUnit({ id: 'u1', owner: 'p1', position: { q: 5, r: 5 } });
    const cmdState = makeCommander({
      unitId: 'cmd1',
      packed: true,
      attachedUnits: ['u1'],
      packedUnitStates: [u1Snapshot],
    });
    const state = stateWithCommander(cmdState, blockingUnits);

    const result = commanderArmySystem(state, {
      type: 'UNPACK_ARMY',
      commanderId: 'cmd1',
    });
    expect(result).toBe(state); // unchanged — no room to unpack
  });

  it('returns state unchanged when commander is not packed', () => {
    const cmdState = makeCommander({ unitId: 'cmd1', packed: false });
    const state = stateWithCommander(cmdState);

    const result = commanderArmySystem(state, {
      type: 'UNPACK_ARMY',
      commanderId: 'cmd1',
    });
    expect(result).toBe(state);
  });

  it('returns state unchanged when commander does not exist', () => {
    const state = createTestState();
    const result = commanderArmySystem(state, {
      type: 'UNPACK_ARMY',
      commanderId: 'ghost',
    });
    expect(result).toBe(state);
  });
});
