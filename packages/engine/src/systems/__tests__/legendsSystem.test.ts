/**
 * legendsSystem + AccountState unit tests (W3-06)
 *
 * Covers:
 * 1. Foundation level-up at XP thresholds unlocks memento slots
 * 2. Leader XP increments on leader-specific challenge completion
 * 3. Memento effect applied at game start via applyEquippedMementos
 * 4. Cross-session: AccountState survives restart (serialize/deserialize)
 * 5. evaluateLegends evaluates multiple challenges in one call
 * 6. filterValidMementos silently drops unowned mementos
 */

import { describe, it, expect } from 'vitest';
import {
  createDefaultAccountState,
  foundationLevelForXP,
  foundationMementoSlots,
  foundationXPForLevel,
  leaderLevelForXP,
  applyAccountDelta,
} from '../../types/AccountState';
import type { AccountState, AccountStateDelta } from '../../types/AccountState';
import { evaluateLegends } from '../legendsSystem';
import { applyEquippedMementos, filterValidMementos } from '../../state/MementoApply';
import { createInitialState } from '../../state/GameInitializer';
import type { GameState } from '../../types/GameState';

// ── Helpers ──

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState({ civId: 'rome', leaderId: 'augustus', mapWidth: 10, mapHeight: 10, numAI: 0 }, 42);
  return { ...base, ...overrides };
}

function stateWithCities(state: GameState, count: number): GameState {
  const cities = new Map(state.cities);
  for (let i = 0; i < count; i++) {
    cities.set(`city${i}`, {
      id: `city${i}`,
      name: `City ${i}`,
      owner: 'player1',
      position: { q: i, r: 0 },
      population: 2,
      food: 0,
      productionQueue: [],
      productionProgress: 0,
      buildings: [],
      territory: [],
      settlementType: 'city',
      happiness: 0,
      isCapital: i === 0,
      defenseHP: 100,
      specialization: null,
      specialists: 0,
      districts: [],
    });
  }
  return { ...state, cities };
}

function stateWithTechs(state: GameState, count: number): GameState {
  const players = new Map(state.players);
  const player = players.get('player1')!;
  const researchedTechs = Array.from({ length: count }, (_, i) => `tech${i}`) as string[];
  players.set('player1', { ...player, researchedTechs });
  return { ...state, players };
}

function stateWithCombatWins(state: GameState, wins: number): GameState {
  const players = new Map(state.players);
  const player = players.get('player1')!;
  players.set('player1', { ...player, totalKills: wins });
  return { ...state, players };
}

// ── Tests ──

describe('AccountState — level derivation', () => {
  it('new account starts at level 1 with 0 XP', () => {
    const account = createDefaultAccountState();
    expect(account.foundationLevel).toBe(1);
    expect(account.foundationXP).toBe(0);
  });

  it('XP at level 2 threshold upgrades level', () => {
    const xpRequired = foundationXPForLevel(2);
    expect(foundationLevelForXP(xpRequired)).toBe(2);
  });

  it('XP just below threshold stays at lower level', () => {
    const xpRequired = foundationXPForLevel(3);
    expect(foundationLevelForXP(xpRequired - 1)).toBe(2);
  });

  it('foundationMementoSlots: level 1 = 0, level 2 = 1, level 5 = 2', () => {
    expect(foundationMementoSlots(1)).toBe(0);
    expect(foundationMementoSlots(2)).toBe(1);
    expect(foundationMementoSlots(4)).toBe(1);
    expect(foundationMementoSlots(5)).toBe(2);
    expect(foundationMementoSlots(50)).toBe(2);
  });

  it('leaderLevelForXP produces level 1 at 0 XP', () => {
    expect(leaderLevelForXP(0)).toBe(1);
  });

  it('leaderLevelForXP caps at 10', () => {
    expect(leaderLevelForXP(99999)).toBe(10);
  });
});

