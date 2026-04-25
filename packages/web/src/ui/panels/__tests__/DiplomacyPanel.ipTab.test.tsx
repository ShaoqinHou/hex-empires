// @vitest-environment jsdom

/**
 * DiplomacyPanel — Independent Powers tab + Leaders stub (W10 items 3 + 4).
 *
 * Tests:
 *  F-07:
 *   1. "Ind. Powers" tab button is present.
 *   2. Clicking it shows IP entries from state.independentPowers.
 *   3. Empty-state message when there are no IPs.
 *  F-15:
 *   4. "Leaders" tab button is present.
 *   5. Clicking it shows AI leader entries.
 *   6. Clicking "Discuss" shows the placeholder modal.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import type { GameState, PlayerState, IndependentPowerState } from '@hex/engine';
import { createGameConfig, createDefaultAccountState } from '@hex/engine';
import { DiplomacyPanel } from '../DiplomacyPanel';
import { PanelManagerProvider } from '../PanelManager';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePlayer(id: string, isHuman: boolean): PlayerState {
  return {
    id,
    name: isHuman ? 'Human' : `AI ${id}`,
    isHuman,
    civilizationId: isHuman ? 'rome' : 'greece',
    leaderId: isHuman ? 'augustus' : 'pericles',
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
    influence: 200,
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
    equippedMementos: [],
  } as unknown as PlayerState;
}

function makeIP(id: string, overrides: Partial<IndependentPowerState> = {}): IndependentPowerState {
  return {
    id,
    type: 'militaristic',
    attitude: 'neutral',
    position: { q: 3, r: 5 },
    befriendProgress: 10,
    suzerainPlayerId: null,
    isIncorporated: false,
    isCityState: true,
    bonusPool: [],
    ...overrides,
  };
}

function makeState(
  ips: ReadonlyMap<string, IndependentPowerState> = new Map(),
  withAI = false,
): GameState {
  const players: [string, PlayerState][] = [['player1', makePlayer('player1', true)]];
  if (withAI) players.push(['ai1', makePlayer('ai1', false)]);
  return {
    turn: 1,
    currentPlayerId: 'player1',
    phase: 'actions',
    players: new Map(players),
    map: { width: 5, height: 5, tiles: new Map(), wrapX: false },
    units: new Map(),
    cities: new Map(),
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    builtWonders: [],
    crises: [],
    log: [],
    config: createGameConfig(),
    diplomacy: { relations: new Map() },
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    victory: { winner: null, winType: null, progress: new Map() },
    rng: { seed: 0, counter: 0 },
    unlockedAchievements: new Map(),
    independentPowers: ips,
    firedNarrativeEvents: [],
    pendingNarrativeEvents: [],
    ageProgressMeter: 0,
    commanders: new Map(),
    lastValidation: null,
  } as unknown as GameState;
}

// ── Shim: mock useGameState to inject test state ─────────────────────────────

import * as GameProviderModule from '../../../providers/GameProvider';

function renderPanel(state: GameState, onClose = () => {}) {
  // Mock useGameState to return our injected state.
  vi.spyOn(GameProviderModule, 'useGameState').mockReturnValue({
    state,
    dispatch: vi.fn(),
    initGame: vi.fn(),
    isProcessingAI: false,
    account: createDefaultAccountState(),
    terrainRegistry: { get: () => undefined, getAll: () => [], has: () => false, register: () => {} } as any,
    featureRegistry: { get: () => undefined, getAll: () => [], has: () => false, register: () => {} } as any,
    unitRegistry: { get: () => undefined, getAll: () => [], has: () => false, register: () => {} } as any,
    resourceRegistry: { get: () => undefined, getAll: () => [], has: () => false, register: () => {} } as any,
    selectedUnit: null,
    setSelectedUnit: vi.fn(),
    selectedHex: null,
    setSelectedHex: vi.fn(),
    hoveredHex: null,
    setHoveredHex: vi.fn(),
    isAltPressed: false,
    selectedCityId: null,
    selectedCity: null,
    selectCity: vi.fn(),
    combatPreview: null,
    setCombatPreview: vi.fn(),
    combatPreviewPosition: null,
    setCombatPreviewPosition: vi.fn(),
    reachableHexes: null,
    saveGame: vi.fn(),
    loadGame: vi.fn(),
    lastValidation: null,
    clearValidation: vi.fn(),
    placementMode: null,
    enterPlacementMode: vi.fn(),
    exitPlacementMode: vi.fn(),
  });

  return render(
    <PanelManagerProvider initialPanel="diplomacy">
      <DiplomacyPanel onClose={onClose} />
    </PanelManagerProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DiplomacyPanel — Independent Powers tab (W10 F-07)', () => {
  it('renders "Ind. Powers" tab button', () => {
    renderPanel(makeState());
    expect(screen.getByRole('button', { name: 'Ind. Powers' })).toBeTruthy();
  });

  it('clicking Ind. Powers tab with IPs shows them', () => {
    const ips = new Map([['carantania', makeIP('carantania')]]);
    renderPanel(makeState(ips));

    fireEvent.click(screen.getByRole('button', { name: 'Ind. Powers' }));

    expect(screen.getByText('carantania')).toBeTruthy();
    expect(screen.getByText('Neutral')).toBeTruthy();
  });

  it('clicking Ind. Powers tab with no IPs shows empty-state message', () => {
    renderPanel(makeState(new Map()));

    fireEvent.click(screen.getByRole('button', { name: 'Ind. Powers' }));

    expect(
      screen.getByText(/No independent powers on the map/i),
    ).toBeTruthy();
  });
});

describe('DiplomacyPanel — Leaders stub tab (W10 F-15)', () => {
  it('renders "Leaders" tab button', () => {
    renderPanel(makeState(new Map(), true));
    expect(screen.getByRole('button', { name: 'Leaders' })).toBeTruthy();
  });

  it('clicking Leaders tab shows AI leader entries', () => {
    renderPanel(makeState(new Map(), true));

    fireEvent.click(screen.getByRole('button', { name: 'Leaders' }));

    // AI player's leader should appear. Config has 'pericles' in leaders map.
    // The config.leaders.get('pericles') returns the def with name 'Pericles'.
    expect(screen.getByText('Discuss')).toBeTruthy();
  });

  it('clicking Discuss shows the development placeholder message', () => {
    renderPanel(makeState(new Map(), true));

    fireEvent.click(screen.getByRole('button', { name: 'Leaders' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discuss' }));

    expect(screen.getByText(/Feature in development/i)).toBeTruthy();
  });
});
