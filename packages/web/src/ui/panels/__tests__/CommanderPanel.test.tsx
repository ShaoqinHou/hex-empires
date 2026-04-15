// @vitest-environment jsdom

/**
 * CommanderPanel — component tests.
 *
 * The panel is read-only and depends on just two state shapes:
 *   • `state.players` — to locate the human player,
 *   • `state.units`   — filtered by `owner === human.id` and
 *                       `COMMANDER_INDEX.has(typeId)`.
 *
 * We stub `useGameState` via `vi.mock` so tests can feed hand-rolled
 * `GameState` slices without spinning up the full engine (matches the
 * pattern used by ReligionPanel.test.tsx and GovernmentPanel.test.tsx).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { GameState, PlayerState, UnitState } from '@hex/engine';

// ── vi.mock — stub the useGameState hook ──

const mockRef: { state: GameState | null } = { state: null };

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('CommanderPanel.test: mock state not set');
    }
    return { state: mockRef.state };
  },
}));

// Import AFTER vi.mock so the component picks up the stub.
import { CommanderPanel } from '../CommanderPanel';

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

function makeUnit(overrides: Partial<UnitState> = {}): UnitState {
  return {
    id: 'u1',
    typeId: 'captain',
    owner: 'p1',
    position: { q: 0, r: 0 },
    hp: 10,
    movement: 2,
    movementLeft: 2,
    experience: 0,
    promotions: [],
    fortified: false,
    ...overrides,
  } as unknown as UnitState;
}

function makeState(overrides: Partial<GameState> = {}): GameState {
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
    ...overrides,
  } as unknown as GameState;
}

function setMockState(state: GameState): void {
  mockRef.state = state;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
});

// ── Tests ──

describe('CommanderPanel', () => {
  it('renders empty state when the human has no commander units', () => {
    // A non-commander unit owned by the human should be ignored.
    const warrior = makeUnit({ id: 'u9', typeId: 'warrior' });
    setMockState(
      makeState({
        units: new Map([[warrior.id, warrior]]),
      }),
    );

    const { getByTestId, queryByTestId } = render(
      <CommanderPanel onClose={() => {}} />,
    );

    const empty = getByTestId('commander-panel-empty');
    expect(empty.textContent).toContain('No commanders in play yet');
    expect(empty.textContent).toContain('Captain');
    expect(empty.textContent).toContain('General/Admiral');
    expect(empty.textContent).toContain('Marshal');
    expect(queryByTestId('commander-panel-row-u1')).toBeNull();
    expect(getByTestId('commander-panel-count').textContent).toContain('0');
  });

  it('renders a commander row with name and derived level from XP', () => {
    // 150 XP crosses the level-3 threshold (LEVEL_THRESHOLDS[2] = 150).
    const cmd = makeUnit({
      id: 'u1',
      typeId: 'captain',
      owner: 'p1',
      experience: 150,
      promotions: [],
    });
    setMockState(
      makeState({ units: new Map([[cmd.id, cmd]]) }),
    );

    const { getByTestId } = render(<CommanderPanel onClose={() => {}} />);

    expect(getByTestId('commander-panel-name-u1').textContent).toBe('Captain');
    expect(getByTestId('commander-panel-level-u1').textContent).toBe('3');
    expect(getByTestId('commander-panel-xp-u1').textContent).toBe('150');
  });

  it('renders unspent picks correctly (level 2, 0 promotions → "2 picks available")', () => {
    // 50 XP == level-2 threshold; 0 promotions taken → 2 picks available.
    const cmd = makeUnit({
      id: 'u2',
      typeId: 'general',
      owner: 'p1',
      experience: 50,
      promotions: [],
    });
    setMockState(
      makeState({ units: new Map([[cmd.id, cmd]]) }),
    );

    const { getByTestId } = render(<CommanderPanel onClose={() => {}} />);

    expect(getByTestId('commander-panel-level-u2').textContent).toBe('2');
    expect(getByTestId('commander-panel-picks-u2').textContent).toBe(
      '2 picks available',
    );
    // No promotions picked yet → the empty-promotions hint shows.
    expect(
      getByTestId('commander-panel-promotions-empty-u2').textContent,
    ).toContain('no promotions picked');
  });

  it('calls onClose when the close button is clicked', () => {
    setMockState(makeState());

    const onClose = vi.fn();
    const { getByTestId } = render(<CommanderPanel onClose={onClose} />);

    // Migrated to PanelShell — close button is `panel-close-commanders`.
    fireEvent.click(getByTestId('panel-close-commanders'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders inside a PanelShell with the correct id and overlay priority', () => {
    setMockState(makeState());
    const { getByTestId } = render(<CommanderPanel onClose={() => {}} />);
    const shell = getByTestId('panel-shell-commanders');
    expect(shell.getAttribute('data-panel-priority')).toBe('overlay');
  });

  it('renders multiple commanders as separate rows', () => {
    const captain = makeUnit({
      id: 'u1',
      typeId: 'captain',
      owner: 'p1',
      experience: 0,
      promotions: [],
    });
    const general = makeUnit({
      id: 'u2',
      typeId: 'general',
      owner: 'p1',
      experience: 300, // level-4 threshold
      promotions: [],
    });
    // An AI-owned commander must NOT render.
    const enemyCaptain = makeUnit({
      id: 'u3',
      typeId: 'captain',
      owner: 'p2',
      experience: 0,
      promotions: [],
    });
    setMockState(
      makeState({
        units: new Map([
          [captain.id, captain],
          [general.id, general],
          [enemyCaptain.id, enemyCaptain],
        ]),
      }),
    );

    const { getByTestId, queryByTestId } = render(
      <CommanderPanel onClose={() => {}} />,
    );

    expect(getByTestId('commander-panel-row-u1')).toBeTruthy();
    expect(getByTestId('commander-panel-row-u2')).toBeTruthy();
    expect(queryByTestId('commander-panel-row-u3')).toBeNull();
    expect(getByTestId('commander-panel-name-u1').textContent).toBe('Captain');
    expect(getByTestId('commander-panel-name-u2').textContent).toBe('General');
    expect(getByTestId('commander-panel-level-u2').textContent).toBe('4');
    expect(getByTestId('commander-panel-count').textContent).toContain('2');
  });
});
