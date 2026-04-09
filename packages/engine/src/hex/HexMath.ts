import type { HexCoord, CubeCoord, HexKey } from '../types/HexCoord';

/** Convert axial to cube coordinates */
export function axialToCube(hex: HexCoord): CubeCoord {
  return { q: hex.q, r: hex.r, s: -hex.q - hex.r };
}

/** Convert cube to axial coordinates */
export function cubeToAxial(cube: CubeCoord): HexCoord {
  return { q: cube.q, r: cube.r };
}

/** Create a unique string key for map lookups */
export function coordToKey(coord: HexCoord): HexKey {
  return `${coord.q},${coord.r}`;
}

/** Parse a HexKey back to coordinates */
export function keyToCoord(key: HexKey): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

/** The 6 axial direction vectors for pointy-top hexes */
export const HEX_DIRECTIONS: ReadonlyArray<HexCoord> = [
  { q: 1, r: 0 },   // E
  { q: 1, r: -1 },  // NE
  { q: 0, r: -1 },  // NW
  { q: -1, r: 0 },  // W
  { q: -1, r: 1 },  // SW
  { q: 0, r: 1 },   // SE
] as const;

/** Get the 6 neighboring hex coordinates */
export function neighbors(center: HexCoord): ReadonlyArray<HexCoord> {
  return HEX_DIRECTIONS.map(d => ({ q: center.q + d.q, r: center.r + d.r }));
}

/** Manhattan distance on hex grid (cube distance) */
export function distance(a: HexCoord, b: HexCoord): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return Math.max(Math.abs(ac.q - bc.q), Math.abs(ac.r - bc.r), Math.abs(ac.s - bc.s));
}

/** All hexes at exactly radius distance from center */
export function ring(center: HexCoord, radius: number): ReadonlyArray<HexCoord> {
  if (radius === 0) return [center];
  const results: HexCoord[] = [];
  // Start at the hex radius steps in direction 4 (SW) from center
  let hex: HexCoord = {
    q: center.q + HEX_DIRECTIONS[4].q * radius,
    r: center.r + HEX_DIRECTIONS[4].r * radius,
  };
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push(hex);
      hex = { q: hex.q + HEX_DIRECTIONS[i].q, r: hex.r + HEX_DIRECTIONS[i].r };
    }
  }
  return results;
}

/** All hexes within radius distance from center (inclusive) */
export function range(center: HexCoord, radius: number): ReadonlyArray<HexCoord> {
  const results: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }
  return results;
}

/** Round fractional cube coordinates to nearest hex */
function cubeRound(q: number, r: number, s: number): CubeCoord {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }
  return { q: rq, r: rr, s: rs };
}

/** Draw a line between two hexes, returning all hexes along the path */
export function lineDraw(a: HexCoord, b: HexCoord): ReadonlyArray<HexCoord> {
  const n = distance(a, b);
  if (n === 0) return [a];
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  const results: HexCoord[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const q = ac.q + (bc.q - ac.q) * t;
    const r = ac.r + (bc.r - ac.r) * t;
    const s = ac.s + (bc.s - ac.s) * t;
    // Nudge slightly to avoid landing exactly on edges
    const cube = cubeRound(q + 1e-6, r + 1e-6, s - 2e-6);
    results.push(cubeToAxial(cube));
  }
  return results;
}

/** Check if two hexes are equal */
export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}
