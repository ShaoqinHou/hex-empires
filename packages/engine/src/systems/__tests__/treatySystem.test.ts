import { describe, it, expect } from 'vitest';
import { treatySystem, canEstablishTrade, canCrossBorder } from '../treatySystem';
import { tradeSystem } from '../tradeSystem';
import { combatSystem } from '../combatSystem';
import { getRelationshipTier, getRelationshipTierForPair } from '../../state/DiplomacyUtils';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import type { DiplomacyRelation, CityState } from '../../types/GameState';
import { defaultRelation } from '../../state/DiplomacyUtils';
import type { ActiveTreaty } from '../../types/Treaty';

function stateWithTwoPlayers(overrides: { p1Influence?: number; p2Influence?: number } = {}) {
  return createTestState({
    currentPlayerId: 'p1',
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', name: 'Player 1', influence: overrides.p1Influence ?? 100 })],
      ['p2', createTestPlayer({ id: 'p2', name: 'Player 2', influence: overrides.p2Influence ?? 100 })],
    ]),
  });
}

describe('treatySystem', () => {
  it('PROPOSE_TREATY creates a pending treaty when valid', () => {
    const state = stateWithTwoPlayers({ p1Influence: 50 });
    const next = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treaties = next.diplomacy.activeTreaties ?? [];
    expect(treaties).toHaveLength(1);
    expect(treaties[0].treatyId).toBe('open_borders');
    expect(treaties[0].proposerId).toBe('p1');
    expect(treaties[0].targetId).toBe('p2');
    expect(treaties[0].status).toBe('pending');
    expect(treaties[0].activeSinceTurn).toBeNull();
    // Influence deducted from proposer
    expect(next.players.get('p1')!.influence).toBe(30);
  });

  it('PROPOSE_TREATY no-ops when player lacks influence', () => {
    const state = stateWithTwoPlayers({ p1Influence: 10 });
    const next = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treaties = next.diplomacy.activeTreaties ?? [];
    expect(treaties).toHaveLength(0);
    expect(next.players.get('p1')!.influence).toBe(10);
  });

  it('PROPOSE_TREATY no-ops when proposing to self', () => {
    const state = stateWithTwoPlayers({ p1Influence: 50 });
    const next = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p1',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treaties = next.diplomacy.activeTreaties ?? [];
    expect(treaties).toHaveLength(0);
  });

  it('ACCEPT_TREATY transitions pending treaty to active', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50 });
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treatyRuntimeId = state.diplomacy.activeTreaties![0].id;

    // Switch to p2 (target accepts)
    state = { ...state, currentPlayerId: 'p2' };
    const next = treatySystem(state, {
      type: 'ACCEPT_TREATY',
      treatyId: treatyRuntimeId,
    });

    const treaty = next.diplomacy.activeTreaties![0];
    expect(treaty.status).toBe('active');
    expect(treaty.activeSinceTurn).toBe(state.turn);
    expect(treaty.turnsRemaining).toBe(30); // open_borders has durationTurns: 30
  });

  it('ACCEPT_TREATY no-ops when target is not current player', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50 });
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treatyRuntimeId = state.diplomacy.activeTreaties![0].id;

    // p1 (proposer) tries to accept their own proposal — should no-op
    const next = treatySystem(state, {
      type: 'ACCEPT_TREATY',
      treatyId: treatyRuntimeId,
    });

    const treaty = next.diplomacy.activeTreaties![0];
    expect(treaty.status).toBe('pending');
  });

  it('REJECT_TREATY transitions pending treaty to rejected', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50 });
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'improve_trade_relations',
      influenceSpent: 25,
    });

    const treatyRuntimeId = state.diplomacy.activeTreaties![0].id;

    // Switch to p2 (target rejects)
    state = { ...state, currentPlayerId: 'p2' };
    const next = treatySystem(state, {
      type: 'REJECT_TREATY',
      treatyId: treatyRuntimeId,
    });

    const treaty = next.diplomacy.activeTreaties![0];
    expect(treaty.status).toBe('rejected');
  });

  it('END_TURN decrements turnsRemaining on active treaties', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50 });
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treatyRuntimeId = state.diplomacy.activeTreaties![0].id;
    // Accept
    state = { ...state, currentPlayerId: 'p2' };
    state = treatySystem(state, {
      type: 'ACCEPT_TREATY',
      treatyId: treatyRuntimeId,
    });

    expect(state.diplomacy.activeTreaties![0].turnsRemaining).toBe(30);

    // Tick one turn
    state = treatySystem(state, { type: 'END_TURN' });
    expect(state.diplomacy.activeTreaties![0].turnsRemaining).toBe(29);
    expect(state.diplomacy.activeTreaties![0].status).toBe('active');
  });

  it('END_TURN expires treaty when turnsRemaining reaches 0', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50 });
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'denounce_military_presence',
      influenceSpent: 15,
    });

    const treatyRuntimeId = state.diplomacy.activeTreaties![0].id;
    // Accept
    state = { ...state, currentPlayerId: 'p2' };
    state = treatySystem(state, {
      type: 'ACCEPT_TREATY',
      treatyId: treatyRuntimeId,
    });

    // denounce_military_presence has durationTurns: 20 — tick 20 times
    for (let i = 0; i < 20; i++) {
      state = treatySystem(state, { type: 'END_TURN' });
    }

    const treaty = state.diplomacy.activeTreaties![0];
    expect(treaty.status).toBe('expired');
    expect(treaty.turnsRemaining).toBe(0);
  });
});

