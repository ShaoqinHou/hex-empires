import type { GameState, GameAction, UnitState, CityState, TownSpecialization } from '../types/GameState';
import { coordToKey, neighbors, distance } from '../hex/HexMath';
import { getMovementCost } from '../hex/TerrainCost';
import type { HexCoord } from '../types/HexCoord';
import { ALL_IMPROVEMENTS } from '../data/improvements';

/**
 * AISystem generates actions for non-human players.
 * Uses priority-based decision making:
 * 1. Research (always pick the cheapest available tech)
 * 2. City management (set production based on needs)
 * 3. Settler movement and city founding
 * 4. Military movement and combat
 * 5. Exploration
 */
export function generateAIActions(state: GameState): ReadonlyArray<GameAction> {
  const player = state.players.get(state.currentPlayerId);
  if (!player || player.isHuman) return [];

  const actions: GameAction[] = [];
  const ourCities = [...state.cities.values()].filter(c => c.owner === player.id);
  const ourUnits = [...state.units.values()].filter(u => u.owner === player.id);
  const militaryUnits = ourUnits.filter(u => {
    const def = state.config.units.get(u.typeId);
    return def && def.category !== 'civilian';
  });

  // 1. Research — pick cheapest unresearched tech with met prerequisites
  if (!player.currentResearch) {
    const techId = pickBestTech(state);
    if (techId) {
      actions.push({ type: 'SET_RESEARCH', techId });
    }
  }

  // 2. City production — based on current needs
  for (const city of ourCities) {
    if (city.settlementType === 'town') {
      // Towns must purchase with gold — pick something affordable
      const itemId = pickProduction(state, city, ourCities.length, militaryUnits.length);
      const itemType = state.config.buildings.has(itemId) ? 'building' as const : 'unit' as const;
      const cost = (state.config.units.get(itemId)?.cost ?? state.config.buildings.get(itemId)?.cost ?? 100) * 2;
      if (player.gold >= cost) {
        actions.push({ type: 'PURCHASE_ITEM', cityId: city.id, itemId, itemType });
      }

      // Set town specialization if not set
      if (!city.specialization) {
        const specialization = pickTownSpecialization(state, city, player);
        if (specialization) {
          actions.push({ type: 'SET_SPECIALIZATION', cityId: city.id, specialization });
        }
      }
    } else if (city.productionQueue.length === 0) {
      const itemId = pickProduction(state, city, ourCities.length, militaryUnits.length);
      const itemType = state.config.buildings.has(itemId) ? 'building' as const : 'unit' as const;
      actions.push({ type: 'SET_PRODUCTION', cityId: city.id, itemId, itemType });
    }
  }

  // 3. Process each unit
  for (const unit of ourUnits) {
    if (unit.movementLeft <= 0) continue;
    const unitDef = state.config.units.get(unit.typeId);
    if (!unitDef) continue;

    if (unitDef.category === 'civilian') {
      // Units with found_city ability: move to good spot and found city
      if (unitDef.abilities.includes('found_city') && ourCities.length < 4) {
        const founded = tryFoundCity(state, unit, ourCities, actions);
        if (!founded) {
          // Move toward a good city location
          moveTowardGoodCitySpot(state, unit, ourCities, actions);
        }
      }
      // Builders: build improvements on nearby tiles
      else if (unitDef.abilities.includes('build_improvement')) {
        const built = tryBuildImprovement(state, unit, player, ourCities, actions);
        if (!built) {
          // Move toward tiles that need improvements
          moveTowardImprovementSpot(state, unit, player, ourCities, actions);
        }
      }
    } else {
      // Military: attack nearby enemy units first, then enemy cities, or explore
      const attacked = tryAttackNearby(state, unit, actions);
      if (!attacked) {
        const attackedCity = tryAttackNearbyCity(state, unit, actions);
        if (!attackedCity) {
          moveStrategically(state, unit, ourCities, actions);
        }
      }
    }
  }

  actions.push({ type: 'END_TURN' });
  return actions;
}

/** Pick the cheapest available tech with met prerequisites */
function pickBestTech(state: GameState): string | null {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const researched = new Set(player.researchedTechs);
  let bestTech: string | null = null;
  let bestCost = Infinity;

  for (const [techId, tech] of state.config.technologies) {
    if (researched.has(techId)) continue;
    if (tech.age !== player.age) continue; // only research current age techs
    const prereqsMet = tech.prerequisites.every(p => researched.has(p));
    if (!prereqsMet) continue;
    if (tech.cost < bestCost) {
      bestCost = tech.cost;
      bestTech = techId;
    }
  }

  return bestTech;
}

