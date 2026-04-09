/**
 * Axial hex coordinate using the "pointy-top" convention.
 * q = column, r = row.
 * See: https://www.redblobgames.com/grids/hexagons/
 */
export interface HexCoord {
  readonly q: number;
  readonly r: number;
}

/** Cube coordinate — useful for algorithms. s = -q - r */
export interface CubeCoord {
  readonly q: number;
  readonly r: number;
  readonly s: number;
}

/** Unique string key for a hex coordinate, used as Map keys */
export type HexKey = string;
