// @vitest-environment jsdom

/**
 * CrisisPanel — smoke test for the PanelShell migration (cycle 3 batch 1).
 *
 * CrisisPanel has no `onClose` prop — it dismisses via the
 * RESOLVE_CRISIS dispatch driven by choice buttons. We assert the shell
 * is present when an active crisis exists, and that clicking a choice
 * dispatches the action (the in-shell "close X" is intentionally a
 * no-op — see the CrisisPanel source).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { GameState } from '@hex/engine';

const mockRef: { state: GameState | null; dispatch: ReturnType<typeof vi.fn> } = {
  state: null,
  dispatch: vi.fn(),
};

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('CrisisPanel.shell.test: mock state not set');
    }
    return { state: mockRef.state, dispatch: mockRef.dispatch };
  },
}));

import { CrisisPanel } from '../CrisisPanel';

function makeStateWithCrisis(): GameState {
  return {
    turn: 3,
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
    crises: [
      {
        id: 'plague',
        name: 'Plague',
        active: true,
        turn: 3,
        choices: [
          { id: 'quarantine', text: 'Quarantine cities' },
        ],
      },
    ],
    log: [],
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
  mockRef.dispatch = vi.fn();
});

describe('CrisisPanel (PanelShell)', () => {
  it('renders inside PanelShell with the crisis name as title when a crisis is active', () => {
    mockRef.state = makeStateWithCrisis();
    const { getByTestId, getAllByText } = render(<CrisisPanel />);
    // The shell uses the registry's `age` slot since no `crisis` id exists.
    expect(getByTestId('panel-shell-age')).toBeTruthy();
    // The crisis name appears in both the shell's title bar and the body h1.
    expect(getAllByText('Plague').length).toBeGreaterThanOrEqual(1);
  });

  it('dispatches RESOLVE_CRISIS when a choice button is clicked', () => {
    mockRef.state = makeStateWithCrisis();
    const { getByText } = render(<CrisisPanel />);
    fireEvent.click(getByText('Quarantine cities'));
    expect(mockRef.dispatch).toHaveBeenCalledWith({
      type: 'RESOLVE_CRISIS',
      crisisId: 'plague',
      choice: 'quarantine',
    });
  });
});
