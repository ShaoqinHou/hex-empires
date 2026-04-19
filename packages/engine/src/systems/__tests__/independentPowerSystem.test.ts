import { describe, it, expect } from 'vitest';
import { independentPowerSystem, createDefaultIPState } from '../independentPowerSystem';
import { createGameConfig } from '../../state/GameConfigFactory';
import type { GameState, IndependentPowerState, PlayerState } from '../../types/GameState';
import { createRng } from '../../state/SeededRng';

/** Minimal player factory */
function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
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
    suzerainties: [],
    suzerainBonuses: new Map(),
    ...overrides,
  };
}

/** Minimal IP state factory */
function makeIP(overrides: Partial<IndependentPowerState> = {}): IndependentPowerState {
  return {
    id: 'test_ip',
    type: 'cultural',
    attitude: 'neutral',
    position: { q: 0, r: 0 },
    befriendProgress: 0,
    suzerainPlayerId: null,
    isIncorporated: false,
    isCityState: true,
    bonusPool: ['bonus_a', 'bonus_b', 'bonus_c'],
    ...overrides,
  };
}

/** Minimal game state factory */
function makeState(overrides: Partial<GameState> = {}): GameState {
  const config = createGameConfig();
  const player = makePlayer();
  const ip = makeIP();
  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([['p1', player]]),
    map: { width: 10, height: 10, tiles: new Map(), wrapX: false },
    units: new Map(),
    cities: new Map(),
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    diplomacy: { relations: new Map() },
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 20, modern: 40 } },
    builtWonders: [],
    crises: [],
    victory: { winner: null, winType: null, progress: new Map() },
    log: [],
    rng: createRng(42),
    config,
    lastValidation: null,
    independentPowers: new Map([['test_ip', ip]]),
    ...overrides,
  };
}