/** Pick what to produce based on game state */
function pickProduction(state: GameState, city: CityState, cityCount: number, militaryCount: number): string {
  // Priority: settler if few cities
  if (cityCount < 3 && !hasUnitAbility(state, 'found_city')) {
    // Find cheapest unit with found_city ability
    const settler = findCheapestUnitByAbility(state, 'found_city');
    if (settler) return settler;
  }

  // Check for useful buildings not yet built
  const player = state.players.get(state.currentPlayerId);
  const age = player?.age ?? 'antiquity';
  for (const [buildingId, building] of state.config.buildings) {
    if (building.age !== age) continue;
    if (city.buildings.includes(buildingId)) continue;
    // Prioritize economy buildings
    if (building.yields.food && building.yields.food > 0) return buildingId;
    if (building.yields.production && building.yields.production > 0) return buildingId;
    if (building.yields.science && building.yields.science > 0) return buildingId;
  }

  // Default: produce cheapest melee military unit for current age
  if (militaryCount < cityCount * 2) {
    const military = findCheapestMilitary(state, age);
    if (military) return military;
  }

  return findCheapestMilitary(state, age) ?? 'warrior';
}

function hasUnitAbility(state: GameState, ability: string): boolean {
  for (const unit of state.units.values()) {
    if (unit.owner !== state.currentPlayerId) continue;
    const def = state.config.units.get(unit.typeId);
    if (def?.abilities.includes(ability)) return true;
  }
  return false;
}

function findCheapestUnitByAbility(state: GameState, ability: string): string | null {
  const player = state.players.get(state.currentPlayerId);
  const age = player?.age ?? 'antiquity';
  let cheapest: string | null = null;
  let cheapestCost = Infinity;
  for (const [id, def] of state.config.units) {
    if (def.age !== age) continue;
    if (!def.abilities.includes(ability)) continue;
    if (def.cost < cheapestCost) { cheapestCost = def.cost; cheapest = id; }
  }
  return cheapest;
}

function findCheapestMilitary(state: GameState, age: string): string | null {
  let cheapest: string | null = null;
  let cheapestCost = Infinity;
  for (const [id, def] of state.config.units) {
    if (def.age !== age) continue;
    if (def.category === 'civilian' || def.category === 'religious') continue;
    if (def.combat <= 0 && def.rangedCombat <= 0) continue;
    if (def.cost < cheapestCost) { cheapestCost = def.cost; cheapest = id; }
  }
  return cheapest;
}

/** Try to found a city at current position */
function tryFoundCity(state: GameState, settler: UnitState, ourCities: CityState[], actions: GameAction[]): boolean {
  const pos = settler.position;
  const tile = state.map.tiles.get(coordToKey(pos));
  if (!tile) return false;

  // Check terrain suitability
  const terrain = state.config.terrains.get(tile.terrain);
  if (!terrain || terrain.isWater) return false;
  if (tile.feature) {
    const featureDef = state.config.features.get(tile.feature);
    if (featureDef?.blocksMovement) return false;
  }

  // Check minimum distance from existing cities (hex distance >= 4)
  for (const city of state.cities.values()) {
    if (distance(pos, city.position) < 4) return false;
  }

  actions.push({ type: 'FOUND_CITY', unitId: settler.id, name: `AI City ${ourCities.length + 1}` });
  return true;
}

/** Move settler toward a good city location */
function moveTowardGoodCitySpot(state: GameState, settler: UnitState, ourCities: CityState[], actions: GameAction[]): void {
  // Find a land tile far enough from all cities
  let bestTarget: HexCoord | null = null;
  let bestScore = -Infinity;

  // Sample nearby tiles
  for (const n of neighbors(settler.position)) {
    for (const nn of neighbors(n)) {
      const key = coordToKey(nn);
      const tile = state.map.tiles.get(key);
      if (!tile) continue;
      const terrain = state.config.terrains.get(tile.terrain);
      if (!terrain || terrain.isWater) continue;
      if (tile.feature && state.config.features.get(tile.feature)?.blocksMovement) continue;

      // Score: prefer tiles far from existing cities, with good terrain
      let score = 0;
      for (const city of state.cities.values()) {
        score += Math.min(10, distance(nn, city.position));
      }
      score += terrain.baseYields.food + terrain.baseYields.production;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = nn;
      }
    }
  }

  if (bestTarget) {
    const step = getOneStepToward(settler.position, bestTarget, state);
    if (step) {
      actions.push({ type: 'MOVE_UNIT', unitId: settler.id, path: [step] });
    }
  }
}

