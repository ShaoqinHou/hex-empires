import { describe, it, expect } from 'vitest';
import { crisisSystem } from '../crisisSystem';
import { turnSystem } from '../turnSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState, CrisisState } from '../../types/GameState';
import type { CrisisEventDef } from '../../data/crises/types';
import { coordToKey } from '../../hex/HexMath';

function makeCity(id: string, owner: string, population: number = 5): CityState {
  return {
    id, name: id, owner, position: { q: 0, r: 0 },
    population, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey({ q: 0, r: 0 })],
    settlementType: 'city', happiness: 10, isCapital: false, defenseHP: 100,
    specialization: null, specialists: 0, districts: [],
  };
}

describe('crisisSystem', () => {
  describe('trigger conditions', () => {
    it('triggers barbarian_invasion crisis at turn 10', () => {
      const state = createTestState({ turn: 10 });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const crisis = next.crises.find(c => c.id === 'barbarian_invasion');
      expect(crisis).toBeDefined();
      expect(crisis!.active).toBe(true);
      expect(crisis!.turn).toBe(10);
      expect(crisis!.choices.length).toBe(2);
    });

    it('does not trigger crisis before its turn', () => {
      const state = createTestState({ turn: 5 });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const crisis = next.crises.find(c => c.id === 'barbarian_invasion');
      expect(crisis).toBeUndefined();
    });

    it('does not trigger same crisis twice', () => {
      const existing: CrisisState = {
        id: 'barbarian_invasion', name: 'Barbarian Invasion', active: true,
        turn: 10, choices: [], resolvedBy: null, choiceMade: null,
      };
      const state = createTestState({ turn: 11, crises: [existing] });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const invasionCrises = next.crises.filter(c => c.id === 'barbarian_invasion');
      expect(invasionCrises.length).toBe(1);
    });

  });

  describe('RESOLVE_CRISIS', () => {
    it('applies negative gold effect when resolving barbarian_invasion with pay_tribute', () => {
      const crisis: CrisisState = {
        id: 'barbarian_invasion', name: 'Barbarian Invasion', active: true,
        turn: 10,
        choices: [
          { id: 'pay_tribute', text: 'Pay tribute', effects: [] },
          { id: 'fight', text: 'Fight', effects: [] },
        ],
        resolvedBy: null, choiceMade: null,
      };
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1', gold: 100 })],
      ]);
      const state = createTestState({ crises: [crisis], players });
      const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'barbarian_invasion', choice: 'pay_tribute' });

      const player = next.players.get('p1')!;
      expect(player.gold).toBe(50); // 100 - 50
    });

    it('marks crisis as resolved after choice', () => {
      const crisis: CrisisState = {
        id: 'barbarian_invasion', name: 'Barbarian Invasion', active: true,
        turn: 10,
        choices: [
          { id: 'pay_tribute', text: 'Pay tribute', effects: [] },
          { id: 'fight', text: 'Fight', effects: [] },
        ],
        resolvedBy: null, choiceMade: null,
      };
      const state = createTestState({ crises: [crisis] });
      const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'barbarian_invasion', choice: 'pay_tribute' });

      const resolved = next.crises.find(c => c.id === 'barbarian_invasion')!;
      expect(resolved.active).toBe(false);
      expect(resolved.resolvedBy).toBe('p1');
      expect(resolved.choiceMade).toBe('pay_tribute');
    });

    it('applies population loss effect for plague ignore choice', () => {
      const crisis: CrisisState = {
        id: 'plague', name: 'The Great Plague', active: true,
        turn: 20,
        choices: [
          { id: 'quarantine', text: 'Quarantine', effects: [] },
          { id: 'ignore', text: 'Ignore', effects: [] },
        ],
        resolvedBy: null, choiceMade: null,
      };
      const cities = new Map([
        ['c1', makeCity('c1', 'p1', 10)],
        ['c2', makeCity('c2', 'p1', 5)],
      ]);
      const state = createTestState({ crises: [crisis], cities });
      const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'plague', choice: 'ignore' });

      // Largest city (c1, pop 10) should lose 1 pop
      const city = next.cities.get('c1')!;
      expect(city.population).toBe(9);
    });

    it('does not resolve a non-existent crisis', () => {
      const state = createTestState();
      const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'fake', choice: 'fake' });
      expect(next).toBe(state);
    });

    it('does not resolve an already resolved crisis', () => {
      const crisis: CrisisState = {
        id: 'barbarian_invasion', name: 'Barbarian Invasion', active: false,
        turn: 10,
        choices: [],
        resolvedBy: 'p1', choiceMade: 'pay_tribute',
      };
      const state = createTestState({ crises: [crisis] });
      const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'barbarian_invasion', choice: 'pay_tribute' });
      expect(next).toBe(state);
    });

    it('applies evacuate cost for natural_disaster', () => {
      const crisis: CrisisState = {
        id: 'natural_disaster', name: 'Natural Disaster', active: true,
        turn: 25,
        choices: [
          { id: 'evacuate', text: 'Evacuate', effects: [] },
          { id: 'weather_it', text: 'Weather it', effects: [] },
        ],
        resolvedBy: null, choiceMade: null,
      };
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1', gold: 100 })],
      ]);
      const state = createTestState({ crises: [crisis], players });
      const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'natural_disaster', choice: 'evacuate' });

      const player = next.players.get('p1')!;
      expect(player.gold).toBe(80); // 100 - 20
    });
  });

  describe('passthrough', () => {
    it('returns state unchanged for unrelated actions', () => {
      const state = createTestState();
      const next = crisisSystem(state, { type: 'START_TURN' });
      expect(next).toBe(state);
    });
  });

  describe('age_progress trigger (W2-05 F-02)', () => {
    function makeAgeProgressCrisis(threshold: number): CrisisEventDef {
      return {
        id: 'age_crisis',
        name: 'Age Crisis',
        description: 'A crisis driven by age progress.',
        triggerCondition: 'age_progress',
        triggerValue: threshold,
        age: 'antiquity',
        crisisType: 'revolt',
        choices: [
          {
            id: 'act',
            text: 'Take action',
            effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -10 }],
          },
        ],
      };
    }

    it('fires at age_progress threshold 0.70 when ratio is exactly met', () => {
      // ageThresholds.exploration = 100, ageProgress = 70 → ratio 0.70
      const player = createTestPlayer({ id: 'p1', ageProgress: 70 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 100, modern: 200 } },
        config: {
          ...createTestState().config,
          crises: [makeAgeProgressCrisis(0.70)],
        },
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const crisis = next.crises.find(c => c.id === 'age_crisis');
      expect(crisis).toBeDefined();
      expect(crisis!.active).toBe(true);
    });

    it('does NOT fire when ratio is below threshold', () => {
      const player = createTestPlayer({ id: 'p1', ageProgress: 69 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 100, modern: 200 } },
        config: {
          ...createTestState().config,
          crises: [makeAgeProgressCrisis(0.70)],
        },
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      expect(next.crises.find(c => c.id === 'age_crisis')).toBeUndefined();
    });

    it('does NOT fire for modern age (no next threshold)', () => {
      const player = createTestPlayer({ id: 'p1', ageProgress: 999 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'modern', ageThresholds: { exploration: 100, modern: 200 } },
        config: {
          ...createTestState().config,
          crises: [makeAgeProgressCrisis(0.70)],
        },
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      expect(next.crises.find(c => c.id === 'age_crisis')).toBeUndefined();
    });

    it('does not trigger crises from a different age', () => {
      const state = createTestState({
        turn: 55,
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 100, modern: 200 } },
        config: {
          ...createTestState().config,
          crises: [
            {
              id: 'exploration_revolution_test',
              name: 'Exploration Revolution',
              description: 'Wrong-age crisis.',
              triggerCondition: 'turn_reached',
              triggerValue: 55,
              age: 'exploration',
              crisisType: 'revolution',
              choices: [{ id: 'act', text: 'Act', effects: [] }],
            },
          ],
        },
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      expect(next.crises.find(c => c.id === 'exploration_revolution_test')).toBeUndefined();
    });
  });

  describe('crisis stage advancement (W2-05 F-03)', () => {
    it('advances from none to stage1 at 0.70', () => {
      const player = createTestPlayer({ id: 'p1', ageProgress: 70, crisisPhase: 'none' });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 100, modern: 200 } },
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const updatedPlayer = next.players.get('p1')!;
      expect(updatedPlayer.crisisPhase).toBe('stage1');
      expect(updatedPlayer.crisisPolicySlots).toBe(2);
    });

    it('advances from stage1 to stage2 at 0.80', () => {
      const player = createTestPlayer({ id: 'p1', ageProgress: 80, crisisPhase: 'stage1', crisisPolicySlots: 2, crisisPolicies: ['p1', 'p2'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 100, modern: 200 } },
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const updatedPlayer = next.players.get('p1')!;
      expect(updatedPlayer.crisisPhase).toBe('stage2');
      expect(updatedPlayer.crisisPolicySlots).toBe(3);
    });

    it('advances from stage2 to stage3 at 0.90', () => {
      const player = createTestPlayer({ id: 'p1', ageProgress: 90, crisisPhase: 'stage2', crisisPolicySlots: 3, crisisPolicies: ['p1', 'p2', 'p3'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 100, modern: 200 } },
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const updatedPlayer = next.players.get('p1')!;
      expect(updatedPlayer.crisisPhase).toBe('stage3');
      expect(updatedPlayer.crisisPolicySlots).toBe(4);
    });

    it('opens a forced revolutionary government choice at Exploration Revolutions stage3', () => {
      const player = createTestPlayer({
        id: 'p1',
        age: 'exploration',
        ageProgress: 90,
        crisisPhase: 'stage2',
        crisisPolicySlots: 3,
        crisisPolicies: ['p1', 'p2', 'p3'],
        governmentId: 'feudal_monarchy',
        slottedPolicies: ['discipline', null, null, null],
        governmentLockedForAge: true,
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: {
          currentAge: 'exploration',
          ageThresholds: { exploration: 100, modern: 100 },
          activeCrisisType: 'revolution',
        },
        crises: [{
          id: 'exploration_revolution',
          name: 'Flames in the Capital',
          active: true,
          turn: 55,
          choices: [],
          resolvedBy: null,
          choiceMade: null,
          stage: 2,
          pendingResolution: false,
        }],
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const updatedPlayer = next.players.get('p1')!;
      expect(updatedPlayer.crisisPhase).toBe('stage3');
      expect(updatedPlayer.governmentId).toBeNull();
      expect(updatedPlayer.slottedPolicies).toEqual([]);
      expect(updatedPlayer.governmentLockedForAge).toBe(false);
      expect(updatedPlayer.pendingGovernmentChoice).toEqual({
        reason: 'revolutions_final_stage',
        sourceCrisisType: 'revolution',
        sourceStage: 3,
        options: ['revolutionary_republic', 'revolutionary_authoritarianism', 'constitutional_monarchy'],
      });
    });

    it('does not open revolutionary government choice without an active final Revolutions crisis', () => {
      const player = createTestPlayer({
        id: 'p1',
        age: 'exploration',
        ageProgress: 90,
        crisisPhase: 'stage2',
        crisisPolicySlots: 3,
        crisisPolicies: ['p1', 'p2', 'p3'],
        governmentId: 'feudal_monarchy',
        governmentLockedForAge: true,
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: {
          currentAge: 'exploration',
          ageThresholds: { exploration: 100, modern: 100 },
          activeCrisisType: 'revolution',
        },
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const updatedPlayer = next.players.get('p1')!;
      expect(updatedPlayer.crisisPhase).toBe('stage3');
      expect(updatedPlayer.governmentId).toBe('feudal_monarchy');
      expect(updatedPlayer.pendingGovernmentChoice ?? null).toBeNull();
    });

    it('does not open revolutionary government choice for non-Revolutions crises', () => {
      const player = createTestPlayer({
        id: 'p1',
        age: 'exploration',
        ageProgress: 90,
        crisisPhase: 'stage2',
        crisisPolicySlots: 3,
        crisisPolicies: ['p1', 'p2', 'p3'],
        governmentId: 'feudal_monarchy',
        governmentLockedForAge: true,
      });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: {
          currentAge: 'exploration',
          ageThresholds: { exploration: 100, modern: 100 },
          activeCrisisType: 'wars_of_religion',
        },
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const updatedPlayer = next.players.get('p1')!;
      expect(updatedPlayer.crisisPhase).toBe('stage3');
      expect(updatedPlayer.governmentId).toBe('feudal_monarchy');
      expect(updatedPlayer.pendingGovernmentChoice ?? null).toBeNull();
    });

    it('does NOT advance resolved phase', () => {
      const player = createTestPlayer({ id: 'p1', ageProgress: 90, crisisPhase: 'resolved' });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 100, modern: 200 } },
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.crisisPhase).toBe('resolved');
    });

    it('does NOT advance when ratio is below next threshold', () => {
      const player = createTestPlayer({ id: 'p1', ageProgress: 79, crisisPhase: 'stage1', crisisPolicySlots: 2 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 100, modern: 200 } },
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.crisisPhase).toBe('stage1');
    });
  });

  describe('FORCE_CRISIS_POLICY (W2-05 F-03)', () => {
    it('appends a policy when player is in active crisis phase', () => {
      const player = createTestPlayer({ id: 'p1', crisisPhase: 'stage1', crisisPolicySlots: 2, crisisPolicies: [] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = crisisSystem(state, { type: 'FORCE_CRISIS_POLICY', policyId: 'isolation' });
      expect(next.players.get('p1')!.crisisPolicies).toEqual(['isolation']);
    });

    it('does not add duplicate policy', () => {
      const player = createTestPlayer({ id: 'p1', crisisPhase: 'stage1', crisisPolicySlots: 2, crisisPolicies: ['isolation'] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = crisisSystem(state, { type: 'FORCE_CRISIS_POLICY', policyId: 'isolation' });
      expect(next.players.get('p1')!.crisisPolicies).toEqual(['isolation']);
    });

    it('respects max slot count', () => {
      const player = createTestPlayer({ id: 'p1', crisisPhase: 'stage1', crisisPolicySlots: 2, crisisPolicies: ['p1', 'p2'] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = crisisSystem(state, { type: 'FORCE_CRISIS_POLICY', policyId: 'extra' });
      expect(next.players.get('p1')!.crisisPolicies).toEqual(['p1', 'p2']);
    });

    it('no-ops when phase is none', () => {
      const player = createTestPlayer({ id: 'p1', crisisPhase: 'none', crisisPolicies: [] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = crisisSystem(state, { type: 'FORCE_CRISIS_POLICY', policyId: 'test' });
      expect(next).toBe(state);
    });

    it('no-ops when phase is resolved', () => {
      const player = createTestPlayer({ id: 'p1', crisisPhase: 'resolved', crisisPolicies: [] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = crisisSystem(state, { type: 'FORCE_CRISIS_POLICY', policyId: 'test' });
      expect(next).toBe(state);
    });
  });

  // ── X5.2: 3-stage persistent crisis system tests ──
  describe('X5.2 — 3-stage CrisisState advancement', () => {
    function makeActiveCrisis(id = 'test_crisis', stage: 0 | 1 | 2 | 3 = 0): CrisisState {
      return {
        id,
        name: 'Test Crisis',
        active: true,
        turn: 1,
        choices: [],
        resolvedBy: null,
        choiceMade: null,
        stage: stage === 0 ? undefined : stage as 1 | 2 | 3,
        pendingResolution: false,
      };
    }

    it('X5.2 stage 1 fires on CrisisState at age progress ratio >= 0.33', () => {
      // ageThresholds.exploration = 100, ageProgress = 33 → ratio exactly 0.33
      const player = createTestPlayer({ id: 'p1', ageProgress: 33 });
      const crisis = makeActiveCrisis('test_crisis', 0);
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 100, modern: 200 } },
        crises: [crisis],
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const updatedCrisis = next.crises.find(c => c.id === 'test_crisis')!;
      expect(updatedCrisis.stage).toBe(1);
      expect(updatedCrisis.stageStartedTurn).toBe(1);
      expect(updatedCrisis.pendingResolution).toBe(true);
    });

    it('X5.2 stage 2 fires on CrisisState at age progress ratio >= 0.66', () => {
      // stage 1 → stage 2 at ratio 0.66
      const player = createTestPlayer({ id: 'p1', ageProgress: 66 });
      const crisis = makeActiveCrisis('test_crisis', 1); // already at stage 1
      const state = createTestState({
        players: new Map([['p1', player]]),
        age: { currentAge: 'antiquity', ageThresholds: { exploration: 100, modern: 200 } },
        crises: [crisis],
      });
      const next = crisisSystem(state, { type: 'END_TURN' });
      const updatedCrisis = next.crises.find(c => c.id === 'test_crisis')!;
      expect(updatedCrisis.stage).toBe(2);
      expect(updatedCrisis.pendingResolution).toBe(true);
    });

    it('X5.2 pendingResolution on CrisisState blocks END_TURN for the current player', () => {
      // This test verifies the turnSystem gate added by X5.2:
      // if any active crisis has pendingResolution AND the player has not slotted a policy,
      // END_TURN must be blocked.
      // We test this through turnSystem directly.
      // Note: crisisSystem sets pendingResolution but turnSystem gates END_TURN.
      const player = createTestPlayer({ id: 'p1', isHuman: true });
      const crisis: CrisisState = {
        id: 'test_crisis', name: 'Test Crisis', active: true, turn: 1,
        choices: [], resolvedBy: null, choiceMade: null,
        stage: 1,
        pendingResolution: true,
        slottedPolicies: new Map(), // no policies slotted yet
      };
      const state = createTestState({
        players: new Map([['p1', player]]),
        crises: [crisis],
        currentPlayerId: 'p1',
        phase: 'actions',
      });
      const next = turnSystem(state, { type: 'END_TURN' });
      expect(next.lastValidation).toMatchObject({
        valid: false,
        reason: expect.stringContaining('crisis'),
      });
    });

    it('X5.2 SLOT_CRISIS_POLICY clears pendingResolution once all players have slotted', () => {
      const player = createTestPlayer({ id: 'p1', isHuman: true });
      const crisis: CrisisState = {
        id: 'test_crisis', name: 'Test Crisis', active: true, turn: 1,
        choices: [], resolvedBy: null, choiceMade: null,
        stage: 1,
        pendingResolution: true,
        slottedPolicies: new Map(),
      };
      const state = createTestState({
        players: new Map([['p1', player]]),
        crises: [crisis],
        currentPlayerId: 'p1',
      });
      const next = crisisSystem(state, {
        type: 'SLOT_CRISIS_POLICY',
        playerId: 'p1',
        crisisId: 'test_crisis',
        policyId: 'emergency_measures',
      });
      const updatedCrisis = next.crises.find(c => c.id === 'test_crisis')!;
      expect(updatedCrisis.slottedPolicies?.get('p1')).toEqual(['emergency_measures']);
      // Single human player has slotted → pendingResolution should clear
      expect(updatedCrisis.pendingResolution).toBe(false);
    });
  });
});
