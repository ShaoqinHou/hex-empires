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
  SettlementType,
  CityState,
  ProductionItem,
  LegacyPaths,
  PlayerState,
  DiplomaticStatus,
  DiplomaticEndeavor,
  DiplomaticSanction,
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
export { resourceSystem, calculateCityHappiness, calculateSettlementCapPenalty, applyHappinessPenalty } from './systems/resourceSystem';
export { researchSystem } from './systems/researchSystem';
export { ageSystem } from './systems/ageSystem';
export { combatSystem } from './systems/combatSystem';
export { promotionSystem } from './systems/promotionSystem';
export { getPromotionCombatBonus, getPromotionDefenseBonus, getPromotionRangeBonus, getPromotionMovementBonus } from './state/PromotionUtils';
export { diplomacySystem, updateDiplomacyCounters, getStatusFromRelationship, getRelationKey, defaultRelation } from './systems/diplomacySystem';
export { fortifySystem } from './systems/fortifySystem';
export { generateAIActions } from './systems/aiSystem';
export { victorySystem } from './systems/victorySystem';
export { effectSystem, getActiveEffects } from './systems/effectSystem';
export { visibilitySystem } from './systems/visibilitySystem';
export { crisisSystem } from './systems/crisisSystem';
export { civicSystem } from './systems/civicSystem';

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
export { ALL_BUILDINGS, ALL_ANTIQUITY_BUILDINGS, ALL_EXPLORATION_BUILDINGS, ALL_MODERN_BUILDINGS } from './data/buildings';
export {
  GRANARY, MONUMENT, WALLS, BARRACKS, LIBRARY,
  MARKET, WATERMILL, WORKSHOP, SHRINE,
} from './data/buildings';
export {
  BANK, UNIVERSITY, STOCK_EXCHANGE, ARMORY, STAR_FORT,
} from './data/buildings';
export {
  FACTORY, RESEARCH_LAB, POWER_PLANT, NUCLEAR_PLANT, BROADCAST_TOWER,
} from './data/buildings';

// Unit data
export type { UnitDef } from './data/units';
export type { PromotionDef } from './data/units/promotions';
export { ALL_PROMOTIONS, PROMOTION_THRESHOLDS } from './data/units/promotions';
export {
  BATTLECRY, TORTOISE, VOLLEY, ARROWS, CHARGE, PURSUIT,
  BLITZ, LOGISTICS, FLANKING, BREAKTHROUGH, ELITE,
} from './data/units/promotions';
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
export { ALL_CIVILIZATIONS, ALL_ANTIQUITY_CIVS, ALL_EXPLORATION_CIVS, ALL_MODERN_CIVS } from './data/civilizations';
export {
  ROME, EGYPT, GREECE, PERSIA, INDIA, CHINA,
} from './data/civilizations';
export {
  SPAIN, ENGLAND, FRANCE, OTTOMAN, JAPAN, MONGOLIA,
} from './data/civilizations';
export {
  AMERICA, GERMANY, RUSSIA, BRAZIL,
} from './data/civilizations';

// Civic data
export type { CivicDef } from './data/civics';
export { ALL_CIVICS, ALL_ANTIQUITY_CIVICS, ALL_EXPLORATION_CIVICS, ALL_MODERN_CIVICS } from './data/civics';
export {
  CODE_OF_LAWS, CRAFTSMANSHIP, FOREIGN_TRADE, EARLY_EMPIRE,
  MYSTICISM, STATE_WORKFORCE, MILITARY_TRADITION, RECORDED_HISTORY,
} from './data/civics';
export {
  HUMANISM, MERCANTILISM, DIVINE_RIGHT, EXPLORATION_CIVIC,
  REFORMED_CHURCH, COLONIALISM, CIVIL_ENGINEERING, NATIONALISM,
} from './data/civics';
export {
  IDEOLOGY, SUFFRAGE, TOTALITARIANISM,
  ENVIRONMENTALISM, GLOBALIZATION, FUTURE_CIVIC,
} from './data/civics';

// Crisis data
export type { CrisisEventDef, CrisisTriggerCondition } from './data/crises';
export { ALL_CRISES, PLAGUE, BARBARIAN_INVASION, GOLDEN_AGE, TRADE_OPPORTUNITY, NATURAL_DISASTER } from './data/crises';

// Resource data
export type { ResourceDef } from './data/resources';
export { ALL_RESOURCES, WHEAT, CATTLE, STONE, IRON, HORSES, NITER, SILK, GEMS, SPICES, WINE } from './data/resources';

// Leader data
export type { LeaderDef } from './data/leaders';
export { ALL_LEADERS } from './data/leaders';