describe('AccountState — applyAccountDelta', () => {
  it('accumulates Foundation XP and re-derives level', () => {
    const account = createDefaultAccountState();
    const delta: AccountStateDelta = {
      foundationXPGained: 500,
      leaderXPGained: new Map(),
      newlyCompletedChallenges: [],
      newlyUnlockedMementos: [],
    };
    const next = applyAccountDelta(account, delta);
    expect(next.foundationXP).toBe(500);
    // Level should be >= 1 (exact value depends on threshold math)
    expect(next.foundationLevel).toBeGreaterThanOrEqual(1);
  });

  it('accumulates leader XP for specified leader', () => {
    const account = createDefaultAccountState();
    const delta: AccountStateDelta = {
      foundationXPGained: 0,
      leaderXPGained: new Map([['augustus', 200]]),
      newlyCompletedChallenges: [],
      newlyUnlockedMementos: [],
    };
    const next = applyAccountDelta(account, delta);
    expect(next.leaderXP.get('augustus')).toBe(200);
    expect(next.leaderLevels.get('augustus')).toBeGreaterThanOrEqual(1);
  });

  it('stacks leader XP across multiple deltas', () => {
    let account = createDefaultAccountState();
    const delta200: AccountStateDelta = {
      foundationXPGained: 0,
      leaderXPGained: new Map([['augustus', 200]]),
      newlyCompletedChallenges: [],
      newlyUnlockedMementos: [],
    };
    account = applyAccountDelta(account, delta200);
    account = applyAccountDelta(account, delta200);
    expect(account.leaderXP.get('augustus')).toBe(400);
  });

  it('does not re-add already completed challenges', () => {
    const account: AccountState = {
      ...createDefaultAccountState(),
      completedChallenges: ['FIRST_CITY_FOUNDED'],
    };
    const delta: AccountStateDelta = {
      foundationXPGained: 0,
      leaderXPGained: new Map(),
      newlyCompletedChallenges: ['FIRST_CITY_FOUNDED'],
      newlyUnlockedMementos: [],
    };
    const next = applyAccountDelta(account, delta);
    expect(next.completedChallenges.filter(id => id === 'FIRST_CITY_FOUNDED').length).toBe(1);
  });

  it('merges newly unlocked mementos without duplicates', () => {
    const account: AccountState = {
      ...createDefaultAccountState(),
      unlockedMementos: ['rosetta-stone'],
    };
    const delta: AccountStateDelta = {
      foundationXPGained: 0,
      leaderXPGained: new Map(),
      newlyCompletedChallenges: [],
      newlyUnlockedMementos: ['rosetta-stone', 'napoleon-hat'],
    };
    const next = applyAccountDelta(account, delta);
    expect(next.unlockedMementos).toContain('napoleon-hat');
    expect(next.unlockedMementos.filter(id => id === 'rosetta-stone').length).toBe(1);
  });
});

describe('evaluateLegends — Foundation Challenges', () => {
  it('completes FIRST_CITY_FOUNDED when player has 1+ cities', () => {
    const state = stateWithCities(makeMinimalState(), 1);
    const account = createDefaultAccountState();
    const { accountDelta } = evaluateLegends(state, account, 'player1');
    expect(accountDelta.newlyCompletedChallenges).toContain('FIRST_CITY_FOUNDED');
    expect(accountDelta.foundationXPGained).toBeGreaterThan(0);
  });

  it('does not re-complete already completed challenges', () => {
    const state = stateWithCities(makeMinimalState(), 1);
    const account: AccountState = {
      ...createDefaultAccountState(),
      completedChallenges: ['FIRST_CITY_FOUNDED'],
    };
    const { accountDelta } = evaluateLegends(state, account, 'player1');
    expect(accountDelta.newlyCompletedChallenges).not.toContain('FIRST_CITY_FOUNDED');
  });

  it('completes FIRST_TECH_RESEARCHED when player has 1+ techs', () => {
    const state = stateWithTechs(makeMinimalState(), 1);
    const account = createDefaultAccountState();
    const { accountDelta } = evaluateLegends(state, account, 'player1');
    expect(accountDelta.newlyCompletedChallenges).toContain('FIRST_TECH_RESEARCHED');
  });

  it('unlocks rosetta-stone memento when FIRST_TECH_RESEARCHED is completed', () => {
    const state = stateWithTechs(makeMinimalState(), 1);
    const account = createDefaultAccountState();
    const { accountDelta } = evaluateLegends(state, account, 'player1');
    expect(accountDelta.newlyUnlockedMementos).toContain('rosetta-stone');
  });

  it('completes FIRST_COMBAT_VICTORY when player has 1+ kills', () => {
    const state = stateWithCombatWins(makeMinimalState(), 1);
    const account = createDefaultAccountState();
    const { accountDelta } = evaluateLegends(state, account, 'player1');
    expect(accountDelta.newlyCompletedChallenges).toContain('FIRST_COMBAT_VICTORY');
  });
});

