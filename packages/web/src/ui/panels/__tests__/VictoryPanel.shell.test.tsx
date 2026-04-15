// @vitest-environment jsdom

/**
 * VictoryPanel — smoke test for the PanelShell migration (cycle 3 batch 1).
 *
 * VictoryPanel has no `onClose` prop — it dismisses via internal state.
 * The shell still exposes a close button which we wire to the same
 * "dismissed" flag. We assert the shell is present and clicking close
 * removes the panel (state-based dismissal).
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
    const { getByTestId } = render(<VictoryPanel />);
    expect(getByTestId('panel-shell-victoryProgress')).toBeTruthy();
  });

  it('dismisses the panel when the shell close button is clicked', () => {
    mockRef.state = makeWinningState();
    const { getByTestId, queryByTestId } = render(<VictoryPanel />);
    fireEvent.click(getByTestId('panel-close-victoryProgress'));
    // After dismissal the shell unmounts (panel returns null).
    expect(queryByTestId('panel-shell-victoryProgress')).toBeNull();
  });
});
