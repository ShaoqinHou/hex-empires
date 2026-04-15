// @vitest-environment jsdom

/**
 * TradeRoutesPanel — smoke tests for the PanelShell migration pattern.
 *
 * The panel reads:
 *   • `state.tradeRoutes` — filters to current player's routes,
 *   • `state.cities`      — resolves city names,
 *   • `state.players`     — resolves owner names for foreign cities.
 *
 * `useGameState` is stubbed via `vi.mock` so the test never spins up
 * the engine. Goals:
 *   1. Correct PanelShell id + priority.
 *   2. Empty-state message when there are no routes.
 *   3. Route rows appear when routes exist.
 *   4. Close button wires through to `onClose`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { GameState, PlayerState, TradeRoute } from '@hex/engine';

const mockRef: { state: GameState | null } = { state: null };

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('TradeRoutesPanel.test: mock state not set');
    }
    return { state: mockRef.state, dispatch: () => {} };
  },
}));

import { TradeRoutesPanel } from '../TradeRoutesPanel';

function makePlayer(id: string, name: string): PlayerState {
  return { id, name, isHuman: true } as unknown as PlayerState;
}

function makeRoute(overrides: Partial<TradeRoute> = {}): TradeRoute {
  return {
    id: 'route1',
    from: 'city1',
    to: 'city2',
    owner: 'p1',
    turnsRemaining: 15,
    goldPerTurn: 3,
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([
      ['p1', makePlayer('p1', 'Rome')],
      ['p2', makePlayer('p2', 'Greece')],
    ]),
    cities: new Map([
      ['city1', { id: 'city1', name: 'Rome',   owner: 'p1', position: { q: 0, r: 0 } }],
      ['city2', { id: 'city2', name: 'Athens', owner: 'p2', position: { q: 3, r: 0 } }],
    ]),
    tradeRoutes: new Map(),
    ...overrides,
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
});

describe('TradeRoutesPanel (PanelShell pattern)', () => {
  it('renders inside a PanelShell with id="tradeRoutes" and priority="overlay"', () => {
    mockRef.state = makeState();
    const { getByTestId } = render(<TradeRoutesPanel onClose={() => {}} />);
    const shell = getByTestId('panel-shell-tradeRoutes');
    expect(shell.getAttribute('data-panel-id')).toBe('tradeRoutes');
    expect(shell.getAttribute('data-panel-priority')).toBe('overlay');
  });

  it('shows the empty-state message when the player has no trade routes', () => {
    mockRef.state = makeState();
    const { getByText } = render(<TradeRoutesPanel onClose={() => {}} />);
    expect(getByText(/No active trade routes/i)).toBeTruthy();
  });

  it('shows a row for each active route belonging to the current player', () => {
    const route = makeRoute();
    mockRef.state = makeState({
      tradeRoutes: new Map([['route1', route]]),
    });
    const { getByText } = render(<TradeRoutesPanel onClose={() => {}} />);
    expect(getByText('Rome')).toBeTruthy();    // origin city name
    expect(getByText('Athens')).toBeTruthy();  // destination city name
  });

  it('does NOT show routes belonging to other players', () => {
    const otherRoute = makeRoute({ id: 'route-other', owner: 'p2', from: 'city2', to: 'city1' });
    mockRef.state = makeState({
      tradeRoutes: new Map([['route-other', otherRoute]]),
    });
    const { getByText } = render(<TradeRoutesPanel onClose={() => {}} />);
    // Should still show empty-state (no routes for p1)
    expect(getByText(/No active trade routes/i)).toBeTruthy();
  });

  it('shows gold per turn for each route', () => {
    const route = makeRoute({ goldPerTurn: 5 });
    mockRef.state = makeState({
      tradeRoutes: new Map([['route1', route]]),
    });
    const { getByText } = render(<TradeRoutesPanel onClose={() => {}} />);
    // The gold column shows "+5💰"
    expect(getByText('+5💰')).toBeTruthy();
  });

  it('shows turns remaining for each route', () => {
    const route = makeRoute({ turnsRemaining: 12 });
    mockRef.state = makeState({
      tradeRoutes: new Map([['route1', route]]),
    });
    const { getByText } = render(<TradeRoutesPanel onClose={() => {}} />);
    expect(getByText('12t')).toBeTruthy();
  });

  it('fires onClose when the PanelShell close button is clicked', () => {
    mockRef.state = makeState();
    const onClose = vi.fn();
    const { getByTestId } = render(<TradeRoutesPanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-close-tradeRoutes'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
