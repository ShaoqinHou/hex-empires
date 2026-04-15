// @vitest-environment jsdom

/**
 * VictoryPanel — smoke test for the PanelShell migration (cycle 3 batch 1).
 *
 * After the C3 cleanup cycle, VictoryPanel is registered as its own
 * `'victory'` panel id and visibility is owned by PanelManager. The
 * panel now takes an `onClose` prop (no internal `dismissed` flag) and
 * clicking the shell close button invokes the callback.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { GameState } from '@hex/engine';

const mockRef: { state: GameState | null } = { state: null };

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('VictoryPanel.shell.test: mock state not set');
    }
    return { state: mockRef.state };
  },
}));

import { VictoryPanel } from '../VictoryPanel';

function makeWinningState(): GameState {
  return {
    turn: 5,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([['p1', { id: 'p1', name: 'Human' }]]),
    map: { width: 1, height: 1, tiles: new Map() },
    units: new Map(),
    cities: new Map(),
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    builtWonders: [],
    crises: [],
    log: [],
    victory: {
      winner: 'p1',
      winType: 'science',
      progress: new Map([['p1', []]]),
    },
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
});

describe('VictoryPanel (PanelShell)', () => {
  it('renders inside PanelShell with the shell title when a winner exists', () => {
    mockRef.state = makeWinningState();
    const { getByTestId } = render(<VictoryPanel onClose={() => {}} />);
    expect(getByTestId('panel-shell-victory')).toBeTruthy();
  });

  it('invokes onClose when the shell close button is clicked', () => {
    mockRef.state = makeWinningState();
    const onClose = vi.fn();
    const { getByTestId } = render(<VictoryPanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-close-victory'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