/** Try to attack an adjacent enemy */
function tryAttackNearby(state: GameState, unit: UnitState, actions: GameAction[]): boolean {
  const unitDef = state.config.units.get(unit.typeId);
  const attackRange = unitDef?.range ?? 0;
  const maxRange = attackRange > 0 ? attackRange : 1;

  let bestTarget: UnitState | null = null;
  let bestScore = -Infinity;

  for (const enemy of state.units.values()) {
    if (enemy.owner === unit.owner) continue;
    const dist = distance(unit.position, enemy.position);
    if (dist > maxRange) continue;

    // Prefer low-health targets and high-value targets
    const enemyDef = state.config.units.get(enemy.typeId);
    const score = (100 - enemy.health) + (enemyDef?.cost ?? 0) / 10;
    if (score > bestScore) {
      bestScore = score;
      bestTarget = enemy;
    }
  }

  if (bestTarget) {
    actions.push({ type: 'ATTACK_UNIT', attackerId: unit.id, targetId: bestTarget.id });
    return true;
  }
  return false;
}

/** Try to attack an adjacent enemy city */
function tryAttackNearbyCity(state: GameState, unit: UnitState, actions: GameAction[]): boolean {
  const unitDef = state.config.units.get(unit.typeId);
  const attackRange = unitDef?.range ?? 0;
  const maxRange = attackRange > 0 ? attackRange : 1;

  let bestTarget: CityState | null = null;
  let bestScore = -Infinity;

  for (const city of state.cities.values()) {
    if (city.owner === unit.owner) continue;
    const dist = distance(unit.position, city.position);
    if (dist > maxRange) continue;

    // Prefer low-defense cities
    const score = (200 - city.defenseHP) + city.population * 5;
    if (score > bestScore) {
      bestScore = score;
      bestTarget = city;
    }
  }

  if (bestTarget) {
    actions.push({ type: 'ATTACK_CITY', attackerId: unit.id, cityId: bestTarget.id });
    return true;
  }
  return false;
}

/** Move military units strategically */
function moveStrategically(state: GameState, unit: UnitState, ourCities: CityState[], actions: GameAction[]): void {
  // Priority 1: Move toward nearest enemy
  let nearestEnemy: HexCoord | null = null;
  let nearestDist = Infinity;
  for (const enemy of state.units.values()) {
    if (enemy.owner === unit.owner) continue;
    const d = distance(unit.position, enemy.position);
    if (d < nearestDist) {
      nearestDist = d;
      nearestEnemy = enemy.position;
    }
  }

  // Priority 2: If no nearby enemy, defend cities
  if (!nearestEnemy || nearestDist > 10) {
    if (ourCities.length > 0) {
      // Move toward least-defended city
      let leastDefended: CityState | null = null;
      let fewestDefenders = Infinity;
      for (const city of ourCities) {
        const defenders = [...state.units.values()].filter(
          u => u.owner === unit.owner && distance(u.position, city.position) <= 2
        ).length;
        if (defenders < fewestDefenders) {
          fewestDefenders = defenders;
          leastDefended = city;
        }
      }
      if (leastDefended && distance(unit.position, leastDefended.position) > 2) {
        nearestEnemy = leastDefended.position;
      }
    }
  }

  // Priority 3: Explore — move away from known territory
  if (!nearestEnemy) {
    const ns = neighbors(unit.position);
    for (const n of ns) {
      const tile = state.map.tiles.get(coordToKey(n));
      if (tile && !state.config.terrains.get(tile.terrain)?.isWater && !(tile.feature && state.config.features.get(tile.feature)?.blocksMovement)) {
        nearestEnemy = n;
        break;
      }
    }
  }

  if (nearestEnemy) {
    const step = getOneStepToward(unit.position, nearestEnemy, state);
    if (step) {
      actions.push({ type: 'MOVE_UNIT', unitId: unit.id, path: [step] });
    }
  }
}