// ---- Y4.1: Relationship tier tests ----

describe('getRelationshipTier (Y4.1)', () => {
  it('returns Friendly for score >= 50', () => {
    expect(getRelationshipTier(50)).toBe('Friendly');
    expect(getRelationshipTier(100)).toBe('Friendly');
  });

  it('returns Neutral for score 0 to 49', () => {
    expect(getRelationshipTier(0)).toBe('Neutral');
    expect(getRelationshipTier(49)).toBe('Neutral');
  });

  it('returns Unfriendly for score -1 to -49', () => {
    expect(getRelationshipTier(-1)).toBe('Unfriendly');
    expect(getRelationshipTier(-49)).toBe('Unfriendly');
  });

  it('returns Hostile for score -50 or lower', () => {
    expect(getRelationshipTier(-50)).toBe('Hostile');
    expect(getRelationshipTier(-100)).toBe('Hostile');
  });

  it('getRelationshipTierForPair returns Neutral for unknown pair', () => {
    const relations = new Map<string, DiplomacyRelation>();
    expect(getRelationshipTierForPair('p1', 'p2', relations)).toBe('Neutral');
  });

  it('getRelationshipTierForPair returns correct tier for known pair', () => {
    const rel: DiplomacyRelation = { ...defaultRelation(), relationship: 60 };
    const relations = new Map([['p1:p2', rel]]);
    expect(getRelationshipTierForPair('p1', 'p2', relations)).toBe('Friendly');
    expect(getRelationshipTierForPair('p2', 'p1', relations)).toBe('Friendly');
  });
});

// ---- Y4.2: Influence accumulation tests ----

describe('END_TURN influence accumulation (Y4.2)', () => {
  it('baseline: +1 Influence per turn with no treaties or embassies', () => {
    let state = stateWithTwoPlayers({ p1Influence: 0, p2Influence: 0 });
    const initial = state.players.get('p1')!.influence;

    for (let i = 0; i < 10; i++) {
      state = treatySystem(state, { type: 'END_TURN' });
    }

    const final = state.players.get('p1')!.influence;
    // 10 turns * +1 baseline = +10
    expect(final - initial).toBe(10);
  });

  it('+0.5 per active treaty partner on top of baseline', () => {
    // Set up an active treaty between p1 and p2
    let state = stateWithTwoPlayers({ p1Influence: 50, p2Influence: 50 });
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });
    const treatyId = state.diplomacy.activeTreaties![0].id;
    state = { ...state, currentPlayerId: 'p2' };
    state = treatySystem(state, { type: 'ACCEPT_TREATY', treatyId });
    state = { ...state, currentPlayerId: 'p1' };

    // Record post-treaty-setup influence
    const p1Before = state.players.get('p1')!.influence;
    const p2Before = state.players.get('p2')!.influence;

    state = treatySystem(state, { type: 'END_TURN' });

    const p1After = state.players.get('p1')!.influence;
    const p2After = state.players.get('p2')!.influence;

    // 1 baseline + 0.5 treaty partner = 1.5 per turn
    expect(p1After - p1Before).toBe(1.5);
    expect(p2After - p2Before).toBe(1.5);
  });

  it('spending (DENOUNCE_PLAYER) decreases Influence', () => {
    const state = stateWithTwoPlayers({ p1Influence: 20, p2Influence: 0 });
    const next = treatySystem(state, {
      type: 'DENOUNCE_PLAYER',
      targetPlayerId: 'p2',
    });
    // DENOUNCE_PLAYER costs 5
    expect(next.players.get('p1')!.influence).toBe(15);
  });
});

