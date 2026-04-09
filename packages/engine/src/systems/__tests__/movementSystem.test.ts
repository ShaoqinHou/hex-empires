import { describe, it, expect } from 'vitest';
import { movementSystem } from '../movementSystem';
import { createTestState, createTestUnit, setTile } from './helpers';
import { coordToKey } from '../../hex/HexMath';

describe('movementSystem', () => {
  it('moves unit to adjacent hex', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(1);
  });

  it('moves unit along multi-step path', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 3 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 2, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(1);
  });

  it('rejects movement with insufficient movement points', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 1 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    // Should not move — cost is 2 but only 1 movement left
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
  });

  it('rejects movement into impassable terrain (ocean)', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    // Set target tile to ocean
    const tiles = new Map(state.map.tiles);
    setTile(tiles, { q: 1, r: 0 }, 'ocean');
    const next = movementSystem(
      { ...state, map: { ...state.map, tiles } },
      { type: 'MOVE_UNIT', unitId: 'u1', path: [{ q: 1, r: 0 }] },
    );
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
  });

  it('rejects movement into mountains', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const tiles = new Map(state.map.tiles);
    setTile(tiles, { q: 1, r: 0 }, 'plains', 'mountains');
    const next = movementSystem(
      { ...state, map: { ...state.map, tiles } },
      { type: 'MOVE_UNIT', unitId: 'u1', path: [{ q: 1, r: 0 }] },
    );
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
  });

  it('charges extra movement for hills', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 3 })],
    ]);
    const state = createTestState({ units });
    const tiles = new Map(state.map.tiles);
    setTile(tiles, { q: 1, r: 0 }, 'grassland', 'hills');
    const next = movementSystem(
      { ...state, map: { ...state.map, tiles } },
      { type: 'MOVE_UNIT', unitId: 'u1', path: [{ q: 1, r: 0 }] },
    );
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(1); // cost 2 (1 base + 1 hills)
  });

  it('rejects movement to non-adjacent hex', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 5 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 3, r: 0 }], // not adjacent
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
  });

  it('rejects movement of non-existent unit', () => {
    const state = createTestState();
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'nonexistent',
      path: [{ q: 1, r: 0 }],
    });
    expect(next).toBe(state);
  });

  it('rejects movement of enemy unit', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p2', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
  });

  it('prevents stacking friendly units', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
      ['u2', createTestUnit({ id: 'u2', position: { q: 1, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
  });

  it('breaks fortification on movement', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2, fortified: true })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }],
    });
    expect(next.units.get('u1')!.fortified).toBe(false);
  });

  it('adds log entry on successful move', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }],
    });
    expect(next.log.length).toBe(1);
    expect(next.log[0].type).toBe('move');
  });

  it('ignores non-MOVE_UNIT actions', () => {
    const state = createTestState();
    const next = movementSystem(state, { type: 'END_TURN' });
    expect(next).toBe(state);
  });
});
