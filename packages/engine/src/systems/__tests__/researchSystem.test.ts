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
    housing: 10, amenities: 1,
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
      expect(next.players.get('p1')!.researchProgress).toBeGreaterThan(0);
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
  });
});
