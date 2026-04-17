import { describe, it, expect } from 'vitest';
import { allUnitsHaveActed } from '../AllUnitsActed';
import { createTestState, createTestUnit } from '../../systems/__tests__/helpers';

describe('allUnitsHaveActed', () => {
  it('returns true when there are no units', () => {
    const state = createTestState({ units: new Map() });
    expect(allUnitsHaveActed(state)).toBe(true);
  });

  it('returns true when the only unit has movementLeft 0', () => {
    const unit = createTestUnit({ id: 'u1', owner: 'p1', movementLeft: 0, fortified: false });
    const state = createTestState({ units: new Map([['u1', unit]]) });
    expect(allUnitsHaveActed(state)).toBe(true);
  });

  it('returns false when a unit has movementLeft 1', () => {
    const unit = createTestUnit({ id: 'u1', owner: 'p1', movementLeft: 1, fortified: false });
    const state = createTestState({ units: new Map([['u1', unit]]) });
    expect(allUnitsHaveActed(state)).toBe(false);
  });

  it('returns false when one of two units has movementLeft remaining', () => {
    const acted = createTestUnit({ id: 'u1', owner: 'p1', movementLeft: 0, fortified: false });
    const idle  = createTestUnit({ id: 'u2', owner: 'p1', movementLeft: 2, fortified: false });
    const state = createTestState({ units: new Map([['u1', acted], ['u2', idle]]) });
    expect(allUnitsHaveActed(state)).toBe(false);
  });

  it('treats a fortified unit as acted even when movementLeft > 0', () => {
    const unit = createTestUnit({ id: 'u1', owner: 'p1', movementLeft: 2, fortified: true });
    const state = createTestState({ units: new Map([['u1', unit]]) });
    expect(allUnitsHaveActed(state)).toBe(true);
  });

  it('ignores units owned by other players', () => {
    // currentPlayerId is 'p1' in createTestState
    const enemyUnit = createTestUnit({ id: 'u1', owner: 'p2', movementLeft: 3, fortified: false });
    const state = createTestState({ units: new Map([['u1', enemyUnit]]) });
    expect(allUnitsHaveActed(state)).toBe(true);
  });
});
