import type { RngState } from '../types/GameState';

/**
 * Deterministic seeded RNG using a simple mulberry32 algorithm.
 * Returns a float in [0, 1) and the next RNG state.
 */
export function nextRandom(rng: RngState): { value: number; rng: RngState } {
  let t = (rng.seed + 0x6D2B79F5 + rng.counter * 0x9E3779B9) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return {
    value,
    rng: { seed: rng.seed, counter: rng.counter + 1 },
  };
}

/** Get a random integer in [min, max] inclusive */
export function randomInt(rng: RngState, min: number, max: number): { value: number; rng: RngState } {
  const { value, rng: nextState } = nextRandom(rng);
  return {
    value: min + Math.floor(value * (max - min + 1)),
    rng: nextState,
  };
}

/** Shuffle an array deterministically */
export function shuffle<T>(rng: RngState, array: ReadonlyArray<T>): { result: T[]; rng: RngState } {
  const result = [...array];
  let currentRng = rng;
  for (let i = result.length - 1; i > 0; i--) {
    const { value: j, rng: nextState } = randomInt(currentRng, 0, i);
    currentRng = nextState;
    [result[i], result[j]] = [result[j], result[i]];
  }
  return { result, rng: currentRng };
}

/** Create initial RNG state from a seed */
export function createRng(seed: number): RngState {
  return { seed, counter: 0 };
}

/**
 * Simple 2D noise function using the seeded RNG.
 * Returns a value in [0, 1) for given coordinates.
 */
export function noise2D(seed: number, x: number, y: number): number {
  // Hash the coordinates with the seed
  const hash = (seed * 374761393 + x * 668265263 + y * 1274126177) | 0;
  let t = (hash ^ (hash >>> 13)) * 1274126177;
  t = (t ^ (t >>> 16));
  return ((t >>> 0) / 4294967296);
}

/**
 * Smoothed 2D noise (value noise with bilinear interpolation).
 * scale controls the "zoom" of the noise.
 */
export function smoothNoise2D(seed: number, x: number, y: number, scale: number): number {
  const sx = x / scale;
  const sy = y / scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;

  const v00 = noise2D(seed, ix, iy);
  const v10 = noise2D(seed, ix + 1, iy);
  const v01 = noise2D(seed, ix, iy + 1);
  const v11 = noise2D(seed, ix + 1, iy + 1);

  // Smooth interpolation
  const sfx = fx * fx * (3 - 2 * fx);
  const sfy = fy * fy * (3 - 2 * fy);

  const top = v00 + (v10 - v00) * sfx;
  const bottom = v01 + (v11 - v01) * sfx;
  return top + (bottom - top) * sfy;
}

/** Multi-octave noise for more natural terrain */
export function fractalNoise2D(seed: number, x: number, y: number, octaves: number, baseScale: number): number {
  let total = 0;
  let amplitude = 1;
  let maxAmplitude = 0;
  let scale = baseScale;

  for (let i = 0; i < octaves; i++) {
    total += smoothNoise2D(seed + i * 1000, x, y, scale) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= 0.5;
    scale *= 0.5;
  }

  return total / maxAmplitude;
}
