// Types
export type { GameConfig } from './types';
export type {
  HexCoord,
  CubeCoord,
  HexKey,
  TerrainId,
  TerrainDef,
  FeatureId,
  TerrainFeatureDef,
  YieldType,
  YieldSet,
  PlayerId,
  UnitId,
  CityId,
  CivilizationId,
  LeaderId,
  TechnologyId,
  BuildingId,
  ResourceId,
  TurnPhase,
  Age,
  HexTile,
  HexMap,
  UnitCategory,
  UnitState,
  CityState,
  ProductionItem,
  PlayerState,
  DiplomaticStatus,
  DiplomacyRelation,
  DiplomacyState,
  EffectTarget,
  EffectDef,
  ActiveEffect,
  VictoryType,
  VictoryProgress,
  VictoryState,
  CrisisState,
  CrisisChoice,
  AgeState,
  RngState,
  GameState,
  DiplomacyProposal,
  GameAction,
  GameEvent,
  System,
} from './types';
export { EMPTY_YIELDS, addYields } from './types';

// Hex math
export {
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
  HEX_DIRECTIONS,
  findPath,
  getReachable,
  generateMap,
  createTerrainRegistries,
} from './hex';
export type { CostFn, MapGenOptions } from './hex';

// Registry
export { Registry } from './registry';

// State utilities
export { nextRandom, randomInt, shuffle, createRng, noise2D, smoothNoise2D, fractalNoise2D } from './state';

// Engine
export { GameEngine } from './GameEngine';

// Systems
export { turnSystem } from './systems/turnSystem';
export { movementSystem } from './systems/movementSystem';
export { getMovementCost } from './hex/TerrainCost';
export { citySystem } from './systems/citySystem';
export { growthSystem, getGrowthThreshold } from './systems/growthSystem';
export { calculateCityYields } from './state/YieldCalculator';
export { productionSystem } from './systems/productionSystem';
export { resourceSystem } from './systems/resourceSystem';
export { researchSystem } from './systems/researchSystem';
export { ageSystem } from './systems/ageSystem';
export { combatSystem } from './systems/combatSystem';
export { diplomacySystem, updateDiplomacyCounters } from './systems/diplomacySystem';
export { fortifySystem } from './systems/fortifySystem';
export { generateAIActions } from './systems/aiSystem';
export { victorySystem } from './systems/victorySystem';
export { effectSystem, getActiveEffects } from './systems/effectSystem';
export { visibilitySystem } from './systems/visibilitySystem';

// Save/Load
export { serializeState, deserializeState } from './state/SaveLoad';
export { createGameConfig } from './state/GameConfigFactory';

// Terrain data
export { ALL_BASE_TERRAINS, ALL_FEATURES } from './data/terrains';
export {
  GRASSLAND, PLAINS, DESERT, TUNDRA, SNOW, COAST, OCEAN,
  HILLS, MOUNTAINS, FOREST, JUNGLE, MARSH, FLOODPLAINS, OASIS, REEF,
} from './data/terrains';

// Building data
export type { BuildingDef } from './data/buildings';
export { ALL_BUILDINGS, ALL_ANTIQUITY_BUILDINGS } from './data/buildings';

// Unit data
export type { UnitDef } from './data/units';
export { ALL_UNITS, ALL_ANTIQUITY_UNITS, ALL_EXPLORATION_UNITS, ALL_MODERN_UNITS } from './data/units';
export {
  WARRIOR, SLINGER, ARCHER, SCOUT, SPEARMAN,
  CHARIOT, SETTLER, BUILDER, BATTERING_RAM, GALLEY,
} from './data/units';
export {
  SWORDSMAN, CROSSBOWMAN, PIKEMAN, HORSEMAN, KNIGHT,
  MUSKETMAN, BOMBARD, CANNON, SIEGE_TOWER, CARAVEL,
} from './data/units';
export {
  INFANTRY, MACHINE_GUN, TANK, FIGHTER,
  ROCKET_ARTILLERY, IRONCLAD, BIPLANE,
} from './data/units';

// Technology data
export type { TechnologyDef } from './data/technologies';
export { ALL_TECHNOLOGIES, ALL_ANTIQUITY_TECHS, ALL_EXPLORATION_TECHS, ALL_MODERN_TECHS } from './data/technologies';

// Civilization data
export type { CivilizationDef } from './data/civilizations';
export { ALL_CIVILIZATIONS, ALL_ANTIQUITY_CIVS } from './data/civilizations';

// Leader data
export type { LeaderDef } from './data/leaders';
export { ALL_LEADERS } from './data/leaders';