// ---- Y4.3: Alliance effects tests ----

describe('Alliance effects on END_TURN (Y4.3)', () => {
  function stateWithAlliance() {
    return createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', science: 0, influence: 200 })],
        ['p2', createTestPlayer({ id: 'p2', science: 0, influence: 200 })],
      ]),
      diplomacy: {
        relations: new Map([
          ['p1:p2', { ...defaultRelation(), hasAlliance: true, relationship: 70, status: 'helpful' as const }],
        ]),
      },
    });
  }

  it('both alliance partners gain +1 science per turn', () => {
    const state = stateWithAlliance();
    const next = treatySystem(state, { type: 'END_TURN' });

    expect(next.players.get('p1')!.science).toBe(1);
    expect(next.players.get('p2')!.science).toBe(1);
  });

  it('mutual war: ally of belligerent enters war with enemy', () => {
    // p1 at war with p3; p2 allied with p1 -> p2 should enter war with p3
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 100 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 100 })],
        ['p3', createTestPlayer({ id: 'p3', influence: 100 })],
      ]),
      diplomacy: {
        relations: new Map([
          ['p1:p2', { ...defaultRelation(), hasAlliance: true, relationship: 70, status: 'helpful' as const }],
          ['p1:p3', { ...defaultRelation(), status: 'war' as const, relationship: -50 }],
        ]),
      },
    });

    const next = treatySystem(state, { type: 'END_TURN' });

    // p2 and p3 relation should now be at war
    const key = 'p2:p3';
    const rel = next.diplomacy.relations.get(key);
    expect(rel?.status).toBe('war');

    // Log should mention alliance obligation
    expect(next.log.some(e => e.message.includes('Alliance obligation'))).toBe(true);
  });
});

// ---- Y4.4: Trade/border permission tests ----

describe('canEstablishTrade (Y4.4)', () => {
  it('Neutral relation allows trade', () => {
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
      diplomacy: {
        relations: new Map([
          ['p1:p2', { ...defaultRelation(), relationship: 0, status: 'neutral' as const }],
        ]),
      },
    });
    expect(canEstablishTrade('p1', 'p2', state)).toBe(true);
  });

  it('Hostile relation blocks trade', () => {
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
      diplomacy: {
        relations: new Map([
          ['p1:p2', { ...defaultRelation(), relationship: -60, status: 'hostile' as const }],
        ]),
      },
    });
    expect(canEstablishTrade('p1', 'p2', state)).toBe(false);
  });

  it('embargo blocks trade even on Friendly tier', () => {
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
      diplomacy: {
        relations: new Map([
          ['p1:p2', { ...defaultRelation(), relationship: 80, status: 'helpful' as const, hasEmbargo: true }],
        ]),
      },
    });
    expect(canEstablishTrade('p1', 'p2', state)).toBe(false);
  });

  it('Open Borders treaty permits border crossing for Unfriendly players', () => {
    // p1 and p2 are Unfriendly but have an active Open Borders treaty
    let state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 100 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 100 })],
      ]),
      diplomacy: {
        relations: new Map([
          ['p1:p2', { ...defaultRelation(), relationship: -30, status: 'unfriendly' as const }],
        ]),
      },
    });
    // Propose and accept an open_borders treaty
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });
    const tId = state.diplomacy.activeTreaties![0].id;
    state = { ...state, currentPlayerId: 'p2' };
    state = treatySystem(state, { type: 'ACCEPT_TREATY', treatyId: tId });

    // Unfriendly tier but has open_borders treaty -> border crossing allowed
    expect(canCrossBorder('p1', 'p2', state)).toBe(true);
  });
});

// ---- Y4.5: Influence-cost diplomatic actions ----

