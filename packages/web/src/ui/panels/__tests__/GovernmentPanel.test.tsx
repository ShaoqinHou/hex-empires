// @vitest-environment jsdom

/**
 * GovernmentPanel — component tests.
 *
 * The panel is read-only and only depends on `state.players` (the
 * human player's `governmentId`, `slottedPolicies`, `researchedCivics`).
 * We stub `useGameState` via `vi.mock` so tests can feed hand-rolled
 * `GameState` slices without spinning up the full engine.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { GameState, PlayerState } from '@hex/engine';

// ── vi.mock — stub the useGameState hook ──

const mockRef: { state: GameState | null } = { state: null };

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('GovernmentPanel.test: mock state not set');
    }
    return { state: mockRef.state };
  },
}));

// Import AFTER vi.mock so the component picks up the stub.
import { GovernmentPanel } from '../GovernmentPanel';

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

describe('GovernmentPanel', () => {
  it('renders "No government adopted yet" when player.governmentId is absent', () => {
    const player = makePlayer({ governmentId: undefined });
    setMockState(makeState({ players: new Map([[player.id, player]]) }));

    const { getByTestId, queryByTestId } = render(
      <GovernmentPanel onClose={() => {}} />,
    );

    const empty = getByTestId('government-panel-current-empty');
    expect(empty.textContent).toContain('No government adopted yet');
    expect(queryByTestId('government-panel-current')).toBeNull();
    // Slots section should also be in the empty branch.
    expect(getByTestId('government-panel-slots-empty')).not.toBeNull();
  });

  it('renders the current government name + description when governmentId is set', () => {
    const player = makePlayer({ governmentId: 'classical_republic' });
    setMockState(makeState({ players: new Map([[player.id, player]]) }));

    const { getByTestId } = render(<GovernmentPanel onClose={() => {}} />);

    const current = getByTestId('government-panel-current');
    expect(current.textContent).toContain('Classical Republic');
    // Legacy-bonus summary line.
    expect(getByTestId('government-panel-legacy-bonus').textContent)
      .toContain('+1 culture per city');
  });

  it('renders correct slot counts + "—" for empty slots under classical_republic', () => {
    // Classical Republic → { military: 0, economic: 1, diplomatic: 0, wildcard: 1 }
    const player = makePlayer({
      governmentId: 'classical_republic',
      slottedPolicies: new Map([
        ['economic', ['serfdom']],
        ['wildcard', [null]],
      ]),
    });
    setMockState(makeState({ players: new Map([[player.id, player]]) }));

    const { getByTestId } = render(<GovernmentPanel onClose={() => {}} />);

    expect(getByTestId('government-panel-slot-count-military').textContent)
      .toContain('0');
    expect(getByTestId('government-panel-slot-count-economic').textContent)
      .toContain('1');
    expect(getByTestId('government-panel-slot-count-diplomatic').textContent)
      .toContain('0');
    expect(getByTestId('government-panel-slot-count-wildcard').textContent)
      .toContain('1');

    // The economic slot at index 0 is filled with "serfdom" → "Serfdom".
    expect(getByTestId('government-panel-slot-economic-0').textContent)
      .toBe('Serfdom');
    // The wildcard slot at index 0 is explicitly null → "—".
    expect(getByTestId('government-panel-slot-wildcard-0').textContent)
      .toBe('—');
  });

  it('lists available policies whose unlockCivic is researched', () => {
    // `discipline` unlocks from `code_of_laws`. Research that civic and
    // it should appear in the Available Policies list.
    const player = makePlayer({
      researchedCivics: ['code_of_laws'],
    });
    setMockState(makeState({ players: new Map([[player.id, player]]) }));

    const { getByTestId, queryByTestId } = render(
      <GovernmentPanel onClose={() => {}} />,
    );

    // `discipline` and `urban_planning` -- NO; urban_planning is unlocked
    // by `craftsmanship`, which we did NOT research.
    expect(getByTestId('government-panel-available-discipline').textContent)
      .toContain('Discipline');
    expect(queryByTestId('government-panel-available-urban_planning'))
      .toBeNull();
  });

  it('renders a close button in the header', () => {
    setMockState(makeState());

    const { getByTestId } = render(<GovernmentPanel onClose={() => {}} />);
    expect(getByTestId('government-panel-close')).not.toBeNull();
  });

  it('calls onClose when the close button is clicked', () => {
    setMockState(makeState());

    const onClose = vi.fn();
    const { getByTestId } = render(<GovernmentPanel onClose={onClose} />);

    fireEvent.click(getByTestId('government-panel-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
