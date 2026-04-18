// @vitest-environment jsdom

/**
 * TurnSummaryPanel — smoke test for the DramaModal migration (Phase 4.5 Step 5).
 *
 * Stubs `useGameState` AND the `calculateResourceChanges` engine helper
 * so the panel renders without the full engine runtime. Also mocks
 * useViewportClass (DramaModal calls it; window.matchMedia absent in jsdom).
 *
 * heroHeight=120 per spec §11 Q1 recommendation — verifies the compact
 * hero slot is applied.
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

// DramaModal calls useViewportClass which requires window.matchMedia.
vi.mock('../../../hooks/useViewportClass', () => ({
  useViewportClass: () => 'standard',
}));

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

describe('TurnSummaryPanel (DramaModal)', () => {
  it('renders inside DramaModal with panel-shell-turnSummary testid', () => {
    mockRef.state = makeState();
    const { getByTestId } = render(<TurnSummaryPanel onResolve={() => {}} />);
    expect(getByTestId('panel-shell-turnSummary')).toBeTruthy();
  });

  it('renders "Turn 1" as the display title', () => {
    mockRef.state = makeState();
    const { getAllByText } = render(<TurnSummaryPanel onResolve={() => {}} />);
    expect(getAllByText('Turn 1').length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT render a close X button (DramaModal has no X)', () => {
    mockRef.state = makeState();
    const { queryByTestId } = render(<TurnSummaryPanel onResolve={() => {}} />);
    expect(queryByTestId('panel-close-turnSummary')).toBeNull();
  });

  it('fires onResolve when the Continue button is clicked', () => {
    mockRef.state = makeState();
    const onResolve = vi.fn();
    const { getByText } = render(<TurnSummaryPanel onResolve={onResolve} />);
    fireEvent.click(getByText('Continue'));
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it('renders the age subtitle', () => {
    mockRef.state = makeState();
    const { getByText } = render(<TurnSummaryPanel onResolve={() => {}} />);
    expect(getByText('Antiquity Age')).toBeTruthy();
  });

  it('applies 120px heroHeight on the hero slot (compact per Q1 recommendation)', () => {
    mockRef.state = makeState();
    const { container } = render(<TurnSummaryPanel onResolve={() => {}} />);
    // DramaModal renders the hero slot with class "drama-hero-slot"
    const heroSlot = container.querySelector('.drama-hero-slot');
    expect(heroSlot).toBeTruthy();
    const style = (heroSlot as HTMLElement).style;
    expect(style.height).toBe('120px');
  });
});