describe('independentPowerSystem', () => {
  it('returns state unchanged for unrecognised actions', () => {
    const state = makeState();
    const next = independentPowerSystem(state, { type: 'END_TURN' });
    // END_TURN with no hostile IPs should be a no-op in terms of state changes
    // (log may grow if NPC turn fires, but in our case no hostile IPs exist)
    expect(next.independentPowers).toBe(state.independentPowers);
  });

  describe('BEFRIEND_INDEPENDENT', () => {
    it('adds befriend progress proportional to influence spent', () => {
      const state = makeState();
      const next = independentPowerSystem(state, {
        type: 'BEFRIEND_INDEPENDENT',
        ipId: 'test_ip',
        influenceSpent: 20,
      });
      const ip = next.independentPowers?.get('test_ip')!;
      // 20 * 0.1 = 2 points
      expect(ip.befriendProgress).toBe(2);
    });

    it('deducts influence from player', () => {
      const state = makeState();
      const next = independentPowerSystem(state, {
        type: 'BEFRIEND_INDEPENDENT',
        ipId: 'test_ip',
        influenceSpent: 20,
      });
      const player = next.players.get('p1')!;
      expect(player.influence).toBe(180);
    });

    it('returns state unchanged if player has insufficient influence', () => {
      const state = makeState({
        players: new Map([['p1', makePlayer({ influence: 5 })]]),
      });
      const next = independentPowerSystem(state, {
        type: 'BEFRIEND_INDEPENDENT',
        ipId: 'test_ip',
        influenceSpent: 20,
      });
      // No change
      expect(next.players.get('p1')!.influence).toBe(5);
      expect(next.independentPowers?.get('test_ip')!.befriendProgress).toBe(0);
    });

    it('grants suzerainty when befriendProgress reaches 60', () => {
      // Start just below threshold (need 60pts = 600 influence)
      const state = makeState({
        players: new Map([['p1', makePlayer({ influence: 600 })]]),
        independentPowers: new Map([['test_ip', makeIP({ befriendProgress: 58 })]]),
      });
      // 20 influence = 2 pts; 58 + 2 = 60 >= threshold
      const next = independentPowerSystem(state, {
        type: 'BEFRIEND_INDEPENDENT',
        ipId: 'test_ip',
        influenceSpent: 20,
      });
      const ip = next.independentPowers?.get('test_ip')!;
      expect(ip.suzerainPlayerId).toBe('p1');
      expect(ip.attitude).toBe('friendly');
      const player = next.players.get('p1')!;
      expect(player.suzerainties).toContain('test_ip');
    });

    it('does not befriend hostile IPs', () => {
      const state = makeState({
        independentPowers: new Map([['test_ip', makeIP({ attitude: 'hostile' })]]),
      });
      const next = independentPowerSystem(state, {
        type: 'BEFRIEND_INDEPENDENT',
        ipId: 'test_ip',
        influenceSpent: 20,
      });
      // No change to befriendProgress for hostile IPs
      expect(next.independentPowers?.get('test_ip')!.befriendProgress).toBe(0);
    });
  });

  describe('INCORPORATE', () => {
    it('marks IP as incorporated when suzerain has sufficient influence (antiquity: 240)', () => {
      const state = makeState({
        players: new Map([['p1', makePlayer({ influence: 300, suzerainties: ['test_ip'] })]]),
        independentPowers: new Map([['test_ip', makeIP({ suzerainPlayerId: 'p1' })]]),
      });
      const next = independentPowerSystem(state, {
        type: 'INCORPORATE',
        ipId: 'test_ip',
        influenceSpent: 240,
      });
      const ip = next.independentPowers?.get('test_ip')!;
      expect(ip.isIncorporated).toBe(true);
      const player = next.players.get('p1')!;
      expect(player.influence).toBe(60); // 300 - 240
    });

    it('rejects INCORPORATE if not suzerain', () => {
      const state = makeState({
        independentPowers: new Map([['test_ip', makeIP({ suzerainPlayerId: null })]]),
      });
      const next = independentPowerSystem(state, {
        type: 'INCORPORATE',
        ipId: 'test_ip',
        influenceSpent: 240,
      });
      expect(next.independentPowers?.get('test_ip')!.isIncorporated).toBe(false);
    });

    it('rejects INCORPORATE if influence spent is below age cost', () => {
      const state = makeState({
        players: new Map([['p1', makePlayer({ influence: 300, suzerainties: ['test_ip'] })]]),
        independentPowers: new Map([['test_ip', makeIP({ suzerainPlayerId: 'p1' })]]),
      });
      const next = independentPowerSystem(state, {
        type: 'INCORPORATE',
        ipId: 'test_ip',
        influenceSpent: 100, // below 240
      });
      expect(next.independentPowers?.get('test_ip')!.isIncorporated).toBe(false);
    });
  });

  describe('SUZERAIN_BONUS_SELECTED', () => {
    it('removes chosen bonus from pool and records it on player', () => {
      const state = makeState({
        players: new Map([['p1', makePlayer({ suzerainties: ['test_ip'] })]]),
        independentPowers: new Map([['test_ip', makeIP({ suzerainPlayerId: 'p1' })]]),
      });
      const next = independentPowerSystem(state, {
        type: 'SUZERAIN_BONUS_SELECTED',
        ipId: 'test_ip',
        bonusId: 'bonus_a',
      });
      const ip = next.independentPowers?.get('test_ip')!;
      expect(ip.bonusPool).not.toContain('bonus_a');
      expect(ip.bonusPool).toContain('bonus_b');
      const player = next.players.get('p1')!;
      expect(player.suzerainBonuses?.get('test_ip')).toBe('bonus_a');
    });

    it('rejects bonus selection if bonusId not in pool', () => {
      const state = makeState({
        players: new Map([['p1', makePlayer({ suzerainties: ['test_ip'] })]]),
        independentPowers: new Map([['test_ip', makeIP({ suzerainPlayerId: 'p1' })]]),
      });
      const next = independentPowerSystem(state, {
        type: 'SUZERAIN_BONUS_SELECTED',
        ipId: 'test_ip',
        bonusId: 'bonus_nonexistent',
      });
      // State unchanged
      expect(next.independentPowers?.get('test_ip')!.bonusPool).toHaveLength(3);
    });
  });

  describe('createDefaultIPState', () => {
    it('creates a neutral, un-incorporated IP state from a def', () => {
      const def = {
        id: 'kumbi_saleh',
        type: 'economic' as const,
        defaultAttitude: 'neutral' as const,
        bonusPool: ['a', 'b'],
      };
      const ipState = createDefaultIPState(def);
      expect(ipState.id).toBe('kumbi_saleh');
      expect(ipState.type).toBe('economic');
      expect(ipState.attitude).toBe('neutral');
      expect(ipState.befriendProgress).toBe(0);
      expect(ipState.suzerainPlayerId).toBeNull();
      expect(ipState.isIncorporated).toBe(false);
      expect(ipState.isCityState).toBe(true);
      expect(ipState.bonusPool).toEqual(['a', 'b']);
    });
  });
});
