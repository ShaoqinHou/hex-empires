// @vitest-environment jsdom

/**
 * TopBar — settlement cap chip tests (HH5 / settlements F-09).
 *
 * Verifies:
 *   1. The chip renders with data-testid="settlement-cap-chip".
 *   2. It shows "currentCount/cap" in the correct format.
 *   3. When under/at cap, the count text uses muted styling (no warning color).
 *   4. When over cap, the count text uses var(--color-warning) and a warning glyph appears.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { GameState, CityState } from '@hex/engine';

const mockRef: { state: GameState | null } = { state: null };

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('TopBar.settlementCap.test: mock state not set');
    }
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

/** Minimal city stub owned by p1. */
function makeCity(id: string): CityState {
  return {
    id,
    name: `City ${id}`,
    owner: 'p1',
    position: { q: 0, r: 0 },
    population: 1,
    food: 0,
    production: 0,
    happiness: 5,
    buildings: [],
    productionQueue: [],
    territory: new Set(),
    settlementType: 'city',
    specialists: 0,
  } as unknown as CityState;
}

function makeState(cityCount: number, age: 'antiquity' | 'exploration' | 'modern' = 'antiquity'): GameState {
  const cities = new Map<string, CityState>();
  for (let i = 0; i < cityCount; i++) {
    cities.set(`city-${i}`, makeCity(`city-${i}`));
  }

  return {
    turn: 1,
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
          age,
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
    cities,
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    builtWonders: [],
    crises: [],
    log: [],
    age: { currentAge: age, currentAgeProgress: 0, milestones: {} },
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
      civilizations: new Map(),
      leaders: new Map(),
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

afterEach(() => {
  cleanup();
  mockRef.state = null;
});

describe('TopBar — settlement cap chip (HH5)', () => {
  it('renders with data-testid="settlement-cap-chip"', () => {
    mockRef.state = makeState(2); // 2 cities, cap=4, under cap
    const { container } = renderTopBar();
    const chip = container.querySelector('[data-testid="settlement-cap-chip"]');
    expect(chip).not.toBeNull();
  });

  it('shows correct count and cap when under the cap (antiquity: cap=4)', () => {
    mockRef.state = makeState(2); // 2/4
    const { container } = renderTopBar();
    const chip = container.querySelector('[data-testid="settlement-cap-chip"]');
    expect(chip?.textContent).toContain('2/4');
  });

  it('shows correct count and cap at exactly the cap', () => {
    mockRef.state = makeState(4); // 4/4
    const { container } = renderTopBar();
    const chip = container.querySelector('[data-testid="settlement-cap-chip"]');
    expect(chip?.textContent).toContain('4/4');
  });

  it('shows correct count and cap in exploration age (cap=8)', () => {
    mockRef.state = makeState(5, 'exploration'); // 5/8
    const { container } = renderTopBar();
    const chip = container.querySelector('[data-testid="settlement-cap-chip"]');
    expect(chip?.textContent).toContain('5/8');
  });

  it('count text uses muted color when at/under cap', () => {
    mockRef.state = makeState(3); // 3/4, under cap
    const { container } = renderTopBar();
    const chip = container.querySelector('[data-testid="settlement-cap-chip"]');
    const countSpan = chip?.querySelector('.font-mono');
    expect(countSpan).not.toBeNull();
    // Should use muted color, not warning color
    expect((countSpan as HTMLElement).style.color).toBe('var(--color-text-muted)');
  });

  it('count text uses warning color when over cap', () => {
    mockRef.state = makeState(6); // 6/4, over cap
    const { container } = renderTopBar();
    const chip = container.querySelector('[data-testid="settlement-cap-chip"]');
    const countSpan = chip?.querySelector('.font-mono');
    expect(countSpan).not.toBeNull();
    expect((countSpan as HTMLElement).style.color).toBe('var(--color-warning)');
  });

  it('shows warning glyph when over cap', () => {
    mockRef.state = makeState(6); // 6/4, over cap
    const { container } = renderTopBar();
    const chip = container.querySelector('[data-testid="settlement-cap-chip"]');
    expect(chip?.textContent).toContain('⚠');
  });

  it('does not show warning glyph when under cap', () => {
    mockRef.state = makeState(2); // 2/4, under cap
    const { container } = renderTopBar();
    const chip = container.querySelector('[data-testid="settlement-cap-chip"]');
    expect(chip?.textContent).not.toContain('⚠');
  });

  it('title attribute describes over-cap state', () => {
    mockRef.state = makeState(6); // 6/4, over cap
    const { container } = renderTopBar();
    const chip = container.querySelector<HTMLElement>('[data-testid="settlement-cap-chip"]');
    expect(chip?.title).toContain('over cap');
  });
});