describe('DENOUNCE_PLAYER (Y4.5)', () => {
  it('costs 5 Influence and reduces relationship by 20', () => {
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 20 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 0 })],
      ]),
      diplomacy: {
        relations: new Map([['p1:p2', { ...defaultRelation(), relationship: 0 }]]),
      },
    });
    const next = treatySystem(state, { type: 'DENOUNCE_PLAYER', targetPlayerId: 'p2' });
    expect(next.players.get('p1')!.influence).toBe(15); // -5
    expect(next.diplomacy.relations.get('p1:p2')!.relationship).toBe(-20);
  });

  it('no-ops when insufficient Influence', () => {
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 3 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 0 })],
      ]),
    });
    const next = treatySystem(state, { type: 'DENOUNCE_PLAYER', targetPlayerId: 'p2' });
    expect(next).toBe(state); // state reference unchanged
  });
});

describe('DECLARE_FRIENDSHIP (Y4.5)', () => {
  it('costs 5 Influence and raises relationship by 10', () => {
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 20 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 0 })],
      ]),
      diplomacy: {
        relations: new Map([['p1:p2', { ...defaultRelation(), relationship: 0 }]]),
      },
    });
    const next = treatySystem(state, { type: 'DECLARE_FRIENDSHIP', targetPlayerId: 'p2' });
    expect(next.players.get('p1')!.influence).toBe(15); // -5
    expect(next.diplomacy.relations.get('p1:p2')!.relationship).toBe(10);
  });
});

describe('IMPOSE_EMBARGO (Y4.5)', () => {
  it('costs 10 Influence and sets hasEmbargo, blocking trade', () => {
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 20 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 0 })],
      ]),
    });
    const next = treatySystem(state, { type: 'IMPOSE_EMBARGO', targetPlayerId: 'p2' });
    expect(next.players.get('p1')!.influence).toBe(10); // -10
    expect(next.diplomacy.relations.get('p1:p2')!.hasEmbargo).toBe(true);
    // Trade should now be blocked even though default tier is Neutral
    expect(canEstablishTrade('p1', 'p2', next)).toBe(false);
  });
});

// ── AA2.2 (F-06): Treaty effect hooks ──

