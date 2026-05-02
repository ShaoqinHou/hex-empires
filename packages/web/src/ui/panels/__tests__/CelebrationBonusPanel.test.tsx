// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GameState } from '@hex/engine';

const mockRef: { state: GameState | null; dispatch: ReturnType<typeof vi.fn> } = {
  state: null,
  dispatch: vi.fn(),
};

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('CelebrationBonusPanel.test: mock state not set');
    }
    return { state: mockRef.state, dispatch: mockRef.dispatch };
  },
}));

import { CelebrationBonusPanel } from '../CelebrationBonusPanel';

function makeState(): GameState {
  return {
    turn: 1,
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
        governmentId: 'classical_republic',
        pendingCelebrationChoice: { governmentId: 'classical_republic' },
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
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 100, modern: 200 } },
    config: {
      governments: new Map([
        ['classical_republic', {
          id: 'classical_republic',
          name: 'Classical Republic',
          age: 'antiquity',
          unlockCivic: 'code_of_laws',
          policySlots: { total: 2 },
          legacyBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 1 },
          description: '',
          celebrationBonuses: [
            {
              id: 'classical-rep-culture',
              name: '+20% Culture for 10 turns',
              description: 'Culture boost.',
              effects: [{ type: 'MODIFY_YIELD_PERCENT', target: 'empire', yield: 'culture', percent: 20 }],
            },
            {
              id: 'classical-rep-wonder',
              name: '+15% Production toward Wonders for 10 turns',
              description: 'Wonder boost.',
              effects: [{ type: 'MODIFY_PRODUCTION_PERCENT', target: { kind: 'itemType', itemType: 'wonder' }, percent: 15 }],
            },
          ],
        }],
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

describe('CelebrationBonusPanel', () => {
  it('renders pending government bonuses and dispatches the selected bonus', () => {
    mockRef.state = makeState();
    const onClose = vi.fn();

    render(<CelebrationBonusPanel onClose={onClose} />);
    fireEvent.click(screen.getByText('+20% Culture for 10 turns'));

    expect(mockRef.dispatch).toHaveBeenCalledWith({
      type: 'PICK_CELEBRATION_BONUS',
      playerId: 'p1',
      bonusId: 'classical-rep-culture',
    });
    expect(onClose).toHaveBeenCalled();
  });
});
