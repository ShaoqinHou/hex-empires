import { describe, it, expect } from 'vitest';
import { fortifySystem } from '../fortifySystem';
import { createTestState, createTestUnit } from './helpers';

describe('fortifySystem', () => {
  it('fortifies a military unit', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', typeId: 'warrior', fortified: false, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const next = fortifySystem(state, { type: 'FORTIFY_UNIT', unitId: 'u1' });
    expect(next.units.get('u1')!.fortified).toBe(true);
    expect(next.units.get('u1')!.movementLeft).toBe(0);
  });

  it('unfortifies a fortified unit', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', typeId: 'warrior', fortified: true, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const next = fortifySystem(state, { type: 'FORTIFY_UNIT', unitId: 'u1' });
    expect(next.units.get('u1')!.fortified).toBe(false);
  });

  it('rejects fortifying civilian units', () => {
    const units = new Map([
      ['s1', createTestUnit({ id: 's1', typeId: 'settler', movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const next = fortifySystem(state, { type: 'FORTIFY_UNIT', unitId: 's1' });
    expect(next).toBe(state);
  });

  it('rejects fortifying builder', () => {
    const units = new Map([
      ['b1', createTestUnit({ id: 'b1', typeId: 'builder', movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const next = fortifySystem(state, { type: 'FORTIFY_UNIT', unitId: 'b1' });
    expect(next).toBe(state);
  });

  it('rejects fortifying enemy units', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', typeId: 'warrior', owner: 'p2', movementLeft: 2 })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });
    const next = fortifySystem(state, { type: 'FORTIFY_UNIT', unitId: 'u1' });
    expect(next).toBe(state);
  });

  it('ignores non-FORTIFY actions', () => {
    const state = createTestState();
    expect(fortifySystem(state, { type: 'END_TURN' })).toBe(state);
  });
});
