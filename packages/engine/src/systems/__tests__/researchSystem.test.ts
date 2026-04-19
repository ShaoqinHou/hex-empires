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
    specialization: null, specialists: 0, districts: [],
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

    it('does NOT grant age progress on tech completion (F-11: +5 ageProgress retired)', () => {
      const player = createTestPlayer({ currentResearch: 'pottery', researchProgress: 24, ageProgress: 0 });
      const city = createTestCity({ population: 5 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      if (next.players.get('p1')!.researchedTechs.includes('pottery')) {
        // ageProgress must stay 0 — tech completion no longer grants +5
        expect(next.players.get('p1')!.ageProgress).toBe(0);
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

  describe('W3-08: per-tech mastery effects', () => {
    it('applies per-tech masteryEffect instead of generic +1 science when defined', () => {
      // Writing has masteryEffect: MODIFY_YIELD empire science +2, masteryCodexCount: 1
      // Mastery cost = ceil(50 * 0.8) = 40. Start at 39, pop=1 city => science=2, 39+2=41>=40 => complete.
      const player = createTestPlayer({
        researchedTechs: ['writing'],
        masteredTechs: [],
        currentMastery: 'writing',
        masteryProgress: 39,
        legacyBonuses: [],
      });
      const city = createTestCity({ population: 1 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      const bonuses = next.players.get('p1')!.legacyBonuses;
      const masteryBonus = bonuses.find(b => b.source === 'mastery:writing');
      expect(masteryBonus).toBeDefined();
      expect(masteryBonus!.effect.type).toBe('MODIFY_YIELD');
      if (masteryBonus!.effect.type === 'MODIFY_YIELD') {
        expect(masteryBonus!.effect.yield).toBe('science');
        expect(masteryBonus!.effect.value).toBe(2); // per-tech value, not generic 1
        expect(masteryBonus!.effect.target).toBe('empire');
      }
    });

    it('awards codices equal to masteryCodexCount on mastery completion', () => {
      // Writing masteryCodexCount: 1, cost 50, mastery = 40. Start at 39, pop=1, +2 science => done.
      const player = createTestPlayer({
        researchedTechs: ['writing'],
        masteredTechs: [],
        currentMastery: 'writing',
        masteryProgress: 39,
        ownedCodices: [],
      });
      const city = createTestCity({ population: 1 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      const codices = next.players.get('p1')!.ownedCodices ?? [];
      expect(codices).toHaveLength(1);
      expect(codices[0]).toMatch(/^codex-writing-0-/);
    });

    it('awards multiple codices when masteryCodexCount > 1', () => {
      // Mathematics masteryCodexCount: 2, cost 150, mastery = ceil(120) = 120.
      const player = createTestPlayer({
        researchedTechs: ['mathematics'],
        masteredTechs: [],
        currentMastery: 'mathematics',
        masteryProgress: 119,
        ownedCodices: [],
      });
      const city = createTestCity({ population: 1 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      const codices = next.players.get('p1')!.ownedCodices ?? [];
      expect(codices).toHaveLength(2);
    });

    it('awards zero codices for techs with masteryCodexCount: 0', () => {
      // Archery masteryCodexCount: 0. cost 50, mastery = 40. Start at 39, +2 => done.
      const player = createTestPlayer({
        researchedTechs: ['archery'],
        masteredTechs: [],
        currentMastery: 'archery',
        masteryProgress: 39,
        ownedCodices: [],
      });
      const city = createTestCity({ population: 1 });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      const codices = next.players.get('p1')!.ownedCodices ?? [];
      expect(codices).toHaveLength(0);
    });

    it('falls back to generic +1 science when tech has no masteryEffect', () => {
      // Pottery has no masteryEffect — should get fallback MODIFY_YIELD science +1
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
      if (masteryBonus!.effect.type === 'MODIFY_YIELD') {
        expect(masteryBonus!.effect.yield).toBe('science');
        expect(masteryBonus!.effect.value).toBe(1);
      }
    });
  });

  describe('W3-08: research progress preservation (F-06)', () => {
    it('preserves progress when switching research', () => {
      const player = createTestPlayer({
        currentResearch: 'pottery',
        researchProgress: 15,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'SET_RESEARCH', techId: 'writing' });
      const p = next.players.get('p1')!;
      expect(p.currentResearch).toBe('writing');
      // Saved progress for pottery
      expect(p.techProgressMap?.get('pottery')).toBe(15);
      // Writing starts fresh (not previously researched)
      expect(p.researchProgress).toBe(0);
    });

    it('restores saved progress when switching back to a previous tech', () => {
      const techMap = new Map<string, number>([['pottery', 15]]);
      const player = createTestPlayer({
        currentResearch: 'writing',
        researchProgress: 10,
        techProgressMap: techMap,
      });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'SET_RESEARCH', techId: 'pottery' });
      const p = next.players.get('p1')!;
      expect(p.currentResearch).toBe('pottery');
      expect(p.researchProgress).toBe(15); // restored
      // Writing's progress saved
      expect(p.techProgressMap?.get('writing')).toBe(10);
    });

    it('clears techProgressMap on TRANSITION_AGE', () => {
      const techMap = new Map<string, number>([['pottery', 15], ['writing', 10]]);
      const player = createTestPlayer({ techProgressMap: techMap });
      const state = createTestState({ players: new Map([['p1', player]]) });
      const next = researchSystem(state, { type: 'TRANSITION_AGE', newCivId: 'rome' });
      const p = next.players.get('p1')!;
      expect(p.techProgressMap?.size).toBe(0);
    });

    it('removes completed tech from techProgressMap', () => {
      // pottery costs 25. At 20 + 5 science = 25, complete.
      const techMap = new Map<string, number>([['pottery', 0]]);
      const player = createTestPlayer({
        currentResearch: 'pottery',
        researchProgress: 20,
        techProgressMap: techMap,
      });
      const city = createTestCity({ population: 4 }); // +4+1=5 science
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      const p = next.players.get('p1')!;
      expect(p.researchedTechs).toContain('pottery');
      expect(p.techProgressMap?.has('pottery')).toBe(false);
    });
  });

  describe('W3-08: PLACE_CODEX action', () => {
    it('places a codex in a building with available slots', () => {
      const player = createTestPlayer({
        ownedCodices: ['codex-writing-0-1'],
        codexPlacements: [],
      });
      const city = createTestCity({ buildings: ['library'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, {
        type: 'PLACE_CODEX',
        codexId: 'codex-writing-0-1',
        buildingId: 'library',
        cityId: 'c1',
      });
      const p = next.players.get('p1')!;
      expect(p.codexPlacements).toHaveLength(1);
      expect(p.codexPlacements![0].codexId).toBe('codex-writing-0-1');
      expect(p.codexPlacements![0].buildingId).toBe('library');
    });

    it('rejects PLACE_CODEX when player does not own the codex', () => {
      const player = createTestPlayer({
        ownedCodices: [],
        codexPlacements: [],
      });
      const city = createTestCity({ buildings: ['library'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, {
        type: 'PLACE_CODEX',
        codexId: 'codex-writing-0-1',
        buildingId: 'library',
        cityId: 'c1',
      });
      expect(next).toBe(state);
    });

    it('rejects PLACE_CODEX when building slot limit is full', () => {
      // Library has 2 codex slots — filling both then trying a 3rd
      const player = createTestPlayer({
        ownedCodices: ['codex-a', 'codex-b', 'codex-c'],
        codexPlacements: [
          { codexId: 'codex-a', buildingId: 'library', cityId: 'c1' },
          { codexId: 'codex-b', buildingId: 'library', cityId: 'c1' },
        ],
      });
      const city = createTestCity({ buildings: ['library'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, {
        type: 'PLACE_CODEX',
        codexId: 'codex-c',
        buildingId: 'library',
        cityId: 'c1',
      });
      expect(next).toBe(state);
    });

    it('rejects PLACE_CODEX when building has no codex slots', () => {
      const player = createTestPlayer({
        ownedCodices: ['codex-a'],
        codexPlacements: [],
      });
      // Granary has no codexSlots
      const city = createTestCity({ buildings: ['granary'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, {
        type: 'PLACE_CODEX',
        codexId: 'codex-a',
        buildingId: 'granary',
        cityId: 'c1',
      });
      expect(next).toBe(state);
    });

    it('codex placements contribute +2 science per turn in calculateSciencePerTurn', () => {
      // One codex in a Library. Science should include +2.
      const player = createTestPlayer({
        currentResearch: 'writing',
        researchProgress: 0,
        ownedCodices: ['codex-pottery-0-1'],
        codexPlacements: [{ codexId: 'codex-pottery-0-1', buildingId: 'library', cityId: 'c1' }],
      });
      // City with pop=1, Library. Base science = 1(min) + 1(pop) + 3(library yields) + 2(codex) = 7
      const city = createTestCity({ population: 1, buildings: ['library'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        cities: new Map([['c1', city]]),
      });
      const next = researchSystem(state, { type: 'END_TURN' });
      // researchProgress should be 7
      expect(next.players.get('p1')!.researchProgress).toBe(7);
    });
  });
});
