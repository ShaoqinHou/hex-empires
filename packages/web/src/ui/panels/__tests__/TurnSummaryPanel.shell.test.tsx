// @vitest-environment jsdom

/**
 * TurnSummaryPanel — smoke test for the PanelShell migration (cycle 3 batch 1).
 *
 * Stubs `useGameState` AND the `calculateResourceChanges` engine helper
 * so the panel renders without the full engine runtime.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { GameState, PlayerState } from '@hex/engine';

const mockRef: { state: GameState | null } = { state: null };

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('TurnSummaryPanel.shell.test: mock state not set');
    }
    return { state: mockRef.state };
  },
}));

vi.mock('@hex/engine', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@hex/engine');
  return {
    ...actual,
    calculateResourceChanges: () => ({
      goldPerTurn: 0,
      sciencePerTurn: 0,
      culturePerTurn: 0,
      maintenanceCost: 0,
      totalFoodSurplus: 0,
      totalProduction: 0,
      starvingCities: [],
      goldDeficitCities: [],
      unhappyCities: 0,
    }),
    getGrowthThreshold: () => 10,
  };
});

import { TurnSummaryPanel } from '../TurnSummaryPanel';

function makePlayer(): PlayerState {
  return { id: 'p1', name: 'Human' } as unknown as PlayerState;
}

function makeState(): GameState {
  const human = makePlayer();
  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([[human.id, human]]),
    map: { width: 1, height: 1, tiles: new Map() },
    units: new Map(),
    cities: new Map(),
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    builtWonders: [],
    crises: [],
    log: [],
    age: { currentAge: 'antiquity' },
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
});

describe('TurnSummaryPanel (PanelShell)', () => {
  it('renders inside PanelShell with the registry title', () => {
    mockRef.state = makeState();
    const { getByTestId, getByText } = render(<TurnSummaryPanel onClose={() => {}} />);
    expect(getByTestId('panel-shell-turnSummary')).toBeTruthy();
    expect(getByText('Turn Summary')).toBeTruthy();
  });

  it('fires onClose when the shell close button is clicked', () => {
    mockRef.state = makeState();
    const onClose = vi.fn();
    const { getByTestId } = render(<TurnSummaryPanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-close-turnSummary'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
