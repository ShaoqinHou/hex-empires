import { describe, it, expect } from 'vitest';
import { nextRandom, randomInt, shuffle, createRng, noise2D, fractalNoise2D } from '../SeededRng';

describe('SeededRng', () => {
  it('produces deterministic values for same seed', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    const { value: v1 } = nextRandom(rng1);
    const { value: v2 } = nextRandom(rng2);
    expect(v1).toBe(v2);
  });

  it('produces values in [0, 1)', () => {
    let rng = createRng(12345);
    for (let i = 0; i < 100; i++) {
      const { value, rng: next } = nextRandom(rng);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      rng = next;
    }
  });

  it('different seeds produce different sequences', () => {
    const { value: v1 } = nextRandom(createRng(1));
    const { value: v2 } = nextRandom(createRng(999));
    expect(v1).not.toBe(v2);
  });

  it('advances state on each call', () => {
    const rng = createRng(42);
    const { value: v1, rng: rng2 } = nextRandom(rng);
    const { value: v2 } = nextRandom(rng2);
    expect(v1).not.toBe(v2);
  });
});

describe('randomInt', () => {
  it('produces values within range', () => {
    let rng = createRng(42);
    for (let i = 0; i < 100; i++) {
      const { value, rng: next } = randomInt(rng, 3, 7);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
      rng = next;
    }
  });
});

describe('shuffle', () => {
  it('returns same elements', () => {
    const { result } = shuffle(createRng(42), [1, 2, 3, 4, 5]);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('is deterministic', () => {
    const { result: r1 } = shuffle(createRng(42), [1, 2, 3, 4, 5]);
    const { result: r2 } = shuffle(createRng(42), [1, 2, 3, 4, 5]);
    expect(r1).toEqual(r2);
  });
});

describe('noise2D', () => {
  it('returns deterministic values', () => {
    expect(noise2D(42, 10, 20)).toBe(noise2D(42, 10, 20));
  });

  it('returns values in [0, 1)', () => {
    for (let x = 0; x < 50; x++) {
      for (let y = 0; y < 50; y++) {
        const v = noise2D(42, x, y);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });
});

describe('fractalNoise2D', () => {
  it('returns values in [0, 1)', () => {
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        const v = fractalNoise2D(42, x, y, 4, 10);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });
});
