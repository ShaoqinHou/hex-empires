import { describe, it, expect } from 'vitest';
import { generateAIActions } from '../aiSystem';
import { createTestState, createTestPlayer, createTestCity, createTestUnit } from './helpers';
import type { GameAction, GameState, CodexState } from '../../types/GameState';

/**
 * CC2 AI breadth tests:
 *   CC2.3 — AI dispatches PROMOTE_COMMANDER
 *   CC2.4 — AI dispatches ASSIGN_RESOURCE
 *   CC2.5 — AI dispatches PLACE_CODEX
 */

// ── CC2.3: PROMOTE_COMMANDER ──────────────────────────────────────────────

describe('aiSystem — CC2.3 PROMOTE_COMMANDER', () => {
  it('AI promotes a commander unit with unspent promotion picks', () => {
    // 'general' is a known commander typeId. Level-2 threshold is 50 XP,
    // so experience=50 gives level 2 with 0 promotions taken → 1 unspent pick.
    const commanderUnit = createTestUnit({
      id: 'u_cmd',
      typeId: 'general',
      owner: 'p1',
      movementLeft: 0,   // movement spent — no movement actions
      experience: 50,     // reaches level 2 → 1 unspent pick
      promotions: [],
    });
    const player = createTestPlayer({ id: 'p1', isHuman: false });
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', player]]),
      units: new Map([['u_cmd', commanderUnit]]),
    });

    const actions = generateAIActions(state);
    const promote = actions.find(a => a.type === 'PROMOTE_COMMANDER') as
      | Extract<GameAction, { type: 'PROMOTE_COMMANDER' }>
      | undefined;

    expect(promote).toBeDefined();
    expect(promote!.commanderId).toBe('u_cmd');
    expect(typeof promote!.promotionId).toBe('string');
    expect(promote!.promotionId.length).toBeGreaterThan(0);
  });

  it('AI does NOT promote a commander that has no unspent picks (level 1, 1 promotion already taken)', () => {
    // Per commanderPromotionSystem convention: unspent = level - promotions.length.
    // Level 1 (0 XP) with 1 promotion already taken → unspent = 0 → no promote.
    const commanderUnit = createTestUnit({
      id: 'u_cmd',
      typeId: 'general',
      owner: 'p1',
      movementLeft: 0,
      experience: 0,
      promotions: ['assault_battle_cry'],
    });
    const player = createTestPlayer({ id: 'p1', isHuman: false });
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', player]]),
      units: new Map([['u_cmd', commanderUnit]]),
    });

    const actions = generateAIActions(state);
    expect(actions.find(a => a.type === 'PROMOTE_COMMANDER')).toBeUndefined();
  });
});

// ── CC2.4: ASSIGN_RESOURCE ────────────────────────────────────────────────

describe('aiSystem — CC2.4 ASSIGN_RESOURCE', () => {
  it('AI assigns an unassigned owned resource to a city with spare capacity', () => {
    // City (type: 'city') has 2-slot capacity; none assigned yet.
    const city = createTestCity({ id: 'c1', owner: 'p1', settlementType: 'city' });
    const player = createTestPlayer({
      id: 'p1',
      isHuman: false,
      ownedResources: ['iron'],
    } as Parameters<typeof createTestPlayer>[0]);
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
    });

    const actions = generateAIActions(state);
    const assign = actions.find(a => a.type === 'ASSIGN_RESOURCE') as
      | Extract<GameAction, { type: 'ASSIGN_RESOURCE' }>
      | undefined;

    expect(assign).toBeDefined();
    expect(assign!.resourceId).toBe('iron');
    expect(assign!.cityId).toBe('c1');
    expect(assign!.playerId).toBe('p1');
  });

  it('AI does NOT assign resources when none are owned', () => {
    const city = createTestCity({ id: 'c1', owner: 'p1', settlementType: 'city' });
    const player = createTestPlayer({
      id: 'p1',
      isHuman: false,
      // No ownedResources field
    });
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
    });

    const actions = generateAIActions(state);
    expect(actions.find(a => a.type === 'ASSIGN_RESOURCE')).toBeUndefined();
  });
});

// ── CC2.5: PLACE_CODEX ────────────────────────────────────────────────────

describe('aiSystem — CC2.5 PLACE_CODEX', () => {
  it('AI places an unplaced codex in a city building with spare codex slots', () => {
    // Library has codexSlots: 2. City has a library. Codex is unplaced.
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      buildings: ['library'],
    });
    const codex: CodexState = {
      id: 'codex-1',
      playerId: 'p1',
      cityId: 'c1',
      buildingId: 'library',
      addedTurn: 1,
      // placedInCityId and placedInBuildingId are absent → unplaced
    };
    const player = createTestPlayer({ id: 'p1', isHuman: false });
    const state: GameState = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
      codices: new Map([['codex-1', codex]]),
    });

    const actions = generateAIActions(state);
    const place = actions.find(a => a.type === 'PLACE_CODEX') as
      | Extract<GameAction, { type: 'PLACE_CODEX' }>
      | undefined;

    expect(place).toBeDefined();
    expect(place!.codexId).toBe('codex-1');
    expect(place!.cityId).toBe('c1');
    expect(place!.buildingId).toBe('library');
  });

  it('AI does NOT place a codex when no unplaced codices exist', () => {
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      buildings: ['library'],
    });
    const player = createTestPlayer({ id: 'p1', isHuman: false });
    // state.codices is undefined (no codices generated yet)
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
    });

    const actions = generateAIActions(state);
    expect(actions.find(a => a.type === 'PLACE_CODEX')).toBeUndefined();
  });

  it('AI does NOT place a codex that is already placed', () => {
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      buildings: ['library'],
    });
    const codex: CodexState = {
      id: 'codex-1',
      playerId: 'p1',
      cityId: 'c1',
      buildingId: 'library',
      addedTurn: 1,
      placedInCityId: 'c1',      // already placed
      placedInBuildingId: 'library',
    };
    const player = createTestPlayer({ id: 'p1', isHuman: false });
    const state: GameState = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
      codices: new Map([['codex-1', codex]]),
    });

    const actions = generateAIActions(state);
    expect(actions.find(a => a.type === 'PLACE_CODEX')).toBeUndefined();
  });
});
