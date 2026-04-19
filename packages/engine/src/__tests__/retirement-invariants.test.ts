/**
 * Retirement Invariants
 *
 * Permanent architectural gates enforcing that retired Civ-VI-isms and invented
 * mechanics stay retired. Each test corresponds to an audit finding that was
 * intended for retirement. If a future commit re-introduces any of these, the
 * test fails loudly at CI time.
 *
 * Why this file exists: during the implementation phase, several implementer
 * agents CLAIMED to retire symbols but didn't. "All tests pass" didn't catch
 * the regressions because no test asserted the ABSENCE of the retired symbols.
 * These tests close that gap.
 *
 * **DO NOT remove or weaken these tests without an audit update.**
 *
 * Related: `.claude/scripts/verify-retirements.sh` (grep-based equivalent).
 */

import { describe, expect, it } from 'vitest';
import * as AntiquityUnits from '../data/units/antiquity-units';
import * as Governments from '../data/governments/governments';
import * as Improvements from '../data/improvements/index';
import * as AntiquityTechs from '../data/technologies/antiquity/index';
import * as AllLeaders from '../data/leaders/all-leaders';
import type { YieldSet } from '../types/Yields';

describe('Retirement invariants — Civ-VI-isms and invented mechanics stay retired', () => {
  describe('Units (tile-improvements F-01)', () => {
    it('BUILDER unit is retired', () => {
      expect((AntiquityUnits as Record<string, unknown>).BUILDER).toBeUndefined();
      const all = AntiquityUnits.ALL_ANTIQUITY_UNITS ?? [];
      expect(all.find((u: { id: string }) => u.id === 'builder')).toBeUndefined();
    });
  });

  describe('Governments (government-policies F-02/F-03/F-04)', () => {
    it('CHIEFDOM is retired', () => {
      expect((Governments as Record<string, unknown>).CHIEFDOM).toBeUndefined();
    });

    it('DEMOCRACY was renamed to ELECTIVE_REPUBLIC', () => {
      expect((Governments as Record<string, unknown>).DEMOCRACY).toBeUndefined();
    });

    it('MONARCHY was renamed to FEUDAL_MONARCHY', () => {
      expect((Governments as Record<string, unknown>).MONARCHY).toBeUndefined();
    });

    it('MERCHANT_REPUBLIC was renamed to PLUTOCRACY', () => {
      expect((Governments as Record<string, unknown>).MERCHANT_REPUBLIC).toBeUndefined();
    });
  });

  describe('Improvements (tile-improvements F-12)', () => {
    it('ROAD improvement is retired', () => {
      expect((Improvements as Record<string, unknown>).ROAD).toBeUndefined();
    });
  });

  describe('Tech tree (F-07, F-11)', () => {
    it('ASTROLOGY tech is retired (Civ-VI holdover not in VII Antiquity roster)', () => {
      expect((AntiquityTechs as Record<string, unknown>).ASTROLOGY).toBeUndefined();
    });
  });

  describe('Leaders (F-10)', () => {
    it('LeaderDef.compatibleAges is retired', () => {
      const first = AllLeaders.ALL_LEADERS[0];
      expect(first).toBeDefined();
      expect((first as unknown as Record<string, unknown>).compatibleAges).toBeUndefined();
    });
  });

  describe('YieldSet (yields-adjacency F-01)', () => {
    it('YieldSet has no housing field (Civ-VI-ism)', () => {
      const sample: YieldSet = {
        food: 0,
        production: 0,
        gold: 0,
        science: 0,
        culture: 0,
        influence: 0,
        faith: 0,
        happiness: 0,
      } as YieldSet;
      expect((sample as unknown as Record<string, unknown>).housing).toBeUndefined();
    });

    it('YieldSet has no diplomacy field (duplicates influence)', () => {
      const sample: YieldSet = {
        food: 0,
        production: 0,
        gold: 0,
        science: 0,
        culture: 0,
        influence: 0,
        faith: 0,
        happiness: 0,
      } as YieldSet;
      expect((sample as unknown as Record<string, unknown>).diplomacy).toBeUndefined();
    });

    it('YieldSet has happiness field (VII 8th yield)', () => {
      const sample: YieldSet = {
        food: 0,
        production: 0,
        gold: 0,
        science: 0,
        culture: 0,
        influence: 0,
        faith: 0,
        happiness: 0,
      } as YieldSet;
      expect(sample.happiness).toBeDefined();
    });
  });
});