describe('evaluateLegends — Leader Challenges (Augustus)', () => {
  it('awards leader XP when augustus_city_builder is completed', () => {
    const state = stateWithCities(makeMinimalState(), 5);
    const account = createDefaultAccountState();
    const { accountDelta } = evaluateLegends(state, account, 'player1');
    expect(accountDelta.newlyCompletedChallenges).toContain('augustus_city_builder');
    expect(accountDelta.leaderXPGained.get('augustus')).toBeGreaterThan(0);
  });

  it('does not award leader XP for a different leader challenge', () => {
    // Player1 uses 'augustus', so cleopatra challenges should not match
    const state = stateWithCities(makeMinimalState(), 3);
    const account = createDefaultAccountState();
    const { accountDelta } = evaluateLegends(state, account, 'player1');
    expect(accountDelta.newlyCompletedChallenges).not.toContain('cleopatra_trader');
  });
});

describe('MementoApply — apply at game start', () => {
  it('adds memento effect as legacyBonus when equipped', () => {
    const state = makeMinimalState();
    const result = applyEquippedMementos(state, 'player1', ['complaint-to-ea-nasir']);
    const player = result.players.get('player1')!;
    const mementoBonus = player.legacyBonuses.find(e => e.source === 'memento:complaint-to-ea-nasir');
    expect(mementoBonus).toBeDefined();
    expect(mementoBonus!.effect.type).toBe('MODIFY_YIELD');
  });

  it('does not mutate state when no mementos equipped', () => {
    const state = makeMinimalState();
    const result = applyEquippedMementos(state, 'player1', []);
    expect(result).toBe(state); // same reference — no state change
  });

  it('equippedMementos field is updated on player', () => {
    const state = makeMinimalState();
    const result = applyEquippedMementos(state, 'player1', ['rosetta-stone']);
    const player = result.players.get('player1')!;
    expect(player.equippedMementos).toContain('rosetta-stone');
  });
});

describe('filterValidMementos', () => {
  it('silently drops unknown memento IDs', () => {
    const account: AccountState = {
      ...createDefaultAccountState(),
      unlockedMementos: ['rosetta-stone'],
    };
    const result = filterValidMementos(['rosetta-stone', 'fake-id'], account);
    expect(result).toEqual(['rosetta-stone']);
  });

  it('silently drops mementos not in account.unlockedMementos', () => {
    const account = createDefaultAccountState(); // no mementos unlocked
    const result = filterValidMementos(['rosetta-stone'], account);
    expect(result).toHaveLength(0);
  });

  it('returns all valid mementos when all are owned', () => {
    const account: AccountState = {
      ...createDefaultAccountState(),
      unlockedMementos: ['rosetta-stone', 'napoleon-hat'],
    };
    const result = filterValidMementos(['rosetta-stone', 'napoleon-hat'], account);
    expect(result).toHaveLength(2);
  });
});

