import { describe, it, expect } from 'vitest';
import {
  coordToKey,
  keyToCoord,
  neighbors,
  distance,
  ring,
  range,
  lineDraw,
  hexEquals,
  axialToCube,
  cubeToAxial,
} from '../HexMath';

describe('coordToKey / keyToCoord', () => {
  it('round-trips coordinates', () => {
    const coord = { q: 3, r: -7 };
    expect(keyToCoord(coordToKey(coord))).toEqual(coord);
  });

  it('produces unique keys for different coords', () => {
    expect(coordToKey({ q: 1, r: 2 })).not.toBe(coordToKey({ q: 2, r: 1 }));
  });

  it('round-trips the origin', () => {
    expect(keyToCoord(coordToKey({ q: 0, r: 0 }))).toEqual({ q: 0, r: 0 });
  });

  it('round-trips large negative coordinates', () => {
    const coord = { q: -42, r: -17 };
    expect(keyToCoord(coordToKey(coord))).toEqual(coord);
  });

  it('produces deterministic keys across calls', () => {
    expect(coordToKey({ q: 5, r: -3 })).toBe(coordToKey({ q: 5, r: -3 }));
  });

  it('round-trips positive-only coordinates', () => {
    const coord = { q: 7, r: 11 };
    expect(keyToCoord(coordToKey(coord))).toEqual(coord);
  });
});

describe('axialToCube / cubeToAxial', () => {
  it('converts axial to cube correctly', () => {
    const cube = axialToCube({ q: 1, r: -3 });
    expect(cube).toEqual({ q: 1, r: -3, s: 2 });
    expect(cube.q + cube.r + cube.s).toBe(0);
  });

  it('round-trips through cube', () => {
    const coord = { q: 5, r: -2 };
    expect(cubeToAxial(axialToCube(coord))).toEqual(coord);
  });
});

describe('neighbors', () => {
  it('returns 6 neighbors', () => {
    expect(neighbors({ q: 0, r: 0 })).toHaveLength(6);
  });

  it('all neighbors are distance 1 from center', () => {
    const center = { q: 3, r: -2 };
    for (const n of neighbors(center)) {
      expect(distance(center, n)).toBe(1);
    }
  });

  it('returns correct neighbors for origin', () => {
    const ns = neighbors({ q: 0, r: 0 });
    const keys = new Set(ns.map(n => coordToKey(n)));
    expect(keys.has('1,0')).toBe(true);   // E
    expect(keys.has('1,-1')).toBe(true);  // NE
    expect(keys.has('0,-1')).toBe(true);  // NW
    expect(keys.has('-1,0')).toBe(true);  // W
    expect(keys.has('-1,1')).toBe(true);  // SW
    expect(keys.has('0,1')).toBe(true);   // SE
  });
});

describe('distance', () => {
  it('distance to self is 0', () => {
    expect(distance({ q: 5, r: 3 }, { q: 5, r: 3 })).toBe(0);
  });

  it('distance to adjacent is 1', () => {
    expect(distance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
  });

  it('computes correct distance for non-adjacent hexes', () => {
    expect(distance({ q: 0, r: 0 }, { q: 3, r: -3 })).toBe(3);
    expect(distance({ q: 0, r: 0 }, { q: 2, r: 1 })).toBe(3);
  });

  it('is symmetric', () => {
    const a = { q: 1, r: 3 };
    const b = { q: -2, r: 5 };
    expect(distance(a, b)).toBe(distance(b, a));
  });
});

describe('ring', () => {
  it('ring of radius 0 is just the center', () => {
    expect(ring({ q: 0, r: 0 }, 0)).toEqual([{ q: 0, r: 0 }]);
  });

  it('ring of radius 1 has 6 hexes', () => {
    expect(ring({ q: 0, r: 0 }, 1)).toHaveLength(6);
  });

  it('ring of radius 2 has 12 hexes', () => {
    expect(ring({ q: 0, r: 0 }, 2)).toHaveLength(12);
  });

  it('all ring hexes are at exact radius distance', () => {
    const center = { q: 2, r: -1 };
    const r = 3;
    for (const hex of ring(center, r)) {
      expect(distance(center, hex)).toBe(r);
    }
  });
});

describe('range', () => {
  it('range of radius 0 is just the center', () => {
    expect(range({ q: 0, r: 0 }, 0)).toEqual([{ q: 0, r: 0 }]);
  });

  it('range of radius 1 has 7 hexes', () => {
    expect(range({ q: 0, r: 0 }, 1)).toHaveLength(7);
  });

  it('range of radius 2 has 19 hexes', () => {
    // Formula: 3*r^2 + 3*r + 1 = 3*4 + 6 + 1 = 19
    expect(range({ q: 0, r: 0 }, 2)).toHaveLength(19);
  });

  it('all range hexes are within radius distance', () => {
    const center = { q: -1, r: 4 };
    const r = 3;
    for (const hex of range(center, r)) {
      expect(distance(center, hex)).toBeLessThanOrEqual(r);
    }
  });
});

describe('lineDraw', () => {
  it('line to self returns just the hex', () => {
    expect(lineDraw({ q: 1, r: 1 }, { q: 1, r: 1 })).toEqual([{ q: 1, r: 1 }]);
  });

  it('line between adjacent hexes has 2 hexes', () => {
    const line = lineDraw({ q: 0, r: 0 }, { q: 1, r: 0 });
    expect(line).toHaveLength(2);
    expect(line[0]).toEqual({ q: 0, r: 0 });
    expect(line[1]).toEqual({ q: 1, r: 0 });
  });

  it('line length equals distance + 1', () => {
    const a = { q: 0, r: 0 };
    const b = { q: 3, r: -1 };
    expect(lineDraw(a, b)).toHaveLength(distance(a, b) + 1);
  });

  it('consecutive hexes in line are adjacent', () => {
    const line = lineDraw({ q: 0, r: 0 }, { q: 4, r: -2 });
    for (let i = 1; i < line.length; i++) {
      expect(distance(line[i - 1], line[i])).toBe(1);
    }
  });
});

describe('hexEquals', () => {
  it('returns true for equal coords', () => {
    expect(hexEquals({ q: 3, r: -1 }, { q: 3, r: -1 })).toBe(true);
  });

  it('returns false for different coords', () => {
    expect(hexEquals({ q: 3, r: -1 }, { q: 3, r: 0 })).toBe(false);
  });
});
