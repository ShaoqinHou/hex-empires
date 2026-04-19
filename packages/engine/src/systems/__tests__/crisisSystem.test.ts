import { describe, it, expect } from 'vitest';
import { crisisSystem } from '../crisisSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState, CrisisState } from '../../types/GameState';
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
});
