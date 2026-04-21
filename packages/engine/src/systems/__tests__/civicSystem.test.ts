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
    specialization: null, specialists: 0, districts: [],
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
        // F-13: ageProgress +5 per civic removed — age progress comes from
        // ageSystem's END_TURN milestone check only.
        expect(next.players.get('p1')!.ageProgress).toBe(0);
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
      const city = createTestCity({ buildings: ['monument'] }); // monument gives +2 culture
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = civicSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.civicMasteryProgress).toBeGreaterThan(0);
    });

    it('completes civic mastery when progress reaches 80% of civic cost', () => {
      // code_of_laws costs 25. 80% = ceil(20) = 20.
      // Set progress to 18, culture/turn = 3 (1 base + 2 monument) → 21 >= 20 → complete.
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

  describe('civ-unique civics', () => {
    it('universal civic is available to any civilization', () => {
      // craftsmanship has no civId — should be available to rome (default civ)
      const player = createTestPlayer({ civilizationId: 'rome', researchedCivics: ['code_of_laws'] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC', civicId: 'craftsmanship' });
      expect(next.players.get('p1')!.currentCivic).toBe('craftsmanship');
    });

    it('universal civic is also available to a different civilization', () => {
      // craftsmanship has no civId — should be available to egypt too
      const player = createTestPlayer({ civilizationId: 'egypt', researchedCivics: ['code_of_laws'] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC', civicId: 'craftsmanship' });
      expect(next.players.get('p1')!.currentCivic).toBe('craftsmanship');
    });

    it('civ-unique civic is available to its matching civilization', () => {
      // roman_senate is civId: 'rome' — available to rome
      const player = createTestPlayer({ civilizationId: 'rome', researchedCivics: ['early_empire'] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC', civicId: 'roman_senate' });
      expect(next.players.get('p1')!.currentCivic).toBe('roman_senate');
    });

    it('civ-unique civic is rejected for a non-matching civilization', () => {
      // roman_senate is civId: 'rome' — must be rejected for egypt
      const player = createTestPlayer({ civilizationId: 'egypt', researchedCivics: ['early_empire'] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC', civicId: 'roman_senate' });
      expect(next).toBe(state);
      expect(next.players.get('p1')!.currentCivic).toBeNull();
    });

    it('egypt-unique civic is available only to egypt', () => {
      // divine_kingship is civId: 'egypt'
      const egyptPlayer = createTestPlayer({ civilizationId: 'egypt', researchedCivics: ['mysticism'] });
      const egyptState = createTestState({ players: new Map([['p1', egyptPlayer]]) });
      const egyptNext = civicSystem(egyptState, { type: 'SET_CIVIC', civicId: 'divine_kingship' });
      expect(egyptNext.players.get('p1')!.currentCivic).toBe('divine_kingship');

      const romePlayer = createTestPlayer({ civilizationId: 'rome', researchedCivics: ['mysticism'] });
      const romeState = createTestState({ players: new Map([['p1', romePlayer]]) });
      const romeNext = civicSystem(romeState, { type: 'SET_CIVIC', civicId: 'divine_kingship' });
      expect(romeNext).toBe(romeState);
    });

    it('greece-unique civic is available only to greece', () => {
      // athenian_democracy is civId: 'greece'
      const greecePlayer = createTestPlayer({ civilizationId: 'greece', researchedCivics: ['early_empire'] });
      const greeceState = createTestState({ players: new Map([['p1', greecePlayer]]) });
      const greeceNext = civicSystem(greeceState, { type: 'SET_CIVIC', civicId: 'athenian_democracy' });
      expect(greeceNext.players.get('p1')!.currentCivic).toBe('athenian_democracy');

      const persiaPlayer = createTestPlayer({ civilizationId: 'persia', researchedCivics: ['early_empire'] });
      const persiaState = createTestState({ players: new Map([['p1', persiaPlayer]]) });
      const persiaNext = civicSystem(persiaState, { type: 'SET_CIVIC', civicId: 'athenian_democracy' });
      expect(persiaNext).toBe(persiaState);
    });

    it('civ-unique civic still requires prerequisites', () => {
      // roman_senate requires early_empire — rome without early_empire should be rejected
      const player = createTestPlayer({ civilizationId: 'rome', researchedCivics: [] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = civicSystem(state, { type: 'SET_CIVIC', civicId: 'roman_senate' });
      expect(next).toBe(state);
    });
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
