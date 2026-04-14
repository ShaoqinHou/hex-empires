import { describe, it, expect } from 'vitest';
import {
  ALL_FOUNDER_BELIEFS,
  ALL_FOLLOWER_BELIEFS,
  type FounderBeliefDef,
  type FollowerBeliefDef,
} from '../religion';
import type { EffectDef } from '../../types/GameState';

// Second data cycle for the Religion system. Founder beliefs apply
// globally to the founding civ; follower beliefs apply to every city
// that follows the religion regardless of owner. Bonuses reuse the
// existing `EffectDef` union — no new variants introduced.

const VALID_EFFECT_TYPES: ReadonlyArray<EffectDef['type']> = [
  'MODIFY_YIELD',
  'MODIFY_COMBAT',
  'GRANT_UNIT',
  'UNLOCK_BUILDING',
  'DISCOUNT_PRODUCTION',
  'MODIFY_MOVEMENT',
  'FREE_TECH',
  'CULTURE_BOMB',
];

const VALID_YIELD_TARGETS: ReadonlyArray<string> = ['city', 'empire', 'unit', 'tile'];
const VALID_COMBAT_TARGETS: ReadonlyArray<string> = [
  'melee',
  'ranged',
  'siege',
  'cavalry',
  'naval',
  'civilian',
  'religious',
  'all',
];

const EXPECTED_FOUNDER_COUNT = 10;
const EXPECTED_FOLLOWER_COUNT = 14;

