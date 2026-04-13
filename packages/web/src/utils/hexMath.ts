import type { HexCoord } from '@hex/engine';

/** Hex sizing — pointy-top orientation */
export const HEX_SIZE = 32; // outer radius (center to vertex)
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;

/** Convert axial hex coordinate to pixel position (center of hex) */
export function hexToPixel(coord: HexCoord): { x: number; y: number } {
  const x = HEX_WIDTH * (coord.q + coord.r * 0.5);
  const y = HEX_HEIGHT * 0.75 * coord.r;
  return { x, y };
}

/** Convert pixel position to axial hex coordinate */
export function pixelToHex(x: number, y: number): HexCoord {
  const r = y / (HEX_HEIGHT * 0.75);
  const q = x / HEX_WIDTH - r * 0.5;
  return hexRound(q, r);
}

function hexRound(q: number, r: number): HexCoord {
  const s = -q - r;
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
  }
  return { q: rq, r: rr };
}
