import { describe, it, expect } from 'vitest';
import {
  ALL_PANTHEONS,
  ALL_FOUNDER_BELIEFS,
  ALL_FOLLOWER_BELIEFS,
  type FounderBeliefDef,
  type FollowerBeliefDef,
} from '../religion';
import type { EffectDef } from '../../types/GameState';

// Expansion cycle — adds additional pantheons, founder beliefs, and
// follower beliefs on top of the M9 baseline. All new entries reuse
// existing `EffectDef` variants; no type or system changes.

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

// ── Baseline (M9) + expansion counts ──────────────────────────────
// Pantheons: 11 baseline + 5 expansion = 16
// Founder:    7 baseline + 3 expansion = 10
// Follower:  10 baseline + 4 expansion = 14

const NEW_PANTHEON_IDS = [
  'god_of_the_dead',
  'goddess_of_love',
  'god_of_writing',
  'goddess_of_the_dawn',
  'goddess_of_the_wild',
] as const;

const NEW_FOUNDER_BELIEF_IDS = [
  'crusade',
  'missionary_zeal',
  'defender_of_the_faith',
] as const;

const NEW_FOLLOWER_BELIEF_IDS = [
  'monasteries',
  'pilgrim_roads',
  'religious_community',
  'tithed_harvest',
] as const;

describe('Religion expansion — counts', () => {
  it('ALL_PANTHEONS has exactly 16 entries (11 baseline + 5 expansion)', () => {
    expect(ALL_PANTHEONS.length).toBe(16);
  });

  it('ALL_FOUNDER_BELIEFS has exactly 10 entries (7 baseline + 3 expansion)', () => {
    expect(ALL_FOUNDER_BELIEFS.length).toBe(10);
  });

  it('ALL_FOLLOWER_BELIEFS has exactly 14 entries (10 baseline + 4 expansion)', () => {
    expect(ALL_FOLLOWER_BELIEFS.length).toBe(14);
  });
});

