// @vitest-environment jsdom

/**
 * CityPanel — PanelShell migration smoke tests (panel cycle 3 / batch 4).
 *
 * Asserts:
 *   1. CityPanel renders inside `<PanelShell id="city" …>` chrome
 *      (data-testid="panel-shell-city" present),
 *   2. The shell title combines the city name with its settlement label
 *      and population count,
 *   3. The shared close button (data-testid="panel-close-city") fires the
 *      `onClose` prop — confirming we no longer rely on the legacy
 *      bespoke "X" header button.
 *
 * The body content (yields, production picker, specialists, building
 * list) is exercised by CityPanel.placement.test.tsx — those tests are
 * the regression coverage for the chrome swap not breaking interactions.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { GameState, PlayerState, CityState, GameAction, CityId } from '@hex/engine';
import { createGameConfig } from '@hex/engine';

interface MockRef {
  state: GameState | null;
  dispatch: (action: GameAction) => void;
  enterPlacementMode: (cityId: CityId, buildingId: string) => void;
}

const mockRef: MockRef = {
  state: null,
  dispatch: () => undefined,
  enterPlacementMode: () => undefined,
};

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('CityPanel.shell.test: mock state not set');
    }
    return {
      state: mockRef.state,
      dispatch: mockRef.dispatch,
      enterPlacementMode: mockRef.enterPlacementMode,
    };
  },
}));

import { CityPanel } from '../CityPanel';

function makePlayer(): PlayerState {
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
  } as PlayerState;
}

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1' as CityId,
    name: 'Rome',
    owner: 'p1',
    position: { q: 0, r: 0 },
    population: 4,
    food: 0,
    buildings: [],
    productionQueue: [],
    productionProgress: 0,
    territory: new Set(),
    settlementType: 'city',
    isCapital: true,
    happiness: 0,
    specialists: 0,
    ...overrides,
  } as unknown as CityState;
}

function makeState(player: PlayerState, city: CityState): GameState {
  return {
    turn: 1,
    currentPlayerId: player.id,
    phase: 'actions',
    players: new Map([[player.id, player]]),
    map: { width: 10, height: 10, tiles: new Map(), wrapX: false },
    units: new Map(),
    cities: new Map([[city.id, city]]),
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    diplomacy: { relations: new Map() },
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    builtWonders: [],
    crises: [],
    victory: { winner: null, winType: null, progress: new Map() },
    log: [],
    rng: { seed: 1, counter: 0 },
    config: createGameConfig(),
    lastValidation: null,
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
  mockRef.dispatch = () => undefined;
  mockRef.enterPlacementMode = () => undefined;
});

describe('CityPanel — PanelShell chrome (panel cycle 3 / batch 4)', () => {
  it('renders inside <PanelShell id="city" …>', () => {
    const city = makeCity();
    mockRef.state = makeState(makePlayer(), city);
    const { getByTestId } = render(<CityPanel city={city} onClose={() => {}} />);
    expect(getByTestId('panel-shell-city')).toBeTruthy();
  });

  it('builds the shell title from city name + settlement label + population', () => {
    const city = makeCity({ name: 'Rome', population: 4, settlementType: 'city', isCapital: true });
    mockRef.state = makeState(makePlayer(), city);
    const { getByTestId } = render(<CityPanel city={city} onClose={() => {}} />);
    const shell = getByTestId('panel-shell-city');
    expect(shell.getAttribute('aria-label')).toBe('Rome — Capital City (Pop 4)');
  });

  it('uses "Town" in the shell title when settlementType is town', () => {
    const city = makeCity({ name: 'Ostia', population: 2, settlementType: 'town', isCapital: false });
    mockRef.state = makeState(makePlayer(), city);
    const { getByTestId } = render(<CityPanel city={city} onClose={() => {}} />);
    expect(getByTestId('panel-shell-city').getAttribute('aria-label')).toBe('Ostia — Town (Pop 2)');
  });

  it('clicking the shared close button fires the onClose prop', () => {
    const closeCalls: number[] = [];
    const city = makeCity();
    mockRef.state = makeState(makePlayer(), city);
    const { getByTestId } = render(<CityPanel city={city} onClose={() => { closeCalls.push(1); }} />);
    fireEvent.click(getByTestId('panel-close-city'));
    expect(closeCalls).toEqual([1]);
  });
});