function getOneStepToward(from: HexCoord, target: HexCoord, state: GameState): HexCoord | null {
  const ns = neighbors(from);
  let bestDist = distance(from, target);
  let bestHex: HexCoord | null = null;

  for (const n of ns) {
    const tile = state.map.tiles.get(coordToKey(n));
    if (!tile) continue;
    const cost = getMovementCost(tile);
    if (cost === null) continue;

    // Don't move into tiles with any units
    let occupied = false;
    for (const unit of state.units.values()) {
      if (coordToKey(unit.position) === coordToKey(n)) {
        occupied = true;
        break;
      }
    }
    if (occupied) continue;

    const d = distance(n, target);
    if (d < bestDist) {
      bestDist = d;
      bestHex = n;
    }
  }

  return bestHex;
}

/** Try to build an improvement on current or adjacent tile */
function tryBuildImprovement(state: GameState, builder: UnitState, player: any, ourCities: CityState[], actions: GameAction[]): boolean {
  // Check current tile first
  const currentTile = state.map.tiles.get(coordToKey(builder.position));
  if (!currentTile || currentTile.improvement) {
    // Current tile already has improvement or is invalid, try adjacent tiles
    const adjacentTiles = neighbors(builder.position);
    for (const adj of adjacentTiles) {
      const tile = state.map.tiles.get(coordToKey(adj));
      if (!tile || tile.improvement) continue;

      const improvement = pickBestImprovement(state, tile, player);
      if (improvement) {
        // Need to move to this tile first
        actions.push({ type: 'MOVE_UNIT', unitId: builder.id, path: [adj] });
        actions.push({ type: 'BUILD_IMPROVEMENT', unitId: builder.id, tile: adj, improvementId: improvement });
        return true;
      }
    }
    return false;
  }

  // Try to build on current tile
  const improvement = pickBestImprovement(state, currentTile, player);
  if (improvement) {
    actions.push({ type: 'BUILD_IMPROVEMENT', unitId: builder.id, tile: builder.position, improvementId: improvement });
    return true;
  }

  return false;
}

/** Pick the best improvement for a tile based on its features/resources */
function pickBestImprovement(state: GameState, tile: any, player: any): string | null {
  let bestImprovement: string | null = null;
  let bestPriority = 0;

  for (const imp of ALL_IMPROVEMENTS) {
    // Check tech prerequisite
    if (imp.requiredTech && !player.researchedTechs.includes(imp.requiredTech)) {
      continue;
    }

    // Check terrain prerequisite
    if (imp.prerequisites.terrain && !imp.prerequisites.terrain.includes(tile.terrain)) {
      continue;
    }

    // Check feature prerequisite
    if (imp.prerequisites.feature) {
      if (!tile.feature || !imp.prerequisites.feature.includes(tile.feature)) {
        continue;
      }
    }

    // Check resource prerequisite
    if (imp.prerequisites.resource) {
      if (!tile.resource || !imp.prerequisites.resource.includes(tile.resource)) {
        continue;
      }
    }

    // Calculate priority based on yields
    let priority = 0;
    if (imp.yields.food) priority += imp.yields.food * 3;
    if (imp.yields.production) priority += imp.yields.production * 2;
    if (imp.yields.gold) priority += imp.yields.gold * 2;
    if (imp.yields.science) priority += imp.yields.science * 4;

    // Resource improvements have highest priority
    if (imp.prerequisites.resource) {
      priority += 20;
    }

    if (priority > bestPriority) {
      bestPriority = priority;
      bestImprovement = imp.id;
    }
  }

  return bestImprovement;
}

