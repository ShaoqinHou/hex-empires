# System Inventory

Last generated: 2026-04-15

Each entry: name, path glob, files (count), purpose, applicable standards, public API surface, known neighbours.

---

## Engine (packages/engine/src/)

### Systems Pipeline Overview
- Path glob: packages/engine/src/systems/*.ts
- Files: 31 (30 system files + index.ts) + 44 test files = 75 total
- DEFAULT_SYSTEMS pipeline (29 ordered systems wired in GameEngine.ts): turnSystem, visibilitySystem, effectSystem, movementSystem, citySystem, combatSystem, religionSystem, governmentSystem, urbanBuildingSystem, resourceAssignmentSystem, commanderPromotionSystem, promotionSystem, fortifySystem, improvementSystem, buildingPlacementSystem, districtSystem, growthSystem, productionSystem, resourceSystem, researchSystem, civicSystem, ageSystem, diplomacySystem, updateDiplomacyCounters, specialistSystem, tradeSystem, governorSystem, crisisSystem, victorySystem
- Note: aiSystem (generateAIActions) is NOT in the pipeline -- it is (state) => GameAction[] called separately by GameProvider for AI turns.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-SEEDED-RNG, S-NAMED-EXPORTS, S-TESTS-L1]

### System: turnSystem
- Path: packages/engine/src/systems/turnSystem.ts
- Files: 2 (+ test)
- Purpose: Turn phase management (start/actions/end), player order, unit movement refresh, unit healing/city recovery on START_TURN, phase-blocking (actions require actions phase).
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: turnSystem
- Touches state: turn, currentPlayerId, phase, units.movementLeft, units.health

### System: visibilitySystem
- Path: packages/engine/src/systems/visibilitySystem.ts
- Files: 2 (+ test)
- Purpose: Fog of war recalculation on START_TURN. Units provide sight radius 2, cities provide sight radius 3. Previously visible tiles become explored.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: visibilitySystem
- Touches state: players.visibility, players.explored

### System: effectSystem
- Path: packages/engine/src/systems/effectSystem.ts
- Files: 2 (+ test)
- Purpose: Pass-through in pipeline. Real work in state/EffectUtils.ts which collects active effects from civ unique ability, leader ability, legacy bonuses. Re-exports query utilities.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-EFFECT-DEF-DISCRIMINATED, S-TESTS-L1]
- Public exports: effectSystem, getActiveEffects, getYieldBonus, getCombatBonus, getMovementBonus, getProductionDiscount
- Touches state: none (query pattern -- other systems call getActiveEffects)

### System: movementSystem
- Path: packages/engine/src/systems/movementSystem.ts
- Files: 2 (+ test)
- Purpose: Unit movement with A* pathfinding, ZoC (zones of control), terrain movement costs. Handles MOVE_UNIT.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-SEEDED-RNG, S-TESTS-L1]
- Public exports: movementSystem
- Touches state: units.position, units.movementLeft

### System: citySystem
- Path: packages/engine/src/systems/citySystem.ts
- Files: 2 (+ test)
- Purpose: City founding (FOUND_CITY consuming settler), territory management, upgrade (UPGRADE_SETTLEMENT town->city), tile purchasing (PURCHASE_TILE), specialization (SET_SPECIALIZATION).
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: citySystem
- Touches state: cities, units (settler consumed), players.cities

### System: combatSystem
- Path: packages/engine/src/systems/combatSystem.ts
- Files: 2 (+ test)
- Purpose: Damage resolution, flanking bonuses, first strike, wall/fortification defense, ranged attacks, city attacks. Handles ATTACK_UNIT, ATTACK_CITY.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-SEEDED-RNG, S-TESTS-L1]
- Public exports: combatSystem
- Touches state: units.health, cities.defenseHp, log

### System: religionSystem
- Path: packages/engine/src/systems/religionSystem.ts + test
- Files: 2
- Purpose: Pantheon adoption and religion founding. M12 integration after combatSystem.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: religionSystem, canAdoptPantheon

### System: governmentSystem
- Path: packages/engine/src/systems/governmentSystem.ts + test
- Files: 2
- Purpose: Government adoption and social policy slotting. Validates civic prerequisites. M12 integration.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: governmentSystem, canAdoptGovernment, canSlotPolicy, findGovernment, findPolicy

### System: urbanBuildingSystem
- Path: packages/engine/src/systems/urbanBuildingSystem.ts + test
- Files: 2
- Purpose: V2 spatial building placement. Adjacency rules, wonder constraints, Quarter bonuses. M12 integration.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: urbanBuildingSystem

### System: resourceAssignmentSystem
- Path: packages/engine/src/systems/resourceAssignmentSystem.ts + test
- Files: 2
- Purpose: Resource slot assign/unassign per settlement. Slot counts: Town=1, City=2. M12 integration.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: resourceAssignmentSystem, getResourceSlotCapacity

### System: commanderPromotionSystem
- Path: packages/engine/src/systems/commanderPromotionSystem.ts + test
- Files: 2
- Purpose: Commander XP accumulation and promotion. M12 integration.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: commanderPromotionSystem, commanderLevelForXp, isCommander, LEVEL_THRESHOLDS

### System: promotionSystem
- Path: packages/engine/src/systems/promotionSystem.ts + test
- Files: 2
- Purpose: Standard unit promotion and experience (PROMOTE_UNIT).
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: promotionSystem

### System: fortifySystem
- Path: packages/engine/src/systems/fortifySystem.ts + test
- Files: 2
- Purpose: Unit fortification (FORTIFY_UNIT). Sets fortified flag; combatSystem grants defense bonus.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: fortifySystem

### System: improvementSystem
- Path: packages/engine/src/systems/improvementSystem.ts + test
- Files: 2
- Purpose: Tile improvement building by builder units (BUILD_IMPROVEMENT). Validates tech prerequisites.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: improvementSystem

### System: buildingPlacementSystem
- Path: packages/engine/src/systems/buildingPlacementSystem.ts + test
- Files: 2
- Purpose: Legacy building placement in cities (PLACE_BUILDING). Validates via BuildingPlacementValidator.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: buildingPlacementSystem

### System: districtSystem
- Path: packages/engine/src/systems/districtSystem.ts + test
- Files: 2
- Purpose: District placement and adjacency bonuses (PLACE_DISTRICT, UPGRADE_DISTRICT).
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: districtSystem

### System: growthSystem
- Path: packages/engine/src/systems/growthSystem.ts + test
- Files: 2
- Purpose: Population growth from food accumulation and town specialization bonuses. Processes on END_TURN.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: growthSystem, getGrowthThreshold

### System: productionSystem
- Path: packages/engine/src/systems/productionSystem.ts + test
- Files: 2
- Purpose: Production queue management, overflow, rush buying. Produces units and buildings on END_TURN.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: productionSystem

### System: resourceSystem
- Path: packages/engine/src/systems/resourceSystem.ts + test
- Files: 2
- Purpose: Per-turn yield calculation (gold, science, culture, faith), happiness, celebrations, settlement cap penalty. Processes on END_TURN.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: resourceSystem, calculateCityHappiness, calculateSettlementCapPenalty, applyHappinessPenalty

### System: researchSystem
- Path: packages/engine/src/systems/researchSystem.ts + test
- Files: 2
- Purpose: Technology research progress and mastery (SET_RESEARCH, SET_MASTERY). Validates prerequisites.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: researchSystem

### System: civicSystem
- Path: packages/engine/src/systems/civicSystem.ts + test
- Files: 2
- Purpose: Civic research and mastery (SET_CIVIC, SET_CIVIC_MASTERY). Validates prerequisites.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: civicSystem

### System: ageSystem
- Path: packages/engine/src/systems/ageSystem.ts + test
- Files: 2
- Purpose: Age transitions Antiquity->Exploration->Modern (TRANSITION_AGE). Old civ legacyBonus becomes permanent ActiveEffect.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: ageSystem

### System: diplomacySystem + updateDiplomacyCounters
- Path: packages/engine/src/systems/diplomacySystem.ts + test
- Files: 2
- Purpose: Diplomatic relations, war/peace proposals, endeavors, sanctions. updateDiplomacyCounters decrements counters each turn.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: diplomacySystem, updateDiplomacyCounters, getStatusFromRelationship, getRelationKey, defaultRelation

### System: specialistSystem
- Path: packages/engine/src/systems/specialistSystem.ts + test
- Files: 2
- Purpose: Citizen specialist assignment/unassignment (ASSIGN_SPECIALIST, UNASSIGN_SPECIALIST).
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: specialistSystem

### System: tradeSystem
- Path: packages/engine/src/systems/tradeSystem.ts + test
- Files: 2
- Purpose: Merchant trade route creation (CREATE_TRADE_ROUTE). Validates merchant availability and target city accessibility.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: tradeSystem

### System: governorSystem
- Path: packages/engine/src/systems/governorSystem.ts + test
- Files: 2
- Purpose: Governor recruitment, city assignment/unassignment, ability promotion.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: governorSystem

### System: crisisSystem
- Path: packages/engine/src/systems/crisisSystem.ts + test
- Files: 2
- Purpose: Crisis event triggering and player choice resolution (RESOLVE_CRISIS). Data-driven events with EffectDef choices.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: crisisSystem

### System: victorySystem
- Path: packages/engine/src/systems/victorySystem.ts + test
- Files: 2
- Purpose: Win condition checking for 7 victory paths (domination, science, culture, economic, diplomacy, military, score).
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-TESTS-L1]
- Public exports: victorySystem

### System: wonderPlacementSystem
- Path: packages/engine/src/systems/wonderPlacementSystem.ts + test
- Files: 2
- Purpose: Pure validation of world-wonder placement geographic rules from data/wonders/placement-rules.ts.
- Standards: [S-SYSTEM-PURE-FUNCTION, S-SYSTEM-INDEPENDENT, S-ENGINE-PURE, S-TESTS-L1]
- Public exports: isWonderPlacementValid

### System: aiSystem (NOT in DEFAULT_SYSTEMS pipeline)
- Path: packages/engine/src/systems/aiSystem.ts + test
- Files: 2
- Purpose: AI action generation utility (state) => GameAction[]. Called separately by GameProvider for AI turns. Personality-driven decisions.
- Standards: [S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-SEEDED-RNG, S-REGISTRY-PATTERN, S-TESTS-L1]
- Public exports: generateAIActions

### Additional System Tests (parity + regression)
- Path: packages/engine/src/systems/__tests__/ (44 files total)
- Includes: helpers.ts (test factories), parity tests for combat/flanking/ZoC/healing/population/production/diplomacy/age-transitions, pantheon-uniqueness, production-cancel, production-lockedTile, governments, rulebook-bugs-v3
- Standards: [S-TESTS-L1, S-CONCRETE-ASSERTIONS, S-DETERMINISM]

---

## Hex Math (packages/engine/src/hex/)

- Files: 5 source + 3 tests = 8 total
- Standards: [S-ENGINE-PURE, S-NAMED-EXPORTS, S-READONLY, S-TESTS-L1]

### HexMath + Pathfinding + MapGenerator + TerrainCost
- HexMath.ts: Axial coordinate math (coordToKey, neighbors, distance, ring, range, lineDraw, hexEquals, HEX_DIRECTIONS)
- Pathfinding.ts: A* pathfinding (findPath, getReachable) with CostFn type
- MapGenerator.ts: Procedural seeded map generation (generateMap, createTerrainRegistries) via fractal noise
- TerrainCost.ts: Movement cost per tile (getMovementCost) data-driven via GameConfig
- hex/index.ts: Barrel re-export

---

## Registry (packages/engine/src/registry/)

- Files: 2 source + 1 test = 3 total
- Path: packages/engine/src/registry/Registry.ts
- Purpose: Generic typed registry class Registry<T>. Methods: register (throws on duplicate id), get, getAll, has, size, clear. Used for terrain, feature, unit, resource lookups in GameProvider.
- Standards: [S-ENGINE-PURE, S-REGISTRY-PATTERN, S-NAMED-EXPORTS, S-TESTS-L1]
- Public exports: Registry

---

## State Utilities (packages/engine/src/state/)

- Files: 20 source + 21 tests = 41 total
- Standards: [S-ENGINE-PURE, S-GAMESTATE-IMMUTABLE, S-NAMED-EXPORTS, S-SEEDED-RNG]

- SeededRng.ts: Deterministic mulberry32 RNG (nextRandom, randomInt, shuffle, createRng, noise2D, smoothNoise2D, fractalNoise2D). RngState = { seed, counter }. Standards: [S-SEEDED-RNG]
- YieldCalculator.ts: calculateCityYields(city, state) aggregates terrain, features, improvements, buildings, effects. getSpecializationYields for town bonuses.
- CombatPreview.ts: Pre-battle combat preview (calculateCombatPreview, calculateCityCombatPreview). getAttackableUnits, getAttackableCities. Pure read-only.
- SaveLoad.ts: serializeState => JSON (handles Map/Set). deserializeState => GameState. Standards: [S-TESTS-L4]
- GameConfigFactory.ts: createGameConfig() assembles GameConfig ReadonlyMaps from all data barrels. Called once at initialization.
- GameInitializer.ts: createInitialState(GameSetupConfig) => GameState. Sets up players, generates map, seeds RNG.
- EffectUtils.ts: getActiveEffects(state, playerId) collects effects from civ, leader, legacy bonuses. Query utilities shared by all systems.
- BuildingPlacementValidator.ts: validateBuildingPlacement(city, buildingId, tile, state) => PlacementResult. Stacks urbanBuildingSystem + wonderPlacementSystem rules.
- DistrictAdjacency.ts: Civ VII-style adjacency bonuses and +50% Quarter amplification for Districts Overhaul. Not yet in main yield pipeline.
- TileContents.ts: getTileContents(coord, state) => TileContents -- unified tile snapshot (units, city, district, improvement, resource). getSelectionCycle, hasStackedEntities.
- PromotionUtils.ts: Shared promotion query utilities. Shared by promotionSystem and combatSystem (avoids cross-system imports).
- ResourceChangeCalculator.ts: calculateResourceChanges(state, playerId) => ResourceChangeSummary. Per-turn income preview.
- LegacyPaths.ts: Pure scoring for Civ VII Legacy Paths (4 axes x 3 ages = 12 paths). scoreLegacyPaths(state, playerId).
- MilestoneTracker.ts: Queryable superset of LegacyPaths -- emits flat list of satisfied milestones per player.
- MapAnalytics.ts: Pure map-level analytics (landRatio, passableLandTiles, terrainFrequency). NOT in engine barrel.
- CombatAnalytics.ts: Pure cross-player military strength snapshots. NOT in engine barrel.
- EconomyAnalytics.ts: Pure cross-player economic rankings (gold, score, cities, population). NOT in engine barrel.
- UrbanPlacementHints.ts: Pure heuristic scoring for AI building placement via adjacency + validity signals.
- CityYieldsWithAdjacency.ts: Stacked yield calculator composing YieldCalculator with DistrictAdjacency. M11 follow-up.
- state/index.ts: Barrel re-export for SeededRng, SaveLoad, YieldCalculator, GameConfigFactory, PromotionUtils.
## Types (packages/engine/src/types/)

- Files: 21
- Standards: [S-ENGINE-PURE, S-NAMED-EXPORTS, S-READONLY, S-DISCRIMINATED-UNIONS]
- Key: GameState.ts owns GameState, GameAction (discriminated union on type), TurnPhase, Age, HexTile, HexMap, UnitState, CityState, PlayerState, DiplomacyState, VictoryState, AgeState, RngState, System, EffectDef (discriminated union on type), ActiveEffect. GameConfig.ts has ReadonlyMap fields per content type. HexCoord.ts, Ids.ts, Yields.ts (EMPTY_YIELDS, addYields), District.ts, DistrictOverhaul.ts (UrbanTileV2/QuarterV2), Government.ts, Religion.ts, Commander.ts, Governor.ts, AIPersonality.ts, Building.ts, Civic.ts, Improvement.ts, Promotion.ts, Resource.ts, Technology.ts, Terrain.ts, Unit.ts

---

## GameEngine

- Path: packages/engine/src/GameEngine.ts
- Files: 1
- Purpose: Orchestrates DEFAULT_SYSTEMS pipeline. applyAction(state, action) runs all 29 systems in sequence. Called by GameProvider on every dispatch.
- Standards: [S-ENGINE-PURE, S-SYSTEM-PURE-FUNCTION, S-GAMESTATE-IMMUTABLE, S-NAMED-EXPORTS]
- Public exports: GameEngine, DEFAULT_SYSTEMS

---

## Effects (packages/engine/src/effects/)

- Files: 1 (.gitkeep -- empty placeholder directory)
- Purpose: Reserved for future effect evaluation modules. EffectDef types in types/GameState.ts. Evaluation in state/EffectUtils.ts. effectSystem.ts in systems/.
- Standards: [S-ENGINE-PURE]

---

## Engine Barrel

- Path: packages/engine/src/index.ts
- Files: 1
- Purpose: Master barrel export for @hex/engine. All types, hex math, registry, state utilities, GameEngine, all systems, all data content. Consumed by packages/web via @hex/engine alias.
- Standards: [S-NAMED-EXPORTS, S-IMPORT-BOUNDARIES]

---

## Data (packages/engine/src/data/)

- Files: 55 source + 15 tests = 70 total
- Standards: [S-DATA-PURE, S-REGISTRY-PATTERN, S-ADD-CONTENT-2-EDIT, S-READONLY, S-NAMED-EXPORTS]

### Civilizations (5 files)
- antiquity-civs.ts, exploration-civs.ts, modern-civs.ts, index.ts, types.ts
- Content: 6 antiquity (ROME, EGYPT, GREECE, PERSIA, INDIA, CHINA), 6 exploration (SPAIN, ENGLAND, FRANCE, OTTOMAN, JAPAN, MONGOLIA), 4 modern (AMERICA, GERMANY, RUSSIA, BRAZIL)
- Barrel: ALL_CIVILIZATIONS, ALL_ANTIQUITY_CIVS, ALL_EXPLORATION_CIVS, ALL_MODERN_CIVS + named exports

### Leaders (3 files)
- all-leaders.ts, index.ts, types.ts. Leaders persist across ages (leader-civ separation mechanic). Barrel: ALL_LEADERS

### Units (5 files)
- antiquity-units.ts, exploration-units.ts, modern-units.ts, index.ts, promotions.ts
- Antiquity: WARRIOR, SLINGER, ARCHER, SCOUT, SPEARMAN, CHARIOT, SETTLER, BUILDER, BATTERING_RAM, GALLEY, MERCHANT
- Exploration: SWORDSMAN, CROSSBOWMAN, PIKEMAN, HORSEMAN, KNIGHT, MUSKETMAN, BOMBARD, CANNON, SIEGE_TOWER, CARAVEL
- Modern: INFANTRY, MACHINE_GUN, TANK, FIGHTER, ROCKET_ARTILLERY, IRONCLAD, BIPLANE
- Promotions: BATTLECRY, TORTOISE, VOLLEY, ARROWS, CHARGE, PURSUIT, BLITZ, LOGISTICS, FLANKING, BREAKTHROUGH, ELITE
- Barrel: ALL_UNITS + age-grouped + ALL_PROMOTIONS, PROMOTION_THRESHOLDS

### Technologies (5 files)
- antiquity/index.ts, exploration/index.ts, modern/index.ts, index.ts, types.ts
- Full tech tree across 3 ages. Nodes have cost, prerequisites (DAG), unlocks, treePosition.
- Barrel: ALL_TECHNOLOGIES + age-grouped exports

### Civics (5 files)
- antiquity/index.ts, exploration/index.ts, modern/index.ts, index.ts, types.ts
- CODE_OF_LAWS through FUTURE_CIVIC across 3 ages. 8 antiquity, 8 exploration, 6 modern.
- Barrel: ALL_CIVICS + age-grouped exports + named exports

### Buildings + Wonders (4 files)
- antiquity-buildings.ts, exploration-buildings.ts, modern-buildings.ts, index.ts
- Antiquity: GRANARY, MONUMENT, WALLS, BARRACKS, LIBRARY, MARKET, WATERMILL, WORKSHOP, SHRINE
- Exploration: BANK, UNIVERSITY, STOCK_EXCHANGE, ARMORY, STAR_FORT
- Modern: FACTORY, RESEARCH_LAB, POWER_PLANT, NUCLEAR_PLANT, BROADCAST_TOWER
- Wonders included with isWonder flag. Barrel: ALL_BUILDINGS + age-grouped + named exports

### Districts (4 files)
- antiquity-districts.ts, exploration-districts.ts, modern-districts.ts, index.ts
- Districts per age with placementConstraints and adjacencyYields. Barrel: ALL_DISTRICTS

### Governors (4 files)
- antiquity-governors.ts, exploration-governors.ts, modern-governors.ts, index.ts
- Governors per age with title, specialization, abilities. Barrel: ALL_GOVERNORS

### Religion: Pantheons + Beliefs (4 files)
- pantheons.ts, founder-beliefs.ts, follower-beliefs.ts, index.ts
- Pantheons (faith cost 25), founder beliefs, follower beliefs. Per-belief uniqueness enforced. Barrel: ALL_PANTHEONS

### Governments + Policies (3 files)
- governments.ts, policies.ts, index.ts
- Government types (unlockCivic prerequisite, policy slot counts). Policies per category (military, economic, diplomatic, wildcard). Barrel: ALL_GOVERNMENTS, ALL_POLICIES

### Crises (4 files)
- all-crises.ts, expansion-crises.ts, index.ts, types.ts
- PLAGUE, BARBARIAN_INVASION, GOLDEN_AGE, TRADE_OPPORTUNITY, NATURAL_DISASTER + expansion crises. Trigger conditions + player choices with EffectDef. Barrel: ALL_CRISES

### Commanders (3 files)
- commanders.ts, promotion-trees.ts, index.ts. CommanderUnitDef with role, promotion trees, XP cost.
- Barrel: ALL_COMMANDERS, ALL_COMMANDER_PROMOTIONS, COMMANDER_PROMOTION_XP_COST

### Improvements (1 file)
- index.ts -- ALL_IMPROVEMENTS (farms, mines, lumber mills, camps, fishing boats, plantations, pastures, quarries)

### Resources (1 file)
- index.ts -- ALL_RESOURCES: WHEAT, CATTLE, STONE, IRON, HORSES, NITER, SILK, GEMS, SPICES, WINE + others. Types: bonus/strategic/luxury

### Terrains + Features (3 files)
- base-terrains.ts, features.ts, index.ts
- Base: GRASSLAND, PLAINS, DESERT, TUNDRA, SNOW, COAST, OCEAN, HILLS, MOUNTAINS
- Features: FOREST, JUNGLE, MARSH, FLOODPLAINS, OASIS, REEF
- Each has movementCost, defenseBonus, baseYields, isPassable, isWater. Barrel: ALL_BASE_TERRAINS, ALL_FEATURES

### Wonders (1 file)
- data/wonders/placement-rules.ts: WONDER_PLACEMENT_RULES map with geographic constraints per wonder id

### Data Tests (15 files)
- Path: packages/engine/src/data/__tests__/
- Covers: antiquity-techs-audit, building-stat-parity, civic-catalog-audit, commanders, crises-expansion, exploration-techs-audit, governments, governors-expansion, modern-techs-expansion, pantheons, religion-beliefs, religion-expansion, units-expansion, unit-stat-parity, wonders-expansion
- Standards: [S-DATA-PURE, S-TESTS-L1, S-CONCRETE-ASSERTIONS]

### Engine Integration Tests (1 file)
- packages/engine/src/__tests__/integration-m12.test.ts -- Standards: [S-TESTS-L2]

---

## Web (packages/web/src/)

### Canvas Renderer (packages/web/src/canvas/)

- Files: 8 source + 1 test = 9 total
- Standards: [S-CANVAS-THIN-VIEW, S-IMPORT-BOUNDARIES, S-NAMED-EXPORTS, S-REACT-FUNCTIONAL]

- GameCanvas.tsx: React component owning HTML5 Canvas element. requestAnimationFrame loop, keyboard input (arrows=pan, ESC=deselect), mouse events (click, drag=pan, wheel=zoom), screen-to-hex coordinate conversion via camera.
- HexRenderer.ts: Draws hex grid, terrain, features, units (via UnitIcons), cities, districts, improvements, resources, selection/movement/attack range overlays. hexToPixel/pixelToHex. Uses RenderCache.
- Camera.ts: Pan (drag/arrow keys) and zoom (scroll wheel) state. screenToWorld, worldToScreen, ctx translate/scale transforms. MIN_ZOOM=0.2, MAX_ZOOM=3.0.
- AnimationManager.ts + test: Visual-only animation queue. update(deltaTime) advances animations. Supports UnitMove, MeleeAttack, RangedAttack, DamageFlash, UnitDeath, CityFounded. State is already updated before animations start.
- AnimationRenderer.ts: Draws active animations on top of game canvas. Pure rendering layer.
- AnimationTrigger.ts: Helper functions to trigger animations when actions are dispatched. Bridges dispatch to AnimationManager.
- RenderCache.ts: Performance optimization via offscreen canvas caching for static terrain. Viewport culling via calculateViewportBounds.
- UnitIcons.ts: Draws distinct unit icons on canvas via canvas paths. Per-type with playerColor, isSelected, isFortified, health.

---

### Providers / Hooks

- Files: 3 (GameProvider.tsx + test, useAltKey.ts, useAudio.ts)

#### GameProvider
- Path: packages/web/src/providers/GameProvider.tsx + test
- Purpose: Central React context. Owns game state. dispatch(action) applies through GameEngine and triggers AI turns via processAITurns. Exposes: state, dispatch, lastValidation, clearValidation, selectedUnit, hoveredHex, isAltPressed, selectedCity, selectCity. Creates unit/resource registries at module level. Manages save/load, placement mode, animation detection.
- Standards: [S-REACT-FUNCTIONAL, S-NAMED-EXPORTS, S-IMPORT-BOUNDARIES]
- Public exports: GameProvider, useGame, GameSetupConfig

#### useAltKey
- Path: packages/web/src/hooks/useAltKey.ts
- Purpose: Window-level Alt key tracking hook. Returns true while Alt is held. Resets on keyup OR window blur (prevents stuck state from Alt-Tab). Used by HUD layer to toggle tooltip tiers (compact/detailed).
- Public exports: useAltKey

#### useAudio
- Path: packages/web/src/hooks/useAudio.ts
- Purpose: Audio playback hook wrapping AudioManager. Exposes isInitialized, soundEnabled, musicEnabled, volumes, initialize, playSound, playMusic, stopMusic, toggleSound, toggleMusic, setVolumes.
- Public exports: useAudio, UseAudioReturn

---

### UI Panels (packages/web/src/ui/panels/)

- Files: 21 source + 17 tests = 38 total
- Standards: [S-PANEL-PATTERN, S-PANEL-REGISTRATION, S-PANEL-SHELL-CHROME, S-NO-BOOLEAN-PANEL-STATE, S-ESC-OWNERSHIP-PANEL, S-NO-HARDCODE-COLORS, S-NO-RAW-HEX-CHROME, S-REACT-FUNCTIONAL, S-NAMED-EXPORTS, S-IMPORT-BOUNDARIES]

- PanelManager.tsx + test: Single React context owning activePanel state. API: openPanel, closePanel, togglePanel, isOpen, activePanel. ESC in capture phase (ignores INPUT/TEXTAREA/SELECT focus). Single-slot model.
- PanelShell.tsx + tests: Shared chrome wrapper. Owns title bar, close button (x U+00D7), backdrop (modal), role=dialog, z-index from --panel-z-*, context-menu suppression, data-panel-id/priority/width.
- panelRegistry.ts: PanelId union (17 ids: help, city, tech, civics, diplomacy, log, age, turnSummary, governors, religion, government, commanders, victoryProgress, crisis, improvement, audioSettings, victory). Titles, icons, keyboard shortcuts, priority. Pure data.

#### Panel Components (listed with priority)
- AgeTransitionPanel [modal]: pick new civ on age change
- AudioSettingsPanel [overlay]: audio volume/enable controls
- CityPanel [overlay]: city detail -- population, yields, production, buildings, districts
- CivicTreePanel [overlay]: civic tree for current age
- CommanderPanel [overlay]: commander list, XP, promotion trees
- CrisisPanel [modal]: crisis event choices
- DiplomacyPanel [overlay]: diplomatic relations, war/peace, endeavors
- EventLogPanel [info]: game event history
- GovernmentPanel [overlay]: government selection, policy slotting
- GovernorPanel [overlay]: governor recruitment, assignment, promotion
- HelpPanel [overlay]: controls list and keyboard shortcuts
- ImprovementPanel [overlay]: builder improvement selection
- ReligionPanel [overlay]: pantheon selection, religion founding, belief selection
- SetupScreen: game setup (pre-game, not in panelRegistry)
- TechTreePanel [overlay]: tech tree for current age
- TurnSummaryPanel [modal]: end-of-turn summary
- VictoryPanel [modal]: victory announcement
- VictoryProgressPanel [modal]: victory conditions progress

---

### UI HUD / Overlays

- Files: 5 source + 5 tests = 10 total
- Standards: [S-HUD-PATTERN, S-HUD-REGISTRATION, S-TOOLTIP-SHELL-CHROME, S-ESC-OWNERSHIP-HUD, S-STACK-CYCLE, S-NO-OCCLUDE, S-GAME-FEEL-INVARIANTS]

- HUDManager.tsx + test: Single context owning HUD-level state. API: register, dismiss, dismissAll, cycleIndex, advanceCycle, resetCycle, isActive. ESC in capture phase after PanelManagerProvider.
- TooltipShell.tsx + test: Shared chrome for tooltip-shaped overlays. anchor-to-screen, user-select:none, context-menu suppression, aria-hidden, data-hud-id/position/tier, pointer-events. Positions: floating, fixed-corner, side.
- hudRegistry.ts: HUDElementId union (10 ids: tileTooltip, combatPreview, notification, validationFeedback, turnTransition, minimap, enemyActivitySummary, urbanPlacementHint, tooltip, yieldsToggle). Pure data.
- TooltipOverlay.tsx + 2 tests: Main tile tooltip. Stack-cycle via HUDManager.cycleIndex. Compact/detailed tiers.
- UrbanPlacementHintBadge.tsx + test: Building placement score overlay during placement mode.

---

### UI Components (packages/web/src/ui/components/)

- Files: 13 source + 1 test = 14 total
- Standards: [S-HUD-PATTERN, S-NO-HARDCODE-COLORS, S-REACT-FUNCTIONAL, S-NAMED-EXPORTS, S-GAME-FEEL-INVARIANTS]

- CombatHoverPreview [combatPreview, fixed-corner, sticky]: combat preview on hover over attackable target
- EnemyActivitySummary [enemyActivitySummary, fixed-corner, sticky]: post-AI-turn summary
- Minimap [minimap, always-mounted]: map overview. panel-tokens chrome directly, data-hud-id=minimap
- Notifications [notification, toast, 5000ms]: auto-dismiss toasts along right edge
- TurnTransition [turnTransition, fixed-corner, 1200ms]: animated interstitial between turns
- ValidationFeedback [validationFeedback, toast, 2500ms, sticky]: shows lastValidation rejection
- YieldsToggle [yieldsToggle]: floating toggle for yields display
- Tooltip, tooltips/: BuildingTooltip, TechnologyTooltip, TerrainTooltip, ResourceTooltip, UnitTooltip
- ActionButton, BuildingCard, CombatPreviewPanel, ResourceChangeBadge, UnitCard: shared UI components

---

### Layout (packages/web/src/ui/layout/)

- Files: 2 source + 1 test = 3 total
- Standards: [S-PANEL-PATTERN, S-DATA-TRIGGER-ATTR, S-NO-HARDCODE-COLORS, S-REACT-FUNCTIONAL]

- TopBar.tsx + test: navigation with panel triggers (data-panel-trigger attrs), resource display, end-turn button
- BottomBar.tsx: selected unit/city info and context-sensitive action buttons

---

### Styles (packages/web/src/styles/)

- Files: 2
- Standards: [S-NO-HARDCODE-COLORS, S-PANEL-PATTERN, S-HUD-PATTERN]

- panel-tokens.css: --panel-bg, --panel-border, --panel-shadow, --panel-radius, --panel-padding-*, --panel-title-color, --panel-text-color, --panel-muted-color, --panel-accent-gold, --panel-backdrop, --panel-z-info(90)/overlay(110)/modal(210), --panel-status-* diplomacy palette
- hud-tokens.css: --hud-bg, --hud-border, --hud-radius, --hud-padding-*, --hud-text-*, --hud-z-fixed-corner(120)/toast(140)/tooltip(150), --hud-accent-*, --hud-tooltip-* semantic palette, --hud-notification-*, --hud-combat-*, --hud-validation-*, --hud-turn-transition-*, --hud-placement-*, --hud-z-floating-control(110)
- packages/web/src/index.css: :root color tokens, .game-app user-select:none, context menu suppression, Tailwind v4

---

### App Entry, Audio, Utilities

- App.tsx: Root component. Mounts GameProvider, PanelManagerProvider, HUDManagerProvider. Lazy-loads 13 panels. Auto-opens help panel first game start. Auto-opens victory modal on winner. Wires PANEL_REGISTRY keyboard shortcuts.
- main.tsx: React 19 root render entry.
- Audio/AudioManager.ts: Full audio system. @ts-nocheck. Sound effects, background music, volume controls. Falls back to SoundGenerator.
- Audio/SoundGenerator.ts: Web Audio API synthesizer for fallback sounds.
- utils/hexMath.ts: Web-side hex pixel math (hexToPixel, pixelToHex). HEX_SIZE=32. Pointy-top orientation. Separate from engine HexMath.

---

### E2E Tests (packages/web/e2e/)

- Files: 17 spec files + playwright.config.ts = 18 total
- Standards: [S-TESTS-L3, S-CONCRETE-ASSERTIONS, S-DETERMINISM, S-GAME-FEEL-INVARIANTS, S-STACK-CYCLE]
- Specs: ai-and-map, ai-behavior, ai-parity-emissions, building-placement-flow, diplomacy, game, gameplay, gameplay-parity, gameplay-parity-strict, hud (M37-B duplicate-content regression guard), interaction, keyboard-shortcuts, robustness, save-load, selection, setup-screen, victory-flow

### Unit Tests (web)

- Files: 26 total (17 panel + 5 HUD + 1 canvas + 1 provider + 1 component + 1 layout)
- Standards: [S-TESTS-L1, S-CONCRETE-ASSERTIONS, S-DETERMINISM]

---

## Meta / Ops (.claude/)

### Rules (.claude/rules/) -- 7 files
- architecture.md, data-driven.md, import-boundaries.md, panels.md, tech-conventions.md, testing.md, ui-overlays.md

### Skills (.claude/skills/) -- 7 SKILL.md files
- add-content, add-hud-element, add-panel, build, consistency-audit (+ references/audit-layers.md), test, verify

### Hooks (.claude/hooks/) -- 6 shell scripts
- check-edited-file.sh (PostToolUse -- import boundary enforcement, hook-enforced critical)
- inject-rules.sh (SubagentStart -- injects rules context)
- log-bash-failure.sh (PostToolUseFailure -- logs failures)
- run-tests.sh (test runner with marker, --module engine/web support)
- session-start.sh (SessionStart -- workspace health check)
- stop-nudge-verify.sh (Stop -- nudges /verify after UI changes)

### Workflow (.claude/workflow/) -- 9 files + design/
- CLAUDE.md: 6-phase TDD workflow (Design, Scaffold, Tests Red, Implement Green, E2E Verify, Review)
- STATUS.md, audit-status.md, issues.md (auto-populated violations log), ux-issues.md
- design/ (22 files): architecture design docs, gap analyses, system design plans

### CLAUDE.md Files
- Root CLAUDE.md: project overview, commands, full architecture reference, panel/HUD conventions, state flow, import boundaries, TDD workflow
- .claude/workflow/CLAUDE.md: 6-phase TDD process detail, bug-fix fast path, artifact locations
- Note: No package-level CLAUDE.md files exist at packages/engine/CLAUDE.md or packages/web/CLAUDE.md

---

## Cross-Cutting Concerns

### i18n
- Status: NONE. No internationalization infrastructure. All text hardcoded English. Not mentioned in any rules.

### a11y
- Status: PARTIAL. PanelShell provides role=dialog and aria-label. TooltipShell sets aria-hidden on compact tier. Close buttons have aria-label. No broader a11y audit. No color contrast or screen reader testing rules.

### Build / Deploy Pipeline
- npm workspaces monorepo (packages/engine + packages/web)
- Engine: tsc (TypeScript compile, ESM, type:module)
- Web: tsc -b && vite build (Tailwind v4 via @tailwindcss/vite)
- Dev server: Vite port 5174
- Testing: Vitest (both packages), Playwright for E2E
- Manual chunk splitting: react-vendor chunk, chunkSizeWarningLimit 700kb
- Lazy loading: 13 heavy panels via React.lazy in App.tsx
- No CI/CD, no linter/formatter config (noted in CLAUDE.md), no deployment target.

### Windows MINGW64 Specifics
- Standards: [S-WINDOWS-ENV]
- Use python not python3; forward slashes in paths; node -e for JSON parsing; MSYS_NO_PATHCONV=1; port 5174
