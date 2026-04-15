// @vitest-environment jsdom

/**
 * DiplomacyPanel — smoke test for the PanelShell migration.
 *
 * The panel reads only:
 *   • `state.currentPlayerId`
 *   • `state.players` — to enumerate other civilizations
 *   • `state.diplomacy.relations` — keyed by `getRelationKey`
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
      throw new Error('DiplomacyPanel.test: mock state not set');
    }
    return { state: mockRef.state, dispatch: () => {} };
  },
}));

import { DiplomacyPanel } from '../DiplomacyPanel';

function makePlayer(id: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id,
    name: id,
    isHuman: id === 'p1',
    civilizationId: 'rome',
    leaderId: 'augustus',
    age: 'antiquity',
    ...overrides,
  } as unknown as PlayerState;
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const human = makePlayer('p1');
  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([[human.id, human]]),
    diplomacy: { relations: new Map() },
    ...overrides,
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
});

describe('DiplomacyPanel (PanelShell migration)', () => {
  it('renders inside a PanelShell with id="diplomacy" and priority="info"', () => {
    mockRef.state = makeState();
    const { getByTestId } = render(<DiplomacyPanel onClose={() => {}} />);
    const shell = getByTestId('panel-shell-diplomacy');
    expect(shell.getAttribute('data-panel-priority')).toBe('info');
    expect(shell.getAttribute('data-panel-id')).toBe('diplomacy');
  });

  it('shows the empty-state hint when no other civs are discovered', () => {
    mockRef.state = makeState();
    const { getByText } = render(<DiplomacyPanel onClose={() => {}} />);
    expect(getByText(/No other civilizations discovered/i)).toBeTruthy();
  });

  it('fires onClose when the PanelShell close button is clicked', () => {
    mockRef.state = makeState();
    const onClose = vi.fn();
    const { getByTestId } = render(<DiplomacyPanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-close-diplomacy'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
