// @vitest-environment jsdom

/**
 * VictoryPanel — smoke test for the DramaModal migration (Phase 4.5 Step 4).
 *
 * VictoryPanel is registered as its own 'victory' panel id and visibility
 * is owned by PanelManager. The panel now uses DramaModal(tone="triumph")
 * and accepts an onResolve prop. There is no close (X) button.
 * "Continue Playing" fires onResolve; "New Game" calls window.location.reload().
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

// DramaModal calls useViewportClass which requires window.matchMedia.
vi.mock('../../../hooks/useViewportClass', () => ({
  useViewportClass: () => 'standard',
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

describe('VictoryPanel (DramaModal)', () => {
  it('renders inside DramaModal with panel-shell-victory testid when a winner exists', () => {
    mockRef.state = makeWinningState();
    const { getByTestId } = render(<VictoryPanel onResolve={() => {}} />);
    expect(getByTestId('panel-shell-victory')).toBeTruthy();
  });

  it('renders "Victory!" as the display title', () => {
    mockRef.state = makeWinningState();
    const { getAllByText } = render(<VictoryPanel onResolve={() => {}} />);
    // Title appears in the h2 element
    expect(getAllByText('Victory!').length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT render a close X button (DramaModal has no X)', () => {
    mockRef.state = makeWinningState();
    const { queryByTestId } = render(<VictoryPanel onResolve={() => {}} />);
    expect(queryByTestId('panel-close-victory')).toBeNull();
  });

  it('invokes onResolve when "Continue Playing" is clicked', () => {
    mockRef.state = makeWinningState();
    const onResolve = vi.fn();
    const { getByText } = render(<VictoryPanel onResolve={onResolve} />);
    fireEvent.click(getByText('Continue Playing'));
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it('renders "New Game" button', () => {
    mockRef.state = makeWinningState();
    const { getByText } = render(<VictoryPanel onResolve={() => {}} />);
    expect(getByText('New Game')).toBeTruthy();
  });

  it('renders the win-type subtitle', () => {
    mockRef.state = makeWinningState();
    const { getByText } = render(<VictoryPanel onResolve={() => {}} />);
    expect(getByText(/Science victory/i)).toBeTruthy();
  });
});
