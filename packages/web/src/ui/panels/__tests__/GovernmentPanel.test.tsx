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
import { createGameConfig } from '@hex/engine';
import { PanelManagerProvider } from '../PanelManager';

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
    config: createGameConfig(),
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
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
      <PanelManagerProvider>
        <GovernmentPanel onClose={() => {}} />
      </PanelManagerProvider>,
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

    const { getByTestId } = render(
      <PanelManagerProvider>
        <GovernmentPanel onClose={() => {}} />
      </PanelManagerProvider>,
    );

    const current = getByTestId('government-panel-current');
    expect(current.textContent).toContain('Classical Republic');
    // Legacy-bonus summary line.
    expect(getByTestId('government-panel-legacy-bonus').textContent)
      .toContain('+1 culture per city');
  });

  it('renders correct total slot count + flat wildcard slots under classical_republic', () => {
    // Classical Republic → policySlots.total = 2 (W2-03 flat wildcard model)
    // slottedPolicies is now ReadonlyArray<string | null>
    const player = makePlayer({
      governmentId: 'classical_republic',
      slottedPolicies: ['serfdom', null] as unknown as PlayerState['slottedPolicies'],
    });
    setMockState(makeState({ players: new Map([[player.id, player]]) }));

    const { getByTestId } = render(
      <PanelManagerProvider>
        <GovernmentPanel onClose={() => {}} />
      </PanelManagerProvider>,
    );

    // W2-03: single "total" count instead of per-category counts
    expect(getByTestId('government-panel-slot-count-total').textContent)
      .toContain('2');

    // Slot 0 is filled with "serfdom" → card contains "Serfdom"
    expect(getByTestId('government-panel-slot-0').textContent)
      .toContain('Serfdom');
    // Slot 1 is null → dashed-border placeholder showing "—"
    expect(getByTestId('government-panel-slot-1').textContent)
      .toBe('—');
  });

  it('adds effective social-policy bonus slots to the total', () => {
    // Classical Republic = 2 base slots (antiquity baseline), +1
    // socialPolicySlots = 3 total visible slots.
    const player = makePlayer({
      governmentId: 'classical_republic',
      socialPolicySlots: 1,
      slottedPolicies: ['serfdom', null, null] as unknown as PlayerState['slottedPolicies'],
    });
    setMockState(makeState({ players: new Map([[player.id, player]]) }));

    const { getByTestId } = render(
      <PanelManagerProvider>
        <GovernmentPanel onClose={() => {}} />
      </PanelManagerProvider>,
    );

    // The count label should report 3 slots and index 2 should be rendered.
    expect(getByTestId('government-panel-slot-count-total').textContent)
      .toContain('3');
    expect(getByTestId('government-panel-slot-2').textContent)
      .toBe('—');
  });

  it('adds civic and legacy effective policy slots to the total', () => {
    const player = makePlayer({
      governmentId: 'classical_republic',
      policySlotCounts: { military: 0, economic: 1, diplomatic: 0, wildcard: 0 },
      legacyBonuses: [
        { source: 'attribute:envoy-corps', effect: { type: 'GRANT_POLICY_SLOT', slotType: 'wildcard' } },
      ],
      slottedPolicies: ['serfdom', null, null, null] as unknown as PlayerState['slottedPolicies'],
    });
    setMockState(makeState({ players: new Map([[player.id, player]]) }));

    const { getByTestId } = render(
      <PanelManagerProvider>
        <GovernmentPanel onClose={() => {}} />
      </PanelManagerProvider>,
    );

    expect(getByTestId('government-panel-slot-count-total').textContent)
      .toContain('4');
    expect(getByTestId('government-panel-slot-3').textContent)
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
      <PanelManagerProvider>
        <GovernmentPanel onClose={() => {}} />
      </PanelManagerProvider>,
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

    const { getByTestId } = render(
      <PanelManagerProvider>
        <GovernmentPanel onClose={() => {}} />
      </PanelManagerProvider>,
    );
    // Migrated to PanelShell — close button is `panel-close-government`.
    expect(getByTestId('panel-close-government')).not.toBeNull();
  });

  it('calls onClose when the close button is clicked', () => {
    setMockState(makeState());

    const onClose = vi.fn();
    const { getByTestId } = render(
      <PanelManagerProvider>
        <GovernmentPanel onClose={onClose} />
      </PanelManagerProvider>,
    );

    fireEvent.click(getByTestId('panel-close-government'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders inside a PanelShell with the correct id and overlay priority', () => {
    setMockState(makeState());
    const { getByTestId } = render(
      <PanelManagerProvider>
        <GovernmentPanel onClose={() => {}} />
      </PanelManagerProvider>,
    );
    const shell = getByTestId('panel-shell-government');
    expect(shell.getAttribute('data-panel-priority')).toBe('overlay');
  });
});