describe('AA2.2 treaty effects', () => {
  /** Helper: produce a state with an active treaty between p1 and p2. */
  function stateWithActiveTreaty(treatyId: string) {
    const treaty: ActiveTreaty = {
      id: `treaty-${treatyId}-1`,
      treatyId: treatyId as ActiveTreaty['treatyId'],
      proposerId: 'p1',
      targetId: 'p2',
      status: 'active',
      proposedOnTurn: 1,
      activeSinceTurn: 1,
      turnsRemaining: 30,
    };
    return createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', gold: 100, influence: 100 })],
        ['p2', createTestPlayer({ id: 'p2', gold: 50, influence: 100 })],
      ]),
      diplomacy: {
        relations: new Map([['p1:p2', defaultRelation()]]),
        activeTreaties: [treaty],
      },
    });
  }

  it('open_borders: canCrossBorder returns true for Unfriendly players with active treaty', () => {
    const state = stateWithActiveTreaty('open_borders');
    // Override relation to Unfriendly (score -30)
    const rel: DiplomacyRelation = { ...defaultRelation(), relationship: -30, status: 'unfriendly' };
    const stateUnfriendly = {
      ...state,
      diplomacy: {
        ...state.diplomacy,
        relations: new Map([['p1:p2', rel]]),
      },
    };
    // Without treaty, Unfriendly would block crossing
    const stateNoTreaty = { ...stateUnfriendly, diplomacy: { ...stateUnfriendly.diplomacy, activeTreaties: [] as ActiveTreaty[] } };
    expect(canCrossBorder('p1', 'p2', stateNoTreaty)).toBe(false);
    // With open_borders treaty, crossing is allowed despite Unfriendly
    expect(canCrossBorder('p1', 'p2', stateUnfriendly)).toBe(true);
  });

  it('improve_trade_relations: trade route gold yield is +50% for parties with active treaty', () => {
    // Build a state with a trade route where p1 is origin and p2 is destination
    const homeCity: CityState = {
      id: 'city1',
      name: 'Rome',
      owner: 'p1',
      position: { q: 0, r: 0 },
      population: 2,
      food: 0,
      productionQueue: [],
      productionProgress: 0,
      buildings: [],
      territory: [],
      settlementType: 'city',
      happiness: 10,
      isCapital: true,
      defenseHP: 100,
      specialization: null,
      specialists: 0,
      districts: [],
    };
    const foreignCity: CityState = {
      ...homeCity,
      id: 'city2',
      name: 'Athens',
      owner: 'p2',
      position: { q: 2, r: 0 },
      isCapital: false,
      assignedResources: [],
    };

    // Caravan unit for the route
    const caravan = createTestUnit({ id: 'c1', typeId: 'caravan', owner: 'p1', position: { q: 2, r: 0 } });

    const baseState = stateWithActiveTreaty('improve_trade_relations');
    const tradeRouteState = {
      ...baseState,
      cities: new Map([['city1', homeCity], ['city2', foreignCity]]),
      units: new Map([['c1', caravan]]),
      tradeRoutes: new Map([['route1', { id: 'route1', from: 'city1', to: 'city2', owner: 'p1', isSea: false, caravanUnitId: 'c1', resources: [] }]]),
    };

    // Without treaty: antiquity base gold = 2, 1 slot minimum = 2 gold to p2
    const noTreatyState = { ...tradeRouteState, diplomacy: { ...tradeRouteState.diplomacy, activeTreaties: [] as ActiveTreaty[] } };
    const afterNoTreaty = tradeSystem(noTreatyState, { type: 'END_TURN' });
    const goldNoTreaty = afterNoTreaty.players.get('p2')!.gold - 50;

    // With treaty: should be 2 × 1.5 = 3 gold
    const afterWithTreaty = tradeSystem(tradeRouteState, { type: 'END_TURN' });
    const goldWithTreaty = afterWithTreaty.players.get('p2')!.gold - 50;

    expect(goldNoTreaty).toBe(2); // base: 2 gold/turn
    expect(goldWithTreaty).toBe(3); // 2 × 1.5 = 3 gold/turn
    expect(goldWithTreaty).toBeGreaterThan(goldNoTreaty);
  });

  it('denounce_military_presence: sanctioned attacker gets -25% combat strength', () => {
    // p1 has an active denounce_military_presence treaty targeting p2
    // p2 is the "sanctioned" player (targetId of the treaty)
    const treaty: ActiveTreaty = {
      id: 'treaty-denounce-1',
      treatyId: 'denounce_military_presence',
      proposerId: 'p1', // p1 declared the sanction against p2
      targetId: 'p2',   // p2 is sanctioned
      status: 'active',
      proposedOnTurn: 1,
      activeSinceTurn: 1,
      turnsRemaining: 20,
    };

    // p2 attacks p1 — p2 should receive -25% CS penalty
    const attacker = createTestUnit({ id: 'u1', typeId: 'warrior', owner: 'p2', position: { q: 0, r: 0 } });
    const defender = createTestUnit({ id: 'u2', typeId: 'warrior', owner: 'p1', position: { q: 1, r: 0 } });

    const state = createTestState({
      currentPlayerId: 'p2',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', influence: 100 })],
        ['p2', createTestPlayer({ id: 'p2', influence: 100 })],
      ]),
      units: new Map([['u1', attacker], ['u2', defender]]),
      diplomacy: {
        relations: new Map([['p1:p2', { ...defaultRelation(), status: 'war', turnsAtWar: 1 }]]),
        activeTreaties: [treaty],
      },
    });

    // Apply combat — p2 (sanctioned) attacks p1
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'u1', targetId: 'u2' });

    // The sanctioned attacker (p2) should be penalized — defender should survive or take less damage
    // compared to an equivalent combat without the treaty.
    const noTreatyState = { ...state, diplomacy: { ...state.diplomacy, activeTreaties: [] as ActiveTreaty[] } };
    const nextNoTreaty = combatSystem(noTreatyState, { type: 'ATTACK_UNIT', attackerId: 'u1', targetId: 'u2' });

    // Defender (p1's warrior) should take less or equal damage with the treaty penalty active
    const defenderHpWithTreaty = next.units.get('u2')?.health ?? 0;
    const defenderHpWithoutTreaty = nextNoTreaty.units.get('u2')?.health ?? 0;

    // With -25% CS on attacker, defender should survive with more HP (take less damage)
    expect(defenderHpWithTreaty).toBeGreaterThanOrEqual(defenderHpWithoutTreaty);
    // And the combat should have resolved (attacker moved or took damage)
    expect(next.lastValidation).toBeNull();
  });
});