describe('Religion expansion — unique ids across each catalogue', () => {
  it('every pantheon id is unique within ALL_PANTHEONS', () => {
    const ids = ALL_PANTHEONS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every founder-belief id is unique within ALL_FOUNDER_BELIEFS', () => {
    const ids = ALL_FOUNDER_BELIEFS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every follower-belief id is unique within ALL_FOLLOWER_BELIEFS', () => {
    const ids = ALL_FOLLOWER_BELIEFS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Religion expansion — new ids are present', () => {
  it('ALL_PANTHEONS contains every new pantheon id', () => {
    const ids = new Set(ALL_PANTHEONS.map((p) => p.id));
    for (const newId of NEW_PANTHEON_IDS) {
      expect(ids.has(newId)).toBe(true);
    }
  });

  it('ALL_FOUNDER_BELIEFS contains every new founder-belief id', () => {
    const ids = new Set(ALL_FOUNDER_BELIEFS.map((b) => b.id));
    for (const newId of NEW_FOUNDER_BELIEF_IDS) {
      expect(ids.has(newId)).toBe(true);
    }
  });

  it('ALL_FOLLOWER_BELIEFS contains every new follower-belief id', () => {
    const ids = new Set(ALL_FOLLOWER_BELIEFS.map((b) => b.id));
    for (const newId of NEW_FOLLOWER_BELIEF_IDS) {
      expect(ids.has(newId)).toBe(true);
    }
  });
});

describe('Religion expansion — EffectDef discriminator is valid', () => {
  it('every new pantheon bonus uses a known EffectDef discriminator', () => {
    const newPantheons = ALL_PANTHEONS.filter((p) =>
      (NEW_PANTHEON_IDS as ReadonlyArray<string>).includes(p.id),
    );
    expect(newPantheons.length).toBe(NEW_PANTHEON_IDS.length);
    for (const p of newPantheons) {
      expect(VALID_EFFECT_TYPES).toContain(p.bonus.type);
    }
  });

  it('every new founder belief bonus uses a known EffectDef discriminator', () => {
    const newBeliefs = ALL_FOUNDER_BELIEFS.filter((b) =>
      (NEW_FOUNDER_BELIEF_IDS as ReadonlyArray<string>).includes(b.id),
    );
    expect(newBeliefs.length).toBe(NEW_FOUNDER_BELIEF_IDS.length);
    for (const b of newBeliefs) {
      expect(VALID_EFFECT_TYPES).toContain(b.bonus.type);
    }
  });

  it('every new follower belief bonus uses a known EffectDef discriminator', () => {
    const newBeliefs = ALL_FOLLOWER_BELIEFS.filter((b) =>
      (NEW_FOLLOWER_BELIEF_IDS as ReadonlyArray<string>).includes(b.id),
    );
    expect(newBeliefs.length).toBe(NEW_FOLLOWER_BELIEF_IDS.length);
    for (const b of newBeliefs) {
      expect(VALID_EFFECT_TYPES).toContain(b.bonus.type);
    }
  });
});

describe('Religion expansion — faithCost is a positive finite number', () => {
  it('every new pantheon has a positive finite faithCost', () => {
    const newPantheons = ALL_PANTHEONS.filter((p) =>
      (NEW_PANTHEON_IDS as ReadonlyArray<string>).includes(p.id),
    );
    for (const p of newPantheons) {
      expect(Number.isFinite(p.faithCost)).toBe(true);
      expect(p.faithCost).toBeGreaterThan(0);
    }
  });

  it('every new founder belief has a positive finite faithCost', () => {
    const newBeliefs = ALL_FOUNDER_BELIEFS.filter((b) =>
      (NEW_FOUNDER_BELIEF_IDS as ReadonlyArray<string>).includes(b.id),
    );
    for (const b of newBeliefs) {
      expect(Number.isFinite(b.faithCost)).toBe(true);
      expect(b.faithCost).toBeGreaterThan(0);
    }
  });

  it('every new follower belief has a positive finite faithCost', () => {
    const newBeliefs = ALL_FOLLOWER_BELIEFS.filter((b) =>
      (NEW_FOLLOWER_BELIEF_IDS as ReadonlyArray<string>).includes(b.id),
    );
    for (const b of newBeliefs) {
      expect(Number.isFinite(b.faithCost)).toBe(true);
      expect(b.faithCost).toBeGreaterThan(0);
    }
  });
});

describe('Religion expansion — named lookups for new entries', () => {
  it('looks up the God of the Dead pantheon with an empire faith bonus', () => {
    const p = ALL_PANTHEONS.find((x) => x.id === 'god_of_the_dead');
    expect(p).toBeDefined();
    expect(p!.name).toBe('God of the Dead');
    expect(p!.bonus).toEqual({
      type: 'MODIFY_YIELD',
      target: 'empire',
      yield: 'faith',
      value: 1,
    });
  });

  it('looks up the Goddess of Love pantheon with a city culture bonus', () => {
    const p = ALL_PANTHEONS.find((x) => x.id === 'goddess_of_love');
    expect(p).toBeDefined();
    expect(p!.bonus).toEqual({
      type: 'MODIFY_YIELD',
      target: 'city',
      yield: 'culture',
      value: 1,
    });
  });

  it('looks up the Crusade founder belief with a +3 melee combat bonus', () => {
    const b: FounderBeliefDef | undefined = ALL_FOUNDER_BELIEFS.find(
      (x) => x.id === 'crusade',
    );
    expect(b).toBeDefined();
    expect(b!.name).toBe('Crusade');
    expect(b!.bonus).toEqual({ type: 'MODIFY_COMBAT', target: 'melee', value: 3 });
  });

  it('looks up the Missionary Zeal founder belief with an empire faith bonus', () => {
    const b = ALL_FOUNDER_BELIEFS.find((x) => x.id === 'missionary_zeal');
    expect(b).toBeDefined();
    expect(b!.bonus).toEqual({
      type: 'MODIFY_YIELD',
      target: 'empire',
      yield: 'faith',
      value: 2,
    });
  });

  it('looks up the Monasteries follower belief with a city science bonus', () => {
    const b: FollowerBeliefDef | undefined = ALL_FOLLOWER_BELIEFS.find(
      (x) => x.id === 'monasteries',
    );
    expect(b).toBeDefined();
    expect(b!.name).toBe('Monasteries');
    expect(b!.bonus).toEqual({
      type: 'MODIFY_YIELD',
      target: 'city',
      yield: 'science',
      value: 1,
    });
  });

  it('looks up the Religious Community follower belief with a city food bonus', () => {
    const b = ALL_FOLLOWER_BELIEFS.find((x) => x.id === 'religious_community');
    expect(b).toBeDefined();
    expect(b!.bonus).toEqual({
      type: 'MODIFY_YIELD',
      target: 'city',
      yield: 'food',
      value: 1,
    });
  });
});

describe('Religion expansion — no id collisions across founder and follower slots', () => {
  it('no founder-belief id collides with a follower-belief id', () => {
    const founderIds = new Set(ALL_FOUNDER_BELIEFS.map((b) => b.id));
    for (const b of ALL_FOLLOWER_BELIEFS) {
      expect(founderIds.has(b.id)).toBe(false);
    }
  });
});
