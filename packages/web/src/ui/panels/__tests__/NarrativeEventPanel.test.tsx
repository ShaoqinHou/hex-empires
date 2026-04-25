// @vitest-environment jsdom

/**
 * NarrativeEventPanel — smoke tests for the narrative event ceremony (F-07).
 *
 * Covers:
 * - Renders title and vignette text for a pending event.
 * - Choice buttons are present and dispatch RESOLVE_NARRATIVE_EVENT.
 * - Returns null when no event is pending.
 * - Calls onResolve when the last queued event is resolved.
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
      throw new Error('NarrativeEventPanel.test: mock state not set');
    }
    return { state: mockRef.state, dispatch: mockRef.dispatch };
  },
}));

vi.mock('../../../hooks/useViewportClass', () => ({
  useViewportClass: () => 'standard',
}));

vi.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

import { NarrativeEventPanel } from '../NarrativeEventPanel';

/** Minimal NarrativeEventDef fixture */
const DISCOVERY_EVENT = {
  id: 'discovery-ruins',
  title: 'Ancient Ruins Discovered',
  vignette: 'Your explorers stumble upon the remains of a lost civilization.',
  category: 'discovery' as const,
  ageGate: undefined,
  requirements: { triggerType: 'DISCOVERY_EXPLORED' as const },
  choices: [
    {
      label: 'Study the ruins',
      effects: [{ type: 'MODIFY_YIELD' as const, target: 'empire' as const, yield: 'science' as const, value: 20 }],
      tagOutput: ['studied_ruins'],
    },
    {
      label: 'Loot the ruins',
      effects: [{ type: 'MODIFY_YIELD' as const, target: 'empire' as const, yield: 'gold' as const, value: 30 }],
      tagOutput: ['looted_ruins'],
    },
  ],
};

function makeStateWithPendingEvent(eventIds: string[] = ['discovery-ruins']): GameState {
  return {
    turn: 5,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([
      ['p1', {
        id: 'p1',
        name: 'Player 1',
        isHuman: true,
        civilizationId: 'greece',
        leaderId: 'pericles',
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
        narrativeTags: [],
      }],
    ]),
    pendingNarrativeEvents: eventIds,
    firedNarrativeEvents: eventIds,
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
    },
    config: {
      narrativeEvents: new Map([['discovery-ruins', DISCOVERY_EVENT]]),
      crises: [],
      policies: new Map(),
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

describe('NarrativeEventPanel', () => {
  it('renders the event title and vignette for a pending event', () => {
    mockRef.state = makeStateWithPendingEvent();
    const { getByText } = render(
      <PanelManagerProvider initialPanel="narrativeEvent">
        <NarrativeEventPanel onResolve={() => {}} />
      </PanelManagerProvider>
    );
    expect(getByText('Ancient Ruins Discovered')).toBeTruthy();
    expect(getByText('Your explorers stumble upon the remains of a lost civilization.')).toBeTruthy();
  });

  it('renders choice buttons for the pending event', () => {
    mockRef.state = makeStateWithPendingEvent();
    const { getByText } = render(
      <PanelManagerProvider initialPanel="narrativeEvent">
        <NarrativeEventPanel onResolve={() => {}} />
      </PanelManagerProvider>
    );
    expect(getByText('Study the ruins')).toBeTruthy();
    expect(getByText('Loot the ruins')).toBeTruthy();
  });

  it('dispatches RESOLVE_NARRATIVE_EVENT with correct eventId and choiceIndex when a choice is clicked', () => {
    mockRef.state = makeStateWithPendingEvent();
    const { getByText } = render(
      <PanelManagerProvider initialPanel="narrativeEvent">
        <NarrativeEventPanel onResolve={() => {}} />
      </PanelManagerProvider>
    );
    fireEvent.click(getByText('Loot the ruins'));
    expect(mockRef.dispatch).toHaveBeenCalledWith({
      type: 'RESOLVE_NARRATIVE_EVENT',
      eventId: 'discovery-ruins',
      choiceIndex: 1,
    });
  });

  it('calls onResolve after resolving the last queued event', () => {
    mockRef.state = makeStateWithPendingEvent(['discovery-ruins']);
    const onResolve = vi.fn();
    const { getByText } = render(
      <PanelManagerProvider initialPanel="narrativeEvent">
        <NarrativeEventPanel onResolve={onResolve} />
      </PanelManagerProvider>
    );
    fireEvent.click(getByText('Study the ruins'));
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it('returns null when pendingNarrativeEvents is empty', () => {
    mockRef.state = makeStateWithPendingEvent([]);
    const { container } = render(
      <PanelManagerProvider initialPanel="narrativeEvent">
        <NarrativeEventPanel onResolve={() => {}} />
      </PanelManagerProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when the event def is not found in config', () => {
    mockRef.state = makeStateWithPendingEvent(['unknown-event-id']);
    const { container } = render(
      <PanelManagerProvider initialPanel="narrativeEvent">
        <NarrativeEventPanel onResolve={() => {}} />
      </PanelManagerProvider>
    );
    expect(container.innerHTML).toBe('');
  });
});
