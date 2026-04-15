// @vitest-environment jsdom

/**
 * CrisisPanel — smoke test for the PanelShell migration (audit batch 3B).
 *
 * CrisisPanel routes through PanelManager. It accepts an `onClose` prop
 * (wired to `closePanel` in App.tsx) and uses `dismissible={false}` — the
 * X button is not rendered; only choice buttons can advance the panel.
 * After resolution, `onClose` is called programmatically.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { GameState } from '@hex/engine';
import { PanelManagerProvider } from '../PanelManager';

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
    const { getByTestId, getAllByText } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    expect(getByTestId('panel-shell-crisis')).toBeTruthy();
    // The crisis name appears in both the shell's title bar and the body h1.
    expect(getAllByText('Plague').length).toBeGreaterThanOrEqual(1);
  });

  it('does not render a close button (dismissible=false)', () => {
    mockRef.state = makeStateWithCrisis();
    const { queryByTestId } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    // PanelShell only renders data-testid="panel-close-crisis" when dismissible=true.
    expect(queryByTestId('panel-close-crisis')).toBeNull();
  });

  it('dispatches RESOLVE_CRISIS and calls onClose when a choice button is clicked', () => {
    mockRef.state = makeStateWithCrisis();
    const onClose = vi.fn();
    const { getByText } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={onClose} />
      </PanelManagerProvider>
    );
    fireEvent.click(getByText('Quarantine cities'));
    expect(mockRef.dispatch).toHaveBeenCalledWith({
      type: 'RESOLVE_CRISIS',
      crisisId: 'plague',
      choice: 'quarantine',
    });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
