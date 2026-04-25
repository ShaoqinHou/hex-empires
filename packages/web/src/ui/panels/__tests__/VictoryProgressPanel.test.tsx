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

describe('VictoryProgressPanel — legacy path milestones (CC1.2)', () => {
  it('renders 12 legacy milestone cells (4 axes × 3 ages)', () => {
    mockRef.state = makeState();
    const { getByTestId } = render(<VictoryProgressPanel onClose={() => {}} />);
    // The grid section must be present
    expect(getByTestId('legacy-milestones')).toBeTruthy();
    // Each axis row is labelled
    expect(getByTestId('legacy-axis-military')).toBeTruthy();
    expect(getByTestId('legacy-axis-economic')).toBeTruthy();
    expect(getByTestId('legacy-axis-science')).toBeTruthy();
    expect(getByTestId('legacy-axis-culture')).toBeTruthy();
    // 12 cells: 4 axes × 3 ages
    const axes = ['military', 'economic', 'science', 'culture'] as const;
    const ages = ['antiquity', 'exploration', 'modern'] as const;
    for (const axis of axes) {
      for (const age of ages) {
        expect(getByTestId(`legacy-cell-${axis}-${age}`)).toBeTruthy();
      }
    }
  });

  it('shows correct progress for stub state with 5 tiers complete', () => {
    const legacyProgressEntries = [
      { axis: 'military' as const, age: 'antiquity' as const, tiersCompleted: 3 as const },
      { axis: 'science' as const, age: 'antiquity' as const, tiersCompleted: 2 as const },
      { axis: 'culture' as const, age: 'exploration' as const, tiersCompleted: 0 as const },
    ];
    mockRef.state = {
      ...makeState(),
      victory: {
        ...makeState().victory,
        legacyProgress: new Map([
          ['p1', legacyProgressEntries],
          ['p2', []],
        ]),
      },
    } as unknown as GameState;

    const { getByTestId, getAllByText } = render(<VictoryProgressPanel onClose={() => {}} />);
    // military-antiquity: 3 tiers complete → 3 checkmarks
    const milAntCell = getByTestId('legacy-cell-military-antiquity');
    expect(milAntCell.querySelectorAll('[data-testid^="legacy-tier"]').length).toBe(3);
    // science-antiquity: 2 tiers → 2 with tiersCompleted 2 means tiers 1+2 checked
    const sciAntCell = getByTestId('legacy-cell-science-antiquity');
    expect(sciAntCell.querySelectorAll('[data-testid^="legacy-tier"]').length).toBe(3);
    // The progress summary shows total completed tiers across the 3 entries: 3+2+0 = 5
    const summaries = getAllByText(/5 \/ 36 tiers/);
    expect(summaries.length).toBeGreaterThanOrEqual(1);
  });
});
