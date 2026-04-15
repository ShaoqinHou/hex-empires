// @vitest-environment jsdom

/**
 * GovernorPanel — smoke test for the PanelShell migration.
 *
 * The panel reads:
 *   • `state.players.get(state.currentPlayerId).governors` — recruited list,
 *   • `state.governors` — to resolve recruited ids to full Governor records,
 *   • `state.config.governors` — to enumerate available-to-recruit defs,
 *   • `state.cities` — to list player cities for assignment.
 *
 * We stub `useGameState` via `vi.mock` so this test can feed a hand-rolled
 * `GameState` slice without spinning up the full engine. The goal here is
 * narrow: confirm the panel mounts inside a PanelShell with the correct
 * id + priority and that the close button (provided by PanelShell) wires
 * through to `onClose`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { GameState, PlayerState } from '@hex/engine';

const mockRef: { state: GameState | null } = { state: null };

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('GovernorPanel.test: mock state not set');
    }
    return { state: mockRef.state, dispatch: () => {} };
  },
}));

import { GovernorPanel } from '../GovernorPanel';

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'p1',
    name: 'Human',
    isHuman: true,
    civilizationId: 'rome',
    leaderId: 'augustus',
    age: 'antiquity',
    governors: [],
    ...overrides,
  } as unknown as PlayerState;
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const human = makePlayer();
  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([[human.id, human]]),
    governors: new Map(),
    cities: new Map(),
    config: { governors: new Map() },
    ...overrides,
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
});

describe('GovernorPanel (PanelShell migration)', () => {
  it('renders inside a PanelShell with id="governors" and priority="info"', () => {
    mockRef.state = makeState();
    const { getByTestId } = render(<GovernorPanel onClose={() => {}} />);
    const shell = getByTestId('panel-shell-governors');
    expect(shell.getAttribute('data-panel-priority')).toBe('info');
    expect(shell.getAttribute('data-panel-id')).toBe('governors');
  });

  it('shows the recruited-empty hint when the player has no governors', () => {
    mockRef.state = makeState();
    const { getByText } = render(<GovernorPanel onClose={() => {}} />);
    expect(getByText(/No governors recruited yet/i)).toBeTruthy();
  });

  it('fires onClose when the PanelShell close button is clicked', () => {
    mockRef.state = makeState();
    const onClose = vi.fn();
    const { getByTestId } = render(<GovernorPanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-close-governors'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
