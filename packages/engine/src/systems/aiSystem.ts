import type { GameState, GameAction, UnitState, CityState } from '../types/GameState';
import { coordToKey, neighbors, distance } from '../hex/HexMath';
import { getMovementCost } from '../hex/TerrainCost';
import type { HexCoord } from '../types/HexCoord';

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
    if (city.productionQueue.length === 0) {
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
      // Settler: move to good spot and found city
      if (unit.typeId === 'settler' && ourCities.length < 4) {
        const founded = tryFoundCity(state, unit, ourCities, actions);
        if (!founded) {
          // Move toward a good city location
          moveTowardGoodCitySpot(state, unit, ourCities, actions);
        }
      }
      // Builders: skip for now (no improvements system)
    } else {
      // Military: attack nearby enemies or explore
      const attacked = tryAttackNearby(state, unit, actions);
      if (!attacked) {
        moveStrategically(state, unit, ourCities, actions);
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
  // Priority: settler if few cities, then buildings, then military
  if (cityCount < 3 && !hasUnitType(state, 'settler')) {
    return 'settler';
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

  // Default: produce military
  if (militaryCount < cityCount * 2) {
    return age === 'antiquity' ? 'warrior' : age === 'exploration' ? 'musketman' : 'infantry';
  }

  return 'warrior';
}

function hasUnitType(state: GameState, typeId: string): boolean {
  for (const unit of state.units.values()) {
    if (unit.owner === state.currentPlayerId && unit.typeId === typeId) return true;
  }
  return false;
}

/** Try to found a city at current position */
function tryFoundCity(state: GameState, settler: UnitState, ourCities: CityState[], actions: GameAction[]): boolean {
  const pos = settler.position;
  const tile = state.map.tiles.get(coordToKey(pos));
  if (!tile) return false;

  // Check terrain suitability
  const terrain = state.config.terrains.get(tile.terrain);
  if (!terrain || terrain.isWater) return false;
  if (tile.feature === 'mountains') return false;

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
      if (tile.feature === 'mountains') continue;

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
      if (tile && !state.config.terrains.get(tile.terrain)?.isWater && tile.feature !== 'mountains') {
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
