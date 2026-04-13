import { describe, it, expect } from 'vitest';
import { governorSystem } from '../governorSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { GameState, GameAction, CityState } from '../../types/GameState';
import type { Governor } from '../../types/Governor';

function stateWithCity(cityId: string, owner: string): GameState {
  const city: CityState = {
    id: cityId,
    name: 'Test City',
    owner,
    position: { q: 5, r: 5 },
    population: 3,
    food: 0,
    production: 0,
    productionQueue: [],
    buildings: [],
    territory: [{ q: 5, r: 5 }],
    settlementType: 'city',
    specialization: null,
    specialists: 0,
    maxSpecialists: 2,
    isCapital: true,
    wallsHealth: 0,
    hasWalls: false,
    turnsWithoutGrowth: 0,
  };
  return createTestState({
    cities: new Map([[cityId, city]]),
  });
}

function stateWithGovernor(governorId: string): GameState {
  const governor: Governor = {
    id: governorId,
    name: 'Magnus',
    title: 'administrator',
    specialization: 'economic',
    level: 1,
    experience: 0,
    experienceToNextLevel: 100,
    assignedCity: null,
    abilities: [],
    promotions: [],
  };
  return createTestState({
    governors: new Map([[governorId, governor]]),
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', governors: [governorId] })],
    ]),
  });
}

