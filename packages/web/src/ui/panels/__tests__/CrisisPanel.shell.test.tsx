// @vitest-environment jsdom

/**
 * CrisisPanel — smoke test for the persistent PanelShell migration (F-06).
 *
 * CrisisPanel wraps PanelShell with priority="modal" and is non-dismissible
 * until the player fills all required crisis policy slots. Policy cards come
 * from state.config.policies; clicking dispatches FORCE_CRISIS_POLICY.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { GameState } from '@hex/engine';
import { PanelManagerProvider } from '../PanelManager';

const mockRef: { state: GameState | null; dispatch: ReturnType<typeof vi.fn> } = {
  state: null,
  dispatch: vi.fn(),
};

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('CrisisPanel.shell.test: mock state not set');
    }
    return { state: mockRef.state, dispatch: mockRef.dispatch };
  },
}));

import { CrisisPanel } from '../CrisisPanel';

function makeStateWithCrisisPhase(
  phase: 'stage1' | 'stage2' | 'stage3' = 'stage1',
  slots: number = 2,
  policies: string[] = [],
): GameState {
  return {
    turn: 20,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([
      ['p1', {
        id: 'p1',
        name: 'Player 1',
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
        gold: 100,
        science: 0,
        culture: 0,
        faith: 0,
        influence: 0,
        ageProgress: 75,
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
        crisisPhase: phase,
        crisisPolicySlots: slots,
        crisisPolicies: policies,
      }],
    ]),
    map: { width: 1, height: 1, tiles: new Map(), wrapX: false },
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
      ageThresholds: { exploration: 100, modern: 200 },
      activeCrisisType: 'plague',
    },
    config: {
      crises: [
        {
          id: 'plague',
          name: 'The Great Plague',
          description: 'A devastating plague sweeps across your empire.',
          crisisType: 'plague',
          choices: [],
        },
      ],
      policies: new Map([
        ['discipline', { id: 'discipline', name: 'Discipline', category: 'military', description: '+1 Combat Strength for all military units.', bonus: {} }],
        ['god_king', { id: 'god_king', name: 'God King', category: 'economic', description: '+2 Gold per turn.', bonus: {} }],
        ['urban_planning', { id: 'urban_planning', name: 'Urban Planning', category: 'economic', description: '+1 Production per city.', bonus: {} }],
      ]),
      governments: new Map([
        ['revolutionary_republic', { id: 'revolutionary_republic', name: 'Revolutionary Republic', description: 'Born of popular revolution.' }],
        ['revolutionary_authoritarianism', { id: 'revolutionary_authoritarianism', name: 'Revolutionary Authoritarianism', description: 'Authoritarian revolutionary order.' }],
        ['constitutional_monarchy', { id: 'constitutional_monarchy', name: 'Constitutional Monarchy', description: 'A constitutional settlement.' }],
      ]),
    } as unknown as GameState['config'],
    diplomacy: { relations: new Map() },
    victory: { winner: null, winType: null, progress: new Map() },
    rng: { seed: 1, counter: 0 },
    independentPowers: new Map(),
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
  mockRef.dispatch = vi.fn();
});

describe('CrisisPanel (persistent PanelShell)', () => {
  it('renders inside PanelShell with the crisis name as title', () => {
    mockRef.state = makeStateWithCrisisPhase();
    const { getByTestId, getByRole } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    expect(getByTestId('panel-shell-crisis')).toBeTruthy();
    expect(getByRole('dialog', { name: 'The Great Plague' })).toBeTruthy();
  });

  it('does not render a close button when slots are not filled', () => {
    mockRef.state = makeStateWithCrisisPhase('stage1', 2, []);
    const { queryByTestId } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    // PanelShell with dismissible=false omits the close button
    expect(queryByTestId('panel-close-crisis')).toBeNull();
  });

  it('renders a close button when all slots are filled', () => {
    mockRef.state = makeStateWithCrisisPhase('stage1', 2, ['discipline', 'god_king']);
    const { getByTestId } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    expect(getByTestId('panel-close-crisis')).toBeTruthy();
  });

  it('shows stage label and slot progress', () => {
    mockRef.state = makeStateWithCrisisPhase('stage1', 2, ['discipline']);
    const { getByText } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    expect(getByText('Stage 1')).toBeTruthy();
    expect(getByText('1 / 2 policies filled')).toBeTruthy();
  });

  it('renders policy cards from config.policies', () => {
    mockRef.state = makeStateWithCrisisPhase('stage1', 2, []);
    const { getByTestId } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    expect(getByTestId('crisis-policy-discipline')).toBeTruthy();
    expect(getByTestId('crisis-policy-god_king')).toBeTruthy();
    expect(getByTestId('crisis-policy-urban_planning')).toBeTruthy();
  });

  it('dispatches FORCE_CRISIS_POLICY when a policy card is clicked', () => {
    mockRef.state = makeStateWithCrisisPhase('stage1', 2, []);
    const { getByTestId } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    fireEvent.click(getByTestId('crisis-policy-discipline'));
    expect(mockRef.dispatch).toHaveBeenCalledWith({
      type: 'FORCE_CRISIS_POLICY',
      policyId: 'discipline',
    });
  });

  it('renders and dispatches a forced revolutionary government choice', () => {
    const state = makeStateWithCrisisPhase('stage3', 4, ['discipline', 'god_king', 'urban_planning']);
    const player = state.players.get('p1')!;
    const updatedPlayers = new Map(state.players);
    updatedPlayers.set('p1', {
      ...player,
      pendingGovernmentChoice: {
        reason: 'revolutions_final_stage',
        sourceCrisisType: 'revolution',
        sourceStage: 3,
        options: ['revolutionary_republic', 'revolutionary_authoritarianism', 'constitutional_monarchy'],
      },
    });
    mockRef.state = { ...state, players: updatedPlayers };
    const { getByTestId, queryByTestId } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );

    expect(queryByTestId('panel-close-crisis')).toBeNull();
    fireEvent.click(getByTestId('crisis-government-revolutionary_republic'));
    expect(mockRef.dispatch).toHaveBeenCalledWith({
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'revolutionary_republic',
    });
  });

  it('disables policy cards when all slots are filled', () => {
    mockRef.state = makeStateWithCrisisPhase('stage1', 2, ['discipline', 'god_king']);
    const { getByTestId } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    // urban_planning is not selected but slots are full → disabled
    expect((getByTestId('crisis-policy-urban_planning') as HTMLButtonElement).disabled).toBe(true);
  });

  it('returns null when crisisPhase is none', () => {
    const state = makeStateWithCrisisPhase('stage1');
    const player = state.players.get('p1')!;
    const updatedPlayers = new Map(state.players);
    updatedPlayers.set('p1', { ...player, crisisPhase: 'none' });
    mockRef.state = { ...state, players: updatedPlayers };
    const { container } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when crisisPhase is resolved', () => {
    const state = makeStateWithCrisisPhase('stage1');
    const player = state.players.get('p1')!;
    const updatedPlayers = new Map(state.players);
    updatedPlayers.set('p1', { ...player, crisisPhase: 'resolved' });
    mockRef.state = { ...state, players: updatedPlayers };
    const { container } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows a hint when slots are not yet filled', () => {
    mockRef.state = makeStateWithCrisisPhase('stage1', 2, []);
    const { getByText } = render(
      <PanelManagerProvider initialPanel="crisis">
        <CrisisPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    expect(getByText('Select 2 more policies to resolve this crisis stage.')).toBeTruthy();
  });
});
