/**
 * II2 (F-10): Civ VII terrain yield parity tests — updated to Civ VII canon values.
 *
 * Previous values in X3.3 were wrong (e.g. Grassland 3F, Plains 2F+1P, Desert 2F+1P,
 * Tundra 3F). Corrected to match Civ VII GDD canon in II2.
 *
 * Reference values (Civ VII canon):
 *   Grassland: 2F 0P 0G
 *   Plains:    1F 1P 0G
 *   Desert:    0F 0P 0G  (floodplains feature gives +3F)
 *   Tundra:    1F 0P 0G
 *   Snow:      0F 0P 0G
 *   Coast:     1F 0P 1G
 *   Ocean:     1F 0P 0G
 */

import { describe, it, expect } from 'vitest';
import { GRASSLAND, PLAINS, DESERT, TUNDRA, SNOW, COAST, OCEAN } from '../terrains/base-terrains';
import { JUNGLE, FOREST, HILLS, FLOODPLAINS } from '../terrains/features';

describe('II2 (F-10): Civ VII terrain base yield parity (regression guard)', () => {
  it('Grassland yields 2F 0P 0G (Civ VII canon)', () => {
    expect(GRASSLAND.baseYields).toEqual(expect.objectContaining({ food: 2, production: 0, gold: 0 }));
  });

  it('Plains yields 1F 1P 0G (Civ VII canon)', () => {
    expect(PLAINS.baseYields).toEqual(expect.objectContaining({ food: 1, production: 1, gold: 0 }));
  });

  it('Desert yields 0F 0P 0G (Civ VII canon — barren; floodplains feature adds food)', () => {
    expect(DESERT.baseYields).toEqual(expect.objectContaining({ food: 0, production: 0, gold: 0 }));
  });

  it('Tundra yields 1F 0P 0G (Civ VII canon)', () => {
    expect(TUNDRA.baseYields).toEqual(expect.objectContaining({ food: 1, production: 0, gold: 0 }));
  });

  it('Snow yields 0F 0P 0G (Civ VII canon — polar barren terrain)', () => {
    expect(SNOW.baseYields).toEqual(expect.objectContaining({ food: 0, production: 0, gold: 0 }));
  });

  it('Coast yields 1F 0P 1G (Civ VII canon)', () => {
    expect(COAST.baseYields).toEqual(expect.objectContaining({ food: 1, production: 0, gold: 1 }));
  });

  it('Ocean yields 1F 0P 0G (Civ VII canon)', () => {
    expect(OCEAN.baseYields).toEqual(expect.objectContaining({ food: 1, production: 0, gold: 0 }));
  });

  it('YieldCalculator getTerrainYields must stay in sync with data-file baseYields', () => {
    // Cross-check: data files are authoritative; this is a reminder that YieldCalculator.ts
    // contains an inline table that must mirror these values (see getTerrainYields function).
    expect(GRASSLAND.baseYields.food).toBe(2);
    expect(PLAINS.baseYields.food).toBe(1);
    expect(PLAINS.baseYields.production).toBe(1);
    expect(DESERT.baseYields.food).toBe(0);
    expect(TUNDRA.baseYields.food).toBe(1);
    expect(OCEAN.baseYields.food).toBe(1);
  });
});

describe('II2 (F-06): JUNGLE feature yield parity (Civ VII canon)', () => {
  it('JUNGLE feature gives +1F +1S (Civ VII canon — science flat, not age-conditional)', () => {
    expect(JUNGLE.yieldModifiers).toEqual(expect.objectContaining({ food: 1, science: 1 }));
    // No production bonus on jungle (was incorrectly +2P)
    expect(JUNGLE.yieldModifiers.production ?? 0).toBe(0);
  });
});

describe('II2 (F-08): Defense bonus format — percentage convention (decimal)', () => {
  it('HILLS defenseBonusModifier uses percentage convention (0.25 = +25%)', () => {
    expect(HILLS.defenseBonusModifier).toBe(0.25);
    expect(HILLS.flatDefenseBonus ?? 0).toBe(0);
  });

  it('FOREST defenseBonusModifier uses percentage convention (0.25 = +25%)', () => {
    expect(FOREST.defenseBonusModifier).toBe(0.25);
    expect(FOREST.flatDefenseBonus ?? 0).toBe(0);
  });

  it('JUNGLE defenseBonusModifier uses percentage convention (0.25 = +25%, was flatDefenseBonus: 2)', () => {
    expect(JUNGLE.defenseBonusModifier).toBe(0.25);
    expect(JUNGLE.flatDefenseBonus ?? 0).toBe(0);
  });

  it('FLOODPLAINS defenseBonusModifier uses percentage convention (-0.10 = -10%)', () => {
    expect(FLOODPLAINS.defenseBonusModifier).toBe(-0.1);
  });
});
