// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Camera } from '../Camera';
import { AnimationManager } from '../AnimationManager';
import type {
  UnitMoveAnimation,
  MeleeAttackAnimation,
  FloatingDamageAnimation,
} from '../AnimationManager';
import { AnimationRenderer } from '../AnimationRenderer';

const { drawUnitIconMock } = vi.hoisted(() => ({
  drawUnitIconMock: vi.fn(),
}));

vi.mock('../UnitIcons', () => ({
  drawUnitIcon: drawUnitIconMock,
}));

function createContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: vi.fn() };
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    measureText: vi.fn(() => ({ width: 10 })),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    canvas: { width: 100, height: 100 },
  } as unknown as CanvasRenderingContext2D;
}

function makeAnimationManager(): AnimationManager {
  return new AnimationManager();
}

function makeRenderer(context: CanvasRenderingContext2D): AnimationRenderer {
  return new AnimationRenderer(context);
}

function makeCamera(): Camera {
  return { applyTransform: vi.fn() } as unknown as Camera;
}

function linear(_t: number): number {
  return _t;
}

describe('AnimationRenderer visibility gating', () => {
  afterEach(() => {
    drawUnitIconMock.mockClear();
    vi.restoreAllMocks();
  });

  it('renders unit movement when the current segment is visible', () => {
    const renderer = makeRenderer(createContext());
    const manager = makeAnimationManager();
    const camera = makeCamera();

    const anim: UnitMoveAnimation = {
      id: 'move-visible',
      type: 'unit-move',
      startTime: 0,
      duration: 1000,
      easing: linear,
      unitId: 'u1',
      ownerId: 'p1',
      unitTypeId: 'warrior',
      path: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }],
      totalDistance: 2,
    };
    manager.add(anim);

    const visibleOnlyMiddle = (coord: { q: number; r: number }) => coord.q === 1 && coord.r === 0;

    renderer.render(camera, manager, 600, visibleOnlyMiddle);

    expect(drawUnitIconMock).toHaveBeenCalledTimes(1);
  });

  it('does not render unit movement when the current segment is hidden', () => {
    const renderer = makeRenderer(createContext());
    const manager = makeAnimationManager();
    const camera = makeCamera();

    const anim: UnitMoveAnimation = {
      id: 'move-hidden',
      type: 'unit-move',
      startTime: 0,
      duration: 1000,
      easing: linear,
      unitId: 'u1',
      ownerId: 'p1',
      unitTypeId: 'warrior',
      path: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }],
      totalDistance: 2,
    };
    manager.add(anim);

    const visibleOnlyDestination = (coord: { q: number; r: number }) => coord.q === 2 && coord.r === 0;

    renderer.render(camera, manager, 0, visibleOnlyDestination);

    expect(drawUnitIconMock).not.toHaveBeenCalled();
  });

  it('renders unit movement only after the current position enters a visible half-segment', () => {
    const renderer = makeRenderer(createContext());
    const manager = makeAnimationManager();
    const camera = makeCamera();

    const anim: UnitMoveAnimation = {
      id: 'move-entering-visible',
      type: 'unit-move',
      startTime: 0,
      duration: 1000,
      easing: linear,
      unitId: 'u1',
      ownerId: 'p1',
      unitTypeId: 'warrior',
      path: [{ q: 0, r: 0 }, { q: 1, r: 0 }],
      totalDistance: 1,
    };
    manager.add(anim);

    const visibleOnlyDestination = (coord: { q: number; r: number }) => coord.q === 1 && coord.r === 0;

    renderer.render(camera, manager, 0, visibleOnlyDestination);
    expect(drawUnitIconMock).not.toHaveBeenCalled();

    renderer.render(camera, manager, 400, visibleOnlyDestination);
    expect(drawUnitIconMock).toHaveBeenCalledTimes(1);
  });

  it('preserves prior behavior when no fog predicate is provided', () => {
    const renderer = makeRenderer(createContext());
    const manager = makeAnimationManager();
    const camera = makeCamera();

    const anim: UnitMoveAnimation = {
      id: 'move-legacy',
      type: 'unit-move',
      startTime: 0,
      duration: 1000,
      easing: linear,
      unitId: 'u1',
      ownerId: 'p1',
      unitTypeId: 'warrior',
      path: [{ q: 0, r: 0 }, { q: 1, r: 0 }],
      totalDistance: 1,
    };
    manager.add(anim);

    renderer.render(camera, manager, 0);

    expect(drawUnitIconMock).toHaveBeenCalledTimes(1);
  });

  it('does not render melee attack when either anchor is hidden', () => {
    const renderer = makeRenderer(createContext());
    const manager = makeAnimationManager();
    const camera = makeCamera();

    const anim: MeleeAttackAnimation = {
      id: 'attack-hidden',
      type: 'melee-attack',
      startTime: 0,
      duration: 200,
      easing: linear,
      attackerId: 'a1',
      attackerTypeId: 'infantry',
      attackerOwnerId: 'p1',
      targetId: 'u2',
      targetTypeId: 'archer',
      targetOwnerId: 'p2',
      attackerFrom: { q: 0, r: 0 },
      attackerTo: { q: 1, r: 0 },
    };
    manager.add(anim);

    renderer.render(camera, manager, 0, () => false);

    expect(drawUnitIconMock).not.toHaveBeenCalled();
  });

  it('renders floating damage numbers only when anchor is visible', () => {
    const context = createContext();
    const renderer = makeRenderer(context);
    const manager = makeAnimationManager();
    const camera = makeCamera();

    const anim: FloatingDamageAnimation = {
      id: 'damage-visible',
      type: 'floating-damage',
      startTime: 0,
      duration: 800,
      easing: linear,
      targetId: 'u1',
      position: { q: 0, r: 0 },
      damage: 10,
    };

    manager.add({
      id: 'damage-hidden',
      type: 'floating-damage',
      startTime: 0,
      duration: 800,
      easing: linear,
      targetId: 'u2',
      position: { q: 2, r: 0 },
      damage: 5,
    });
    manager.add(anim);

    const visibleCoord = (coord: { q: number; r: number }) => coord.q === 0 && coord.r === 0;
    renderer.render(camera, manager, 0, visibleCoord);

    // Each entry draws shadow + main text
    expect(context.fillText).toHaveBeenCalledTimes(2);
  });
});