describe('governorSystem', () => {
  describe('RECRUIT_GOVERNOR', () => {
    it('recruits a governor from config', () => {
      const state = createTestState();
      const action: GameAction = { type: 'RECRUIT_GOVERNOR', governorId: 'magnus' };
      const next = governorSystem(state, action);

      expect(next.governors.has('magnus')).toBe(true);
      const governor = next.governors.get('magnus')!;
      expect(governor.name).toBe('Magnus');
      expect(governor.level).toBe(1);
      expect(governor.assignedCity).toBeNull();
      expect(governor.specialization).toBe('economic');
    });

    it('adds governor to player governor list', () => {
      const state = createTestState();
      const action: GameAction = { type: 'RECRUIT_GOVERNOR', governorId: 'magnus' };
      const next = governorSystem(state, action);

      const player = next.players.get('p1')!;
      expect(player.governors).toContain('magnus');
    });

    it('rejects recruiting already-recruited governor', () => {
      const state = stateWithGovernor('magnus');
      const action: GameAction = { type: 'RECRUIT_GOVERNOR', governorId: 'magnus' };
      const next = governorSystem(state, action);

      expect(next).toBe(state); // unchanged
    });

    it('rejects recruiting non-existent governor', () => {
      const state = createTestState();
      const action: GameAction = { type: 'RECRUIT_GOVERNOR', governorId: 'nonexistent' };
      const next = governorSystem(state, action);

      expect(next).toBe(state);
    });

    it('rejects recruiting beyond max (4) governors', () => {
      const govs = ['magnus', 'victoria', 'galileo', 'michelangelo'].map(id => {
        const gov: Governor = {
          id, name: id, title: 'administrator', specialization: 'economic',
          level: 1, experience: 0, experienceToNextLevel: 100,
          assignedCity: null, abilities: [], promotions: [],
        };
        return [id, gov] as const;
      });
      const state = createTestState({
        governors: new Map(govs),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', governors: govs.map(([id]) => id) })],
        ]),
      });
      const action: GameAction = { type: 'RECRUIT_GOVERNOR', governorId: 'moses' };
      const next = governorSystem(state, action);

      expect(next).toBe(state); // at capacity
    });

    it('logs recruitment event', () => {
      const state = createTestState();
      const action: GameAction = { type: 'RECRUIT_GOVERNOR', governorId: 'magnus' };
      const next = governorSystem(state, action);

      expect(next.log.length).toBe(1);
      expect(next.log[0].message).toContain('Magnus');
    });
  });

  describe('ASSIGN_GOVERNOR', () => {
    it('assigns a governor to a city', () => {
      const base = stateWithGovernor('magnus');
      const state: GameState = {
        ...stateWithCity('c1', 'p1'),
        governors: base.governors,
        players: base.players,
      };
      const action: GameAction = { type: 'ASSIGN_GOVERNOR', governorId: 'magnus', cityId: 'c1' };
      const next = governorSystem(state, action);

      expect(next.governors.get('magnus')!.assignedCity).toBe('c1');
    });

    it('rejects assigning to non-existent city', () => {
      const state = stateWithGovernor('magnus');
      const action: GameAction = { type: 'ASSIGN_GOVERNOR', governorId: 'magnus', cityId: 'nonexistent' };
      const next = governorSystem(state, action);

      expect(next).toBe(state);
    });

    it('rejects assigning to enemy city', () => {
      const base = stateWithGovernor('magnus');
      const cityState = stateWithCity('c1', 'enemy');
      const state: GameState = {
        ...cityState,
        governors: base.governors,
        players: new Map([
          ...base.players,
          ['enemy', createTestPlayer({ id: 'enemy', name: 'Enemy' })],
        ]),
      };
      const action: GameAction = { type: 'ASSIGN_GOVERNOR', governorId: 'magnus', cityId: 'c1' };
      const next = governorSystem(state, action);

      expect(next).toBe(state);
    });

    it('displaces existing governor when assigning to occupied city', () => {
      const gov1: Governor = {
        id: 'magnus', name: 'Magnus', title: 'administrator', specialization: 'economic',
        level: 1, experience: 0, experienceToNextLevel: 100, assignedCity: 'c1',
        abilities: [], promotions: [],
      };
      const gov2: Governor = {
        id: 'victoria', name: 'Victoria', title: 'administrator', specialization: 'military',
        level: 1, experience: 0, experienceToNextLevel: 100, assignedCity: null,
        abilities: [], promotions: [],
      };
      const cityState = stateWithCity('c1', 'p1');
      const state: GameState = {
        ...cityState,
        governors: new Map([['magnus', gov1], ['victoria', gov2]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', governors: ['magnus', 'victoria'] })],
        ]),
      };

      const action: GameAction = { type: 'ASSIGN_GOVERNOR', governorId: 'victoria', cityId: 'c1' };
      const next = governorSystem(state, action);

      expect(next.governors.get('victoria')!.assignedCity).toBe('c1');
      expect(next.governors.get('magnus')!.assignedCity).toBeNull();
    });
  });

  describe('UNASSIGN_GOVERNOR', () => {
    it('unassigns a governor from a city', () => {
      const gov: Governor = {
        id: 'magnus', name: 'Magnus', title: 'administrator', specialization: 'economic',
        level: 1, experience: 0, experienceToNextLevel: 100, assignedCity: 'c1',
        abilities: [], promotions: [],
      };
      const state = createTestState({
        governors: new Map([['magnus', gov]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', governors: ['magnus'] })],
        ]),
      });
      const action: GameAction = { type: 'UNASSIGN_GOVERNOR', governorId: 'magnus' };
      const next = governorSystem(state, action);

      expect(next.governors.get('magnus')!.assignedCity).toBeNull();
    });

    it('ignores unassign for already unassigned governor', () => {
      const state = stateWithGovernor('magnus');
      const action: GameAction = { type: 'UNASSIGN_GOVERNOR', governorId: 'magnus' };
      const next = governorSystem(state, action);

      expect(next).toBe(state);
    });
  });

  describe('PROMOTE_GOVERNOR', () => {
    it('promotes a governor with a valid ability at sufficient level', () => {
      const gov: Governor = {
        id: 'magnus', name: 'Magnus', title: 'administrator', specialization: 'economic',
        level: 2, experience: 0, experienceToNextLevel: 200, assignedCity: null,
        abilities: [], promotions: [],
      };
      const state = createTestState({
        governors: new Map([['magnus', gov]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', governors: ['magnus'] })],
        ]),
      });
      const action: GameAction = { type: 'PROMOTE_GOVERNOR', governorId: 'magnus', abilityId: 'magnus_trade' };
      const next = governorSystem(state, action);

      expect(next.governors.get('magnus')!.promotions).toContain('magnus_trade');
      expect(next.governors.get('magnus')!.abilities.length).toBe(1);
    });

    it('rejects promotion if level is too low', () => {
      const gov: Governor = {
        id: 'magnus', name: 'Magnus', title: 'administrator', specialization: 'economic',
        level: 1, experience: 0, experienceToNextLevel: 100, assignedCity: null,
        abilities: [], promotions: [],
      };
      const state = createTestState({
        governors: new Map([['magnus', gov]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', governors: ['magnus'] })],
        ]),
      });
      // magnus_food requires level 3
      const action: GameAction = { type: 'PROMOTE_GOVERNOR', governorId: 'magnus', abilityId: 'magnus_food' };
      const next = governorSystem(state, action);

      expect(next).toBe(state);
    });

    it('rejects duplicate promotion', () => {
      const gov: Governor = {
        id: 'magnus', name: 'Magnus', title: 'administrator', specialization: 'economic',
        level: 2, experience: 0, experienceToNextLevel: 200, assignedCity: null,
        abilities: [], promotions: ['magnus_trade'],
      };
      const state = createTestState({
        governors: new Map([['magnus', gov]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', governors: ['magnus'] })],
        ]),
      });
      const action: GameAction = { type: 'PROMOTE_GOVERNOR', governorId: 'magnus', abilityId: 'magnus_trade' };
      const next = governorSystem(state, action);

      expect(next).toBe(state);
    });
  });

  describe('pass-through', () => {
    it('returns state unchanged for unrelated actions', () => {
      const state = createTestState();
      const action: GameAction = { type: 'START_TURN' };
      const next = governorSystem(state, action);

      expect(next).toBe(state);
    });
  });
});
