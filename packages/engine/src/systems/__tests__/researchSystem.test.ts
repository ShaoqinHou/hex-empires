import { describe, it, expect } from 'vitest';
import { researchSystem } from '../researchSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
    population: 3, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey({ q: 3, r: 3 })],
    settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
    specialists: 0,
    ...overrides,
  };
}

describe('researchSystem', () => {
  describe('SET_RESEARCH', () => {
    it('sets current research', () => {
      const state = createTestState();
      const next = researchSystem(state, { type: 'SET_RESEARCH', techId: 'pottery' });
      expect(next.players.get('p1')!.currentResearch).toBe('pottery');
      expect(next.players.get('p1')!.researchProgress).toBe(0);
    });

    it('rejects already-researched tech', () => {
      const player = createTestPlayer({ researchedTechs: ['pottery'] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'SET_RESEARCH', techId: 'pottery' });
      expect(next.players.get('p1')!.currentResearch).toBeNull();
    });

    it('rejects researching a tech from a different age', () => {
      // Player is in antiquity, trying to research an exploration tech
      const player = createTestPlayer({ age: 'antiquity' });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'SET_RESEARCH', techId: 'gunpowder' });
      expect(next.players.get('p1')!.currentResearch).toBeNull();
      expect(next).toBe(state); // state unchanged
    });

    it('allows researching a tech from the current age', () => {
      const player = createTestPlayer({ age: 'exploration' });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'SET_RESEARCH', techId: 'gunpowder' });
      expect(next.players.get('p1')!.currentResearch).toBe('gunpowder');
    });
  });

  describe('END_TURN research', () => {
    it('accumulates research progress', () => {
      const player = createTestPlayer({ currentResearch: 'pottery', researchProgress: 0 });
      const city = createTestCity();
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      // sciencePerTurn: base 1 (player.science=0) + city.population(3) = 4
      expect(next.players.get('p1')!.researchProgress).toBe(4);
    });

    it('completes research when progress reaches cost', () => {
      const player = createTestPlayer({ currentResearch: 'pottery', researchProgress: 24 });
      const city = createTestCity({ population: 5 }); // enough science to complete
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.researchedTechs).toContain('pottery');
      expect(next.players.get('p1')!.currentResearch).toBeNull();
    });

    it('grants age progress on tech completion', () => {
      const player = createTestPlayer({ currentResearch: 'pottery', researchProgress: 24, ageProgress: 0 });
      const city = createTestCity({ population: 5 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      if (next.players.get('p1')!.researchedTechs.includes('pottery')) {
        expect(next.players.get('p1')!.ageProgress).toBe(5);
      }
    });

    it('does nothing without current research', () => {
      const player = createTestPlayer({ currentResearch: null });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state);
    });

    it('S2: carries overflow science to next research on completion', () => {
      // Pottery costs 25. Player at 20 progress.
      // sciencePerTurn = 1 (base min, science=0) + population.
      // Population 10 → sciencePerTurn = 1 + 10 = 11. 20 + 11 = 31 >= 25 → completes, overflow = 6.
      const player = createTestPlayer({ currentResearch: 'pottery', researchProgress: 20 });
      const city = createTestCity({ population: 10 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.researchedTechs).toContain('pottery');
      expect(next.players.get('p1')!.currentResearch).toBeNull();
      // Overflow: 31 - 25 = 6 should carry to researchProgress
      expect(next.players.get('p1')!.researchProgress).toBe(6);
    });

    it('S2: no overflow when research completes exactly at cost', () => {
      // Pottery costs 25. 20 progress. sciencePerTurn = 1 (min) + pop.
      // pop=4 → 1 + 4 = 5. 20 + 5 = 25 = cost → overflow = 0.
      const player = createTestPlayer({ currentResearch: 'pottery', researchProgress: 20 });
      const city = createTestCity({ population: 4 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.researchedTechs).toContain('pottery');
      expect(next.players.get('p1')!.researchProgress).toBe(0);
    });
  });

  describe('SET_MASTERY', () => {
    it('begins mastery for a researched tech', () => {
      const player = createTestPlayer({ researchedTechs: ['pottery'], masteredTechs: [] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'SET_MASTERY', techId: 'pottery' });
      expect(next.players.get('p1')!.currentMastery).toBe('pottery');
      expect(next.players.get('p1')!.masteryProgress).toBe(0);
    });

    it('rejects mastery for a tech not yet researched', () => {
      const player = createTestPlayer({ researchedTechs: [], masteredTechs: [] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'SET_MASTERY', techId: 'pottery' });
      expect(next).toBe(state);
      expect(next.players.get('p1')!.currentMastery).toBeNull();
    });

    it('rejects mastery for a tech already mastered', () => {
      const player = createTestPlayer({ researchedTechs: ['pottery'], masteredTechs: ['pottery'] });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'SET_MASTERY', techId: 'pottery' });
      expect(next).toBe(state);
      expect(next.players.get('p1')!.currentMastery).toBeNull();
    });

    it('rejects mastery when another mastery is already in progress', () => {
      const player = createTestPlayer({
        researchedTechs: ['pottery', 'mining'],
        masteredTechs: [],
        currentMastery: 'mining',
        masteryProgress: 5,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'SET_MASTERY', techId: 'pottery' });
      // Should not change existing mastery
      expect(next.players.get('p1')!.currentMastery).toBe('mining');
    });
  });

  describe('END_TURN mastery', () => {
    it('accumulates mastery progress each turn', () => {
      const player = createTestPlayer({
        researchedTechs: ['pottery'],
        masteredTechs: [],
        currentMastery: 'pottery',
        masteryProgress: 0,
      });
      const city = createTestCity({ population: 3 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.masteryProgress).toBeGreaterThan(0);
    });

    it('mastery costs 80% of the original tech cost', () => {
      // Pottery costs 25. 80% = ceil(20) = 20. Player needs masteryProgress >= 20 to complete.
      // sciencePerTurn with science=0 and pop=1 = 1 (min) + 1 (pop) = 2.
      // Set progress to 17 so 17 + 2 = 19 < 20 — mastery does NOT complete this turn.
      const player = createTestPlayer({
        researchedTechs: ['pottery'],
        masteredTechs: [],
        currentMastery: 'pottery',
        masteryProgress: 17,
      });
      const city = createTestCity({ population: 1 }); // 2 science per turn total
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      // 17 + 2 science = 19, still < 20 mastery cost
      expect(next.players.get('p1')!.currentMastery).toBe('pottery');
      expect(next.players.get('p1')!.masteryProgress).toBe(19);
      expect(next.players.get('p1')!.masteredTechs).toEqual([]);
    });

    it('completes mastery when progress reaches 80% of tech cost', () => {
      // Pottery costs 25. 80% = ceil(20) = 20.
      // Start at 19, add 1 science → 20 >= 20 → complete
      const player = createTestPlayer({
        researchedTechs: ['pottery'],
        masteredTechs: [],
        currentMastery: 'pottery',
        masteryProgress: 19,
      });
      const city = createTestCity({ population: 1 }); // 1 science per turn
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.masteredTechs).toContain('pottery');
      expect(next.players.get('p1')!.currentMastery).toBeNull();
      expect(next.players.get('p1')!.masteryProgress).toBe(0);
    });

    it('grants +1 science empire yield bonus on mastery completion', () => {
      const player = createTestPlayer({
        researchedTechs: ['pottery'],
        masteredTechs: [],
        currentMastery: 'pottery',
        masteryProgress: 19,
        legacyBonuses: [],
      });
      const city = createTestCity({ population: 1 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      const bonuses = next.players.get('p1')!.legacyBonuses;
      const masteryBonus = bonuses.find(b => b.source === 'mastery:pottery');
      expect(masteryBonus).toBeDefined();
      expect(masteryBonus!.effect.type).toBe('MODIFY_YIELD');
      if (masteryBonus!.effect.type === 'MODIFY_YIELD') {
        expect(masteryBonus!.effect.yield).toBe('science');
        expect(masteryBonus!.effect.value).toBe(1);
        expect(masteryBonus!.effect.target).toBe('empire');
      }
    });

    it('logs a message on mastery completion', () => {
      const player = createTestPlayer({
        researchedTechs: ['pottery'],
        masteredTechs: [],
        currentMastery: 'pottery',
        masteryProgress: 19,
      });
      const city = createTestCity({ population: 1 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      const masteryLog = next.log.find(e => e.type === 'research' && e.message.includes('Mastered'));
      expect(masteryLog).toBeDefined();
    });

    it('does not progress mastery when no mastery is set', () => {
      const player = createTestPlayer({
        researchedTechs: ['pottery'],
        masteredTechs: [],
        currentMastery: null,
        masteryProgress: 0,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'END_TURN' });
      expect(next.players.get('p1')!.masteryProgress).toBe(0);
      expect(next.players.get('p1')!.masteredTechs).toEqual([]);
    });
  });
});
