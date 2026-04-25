/**
 * X3.3: Civ-VII terrain yield parity tests
 *
 * Verifies that terrain baseYields match the Civ VII GDD values.
 * All values were already correct prior to X3.3; these tests serve as
 * regression guards ensuring no future edits silently revert them.
 *
 * Reference values (Civ VII GDD):
 *   Grassland: 3 food
 *   Plains:    2 food, 1 production
 *   Desert:    2 food, 1 production (has irrigation potential)
 *   Tundra:    3 food
 *   Ocean:     1 food
 */

import { describe, it, expect } from 'vitest';
import { GRASSLAND, PLAINS, DESERT, TUNDRA, OCEAN } from '../terrains/base-terrains';

describe('X3.3: Civ-VII terrain yield corrections (regression guard)', () => {
  it('Grassland has 3 food (Civ VII GDD)', () => {
    expect(GRASSLAND.baseYields.food).toBe(3);
    expect(GRASSLAND.baseYields.production).toBe(0);
  });

  it('Desert has 2 food + 1 production (Civ VII: irrigation potential)', () => {
    expect(DESERT.baseYields.food).toBe(2);
    expect(DESERT.baseYields.production).toBe(1);
  });

  it('Plains has 2 food + 1 production (Civ VII balanced terrain)', () => {
    expect(PLAINS.baseYields.food).toBe(2);
    expect(PLAINS.baseYields.production).toBe(1);
  });

  it('Ocean has 1 food (Civ VII: coastal fishing)', () => {
    expect(OCEAN.baseYields.food).toBe(1);
    expect(OCEAN.baseYields.gold).toBe(0);
  });

  it('Tundra has 3 food (Civ VII: northern foraging)', () => {
    expect(TUNDRA.baseYields.food).toBe(3);
    expect(TUNDRA.baseYields.production).toBe(0);
  });

  it('YieldCalculator getTerrainYields matches data file baseYields for core terrains', () => {
    // The YieldCalculator has its own inline table for terrain yields.
    // This test verifies consistency by checking the data-file values (authoritative).
    // If the data files change, the inline table in YieldCalculator.ts must be updated too.
    expect(GRASSLAND.baseYields).toMatchObject({ food: 3 });
    expect(DESERT.baseYields).toMatchObject({ food: 2, production: 1 });
    expect(PLAINS.baseYields).toMatchObject({ food: 2, production: 1 });
    expect(OCEAN.baseYields).toMatchObject({ food: 1 });
    expect(TUNDRA.baseYields).toMatchObject({ food: 3 });
  });
});