/** Move builder toward tiles that need improvements */
function moveTowardImprovementSpot(state: GameState, builder: UnitState, player: any, ourCities: CityState[], actions: GameAction[]): void {
  let bestTarget: HexCoord | null = null;
  let bestScore = -Infinity;

  // Look at tiles within 2 hex range
  const range = 2;
  const nearbyHexes = [builder.position];
  for (let i = 0; i < range; i++) {
    const currentLength = nearbyHexes.length;
    for (let j = 0; j < currentLength; j++) {
      const ns = neighbors(nearbyHexes[j]);
      for (const n of ns) {
        if (!nearbyHexes.some(h => h.q === n.q && h.r === n.r)) {
          nearbyHexes.push(n);
        }
      }
    }
  }

  // Score each tile
  for (const hex of nearbyHexes) {
    const tile = state.map.tiles.get(coordToKey(hex));
    if (!tile || tile.improvement) continue;

    const improvement = pickBestImprovement(state, tile, player);
    if (!improvement) continue;

    // Score: prioritize by distance and improvement value
    const dist = distance(builder.position, hex);
    let score = 100 - dist * 10;

    // Bonus for tiles near cities
    for (const city of ourCities) {
      if (distance(hex, city.position) <= 3) {
        score += 20;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestTarget = hex;
    }
  }

  if (bestTarget) {
    const step = getOneStepToward(builder.position, bestTarget, state);
    if (step) {
      actions.push({ type: 'MOVE_UNIT', unitId: builder.id, path: [step] });
    }
  }
}

/** Pick the best town specialization based on tile yields and strategic needs */
function pickTownSpecialization(state: GameState, city: CityState, player: any): TownSpecialization | null {
  // Analyze territory tiles
  let foodScore = 0;
  let productionScore = 0;
  let goldScore = 0;

  for (const hexKey of city.territory) {
    const tile = state.map.tiles.get(hexKey);
    if (!tile) continue;

    const terrain = state.config.terrains.get(tile.terrain);
    if (!terrain) continue;

    foodScore += terrain.baseYields.food ?? 0;
    productionScore += terrain.baseYields.production ?? 0;
    goldScore += terrain.baseYields.gold ?? 0;

    // Check for features
    if (tile.feature) {
      const feature = state.config.features.get(tile.feature);
      if (feature) {
        const featureYields = feature.yieldModifiers ?? {};
        foodScore += featureYields.food ?? 0;
        productionScore += featureYields.production ?? 0;
        goldScore += featureYields.gold ?? 0;
      }
    }

    // Check for improvements
    if (tile.improvement) {
      const imp = ALL_IMPROVEMENTS.find(i => i.id === tile.improvement);
      if (imp) {
        foodScore += imp.yields.food ?? 0;
        productionScore += imp.yields.production ?? 0;
        goldScore += imp.yields.gold ?? 0;
      }
    }
  }

  // Calculate resource needs based on game state
  const cityCount = [...state.cities.values()].filter(c => c.owner === player.id).length;
  const militaryCount = [...state.units.values()].filter(u => u.owner === player.id && u.typeId !== 'settler' && u.typeId !== 'builder').length;

  // Priority: food if growing, production if need military, gold if wealthy
  let bestSpecialization: TownSpecialization | null = null;
  let bestScore = 0;

  // farming_town: prioritize if low food
  const farmingScore = foodScore * 2 + (city.population < 5 ? 10 : 0);
  if (farmingScore > bestScore) {
    bestScore = farmingScore;
    bestSpecialization = 'farming_town';
  }

  // mining_town: prioritize if need military
  const miningScore = productionScore * 2 + (militaryCount < cityCount * 2 ? 10 : 0);
  if (miningScore > bestScore) {
    bestScore = miningScore;
    bestSpecialization = 'mining_town';
  }

  // trade_outpost: prioritize if high gold potential
  const tradeScore = goldScore * 2 + (player.gold > 200 ? 10 : 0);
  if (tradeScore > bestScore) {
    bestScore = tradeScore;
    bestSpecialization = 'trade_outpost';
  }

  // growing_town: for fast population growth
  const growingScore = city.population < 3 ? 20 : 0;
  if (growingScore > bestScore) {
    bestScore = growingScore;
    bestSpecialization = 'growing_town';
  }

  // fort_town: for defense if near enemy
  const nearEnemy = isNearEnemyCity(state, city.position, player.id);
  const fortScore = nearEnemy ? 30 : 0;
  if (fortScore > bestScore) {
    bestScore = fortScore;
    bestSpecialization = 'fort_town';
  }

  return bestSpecialization;
}

/** Check if a position is near an enemy city */
function isNearEnemyCity(state: GameState, pos: HexCoord, playerId: string): boolean {
  for (const city of state.cities.values()) {
    if (city.owner === playerId) continue;
    if (distance(pos, city.position) <= 5) {
      return true;
    }
  }
  return false;
}
