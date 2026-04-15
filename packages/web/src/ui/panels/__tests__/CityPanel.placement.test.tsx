// @vitest-environment jsdom

/**
 * CityPanel — building-placement launch regression tests (cycle 5).
 *
 * When the player clicks a building or wonder card in the production
 * picker, CityPanel must launch placement mode via enterPlacementMode
 * (NOT dispatch SET_PRODUCTION) and close itself so the player can see
 * the map. Unit picks still dispatch SET_PRODUCTION directly because
 * units don't need a tile.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { GameState, PlayerState, CityState, GameAction, CityId } from '@hex/engine';
import { createGameConfig } from '@hex/engine';

// ── vi.mock — stub the useGameState hook ──

interface EnterPlacementCall {
  cityId: CityId;
  buildingId: string;
}

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
      throw new Error('CityPanel.placement.test: mock state not set');
    }
    return {
      state: mockRef.state,
      dispatch: mockRef.dispatch,
      enterPlacementMode: mockRef.enterPlacementMode,
    };
  },
}));

// Stub BuildingPlacementPanel — it's an overlay that renders outside the
// production picker and isn't relevant to these tests (and its internal
// useGameState usage would otherwise need extra context wiring).
vi.mock('../../components/BuildingPlacementPanel', () => ({
  BuildingPlacementPanel: () => null,
}));

// Import AFTER vi.mock so the component picks up the stubs.
import { CityPanel } from '../CityPanel';

// ── Fixture builders ──

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'p1',
    name: 'Human',
    isHuman: true,
    civilizationId: 'rome',
    leaderId: 'augustus',
    age: 'antiquity',
    researchedTechs: ['pottery', 'masonry', 'writing'],
    currentResearch: null,
    researchProgress: 0,
    researchedCivics: [],
    currentCivic: null,
    civicProgress: 0,
    gold: 500,
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

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1' as CityId,
    name: 'Rome',
    owner: 'p1',
    position: { q: 0, r: 0 },
    population: 3,
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

function makeState(player: PlayerState, city: CityState, overrides: Partial<GameState> = {}): GameState {
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
    rng: { seed: 42, counter: 0 },
    config: createGameConfig(),
    lastValidation: null,
    ...overrides,
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
  mockRef.dispatch = () => undefined;
  mockRef.enterPlacementMode = () => undefined;
});

// Helper: find a build picker card by building/unit name. The production
// picker section renders card buttons via BuildingCard / UnitCard; we match
// on textContent.
function findCard(container: HTMLElement, name: string): HTMLElement {
  const candidates = Array.from(container.querySelectorAll('button, [role="button"], div'))
    .filter(el => el.textContent?.trim() === name
      || (el.textContent?.includes(name) && (el as HTMLElement).onclick !== null));
  // Prefer the smallest matching element that is clickable.
  const clickable = candidates.find(el => {
    const elText = el.textContent ?? '';
    return elText.includes(name) && elText.length < 200;
  });
  if (!clickable) throw new Error(`No clickable element found for "${name}"`);
  return clickable as HTMLElement;
}

// ── Tests ──

describe('CityPanel — building placement launch (cycle 5)', () => {
  it('clicking a building calls enterPlacementMode and does NOT dispatch SET_PRODUCTION', () => {
    const dispatchCalls: GameAction[] = [];
    const placementCalls: EnterPlacementCall[] = [];
    mockRef.dispatch = (action) => { dispatchCalls.push(action); };
    mockRef.enterPlacementMode = (cityId, buildingId) => {
      placementCalls.push({ cityId, buildingId });
    };
    const city = makeCity();
    mockRef.state = makeState(makePlayer(), city);

    const { container } = render(<CityPanel city={city} onClose={() => {}} />);

    // Granary is an antiquity building unlocked by Pottery.
    const granary = findCard(container, 'Granary');
    fireEvent.click(granary);

    expect(placementCalls).toEqual([{ cityId: 'c1', buildingId: 'granary' }]);
    // No SET_PRODUCTION for the building — the tile-click will dispatch it.
    const setProdCalls = dispatchCalls.filter(a => a.type === 'SET_PRODUCTION');
    expect(setProdCalls).toEqual([]);
  });

  it('clicking a building also invokes onClose so the map is visible', () => {
    const placementCalls: EnterPlacementCall[] = [];
    const closeCalls: number[] = [];
    mockRef.enterPlacementMode = (cityId, buildingId) => {
      placementCalls.push({ cityId, buildingId });
    };
    const city = makeCity();
    mockRef.state = makeState(makePlayer(), city);

    const { container } = render(
      <CityPanel city={city} onClose={() => { closeCalls.push(1); }} />
    );
    const granary = findCard(container, 'Granary');
    fireEvent.click(granary);

    expect(placementCalls).toHaveLength(1);
    expect(closeCalls).toEqual([1]);
  });

  it('clicking a wonder launches placement mode (wonders behave like buildings)', () => {
    const dispatchCalls: GameAction[] = [];
    const placementCalls: EnterPlacementCall[] = [];
    mockRef.dispatch = (action) => { dispatchCalls.push(action); };
    mockRef.enterPlacementMode = (cityId, buildingId) => {
      placementCalls.push({ cityId, buildingId });
    };
    const city = makeCity();
    mockRef.state = makeState(makePlayer(), city);

    const { container } = render(<CityPanel city={city} onClose={() => {}} />);

    // Pyramids: antiquity wonder, requires Masonry (which the fixture has).
    const pyramids = findCard(container, 'Pyramids');
    fireEvent.click(pyramids);

    expect(placementCalls).toEqual([{ cityId: 'c1', buildingId: 'pyramids' }]);
    const setProdCalls = dispatchCalls.filter(a => a.type === 'SET_PRODUCTION');
    expect(setProdCalls).toEqual([]);
  });

  it('clicking a unit still dispatches SET_PRODUCTION (units bypass placement)', () => {
    const dispatchCalls: GameAction[] = [];
    const placementCalls: EnterPlacementCall[] = [];
    mockRef.dispatch = (action) => { dispatchCalls.push(action); };
    mockRef.enterPlacementMode = (cityId, buildingId) => {
      placementCalls.push({ cityId, buildingId });
    };
    const city = makeCity();
    mockRef.state = makeState(makePlayer(), city);

    const { container } = render(<CityPanel city={city} onClose={() => {}} />);

    // Warrior: antiquity unit with no tech requirement.
    const warrior = findCard(container, 'Warrior');
    fireEvent.click(warrior);

    expect(placementCalls).toEqual([]);
    const setProdCalls = dispatchCalls.filter(a => a.type === 'SET_PRODUCTION');
    expect(setProdCalls).toEqual([
      { type: 'SET_PRODUCTION', cityId: 'c1', itemId: 'warrior', itemType: 'unit' },
    ]);
  });

  it('clicking a unit does NOT close the CityPanel', () => {
    const closeCalls: number[] = [];
    mockRef.dispatch = () => undefined;
    const city = makeCity();
    mockRef.state = makeState(makePlayer(), city);

    const { container } = render(
      <CityPanel city={city} onClose={() => { closeCalls.push(1); }} />
    );
    const warrior = findCard(container, 'Warrior');
    fireEvent.click(warrior);

    expect(closeCalls).toEqual([]);
  });
});
