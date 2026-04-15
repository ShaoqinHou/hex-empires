// @vitest-environment jsdom

/**
 * PanelShell migration — batch 3.
 *
 * Verifies that the four "bigger" panels migrated in cycle 3/batch 3
 * (TechTreePanel, CivicTreePanel, AgeTransitionPanel,
 * VictoryProgressPanel) wrap their body in <PanelShell> with the
 * registry-defined identifiers/priorities and that key behavioural
 * invariants survive the chrome swap:
 *
 *   - tree panels expose data-panel-id and a vertically/horizontally
 *     scrollable inner region for the (large) tree grid;
 *   - AgeTransition keeps its "blocking modal" semantic — the
 *     PanelShell-supplied close button + backdrop click do NOT
 *     dismiss the panel until a civ is picked;
 *   - VictoryProgressPanel renders as an overlay PanelShell (not a
 *     bespoke fixed inset/black backdrop block).
 *
 * Each test stubs the GameProvider hook with a minimal fixture so the
 * panels can render without standing up a full GameState.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { GameState, PlayerState, GameAction } from '@hex/engine';

// ── GameProvider mock — a single mockRef shared across all panels ──

interface MockRef {
  state: GameState | null;
  dispatch: (action: GameAction) => void;
}
const mockRef: MockRef = {
  state: null,
  dispatch: () => undefined,
};

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('PanelShell.migration.test: mock state not set');
    }
    return { state: mockRef.state, dispatch: mockRef.dispatch };
  },
}));

// Imports AFTER vi.mock so the panel components pick up the stub.
import { TechTreePanel } from '../TechTreePanel';
import { CivicTreePanel } from '../CivicTreePanel';
import { AgeTransitionPanel } from '../AgeTransitionPanel';
import { VictoryProgressPanel } from '../VictoryProgressPanel';

// ── Fixture builders ──

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'p1',
    name: 'Human',
    isHuman: true,
    civilizationId: 'rome',
    leaderId: 'augustus',
    age: 'antiquity',
    researchedTechs: [],
    currentResearch: null,
    researchProgress: 0,
    researchedCivics: [],
    currentCivic: null,
    civicProgress: 0,
    gold: 0,
    science: 0,
    culture: 0,
    faith: 0,
    influence: 0,
    ageProgress: 0,
    legacyBonuses: [],
    legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
    legacyPoints: 0,
    totalGoldEarned: 0,
    totalKills: 0,
    visibility: new Set(),
    explored: new Set(),
    celebrationCount: 0,
    celebrationBonus: 0,
    celebrationTurnsLeft: 0,
    masteredTechs: [],
    currentMastery: null,
    masteryProgress: 0,
    masteredCivics: [],
    currentCivicMastery: null,
    civicMasteryProgress: 0,
    governors: [],
    ...overrides,
  } as PlayerState;
}

function makeBaseState(player: PlayerState, overrides: Partial<GameState> = {}): GameState {
  return {
    turn: 1,
    currentPlayerId: player.id,
    phase: 'actions',
    players: new Map([[player.id, player]]),
    map: { width: 1, height: 1, tiles: new Map() },
    units: new Map(),
    cities: new Map(),
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    builtWonders: [],
    crises: [],
    log: [],
    age: {
      currentAge: 'antiquity',
      ageThresholds: { antiquity: 0, exploration: 100, modern: 200 },
    },
    victory: { progress: new Map() },
    ...overrides,
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
  mockRef.dispatch = () => undefined;
});

// ── TechTreePanel ──

describe('TechTreePanel — PanelShell migration', () => {
  it('renders inside a PanelShell with id="tech" and overlay priority', () => {
    mockRef.state = makeBaseState(makePlayer());
    const { getByTestId } = render(<TechTreePanel onClose={() => {}} />);
    const shell = getByTestId('panel-shell-tech');
    expect(shell.getAttribute('data-panel-priority')).toBe('overlay');
    expect(shell.getAttribute('data-panel-width')).toBe('full');
  });

  it('the close button (PanelShell chrome) fires the parent onClose', () => {
    const onClose = vi.fn();
    mockRef.state = makeBaseState(makePlayer());
    const { getByTestId } = render(<TechTreePanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-close-tech'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('preserves a horizontally+vertically scrollable inner region for the tree grid', () => {
    mockRef.state = makeBaseState(makePlayer());
    const { getByTestId } = render(<TechTreePanel onClose={() => {}} />);
    // The tree-grid wrapper must be `overflow-auto` to allow both axes
    // of scroll inside PanelShell's vertically-scrollable body.
    const shell = getByTestId('panel-shell-tech');
    const overflowDiv = shell.querySelector('div.overflow-auto');
    expect(overflowDiv).not.toBeNull();
  });
});

// ── CivicTreePanel ──

describe('CivicTreePanel — PanelShell migration', () => {
  it('renders inside a PanelShell with id="civics" and overlay priority', () => {
    mockRef.state = makeBaseState(makePlayer());
    const { getByTestId } = render(<CivicTreePanel onClose={() => {}} />);
    const shell = getByTestId('panel-shell-civics');
    expect(shell.getAttribute('data-panel-priority')).toBe('overlay');
    expect(shell.getAttribute('data-panel-width')).toBe('full');
  });

  it('the close button (PanelShell chrome) fires the parent onClose', () => {
    const onClose = vi.fn();
    mockRef.state = makeBaseState(makePlayer());
    const { getByTestId } = render(<CivicTreePanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-close-civics'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('preserves a horizontally+vertically scrollable inner region for the civic grid', () => {
    mockRef.state = makeBaseState(makePlayer());
    const { getByTestId } = render(<CivicTreePanel onClose={() => {}} />);
    const shell = getByTestId('panel-shell-civics');
    const overflowDiv = shell.querySelector('div.overflow-auto');
    expect(overflowDiv).not.toBeNull();
  });
});

// ── AgeTransitionPanel ──

describe('AgeTransitionPanel — PanelShell migration + blocking semantics', () => {
  it('renders inside a modal PanelShell with id="age"', () => {
    mockRef.state = makeBaseState(makePlayer());
    const { getByTestId } = render(<AgeTransitionPanel onClose={() => {}} />);
    const shell = getByTestId('panel-shell-age');
    expect(shell.getAttribute('data-panel-priority')).toBe('modal');
  });

  it('renders a backdrop (modal priority)', () => {
    mockRef.state = makeBaseState(makePlayer());
    const { queryByTestId } = render(<AgeTransitionPanel onClose={() => {}} />);
    expect(queryByTestId('panel-backdrop-age')).not.toBeNull();
  });

  it('marks the shell root with data-dismissible="false" — blocking modal', () => {
    mockRef.state = makeBaseState(makePlayer());
    const { getByTestId } = render(<AgeTransitionPanel onClose={() => {}} />);
    expect(getByTestId('panel-shell-age').getAttribute('data-dismissible')).toBe('false');
  });

  it('does NOT render the PanelShell close X button — blocking modal', () => {
    // Now that AgeTransitionPanel uses `dismissible={false}`, PanelShell
    // drops the close button entirely instead of rendering an inert one.
    mockRef.state = makeBaseState(makePlayer());
    const { queryByTestId } = render(<AgeTransitionPanel onClose={() => {}} />);
    expect(queryByTestId('panel-close-age')).toBeNull();
  });

  it('does NOT call parent onClose when the modal backdrop is clicked — blocking modal', () => {
    const onClose = vi.fn();
    mockRef.state = makeBaseState(makePlayer());
    const { getByTestId } = render(<AgeTransitionPanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-backdrop-age'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dispatches TRANSITION_AGE and calls parent onClose when a civ is picked (ready)', () => {
    const calls: GameAction[] = [];
    mockRef.dispatch = (action) => { calls.push(action); };
    const onClose = vi.fn();
    // Player has enough age progress to be `ready` for exploration age.
    mockRef.state = makeBaseState(makePlayer({ ageProgress: 100 }));
    const { container } = render(<AgeTransitionPanel onClose={onClose} />);
    // All visible buttons are civ-pick buttons now — the PanelShell X is
    // not rendered at all with `dismissible={false}`.
    const civButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => !b.disabled,
    );
    expect(civButtons.length).toBeGreaterThan(0);
    fireEvent.click(civButtons[0]);
    expect(calls.length).toBe(1);
    expect(calls[0].type).toBe('TRANSITION_AGE');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── VictoryProgressPanel ──

describe('VictoryProgressPanel — PanelShell migration', () => {
  it('renders inside a PanelShell with id="victoryProgress" and overlay priority', () => {
    mockRef.state = makeBaseState(makePlayer());
    const { getByTestId } = render(<VictoryProgressPanel onClose={() => {}} />);
    const shell = getByTestId('panel-shell-victoryProgress');
    expect(shell.getAttribute('data-panel-priority')).toBe('overlay');
  });

  it('the close button (PanelShell chrome) fires the parent onClose', () => {
    const onClose = vi.fn();
    mockRef.state = makeBaseState(makePlayer());
    const { getByTestId } = render(<VictoryProgressPanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-close-victoryProgress'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT render a fixed-inset bespoke backdrop (chrome owned by PanelShell)', () => {
    // The pre-migration version mounted its own `fixed inset-0 bg-black/60`
    // wrapper. After migration, no element with that exact class signature
    // should exist — chrome is owned by PanelShell.
    mockRef.state = makeBaseState(makePlayer());
    const { container } = render(<VictoryProgressPanel onClose={() => {}} />);
    const bespokeBackdrop = container.querySelector('div.fixed.inset-0');
    expect(bespokeBackdrop).toBeNull();
  });
});