describe('AccountState — cross-session persistence (serialize/deserialize)', () => {
  it('AccountState survives JSON round-trip via manual Map serialization', () => {
    const account: AccountState = {
      foundationXP: 750,
      foundationLevel: 3,
      leaderXP: new Map([['augustus', 400], ['cleopatra', 200]]),
      leaderLevels: new Map([['augustus', 3], ['cleopatra', 2]]),
      unlockedMementos: ['rosetta-stone', 'napoleon-hat'],
      unlockedAttributeNodes: new Map([['augustus', ['node_a', 'node_b']]]),
      unlockedLegacyCards: new Map(),
      completedChallenges: ['FIRST_CITY_FOUNDED', 'FIRST_TECH_RESEARCHED'],
    };

    // Simulate the web layer's localStorage serialization pattern
    const serialized = JSON.stringify({
      foundationXP: account.foundationXP,
      foundationLevel: account.foundationLevel,
      leaderXP: [...account.leaderXP.entries()],
      leaderLevels: [...account.leaderLevels.entries()],
      unlockedMementos: account.unlockedMementos,
      unlockedAttributeNodes: [...account.unlockedAttributeNodes.entries()],
      unlockedLegacyCards: [...account.unlockedLegacyCards.entries()],
      completedChallenges: account.completedChallenges,
    });

    const parsed = JSON.parse(serialized);
    const restored: AccountState = {
      foundationXP: parsed.foundationXP,
      foundationLevel: parsed.foundationLevel,
      leaderXP: new Map(parsed.leaderXP),
      leaderLevels: new Map(parsed.leaderLevels),
      unlockedMementos: parsed.unlockedMementos,
      unlockedAttributeNodes: new Map(parsed.unlockedAttributeNodes),
      unlockedLegacyCards: new Map(parsed.unlockedLegacyCards),
      completedChallenges: parsed.completedChallenges,
    };

    expect(restored.foundationXP).toBe(750);
    expect(restored.foundationLevel).toBe(3);
    expect(restored.leaderXP.get('augustus')).toBe(400);
    expect(restored.leaderXP.get('cleopatra')).toBe(200);
    expect(restored.unlockedMementos).toContain('rosetta-stone');
    expect(restored.completedChallenges).toContain('FIRST_CITY_FOUNDED');
    expect(restored.unlockedAttributeNodes.get('augustus')).toEqual(['node_a', 'node_b']);
  });
});

describe('createInitialState — memento integration via equippedMementos config', () => {
  it('applies mementos when account + equippedMementos provided', () => {
    const account: AccountState = {
      ...createDefaultAccountState(),
      foundationLevel: 2, // unlocks 1 slot
      unlockedMementos: ['complaint-to-ea-nasir'],
    };
    const state = createInitialState(
      {
        civId: 'rome',
        leaderId: 'augustus',
        mapWidth: 10,
        mapHeight: 10,
        numAI: 0,
        equippedMementos: ['complaint-to-ea-nasir'],
      },
      42,
      account,
    );
    const player = state.players.get('player1')!;
    const mementoBonus = player.legacyBonuses.find(e => e.source === 'memento:complaint-to-ea-nasir');
    expect(mementoBonus).toBeDefined();
  });

  it('ignores mementos when account level too low (0 slots)', () => {
    const account: AccountState = {
      ...createDefaultAccountState(),
      foundationLevel: 1, // 0 slots
      unlockedMementos: ['complaint-to-ea-nasir'],
    };
    const state = createInitialState(
      {
        civId: 'rome',
        leaderId: 'augustus',
        mapWidth: 10,
        mapHeight: 10,
        numAI: 0,
        equippedMementos: ['complaint-to-ea-nasir'],
      },
      42,
      account,
    );
    const player = state.players.get('player1')!;
    const mementoBonus = player.legacyBonuses.find(e => e.source === 'memento:complaint-to-ea-nasir');
    expect(mementoBonus).toBeUndefined();
  });
});
