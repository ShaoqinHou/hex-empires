/**
 * Building stat parity tests — verify each corrected numeric field aligns with
 * civ7-rulebook.md §8 (Gap Analysis v3, item C6).
 *
 * Numeric-only stat corrections: cost, yields. No id/name/effect changes.
 */
import { describe, it, expect } from 'vitest';
import {
  GRANARY,
  MONUMENT,
  BARRACKS,
  LIBRARY,
  MARKET,
} from '../buildings/antiquity-buildings';
import {
  BANK,
  UNIVERSITY,
  ARMORY,
} from '../buildings/exploration-buildings';
import {
  FACTORY,
  RESEARCH_LAB,
} from '../buildings/modern-buildings';

describe('Building stat parity with rulebook §8', () => {
  describe('Antiquity', () => {
    it('Granary cost is 55 (rulebook §8, Warehouse table)', () => {
      expect(GRANARY.cost).toBe(55);
    });

    it('Granary yields +1 Food (rulebook §8, Warehouse table)', () => {
      expect(GRANARY.yields.food).toBe(1);
    });

    it('Monument cost is 90 (rulebook §8, Culture table)', () => {
      expect(MONUMENT.cost).toBe(90);
    });

    it('Barracks yields +2 Production (rulebook §8, Military/Production table)', () => {
      expect(BARRACKS.yields.production).toBe(2);
    });

    it('Library cost is 90 (rulebook §8, Science table)', () => {
      expect(LIBRARY.cost).toBe(90);
    });

    it('Market cost is 90 (rulebook §8, Gold table)', () => {
      expect(MARKET.cost).toBe(90);
    });

    it('Market yields +5 Gold (rulebook §8, Gold table)', () => {
      expect(MARKET.yields.gold).toBe(5);
    });
  });

  describe('Exploration', () => {
    it('Bank cost is 250 (rulebook §8, Gold table)', () => {
      expect(BANK.cost).toBe(250);
    });

    it('University yields +5 Science (rulebook §8, Science table)', () => {
      expect(UNIVERSITY.yields.science).toBe(5);
    });

    it('Armory (Armorer) cost is 200 (rulebook §8, Military/Production table)', () => {
      expect(ARMORY.cost).toBe(200);
    });

    it('Armory (Armorer) yields +4 Production (rulebook §8, Military/Production table)', () => {
      expect(ARMORY.yields.production).toBe(4);
    });
  });

  describe('Modern', () => {
    it('Factory cost is 600 (rulebook §8, Military/Production table)', () => {
      expect(FACTORY.cost).toBe(600);
    });

    it('Factory yields +12 Production (rulebook §8, Military/Production table)', () => {
      expect(FACTORY.yields.production).toBe(12);
    });

    it('Research Lab (Laboratory) cost is 650 (rulebook §8, Science table)', () => {
      expect(RESEARCH_LAB.cost).toBe(650);
    });
  });
});
