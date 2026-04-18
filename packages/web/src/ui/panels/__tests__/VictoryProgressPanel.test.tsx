// @vitest-environment jsdom

/**
 * VictoryProgressPanel — tests for multi-player ranking (Phase 4.4).
 *
 * Stubs `useGameState` to exercise the ranking section without the full engine.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { GameState } from '@hex/engine';

const mockRef: { state: GameState | null } = { state: null };
vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (!mockRef.state) throw new Error('VictoryProgressPanel.test: mock not set');
    return { state: mockRef.state };
  },
}));

import { VictoryProgressPanel } from '../VictoryProgressPanel';

function makeState(): GameState {
  return {
    turn: 5,
    currentPlayerId: 'p1',
    phase: 'actions',
    age: { currentAge: 'antiquity', transitionPending: false },
    players: new Map([
      ['p1', { id: 'p1', name: 'Rome', age: 'antiquity' }],
      ['p2', { id: 'p2', name: 'Greece', age: 'antiquity' }],
    ]),
    victory: {
      progress: new Map([
        ['p1', [
          { type: 'science', progress: 0.4, achieved: false },
          { type: 'domination', progress: 0.1, achieved: false },
        ]],
        ['p2', [
          { type: 'science', progress: 0.7, achieved: false },
          { type: 'domination', progress: 0.2, achieved: false },
        ]],
      ]),
      winner: null,
    },
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

afterEach(cleanup);

describe('VictoryProgressPanel (multi-player ranking)', () => {
  it('renders panel shell', () => {
    mockRef.state = makeState();
    const { getByTestId } = render(<VictoryProgressPanel onClose={() => {}} />);
    expect(getByTestId('panel-shell-victoryProgress')).toBeTruthy();
  });

  it('shows Greece and Rome in the ranking lists', () => {
    mockRef.state = makeState();
    const { getAllByText } = render(<VictoryProgressPanel onClose={() => {}} />);
    // Both players appear across the ranking sections (one row per victory type)
    expect(getAllByText('Greece').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Rome').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "All Players Ranking" section heading', () => {
    mockRef.state = makeState();
    const { getByText } = render(<VictoryProgressPanel onClose={() => {}} />);
    expect(getByText('All Players Ranking')).toBeTruthy();
  });

  it('renders without crash for single-player state', () => {
    mockRef.state = {
      ...makeState(),
      players: new Map([['p1', { id: 'p1', name: 'Solo', age: 'antiquity' }]]),
      victory: {
        progress: new Map([['p1', [{ type: 'science', progress: 0.5, achieved: false }]]]),
        winner: null,
      },
    } as unknown as GameState;
    const { getByTestId } = render(<VictoryProgressPanel onClose={() => {}} />);
    expect(getByTestId('panel-shell-victoryProgress')).toBeTruthy();
  });

  it('fires onClose when Close button is clicked', () => {
    mockRef.state = makeState();
    const onClose = vi.fn();
    const { getByTestId } = render(<VictoryProgressPanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-close-victoryProgress'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
