import { describe, expect, it } from 'vitest';
import type { GameState, HexCoord, UnitState } from '@hex/engine';
import { AnimationManager } from '../AnimationManager';
import {
  createUnitMoveAnimationPlan,
  triggerAnimationsForAction,
} from '../AnimationTrigger';

function makeUnit(position: HexCoord): UnitState {
  return {
    id: 'u1',
    owner: 'p1',
    typeId: 'warrior',
    position,
    movementLeft: 2,
    health: 100,
    experience: 0,
    promotions: [],
    fortified: false,
  };
}

function makeState(unit: UnitState): GameState {
  return {
    units: new Map([[unit.id, unit]]),
    cities: new Map(),
  } as unknown as GameState;
}

describe('AnimationTrigger movement diffing', () => {
  it('builds move animations from the previous position to the accepted final position', () => {
    const prev = makeState(makeUnit({ q: 3, r: 3 }));
    const next = makeState(makeUnit({ q: 4, r: 3 }));

    const plan = createUnitMoveAnimationPlan(prev, next, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 4, r: 3 }],
    });

    expect(plan?.ownerId).toBe('p1');
    expect(plan?.unitTypeId).toBe('warrior');
    expect(plan?.path).toEqual([{ q: 3, r: 3 }, { q: 4, r: 3 }]);
  });

  it('does not animate rejected moves where engine state did not move', () => {
    const prev = makeState(makeUnit({ q: 3, r: 3 }));
    const manager = new AnimationManager();

    triggerAnimationsForAction(manager, prev, prev, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 4, r: 3 }],
    });

    expect(manager.getActive()).toHaveLength(0);
  });

  it('shortens the animation path when the engine stops movement before the requested destination', () => {
    const prev = makeState(makeUnit({ q: 3, r: 3 }));
    const next = makeState(makeUnit({ q: 4, r: 3 }));

    const plan = createUnitMoveAnimationPlan(prev, next, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 4, r: 3 }, { q: 5, r: 3 }],
    });

    expect(plan?.path).toEqual([{ q: 3, r: 3 }, { q: 4, r: 3 }]);
  });
});
