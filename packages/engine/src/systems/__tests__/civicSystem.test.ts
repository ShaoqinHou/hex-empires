import { describe, it, expect } from 'vitest';
import { civicSystem } from '../civicSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
    population: 3, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey({ q: 3, r: 3 })],
    settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
    ...overrides,
  };
}

describe('civicSystem', () => {
  describe('SET_CIVIC', () => {
    it('sets current civic', () => {
      const state = createTestState();
      const next = civicSystem(state, { type: 'SET_CIVIC', civicId: 'code_of_laws' });
      expect(next.players.get('p1')!.currentCivic).toBe('code_of_laws');
      expect(next.players.get('p1')!.civicProgress).toBe(0);
    });

    it('rejects already-researched civic', () => {
      const player = createTestPlayer({ researchedCivics: ['code_of_laws'] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC', civicId: 'code_of_laws' });
      expect(next.players.get('p1')!.currentCivic).toBeNull();
    });

    it('rejects civic not in config', () => {
      const state = createTestState();
      const next = civicSystem(state, { type: 'SET_CIVIC', civicId: 'nonexistent_civic' });
      expect(next).toBe(state);
    });

    it('rejects civic from different age', () => {
      // Player is in antiquity, civic would need to be from a different age
      // All our test civics are antiquity, so let's test by putting player in exploration
      const player = createTestPlayer({ age: 'exploration' });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC', civicId: 'code_of_laws' });
      expect(next).toBe(state);
    });

    it('rejects civic with unmet prerequisites', () => {
      const state = createTestState();
      // craftsmanship requires code_of_laws
      const next = civicSystem(state, { type: 'SET_CIVIC', civicId: 'craftsmanship' });
      expect(next).toBe(state);
    });

    it('allows civic with met prerequisites', () => {
      const player = createTestPlayer({ researchedCivics: ['code_of_laws'] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC', civicId: 'craftsmanship' });
      expect(next.players.get('p1')!.currentCivic).toBe('craftsmanship');
    });
  });

  describe('END_TURN civic research', () => {
    it('accumulates civic progress from cities', () => {
      const player = createTestPlayer({ currentCivic: 'code_of_laws', civicProgress: 0 });
      const city = createTestCity();
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = civicSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.civicProgress).toBeGreaterThan(0);
    });

    it('completes civic when progress reaches cost', () => {
      const player = createTestPlayer({ currentCivic: 'code_of_laws', civicProgress: 24 });
      // city with monument (which gives culture) to push progress over the 25 cost
      const city = createTestCity({ buildings: ['monument'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = civicSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.researchedCivics).toContain('code_of_laws');
      expect(next.players.get('p1')!.currentCivic).toBeNull();
    });

    it('grants age progress on civic completion', () => {
      const player = createTestPlayer({ currentCivic: 'code_of_laws', civicProgress: 24, ageProgress: 0 });
      const city = createTestCity({ buildings: ['monument'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = civicSystem(state, { type: 'END_TURN' });
      if (next.players.get('p1')!.researchedCivics.includes('code_of_laws')) {
        expect(next.players.get('p1')!.ageProgress).toBe(5);
      }
    });

    it('does nothing without current civic', () => {
      const player = createTestPlayer({ currentCivic: null });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });

    it('does nothing without cities', () => {
      const player = createTestPlayer({ currentCivic: 'code_of_laws', civicProgress: 0 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map(),
      });
      const next = civicSystem(state, { type: 'END_TURN' });
      // No cities means no culture, so no progress
      expect(next).toBe(state);
    });

    it('adds log entry on civic completion', () => {
      const player = createTestPlayer({ currentCivic: 'code_of_laws', civicProgress: 24 });
      const city = createTestCity({ buildings: ['monument'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = civicSystem(state, { type: 'END_TURN' });
      if (next.players.get('p1')!.researchedCivics.includes('code_of_laws')) {
        expect(next.log.some(e => e.type === 'civic')).toBe(true);
      }
    });
  });

  it('ignores non-SET_CIVIC and non-END_TURN actions', () => {
    const state = createTestState();
    expect(civicSystem(state, { type: 'START_TURN' })).toBe(state);
  });

  describe('S3: civic mastery', () => {
    it('SET_CIVIC_MASTERY begins mastery for a researched civic', () => {
      const player = createTestPlayer({ researchedCivics: ['code_of_laws'], masteredCivics: [] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC_MASTERY', civicId: 'code_of_laws' });
      expect(next.players.get('p1')!.currentCivicMastery).toBe('code_of_laws');
      expect(next.players.get('p1')!.civicMasteryProgress).toBe(0);
    });

    it('rejects mastery for a civic not yet researched', () => {
      const player = createTestPlayer({ researchedCivics: [], masteredCivics: [] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC_MASTERY', civicId: 'code_of_laws' });
      expect(next).toBe(state);
    });

    it('rejects mastery for an already-mastered civic', () => {
      const player = createTestPlayer({ researchedCivics: ['code_of_laws'], masteredCivics: ['code_of_laws'] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC_MASTERY', civicId: 'code_of_laws' });
      expect(next).toBe(state);
    });

    it('rejects mastery when another civic mastery is already in progress', () => {
      const player = createTestPlayer({
        researchedCivics: ['code_of_laws', 'craftsmanship'],
        masteredCivics: [],
        currentCivicMastery: 'code_of_laws',
        civicMasteryProgress: 5,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC_MASTERY', civicId: 'craftsmanship' });
      expect(next.players.get('p1')!.currentCivicMastery).toBe('code_of_laws');
    });

    it('accumulates civic mastery progress on END_TURN', () => {
      const player = createTestPlayer({
        researchedCivics: ['code_of_laws'],
        masteredCivics: [],
        currentCivicMastery: 'code_of_laws',
        civicMasteryProgress: 0,
      });
      const city = createTestCity({ buildings: ['monument'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = civicSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.civicMasteryProgress).toBeGreaterThan(0);
    });

    it('completes civic mastery when progress reaches 80% of civic cost', () => {
      // code_of_laws costs 25. 80% = ceil(20) = 20.
      // culture/turn with monument: 1 (base) + 2 (monument) = 3. 18 + 3 = 21 >= 20 → complete.
      const player = createTestPlayer({
        researchedCivics: ['code_of_laws'],
        masteredCivics: [],
        currentCivicMastery: 'code_of_laws',
        civicMasteryProgress: 18,
      });
      const city = createTestCity({ buildings: ['monument'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = civicSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.masteredCivics).toContain('code_of_laws');
      expect(next.players.get('p1')!.currentCivicMastery).toBeNull();
      expect(next.players.get('p1')!.civicMasteryProgress).toBe(0);
    });

    it('grants +1 culture empire yield bonus on civic mastery completion', () => {
      const player = createTestPlayer({
        researchedCivics: ['code_of_laws'],
        masteredCivics: [],
        currentCivicMastery: 'code_of_laws',
        civicMasteryProgress: 18,
        legacyBonuses: [],
      });
      const city = createTestCity({ buildings: ['monument'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = civicSystem(state, { type: 'END_TURN' });
      const bonuses = next.players.get('p1')!.legacyBonuses;
      const masteryBonus = bonuses.find(b => b.source === 'civic_mastery:code_of_laws');
      expect(masteryBonus).toBeDefined();
      expect(masteryBonus!.effect.type).toBe('MODIFY_YIELD');
      if (masteryBonus!.effect.type === 'MODIFY_YIELD') {
        expect(masteryBonus!.effect.yield).toBe('culture');
        expect(masteryBonus!.effect.value).toBe(1);
        expect(masteryBonus!.effect.target).toBe('empire');
      }
    });

    it('logs a message on civic mastery completion', () => {
      const player = createTestPlayer({
        researchedCivics: ['code_of_laws'],
        masteredCivics: [],
        currentCivicMastery: 'code_of_laws',
        civicMasteryProgress: 18,
      });
      const city = createTestCity({ buildings: ['monument'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = civicSystem(state, { type: 'END_TURN' });
      const masteryLog = next.log.find(e => e.type === 'civic' && e.message.includes('Mastered'));
      expect(masteryLog).toBeDefined();
    });
  });
});
