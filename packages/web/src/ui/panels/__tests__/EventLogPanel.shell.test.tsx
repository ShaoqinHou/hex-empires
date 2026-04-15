// @vitest-environment jsdom

/**
 * EventLogPanel — smoke test for the PanelShell migration (cycle 3 batch 1).
 *
 * Stubs `useGameState` so the panel can render without the full engine,
 * then asserts the shell wraps it and onClose fires.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { GameState } from '@hex/engine';

const mockRef: { state: GameState | null } = { state: null };

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('EventLogPanel.shell.test: mock state not set');
    }
    return { state: mockRef.state };
  },
}));

import { EventLogPanel } from '../EventLogPanel';

function makeState(): GameState {
  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map(),
    map: { width: 1, height: 1, tiles: new Map() },
    units: new Map(),
    cities: new Map(),
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    builtWonders: [],
    crises: [],
    log: [],
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
});

describe('EventLogPanel (PanelShell)', () => {
  it('renders inside PanelShell with the registry title', () => {
    mockRef.state = makeState();
    const { getByTestId, getByText } = render(<EventLogPanel onClose={() => {}} />);
    expect(getByTestId('panel-shell-log')).toBeTruthy();
    expect(getByText('Event Log')).toBeTruthy();
  });

  it('fires onClose when the shell close button is clicked', () => {
    mockRef.state = makeState();
    const onClose = vi.fn();
    const { getByTestId } = render(<EventLogPanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-close-log'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
