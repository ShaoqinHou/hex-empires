// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { Minimap } from '../Minimap';

const gameState = vi.hoisted(() => ({ current: null as any }));

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => gameState.current,
}));

function createCanvasContext() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  };
}

function makeGameState(options: { explored: boolean; visible: boolean }) {
  const coord = { q: 0, r: 0 };
  const key = '0,0';
  const visibility = options.visible ? new Set([key]) : new Set<string>();
  const explored = options.explored ? new Set([key]) : new Set<string>();

  return {
    state: {
      currentPlayerId: 'p1',
      map: {
        tiles: new Map([[key, { coord, terrain: 'grassland' }]]),
      },
      players: new Map([
        ['p1', { id: 'p1', visibility, explored }],
        ['p2', { id: 'p2' }],
      ]),
      cities: new Map([[
        'c1',
        { id: 'c1', owner: 'p2', position: coord },
      ]]),
      units: new Map([[
        'u1',
        { id: 'u1', owner: 'p2', position: coord },
      ]]),
    },
    terrainRegistry: new Map([['grassland', { id: 'grassland' }]]),
  };
}

describe('Minimap fog visibility', () => {
  let context: ReturnType<typeof createCanvasContext>;

  beforeEach(() => {
    context = createCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not draw city or unit markers on unexplored tiles', async () => {
    gameState.current = makeGameState({ explored: false, visible: false });

    render(<Minimap />);

    await waitFor(() => expect(context.clearRect).toHaveBeenCalled());
    expect(context.strokeRect).not.toHaveBeenCalled();
    expect(context.arc).not.toHaveBeenCalled();
  });

  it('draws city and unit markers on visible tiles', async () => {
    gameState.current = makeGameState({ explored: true, visible: true });

    render(<Minimap />);

    await waitFor(() => expect(context.strokeRect).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      6,
      6,
    ));
    expect(context.arc).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      2,
      0,
      Math.PI * 2,
    );
  });

  it('remembers explored city markers but hides units outside current visibility', async () => {
    gameState.current = makeGameState({ explored: true, visible: false });

    render(<Minimap />);

    await waitFor(() => expect(context.strokeRect).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      6,
      6,
    ));
    expect(context.arc).not.toHaveBeenCalled();
  });
});