describe('ALL_FOUNDER_BELIEFS catalogue', () => {
  it('exposes the expected number of founder beliefs', () => {
    expect(ALL_FOUNDER_BELIEFS.length).toBe(EXPECTED_FOUNDER_COUNT);
  });

  it('has all unique ids within the founder list', () => {
    const ids = ALL_FOUNDER_BELIEFS.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has all unique display names within the founder list', () => {
    const names = ALL_FOUNDER_BELIEFS.map(b => b.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('populates non-empty name and description on every entry', () => {
    for (const b of ALL_FOUNDER_BELIEFS) {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.description.length).toBeGreaterThan(0);
    }
  });

  it('has positive integer faithCost on every entry', () => {
    for (const b of ALL_FOUNDER_BELIEFS) {
      expect(b.faithCost).toBeGreaterThan(0);
      expect(Number.isInteger(b.faithCost)).toBe(true);
    }
  });

  it('uses only already-defined EffectDef variants for every bonus', () => {
    for (const b of ALL_FOUNDER_BELIEFS) {
      expect(VALID_EFFECT_TYPES).toContain(b.bonus.type);
    }
  });

  it('uses snake_case ids only', () => {
    for (const b of ALL_FOUNDER_BELIEFS) {
      expect(b.id).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('exposes the world_church founder belief with an influence bonus', () => {
    const wc = ALL_FOUNDER_BELIEFS.find(b => b.id === 'world_church');
    expect(wc).toBeDefined();
    const bonus = (wc as FounderBeliefDef).bonus;
    expect(bonus.type).toBe('MODIFY_YIELD');
    if (bonus.type === 'MODIFY_YIELD') {
      expect(bonus.yield).toBe('influence');
      expect(bonus.value).toBe(2);
    }
  });

  it('exposes the lay_ministry founder belief with a faith bonus', () => {
    const lm = ALL_FOUNDER_BELIEFS.find(b => b.id === 'lay_ministry');
    expect(lm).toBeDefined();
    const bonus = (lm as FounderBeliefDef).bonus;
    expect(bonus.type).toBe('MODIFY_YIELD');
    if (bonus.type === 'MODIFY_YIELD') {
      expect(bonus.yield).toBe('faith');
      expect(bonus.target).toBe('city');
    }
  });

  it('exposes the tithe founder belief with a gold bonus', () => {
    const tithe = ALL_FOUNDER_BELIEFS.find(b => b.id === 'tithe');
    expect(tithe).toBeDefined();
    const bonus = (tithe as FounderBeliefDef).bonus;
    expect(bonus.type).toBe('MODIFY_YIELD');
    if (bonus.type === 'MODIFY_YIELD') {
      expect(bonus.yield).toBe('gold');
    }
  });

  it('has valid shape on every MODIFY_YIELD bonus', () => {
    for (const b of ALL_FOUNDER_BELIEFS) {
      if (b.bonus.type === 'MODIFY_YIELD') {
        expect(VALID_YIELD_TARGETS).toContain(b.bonus.target);
        expect(b.bonus.value).toBeGreaterThan(0);
      }
    }
  });
});

describe('ALL_FOLLOWER_BELIEFS catalogue', () => {
  it('exposes the expected number of follower beliefs', () => {
    expect(ALL_FOLLOWER_BELIEFS.length).toBe(EXPECTED_FOLLOWER_COUNT);
  });

  it('has all unique ids within the follower list', () => {
    const ids = ALL_FOLLOWER_BELIEFS.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has all unique display names within the follower list', () => {
    const names = ALL_FOLLOWER_BELIEFS.map(b => b.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('populates non-empty name and description on every entry', () => {
    for (const b of ALL_FOLLOWER_BELIEFS) {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.description.length).toBeGreaterThan(0);
    }
  });

  it('has positive integer faithCost on every entry', () => {
    for (const b of ALL_FOLLOWER_BELIEFS) {
      expect(b.faithCost).toBeGreaterThan(0);
      expect(Number.isInteger(b.faithCost)).toBe(true);
    }
  });

  it('uses only already-defined EffectDef variants for every bonus', () => {
    for (const b of ALL_FOLLOWER_BELIEFS) {
      expect(VALID_EFFECT_TYPES).toContain(b.bonus.type);
    }
  });

  it('uses snake_case ids only', () => {
    for (const b of ALL_FOLLOWER_BELIEFS) {
      expect(b.id).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('covers multiple EffectDef variants across the follower catalogue', () => {
    const variants = new Set(ALL_FOLLOWER_BELIEFS.map(b => b.bonus.type));
    expect(variants.size).toBeGreaterThanOrEqual(2);
  });

  it('includes at least one combat-modifier follower belief', () => {
    const combat = ALL_FOLLOWER_BELIEFS.filter(b => b.bonus.type === 'MODIFY_COMBAT');
    expect(combat.length).toBeGreaterThan(0);
  });

  it('exposes the jesuit_education follower belief with a science bonus', () => {
    const je = ALL_FOLLOWER_BELIEFS.find(b => b.id === 'jesuit_education');
    expect(je).toBeDefined();
    const bonus = (je as FollowerBeliefDef).bonus;
    expect(bonus.type).toBe('MODIFY_YIELD');
    if (bonus.type === 'MODIFY_YIELD') {
      expect(bonus.yield).toBe('science');
      expect(bonus.target).toBe('city');
    }
  });

  it('exposes the choral_music follower belief with a culture bonus', () => {
    const cm = ALL_FOLLOWER_BELIEFS.find(b => b.id === 'choral_music');
    expect(cm).toBeDefined();
    const bonus = (cm as FollowerBeliefDef).bonus;
    expect(bonus.type).toBe('MODIFY_YIELD');
    if (bonus.type === 'MODIFY_YIELD') {
      expect(bonus.yield).toBe('culture');
      expect(bonus.value).toBe(2);
    }
  });

  it('exposes the religious_settlements follower belief with a food bonus', () => {
    const rs = ALL_FOLLOWER_BELIEFS.find(b => b.id === 'religious_settlements');
    expect(rs).toBeDefined();
    const bonus = (rs as FollowerBeliefDef).bonus;
    expect(bonus.type).toBe('MODIFY_YIELD');
    if (bonus.type === 'MODIFY_YIELD') {
      expect(bonus.yield).toBe('food');
    }
  });

  it('has valid shape on every MODIFY_COMBAT bonus', () => {
    for (const b of ALL_FOLLOWER_BELIEFS) {
      if (b.bonus.type === 'MODIFY_COMBAT') {
        expect(VALID_COMBAT_TARGETS).toContain(b.bonus.target);
        expect(b.bonus.value).toBeGreaterThan(0);
      }
    }
  });
});

describe('cross-catalogue invariants', () => {
  it('has no id collisions between founder and follower beliefs', () => {
    const founderIds = new Set(ALL_FOUNDER_BELIEFS.map(b => b.id));
    for (const f of ALL_FOLLOWER_BELIEFS) {
      expect(founderIds.has(f.id)).toBe(false);
    }
  });

  it('has no id collisions across the combined belief list', () => {
    const allIds = [
      ...ALL_FOUNDER_BELIEFS.map(b => b.id),
      ...ALL_FOLLOWER_BELIEFS.map(b => b.id),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('has no display-name collisions across the combined belief list', () => {
    const allNames = [
      ...ALL_FOUNDER_BELIEFS.map(b => b.name),
      ...ALL_FOLLOWER_BELIEFS.map(b => b.name),
    ];
    expect(new Set(allNames).size).toBe(allNames.length);
  });

  it('keeps every faithCost within a balance band (50..200)', () => {
    for (const b of [...ALL_FOUNDER_BELIEFS, ...ALL_FOLLOWER_BELIEFS]) {
      expect(b.faithCost).toBeGreaterThanOrEqual(50);
      expect(b.faithCost).toBeLessThanOrEqual(200);
    }
  });
});
