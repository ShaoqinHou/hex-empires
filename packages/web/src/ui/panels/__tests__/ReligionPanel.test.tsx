// @vitest-environment jsdom

/**
 * ReligionPanel — component tests.
 *
 * The panel is read-only and only depends on three state shapes:
 *   • `state.players` — for isHuman + pantheonId + faith,
 *   • `state.cities`  — for the holy-city display name,
 *   • `state.religion?.religions` — for the founded religion record.
 *
 * We stub `useGameState` via `vi.mock` so tests can feed hand-rolled
 * `GameState` slices without spinning up the full engine.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { GameState, PlayerState, CityState } from '@hex/engine';
import { createGameConfig } from '@hex/engine';
import type { ReligionRecord } from '../../../../../../packages/engine/src/types/Religion';

// ── vi.mock — stub the useGameState hook ──
//
// The mocked module exposes a mutable `__mockState` that each test mutates
// before rendering. This is lighter than building a full GameProvider
// tree and avoids importing engine startup code into a JSDOM run.

const mockRef: { state: GameState | null } = { state: null };

vi.mock('../../../providers/GameProvider', () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error('ReligionPanel.test: mock state not set');
    }
    // The real hook returns more than just `state`, but the panel only
    // reads `state` — so a narrow stub is sufficient.
    return { state: mockRef.state };
  },
}));

// Import AFTER vi.mock so the component picks up the stub.
import { ReligionPanel } from '../ReligionPanel';

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

function makeState(overrides: Partial<GameState> = {}): GameState {
  const human = makePlayer();
  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([[human.id, human]]),
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

function setMockState(state: GameState): void {
  mockRef.state = state;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
});

// ── Tests ──

describe('ReligionPanel', () => {
  it('renders "No pantheon adopted yet" when player.pantheonId is undefined', () => {
    const player = makePlayer({ pantheonId: undefined, faith: 0 });
    setMockState(makeState({ players: new Map([[player.id, player]]) }));

    const { getByTestId, queryByTestId } = render(
      <ReligionPanel onClose={() => {}} />,
    );

    const empty = getByTestId('religion-panel-pantheon-empty');
    expect(empty.textContent).toContain('No pantheon adopted yet');
    expect(empty.textContent).toContain('25 faith');
    expect(queryByTestId('religion-panel-pantheon')).toBeNull();
  });

  it('renders the pantheon name + description when player.pantheonId is set', () => {
    const player = makePlayer({ pantheonId: 'god_of_war', faith: 30 });
    setMockState(makeState({ players: new Map([[player.id, player]]) }));

    const { getByTestId } = render(<ReligionPanel onClose={() => {}} />);

    const pantheon = getByTestId('religion-panel-pantheon');
    expect(pantheon.textContent).toContain('God of War');
    // The description in data is distinctive ("Battle-priests accompany…")
    expect(pantheon.textContent?.toLowerCase()).toContain('battle-priests');
  });

  it('renders "No religion founded yet" when state.religion?.religions is empty', () => {
    setMockState(
      makeState({
        religion: { religions: [] },
      }),
    );

    const { getByTestId, queryByTestId } = render(
      <ReligionPanel onClose={() => {}} />,
    );

    const empty = getByTestId('religion-panel-religion-empty');
    expect(empty.textContent).toContain('No religion founded yet');
    expect(empty.textContent).toContain('200 faith');
    expect(queryByTestId('religion-panel-religion')).toBeNull();
  });

  it('renders religion name + holy city + founder/follower beliefs when founded', () => {
    const holyCity = {
      id: 'c1',
      name: 'Jerusalem',
    } as unknown as CityState;

    const record: ReligionRecord = {
      id: 'p1.catholic',
      name: 'Catholicism',
      founderPlayerId: 'p1',
      founderBeliefId: 'world_church',
      followerBeliefId: 'jesuit_education',
      holyCityId: 'c1',
      foundedOnTurn: 30,
    };

    setMockState(
      makeState({
        cities: new Map([['c1', holyCity]]),
        religion: { religions: [record] },
      }),
    );

    const { getByTestId } = render(<ReligionPanel onClose={() => {}} />);

    const religion = getByTestId('religion-panel-religion');
    expect(religion.textContent).toContain('Catholicism');
    expect(religion.textContent).toContain('Jerusalem');

    // Belief ids are humanized: "world_church" → "World Church".
    expect(getByTestId('religion-panel-founder-belief').textContent).toBe(
      'World Church',
    );
    expect(getByTestId('religion-panel-follower-belief').textContent).toBe(
      'Jesuit Education',
    );
  });

  it('calls onClose when the close button is clicked', () => {
    setMockState(makeState());

    const onClose = vi.fn();
    const { getByTestId } = render(<ReligionPanel onClose={onClose} />);

    // Migrated to PanelShell — close button is now `panel-close-religion`.
    fireEvent.click(getByTestId('panel-close-religion'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the player\'s current faith in the header', () => {
    const player = makePlayer({ faith: 137 });
    setMockState(makeState({ players: new Map([[player.id, player]]) }));

    const { getByTestId } = render(<ReligionPanel onClose={() => {}} />);
    expect(getByTestId('religion-panel-faith').textContent).toContain('137');
  });

  it('renders inside a PanelShell with the correct id and overlay priority', () => {
    setMockState(makeState());
    const { getByTestId } = render(<ReligionPanel onClose={() => {}} />);
    const shell = getByTestId('panel-shell-religion');
    expect(shell.getAttribute('data-panel-priority')).toBe('overlay');
  });
});
