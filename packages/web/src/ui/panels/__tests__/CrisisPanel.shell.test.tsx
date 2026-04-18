// @vitest-environment jsdom

/**
 * CrisisPanel — smoke test for the DramaModal migration (Phase 4.5 Step 3).
 *
 * CrisisPanel routes through PanelManager. It accepts an `onResolve` prop
 * (wired to `closePanel` in App.tsx). DramaModal has no X button; only
 * choice buttons can advance the panel. After resolution, `onResolve` is
 * called programmatically.
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

// DramaModal calls useViewportClass which requires window.matchMedia.
vi.mock('../../../hooks/useViewportClass', () => ({
  useViewportClass: () => 'standard',
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

describe('CrisisPanel (DramaModal)', () => {
  it('renders inside DramaModal with the crisis name as title when a crisis is active', () => {
    mockRef.state = makeStateWithCrisis();
    const { getByTestId, getByRole } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onResolve={() => {}} />
      </PanelManagerProvider>
    );
    expect(getByTestId('panel-shell-crisis')).toBeTruthy();
    // DramaModal uses role="dialog" with aria-label = title
    expect(getByRole('dialog', { name: 'Plague' })).toBeTruthy();
  });

  it('does not render a close button (DramaModal has no X)', () => {
    mockRef.state = makeStateWithCrisis();
    const { queryByTestId } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onResolve={() => {}} />
      </PanelManagerProvider>
    );
    // DramaModal never renders data-testid="panel-close-crisis"
    expect(queryByTestId('panel-close-crisis')).toBeNull();
  });

  it('renders choice buttons from activeCrisis.choices', () => {
    mockRef.state = makeStateWithCrisis();
    const { getByText } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onResolve={() => {}} />
      </PanelManagerProvider>
    );
    expect(getByText('Quarantine cities')).toBeTruthy();
  });

  it('dispatches RESOLVE_CRISIS and calls onResolve when a choice button is clicked', () => {
    mockRef.state = makeStateWithCrisis();
    const onResolve = vi.fn();
    const { getByText } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onResolve={onResolve} />
      </PanelManagerProvider>
    );
    fireEvent.click(getByText('Quarantine cities'));
    expect(mockRef.dispatch).toHaveBeenCalledWith({
      type: 'RESOLVE_CRISIS',
      crisisId: 'plague',
      choice: 'quarantine',
    });
    expect(onResolve).toHaveBeenCalledOnce();
  });

  it('renders the turn subtitle', () => {
    mockRef.state = makeStateWithCrisis();
    const { getByText } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onResolve={() => {}} />
      </PanelManagerProvider>
    );
    expect(getByText('Turn 3')).toBeTruthy();
  });
});
