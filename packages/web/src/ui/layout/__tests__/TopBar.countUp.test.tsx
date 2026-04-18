// @vitest-environment jsdom

/**
 * TopBar — yield count-up integration tests (phase 6.4).
 *
 * Verifies that:
 *   1. ResourcePill renders the initial value immediately.
 *   2. On a yield increase the displayed number animates upward (has an
 *      intermediate value visible before completing).
 *   3. On a yield decrease the displayed number snaps immediately (up-only).
 *   4. The number span carries font-variant-numeric: tabular-nums.
 *   5. When value goes below 0 (zero-cross), the span gains the
 *      "yield-negative" class.
 *
 * The test stubs `useGameState` just like the existing PanelManager test;
 * it uses the same fake RAF shim to advance animations deterministically.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { GameState } from '@hex/engine';

// ── RAF shim ─────────────────────────────────────────────────────────────────

let rafCallbacks: Array<(ts: number) => void> = [];
let rafTime = 0;

function advanceRaf(ms: number) {
  rafTime += ms;
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  for (const cb of cbs) cb(rafTime);
}

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRef: { state: GameState | null } = { state: null };

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) throw new Error('TopBar.countUp.test: mock state not set');
    return {
      state: mockRef.state,
      dispatch: () => {},
      saveGame: () => {},
      loadGame: () => {},
    };
  },
}));

import { TopBar } from '../TopBar';
import { PanelManagerProvider } from '../../panels/PanelManager';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeState(gold: number, science = 0, culture = 0): GameState {
  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([
      [
        'p1',
        {
          id: 'p1', name: 'Human', isHuman: true,
          civilizationId: 'rome', leaderId: 'augustus', age: 'antiquity',
          gold, science, culture,
          faith: 0, influence: 0,
          researchedTechs: [], currentResearch: null, researchProgress: 0,
          researchedCivics: [], currentCivic: null, civicProgress: 0,
          ageProgress: 0, legacyBonuses: [],
          legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
          legacyPoints: 0, totalGoldEarned: 0, totalKills: 0,
          visibility: new Set(), explored: new Set(),
          celebrationCount: 0, celebrationBonus: 0, celebrationTurnsLeft: 0,
          masteredTechs: [], currentMastery: null, masteryProgress: 0,
          masteredCivics: [], currentCivicMastery: null, civicMasteryProgress: 0,
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
      units: new Map(), buildings: new Map(), districts: new Map(),
      technologies: new Map(), civics: new Map(), terrains: new Map(),
      features: new Map(), promotions: new Map(), resources: new Map(),
    },
  } as unknown as GameState;
}

function renderTopBar() {
  return render(
    <PanelManagerProvider>
      <TopBar />
    </PanelManagerProvider>,
  );
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  rafCallbacks = [];
  rafTime = 0;
  vi.useFakeTimers();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
    matches: false, media: '', onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  mockRef.state = null;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TopBar yield count-up', () => {
  it('renders initial gold value immediately without animation', () => {
    mockRef.state = makeState(150);
    const { container } = renderTopBar();
    const goldSpan = container.querySelector('[title^="Gold:"] .font-mono');
    expect(goldSpan?.textContent).toBe('150');
  });

  it('gold span has font-variant-numeric: tabular-nums', () => {
    mockRef.state = makeState(100);
    const { container } = renderTopBar();
    const goldSpan = container.querySelector<HTMLSpanElement>('[title^="Gold:"] .font-mono');
    expect(goldSpan).not.toBeNull();
    expect(goldSpan!.style.fontVariantNumeric).toBe('tabular-nums');
  });

  it('animates upward through intermediate values on increase', () => {
    mockRef.state = makeState(0);
    const { container, rerender: rerenderRoot } = renderTopBar();

    // Increase gold to 100.
    act(() => {
      mockRef.state = makeState(100);
      rerenderRoot(
        <PanelManagerProvider>
          <TopBar />
        </PanelManagerProvider>,
      );
    });

    // First RAF tick primes the animation — sets startTime, displayed stays at
    // the from-value (0) while easeOutCubic(0) = 0.
    act(() => { advanceRaf(0); });

    // Advance half-way through the 400ms duration.
    // easeOutCubic(0.5) ≈ 0.875 → displayed ≈ 88.
    act(() => { advanceRaf(200); });

    const goldSpan = container.querySelector('[title^="Gold:"] .font-mono');
    const midValue = Number(goldSpan?.textContent);
    // Should be somewhere between the old (0) and new (100) value.
    expect(midValue).toBeGreaterThan(0);
    expect(midValue).toBeLessThan(100);

    // Complete the animation.
    act(() => { advanceRaf(200); });
    expect(Number(goldSpan?.textContent)).toBe(100);
  });

  it('snaps immediately on decrease (up-only)', () => {
    mockRef.state = makeState(100);
    const { container, rerender: rerenderRoot } = renderTopBar();

    // Let initial render settle (no animation expected).
    act(() => { advanceRaf(0); });

    // Decrease gold to 20.
    act(() => {
      mockRef.state = makeState(20);
      rerenderRoot(
        <PanelManagerProvider>
          <TopBar />
        </PanelManagerProvider>,
      );
    });

    // No RAF tick needed — should have snapped.
    const goldSpan = container.querySelector('[title^="Gold:"] .font-mono');
    expect(goldSpan?.textContent).toBe('20');
  });

  it('adds yield-negative class when value crosses below zero', () => {
    mockRef.state = makeState(5);
    const { container, rerender: rerenderRoot } = renderTopBar();

    act(() => {
      mockRef.state = makeState(-3);
      rerenderRoot(
        <PanelManagerProvider>
          <TopBar />
        </PanelManagerProvider>,
      );
    });

    const goldSpan = container.querySelector('[title^="Gold:"] .font-mono');
    expect(goldSpan?.classList.contains('yield-negative')).toBe(true);
  });
});
