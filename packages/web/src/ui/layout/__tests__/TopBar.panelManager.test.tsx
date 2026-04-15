// @vitest-environment jsdom

/**
 * TopBar — PanelManager wiring tests.
 *
 * These tests assert the M33→App.tsx/TopBar migration:
 *   • Each header trigger (Tech, Civics, Diplo, Ages) carries
 *     `data-panel-trigger="<panelId>"` so the future click-outside-to-close
 *     logic can identify them.
 *   • Clicking a trigger flips the PanelManager's `activePanel`
 *     (single-slot toggle behavior).
 *   • Overflow menu items also tag themselves with `data-panel-trigger`
 *     and route through `togglePanel`, including `victoryProgress`
 *     (which previously lived as TopBar-local state).
 *
 * `useGameState` is stubbed so the test doesn't need to spin up the full
 * engine — TopBar only reads a small slice of state (turn, age, players,
 * units, cities) and dispatches END_TURN.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { GameState } from '@hex/engine';

const mockRef: { state: GameState | null } = { state: null };

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('TopBar.test: mock state not set');
    }
    return {
      state: mockRef.state,
      dispatch: () => {},
      saveGame: () => {},
      loadGame: () => {},
    };
  },
}));

// `calculateResourceChanges` is engine-side and pure; we don't need to mock
// it. But we DO need to make sure the engine import works in JSDOM. The
// other panel tests do this fine, so we follow the same pattern.

import { TopBar } from '../TopBar';
import { PanelManagerProvider, usePanelManager } from '../../panels/PanelManager';
import type { PanelManagerValue } from '../../panels/PanelManager';

function makeState(): GameState {
  return {
    turn: 5,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([
      [
        'p1',
        {
          id: 'p1',
          name: 'Human',
          isHuman: true,
          civilizationId: 'rome',
          leaderId: 'augustus',
          age: 'antiquity',
          gold: 100,
          science: 0,
          culture: 0,
          faith: 0,
          influence: 0,
          researchedTechs: [],
          currentResearch: null,
          researchProgress: 0,
          researchedCivics: [],
          currentCivic: null,
          civicProgress: 0,
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
        },
      ],
    ]),
    map: { width: 1, height: 1, tiles: new Map() },
    units: new Map(),
    cities: new Map(),
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    builtWonders: [],
    crises: [],
    log: [],
    age: { currentAge: 'antiquity', currentAgeProgress: 0, milestones: {} },
    diplomacy: { relations: new Map(), warDeclarations: [] },
    victory: { conditions: [], achievedBy: null },
    lastValidation: null,
    rng: { seed: 1, state: 1 },
    config: {
      units: new Map(),
      buildings: new Map(),
      districts: new Map(),
      technologies: new Map(),
      civics: new Map(),
      terrains: new Map(),
      features: new Map(),
      promotions: new Map(),
      resources: new Map(),
    },
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
});

/** Captures the live PanelManager value into a ref so tests can read it. */
function PanelProbe({ capture }: { capture: (v: PanelManagerValue) => void }) {
  const value = usePanelManager();
  capture(value);
  return null;
}

function renderTopBar() {
  mockRef.state = makeState();
  let captured: PanelManagerValue | null = null;
  const utils = render(
    <PanelManagerProvider>
      <TopBar />
      <PanelProbe capture={(v) => { captured = v; }} />
    </PanelManagerProvider>,
  );
  return {
    ...utils,
    /** Read the PanelManager value at this moment. Throws if unmounted. */
    getPanel(): PanelManagerValue {
      if (captured === null) throw new Error('PanelProbe never captured a value');
      return captured;
    },
  };
}

describe('TopBar — PanelManager wiring', () => {
  it('Tech button has data-panel-trigger="tech" and toggles the tech panel', () => {
    const { container, getPanel } = renderTopBar();

    expect(getPanel().activePanel).toBeNull();

    const techBtn = container.querySelector<HTMLButtonElement>('[data-panel-trigger="tech"]');
    expect(techBtn).not.toBeNull();
    expect(techBtn!.textContent).toBe('Tech');

    fireEvent.click(techBtn!);
    expect(getPanel().activePanel).toBe('tech');

    fireEvent.click(techBtn!);
    expect(getPanel().activePanel).toBeNull();
  });

  it('Civics, Diplo, Ages header buttons all carry data-panel-trigger', () => {
    const { container } = renderTopBar();
    const ids = ['civics', 'diplomacy', 'age'] as const;
    for (const id of ids) {
      const btn = container.querySelector<HTMLButtonElement>(`[data-panel-trigger="${id}"]`);
      expect(btn, `expected button for panel "${id}"`).not.toBeNull();
    }
  });

  it('opening the overflow menu reveals tagged items including victoryProgress', () => {
    const { container, getByText } = renderTopBar();

    // Open the "..." menu.
    fireEvent.click(getByText('⋯'));

    // Religion + Government + Commanders + Governors + Log + Summary + Help + VictoryProgress
    // should all carry data-panel-trigger now.
    const expected: ReadonlyArray<string> = [
      'governors',
      'religion',
      'government',
      'commanders',
      'log',
      'turnSummary',
      'help',
      'victoryProgress',
    ];
    for (const id of expected) {
      const item = container.querySelector(`[data-panel-trigger="${id}"]`);
      expect(item, `expected menu item for panel "${id}"`).not.toBeNull();
    }
  });

  it('clicking the Victory menu item opens the victoryProgress panel via PanelManager', () => {
    const { container, getByText, getPanel } = renderTopBar();
    fireEvent.click(getByText('⋯'));

    const victory = container.querySelector<HTMLButtonElement>('[data-panel-trigger="victoryProgress"]');
    expect(victory).not.toBeNull();
    fireEvent.click(victory!);

    expect(getPanel().activePanel).toBe('victoryProgress');
  });

  it('clicking the Religion menu item routes through togglePanel("religion")', () => {
    const { container, getByText, getPanel } = renderTopBar();
    fireEvent.click(getByText('⋯'));

    const religionItem = container.querySelector<HTMLButtonElement>('[data-panel-trigger="religion"]');
    expect(religionItem).not.toBeNull();
    fireEvent.click(religionItem!);

    expect(getPanel().activePanel).toBe('religion');
  });

  it('Save / Load menu items deliberately have NO data-panel-trigger (they are not panels)', () => {
    const { container, getByText } = renderTopBar();
    fireEvent.click(getByText('⋯'));

    // Audio migrated to a proper panel (AudioSettingsPanel) in the panel-cleanup
    // cycle, so it now carries data-panel-trigger="audioSettings" like the rest.
    // Save and Load remain non-panel actions (they dispatch directly).
    const triggers = container.querySelectorAll('[data-panel-trigger]');
    // 4 header buttons (tech/civics/diplomacy/age) + 10 menu items (tradeRoutes,
    // governors, religion, government, commanders, log, turnSummary, victoryProgress,
    // audioSettings, help) = 14 total.
    expect(triggers.length).toBe(14);
  });
});
