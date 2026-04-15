// @vitest-environment jsdom

/**
 * CivicTreePanel — click-to-research regression tests.
 *
 * Mirrors TechTreePanel.click.test.tsx for the civic tree: clicking an
 * unlocked, unresearched civic dispatches SET_CIVIC; clicking an
 * already-researched or locked civic is a no-op.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { GameState, PlayerState, GameAction } from '@hex/engine';

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
      throw new Error('CivicTreePanel.test: mock state not set');
    }
    return { state: mockRef.state, dispatch: mockRef.dispatch };
  },
}));

// Import AFTER vi.mock so the component picks up the stub.
import { CivicTreePanel } from '../CivicTreePanel';

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
    ...overrides,
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
  mockRef.dispatch = () => undefined;
});

// Helper: find a card button by the civic's display name.
function findCivicButton(container: HTMLElement, civicName: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'));
  const match = buttons.find(b => b.textContent?.includes(civicName));
  if (!match) throw new Error(`No button found for civic "${civicName}"`);
  return match as HTMLButtonElement;
}

// ── Tests ──

describe('CivicTreePanel — click-to-research', () => {
  it('dispatches SET_CIVIC when clicking an unlocked, unresearched root civic', () => {
    // Code of Laws is a root antiquity civic (prerequisites: []).
    const calls: GameAction[] = [];
    mockRef.dispatch = (action) => { calls.push(action); };
    mockRef.state = makeState(makePlayer());

    const { container } = render(<CivicTreePanel onClose={() => {}} />);
    const btn = findCivicButton(container, 'Code of Laws');
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);

    expect(calls).toEqual([{ type: 'SET_CIVIC', civicId: 'code_of_laws' }]);
  });

  it('dispatches SET_CIVIC when clicking an unlocked civic whose prereq is already researched', () => {
    // Craftsmanship requires Code of Laws.
    const calls: GameAction[] = [];
    mockRef.dispatch = (action) => { calls.push(action); };
    mockRef.state = makeState(makePlayer({ researchedCivics: ['code_of_laws'] }));

    const { container } = render(<CivicTreePanel onClose={() => {}} />);
    const btn = findCivicButton(container, 'Craftsmanship');
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);

    expect(calls).toEqual([{ type: 'SET_CIVIC', civicId: 'craftsmanship' }]);
  });

  it('switches civic target when clicking a different unlocked civic while one is in progress', () => {
    const calls: GameAction[] = [];
    mockRef.dispatch = (action) => { calls.push(action); };
    mockRef.state = makeState(makePlayer({
      currentCivic: 'code_of_laws',
      civicProgress: 10,
    }));

    const { container } = render(<CivicTreePanel onClose={() => {}} />);
    const btn = findCivicButton(container, 'Foreign Trade');
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);

    expect(calls).toEqual([{ type: 'SET_CIVIC', civicId: 'foreign_trade' }]);
  });

  it('does NOT dispatch when clicking an already-researched civic', () => {
    const calls: GameAction[] = [];
    mockRef.dispatch = (action) => { calls.push(action); };
    mockRef.state = makeState(makePlayer({ researchedCivics: ['code_of_laws'] }));

    const { container } = render(<CivicTreePanel onClose={() => {}} />);
    const btn = findCivicButton(container, 'Code of Laws');
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);

    expect(calls).toEqual([]);
  });

  it('does NOT dispatch when clicking a locked civic whose prerequisites are unmet', () => {
    // Craftsmanship requires Code of Laws; Code of Laws is NOT researched.
    const calls: GameAction[] = [];
    mockRef.dispatch = (action) => { calls.push(action); };
    mockRef.state = makeState(makePlayer());

    const { container } = render(<CivicTreePanel onClose={() => {}} />);
    const btn = findCivicButton(container, 'Craftsmanship');
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);

    expect(calls).toEqual([]);
  });
});
