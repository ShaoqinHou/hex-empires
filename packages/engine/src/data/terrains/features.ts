import type { TerrainFeatureDef } from '../../types/Terrain';

export const HILLS: TerrainFeatureDef = {
  id: 'hills',
  name: 'Hills',
  movementCostModifier: 1, // +1 to enter (binary deplete: see depletesMovement)
  defenseBonusModifier: 0.25, // Y5.2: +25% multiplicative defense bonus (rough terrain)
  flatDefenseBonus: 0,
  depletesMovement: true,   // F-03: binary deplete-all movement (§6.3)
  yieldModifiers: { production: 1 },
  blocksMovement: false,
  color: '#8a7a55',
  modifier: 'rough',   // W4-02: biome modifier annotation
} as const;

export const MOUNTAINS: TerrainFeatureDef = {
  id: 'mountains',
  name: 'Mountains',
  movementCostModifier: 0,
  defenseBonusModifier: 0.50, // Y5.2: +50% multiplicative defense bonus (impassable; bonus applies if ever reachable)
  flatDefenseBonus: 0,
  yieldModifiers: {},
  blocksMovement: true, // impassable
  color: '#a0a0a0',
  modifier: 'rough',   // W4-02: biome modifier annotation
} as const;

export const FOREST: TerrainFeatureDef = {
  id: 'forest',
  name: 'Forest',
  movementCostModifier: 1,
  defenseBonusModifier: 0.25, // Y5.2: +25% multiplicative defense bonus (vegetated terrain)
  flatDefenseBonus: 0,
  depletesMovement: true,   // F-03: binary deplete-all movement (§6.3)
  yieldModifiers: { production: 1 },
  blocksMovement: false,
  color: '#2d5a1e',
  modifier: 'vegetated', // W4-02: biome modifier annotation
} as const;

export const JUNGLE: TerrainFeatureDef = {
  id: 'jungle',
  name: 'Jungle',
  movementCostModifier: 1,
  // II2 (F-08): standardized to percentage convention (0.25 = +25% CS, same as forest —
  // both are vegetated terrain per rulebook §6.4). Removed flatDefenseBonus.
  defenseBonusModifier: 0.25,
  flatDefenseBonus: 0,
  depletesMovement: true,     // F-03: binary deplete-all movement (§6.3)
  // II2 (F-06): Civ VII canon — jungle feature gives +1F +1S (was +2P +1S).
  // Science is flat (not age-conditional) for simplicity; note: vanilla Civ VII
  // gates jungle science on Modern era, but engine lacks age-conditional feature
  // yields — using flat +1S is the simplest correct approximation.
  yieldModifiers: { food: 1, science: 1 },
  blocksMovement: false,
  color: '#1a4a0f',
  modifier: 'vegetated', // W4-02: biome modifier annotation
} as const;

export const MARSH: TerrainFeatureDef = {
  id: 'marsh',
  name: 'Marsh',
  movementCostModifier: 1,
  defenseBonusModifier: 0,    // F-08: standardized (was -0.15 multiplicative)
  flatDefenseBonus: 0,        // F-08: no flat defense bonus (marsh offers no cover)
  depletesMovement: true,     // F-03: binary deplete-all movement (§6.3)
  yieldModifiers: { food: 1 },
  blocksMovement: false,
  color: '#5a6b3a',
  modifier: 'wet',       // W4-02: biome modifier annotation
} as const;

export const FLOODPLAINS: TerrainFeatureDef = {
  id: 'floodplains',
  name: 'Floodplains',
  movementCostModifier: 0,
  defenseBonusModifier: -0.1,
  yieldModifiers: { food: 3 },
  blocksMovement: false,
  color: '#7a9a4a',
} as const;

export const OASIS: TerrainFeatureDef = {
  id: 'oasis',
  name: 'Oasis',
  movementCostModifier: 0,
  defenseBonusModifier: 0,
  yieldModifiers: { food: 3, gold: 1 },
  blocksMovement: false,
  color: '#4ab87a',
} as const;

export const REEF: TerrainFeatureDef = {
  id: 'reef',
  name: 'Reef',
  movementCostModifier: 0,
  defenseBonusModifier: 0,
  yieldModifiers: { food: 1, production: 1 },
  blocksMovement: false,
  color: '#3a8aaa',
} as const;

export const ALL_FEATURES: ReadonlyArray<TerrainFeatureDef> = [
  HILLS,
  MOUNTAINS,
  FOREST,
  JUNGLE,
  MARSH,
  FLOODPLAINS,
  OASIS,
  REEF,
] as const;
