/**
 * FF4.2 — getResourceYieldForAge + getResourceHappinessForAge + getResourceBonusRow
 * Tests the per-age bonus table helper added as part of the Civ VII resource vocabulary migration.
 */
import { describe, it, expect } from 'vitest';
import {
  getResourceYieldForAge,
  getResourceHappinessForAge,
  getResourceBonusRow,
} from '../ResourceBonusUtils';
import { IRON, HORSES, SILK, WHEAT, NITER } from '../../data/resources/index';
import type { ResourceDef } from '../../types/Resource';
import { EMPTY_YIELDS } from '../../types/Yields';

// ── Vocabulary guard ───────────────────────────────────────────────────────

describe('FF4.1: Civ VII vocabulary — all resources use valid types', () => {
  const VALID_TYPES = ['bonus', 'city', 'empire', 'treasureFleet', 'factory'];
  it('IRON is empire', () => { expect(IRON.type).toBe('empire'); });
  it('HORSES is empire', () => { expect(HORSES.type).toBe('empire'); });
  it('SILK is city', () => { expect(SILK.type).toBe('city'); });
  it('WHEAT is bonus', () => { expect(WHEAT.type).toBe('bonus'); });
  it('every resource type is a valid VII category', async () => {
    const { ALL_RESOURCES } = await import('../../data/resources/index');
    for (const r of ALL_RESOURCES) {
      expect(VALID_TYPES).toContain(r.type);
    }
  });
});

// ── getResourceYieldForAge ─────────────────────────────────────────────────

describe('FF4.2: getResourceYieldForAge', () => {
  it('WHEAT antiquity → food: 1', () => {
    const y = getResourceYieldForAge(WHEAT, 'antiquity');
    expect(y.food).toBe(1);
  });

  it('WHEAT modern → food: 2', () => {
    const y = getResourceYieldForAge(WHEAT, 'modern');
    expect(y.food).toBe(2);
  });

  it('SILK antiquity → gold: 1', () => {
    const y = getResourceYieldForAge(SILK, 'antiquity');
    expect(y.gold).toBe(1);
  });

  it('SILK exploration → gold: 2', () => {
    const y = getResourceYieldForAge(SILK, 'exploration');
    expect(y.gold).toBe(2);
  });

  it('SILK modern → gold: 3', () => {
    const y = getResourceYieldForAge(SILK, 'modern');
    expect(y.gold).toBe(3);
  });

  it('IRON antiquity → no yield bonus (only combat mod)', () => {
    // IRON antiquity row has combatMod only, no yields field
    const y = getResourceYieldForAge(IRON, 'antiquity');
    expect(y.food).toBe(0);
    expect(y.production).toBe(0);
    expect(y.gold).toBe(0);
  });

  it('IRON modern → production: 2', () => {
    const y = getResourceYieldForAge(IRON, 'modern');
    expect(y.production).toBe(2);
  });

  it('HORSES modern → no yield bonus (only happiness)', () => {
    const y = getResourceYieldForAge(HORSES, 'modern');
    expect(y.food).toBe(0);
    expect(y.production).toBe(0);
    expect(y.gold).toBe(0);
  });

  it('resource with no bonusTable → returns EMPTY_YIELDS for any age', () => {
    const bareResource: ResourceDef = {
      id: 'test_bare',
      name: 'Test Bare',
      type: 'bonus',
      yieldBonus: {},
      validTerrains: [],
      happinessBonus: 0,
      // no bonusTable
    };
    const y = getResourceYieldForAge(bareResource, 'antiquity');
    expect(y).toEqual(EMPTY_YIELDS);
  });

  it('resource with bonusTable but missing the requested age → returns EMPTY_YIELDS', () => {
    const partialResource: ResourceDef = {
      id: 'test_partial',
      name: 'Test Partial',
      type: 'bonus',
      yieldBonus: {},
      validTerrains: [],
      happinessBonus: 0,
      bonusTable: {
        antiquity: { yields: { food: 3 } },
        // exploration and modern absent
      },
    };
    const y = getResourceYieldForAge(partialResource, 'modern');
    expect(y).toEqual(EMPTY_YIELDS);
  });
});

// ── getResourceHappinessForAge ─────────────────────────────────────────────

describe('FF4.2: getResourceHappinessForAge', () => {
  it('SILK antiquity → happiness: 2', () => {
    expect(getResourceHappinessForAge(SILK, 'antiquity')).toBe(2);
  });

  it('SILK exploration → happiness: 3', () => {
    expect(getResourceHappinessForAge(SILK, 'exploration')).toBe(3);
  });

  it('HORSES modern → happiness: 6', () => {
    expect(getResourceHappinessForAge(HORSES, 'modern')).toBe(6);
  });

  it('IRON antiquity → happiness: 0 (no happiness row)', () => {
    expect(getResourceHappinessForAge(IRON, 'antiquity')).toBe(0);
  });

  it('WHEAT antiquity → happiness: 0 (bonus resource, no happiness)', () => {
    expect(getResourceHappinessForAge(WHEAT, 'antiquity')).toBe(0);
  });
});

// ── getResourceBonusRow ────────────────────────────────────────────────────

describe('FF4.2: getResourceBonusRow', () => {
  it('HORSES exploration row has cavalry combatMod with versusCategory', () => {
    const row = getResourceBonusRow(HORSES, 'exploration');
    expect(row?.combatMod?.unitCategory).toBe('cavalry');
    expect(row?.combatMod?.versusCategory).toBe('infantry');
  });

  it('NITER exploration row has ranged combatMod +2', () => {
    const row = getResourceBonusRow(NITER, 'exploration');
    expect(row?.combatMod).toEqual({ unitCategory: 'ranged', value: 2 });
  });

  it('returns undefined when age is missing from bonusTable', () => {
    const resource: ResourceDef = {
      id: 'test_sparse',
      name: 'Sparse',
      type: 'empire',
      yieldBonus: {},
      validTerrains: [],
      happinessBonus: 0,
      bonusTable: { antiquity: { combatMod: { unitCategory: 'melee', value: 1 } } },
    };
    expect(getResourceBonusRow(resource, 'modern')).toBeUndefined();
  });
});
