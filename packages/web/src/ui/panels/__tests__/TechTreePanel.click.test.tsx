// @vitest-environment jsdom

/**
 * TechTreePanel — click-to-research regression tests.
 *
 * Ensures the click handler dispatches SET_RESEARCH for any unlocked,
 * unresearched tech whose prerequisites are satisfied, and no-ops for
 * already-researched or locked (prereqs-unmet) techs.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { GameState, PlayerState, GameAction } from '@hex/engine';
import { createGameConfig } from '@hex/engine';

// ── vi.mock — stub the useGameState hook ──

interface MockRef {
  state: GameState | null;
  dispatch: (action: GameAction) => void;
}
const mockRef: MockRef = {
  state: null,
  dispatch: () => undefined,
};

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('TechTreePanel.test: mock state not set');
    }
    return { state: mockRef.state, dispatch: mockRef.dispatch };
  },
}));

// Import AFTER vi.mock so the component picks up the stub.
import { TechTreePanel } from '../TechTreePanel';

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

function makeState(player: PlayerState, overrides: Partial<GameState> = {}): GameState {
  return {
    turn: 1,
    currentPlayerId: player.id,
    phase: 'actions',
    players: new Map([[player.id, player]]),
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
    ...overrides,
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
  mockRef.dispatch = () => undefined;
});

// Helper: find a clickable card by the tech's display name.
function findTechCard(container: HTMLElement, techName: string): HTMLElement {
  const cards = Array.from(container.querySelectorAll('[role="button"]'));
  const match = cards.find(card => card.textContent?.includes(techName));
  if (!match) throw new Error(`No card found for tech "${techName}"`);
  return match as HTMLElement;
}

// ── Tests ──

describe('TechTreePanel — click-to-research', () => {
  it('dispatches SET_RESEARCH when clicking an unlocked, unresearched root tech', () => {
    // Pottery is a root antiquity tech (prerequisites: []).
    const calls: GameAction[] = [];
    mockRef.dispatch = (action) => { calls.push(action); };
    mockRef.state = makeState(makePlayer());

    const { container } = render(<TechTreePanel onClose={() => {}} />);
    const card = findTechCard(container, 'Pottery');
    expect(card.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(card);

    expect(calls).toEqual([{ type: 'SET_RESEARCH', techId: 'pottery' }]);
  });

  it('dispatches SET_RESEARCH when clicking an unlocked tech whose prereq is already researched', () => {
    // Writing requires Pottery.
    const calls: GameAction[] = [];
    mockRef.dispatch = (action) => { calls.push(action); };
    mockRef.state = makeState(makePlayer({ researchedTechs: ['pottery'] }));

    const { container } = render(<TechTreePanel onClose={() => {}} />);
    const card = findTechCard(container, 'Writing');
    expect(card.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(card);

    expect(calls).toEqual([{ type: 'SET_RESEARCH', techId: 'writing' }]);
  });

  it('switches research target when clicking a different unlocked tech while one is in progress', () => {
    // Player is currently researching Pottery; click Animal Husbandry (also root).
    const calls: GameAction[] = [];
    mockRef.dispatch = (action) => { calls.push(action); };
    mockRef.state = makeState(makePlayer({
      currentResearch: 'pottery',
      researchProgress: 10,
    }));

    const { container } = render(<TechTreePanel onClose={() => {}} />);
    const card = findTechCard(container, 'Animal Husbandry');
    expect(card.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(card);

    expect(calls).toEqual([{ type: 'SET_RESEARCH', techId: 'animal_husbandry' }]);
  });

  it('does NOT dispatch when clicking an already-researched tech', () => {
    const calls: GameAction[] = [];
    mockRef.dispatch = (action) => { calls.push(action); };
    mockRef.state = makeState(makePlayer({ researchedTechs: ['pottery'] }));

    const { container } = render(<TechTreePanel onClose={() => {}} />);
    const card = findTechCard(container, 'Pottery');
    expect(card.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(card);

    expect(calls).toEqual([]);
  });

  it('does NOT dispatch when clicking a locked tech whose prerequisites are unmet', () => {
    // Writing requires Pottery; Pottery is NOT researched → Writing is locked.
    const calls: GameAction[] = [];
    mockRef.dispatch = (action) => { calls.push(action); };
    mockRef.state = makeState(makePlayer());

    const { container } = render(<TechTreePanel onClose={() => {}} />);
    const card = findTechCard(container, 'Writing');
    expect(card.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(card);

    expect(calls).toEqual([]);
  });
});
