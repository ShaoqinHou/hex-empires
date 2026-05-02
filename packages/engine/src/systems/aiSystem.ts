import type { GameState, GameAction, UnitState, CityState, PlayerState, TownSpecialization } from '../types/GameState';
import { coordToKey, neighbors, distance } from '../hex/HexMath';
import { getMovementCost } from '../hex/TerrainCost';
import type { HexCoord } from '../types/HexCoord';
import { getLeaderPersonality } from '../types/AIPersonality';
import type { AIPersonality } from '../types/AIPersonality';
import { PROMOTION_THRESHOLDS } from '../data/units/promotions';
/** Faith threshold for adopting a pantheon (mirrors PANTHEON_DEFAULT_FAITH_COST). */
const AI_PANTHEON_FAITH_COST = 25;

// ── Commander helpers (mirrored to avoid cross-system imports) ──────────────

/**
 * Cumulative XP thresholds for commander levels 1–5.
 * Mirrors LEVEL_THRESHOLDS in commanderPromotionSystem to avoid cross-system
 * imports (import-boundaries.md: systems cannot import from each other).
 */
const COMMANDER_LEVEL_THRESHOLDS = [0, 50, 150, 300, 500] as const;

/** Derive commander level from XP, capped at 5. */
function aiCommanderLevelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < COMMANDER_LEVEL_THRESHOLDS.length; i++) {
    if (xp >= COMMANDER_LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, 5);
}

/**
 * True iff unit.typeId is a registered commander archetype.
 * Uses state.config.commanders when available; falls back to the well-known
 * id set to stay consistent with commanderPromotionSystem behaviour.
 */
const KNOWN_COMMANDER_IDS: ReadonlySet<string> = new Set([
  'air_general', 'captain', 'general', 'admiral', 'marshal',
  'fleet_admiral', 'partisan_leader',
]);

function aiIsCommander(unit: UnitState, state: GameState): boolean {
  if (state.config.commanders !== undefined) {
    return state.config.commanders.has(unit.typeId);
  }
  return KNOWN_COMMANDER_IDS.has(unit.typeId);
}

/** Diplomacy helpers (mirrored locally to avoid cross-system imports) */
function aiRelationKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

const AI_DEFAULT_RELATION = {
  status: 'neutral' as const,
  relationship: 0,
  warSupport: 0,
  turnsAtPeace: 0,
  turnsAtWar: 0,
  hasAlliance: false,
  hasFriendship: false,
  hasDenounced: false,
  warDeclarer: null,
  isSurpriseWar: false,
  activeEndeavors: [] as ReadonlyArray<never>,
  activeSanctions: [] as ReadonlyArray<never>,
};

/** Threat level returned by assessThreats */
export type ThreatLevel = 'safe' | 'cautious' | 'danger' | 'critical';

/** Result of threat assessment */
export interface ThreatAssessment {
  readonly threatLevel: ThreatLevel;
  readonly enemyMilitaryStrength: number;
  readonly ownMilitaryStrength: number;
  readonly visibleEnemyCities: number;
  readonly visibleEnemyUnits: number;
}

/**
 * Assess the threat level facing the current AI player.
 * Counts visible enemy military units, estimates their total combat strength,
 * and compares against our own military strength.
 */
export function assessThreats(
  state: GameState,
  playerId: string,
  visibility: ReadonlySet<string>,
): ThreatAssessment {
  let enemyMilitaryStrength = 0;
  let visibleEnemyUnits = 0;
  let visibleEnemyCities = 0;
  let ownMilitaryStrength = 0;

  // Count visible enemy military units and estimate their strength
  for (const unit of state.units.values()) {
    if (unit.owner === playerId) {
      const def = state.config.units.get(unit.typeId);
      if (def && def.category !== 'civilian' && def.category !== 'religious') {
        const strength = Math.max(def.combat, def.rangedCombat);
        // Scale by current health percentage
        ownMilitaryStrength += Math.round(strength * unit.health / 100);
      }
    } else {
      if (!canSee(visibility, unit.position)) continue;
      const def = state.config.units.get(unit.typeId);
      if (def && def.category !== 'civilian' && def.category !== 'religious') {
        const strength = Math.max(def.combat, def.rangedCombat);
        enemyMilitaryStrength += Math.round(strength * unit.health / 100);
        visibleEnemyUnits++;
      }
    }
  }

  // Count visible enemy cities
  for (const city of state.cities.values()) {
    if (city.owner !== playerId && canSee(visibility, city.position)) {
      visibleEnemyCities++;
    }
  }

  // Determine threat level by comparing enemy vs own strength
  let threatLevel: ThreatLevel;
  if (ownMilitaryStrength === 0) {
    // No army at all — always at least cautious when enemies are visible
    threatLevel = enemyMilitaryStrength > 0 ? 'danger' : 'safe';
  } else {
    const ratio = enemyMilitaryStrength / ownMilitaryStrength;
    if (ratio < 0.5) {
      threatLevel = 'safe';
    } else if (ratio < 1.0) {
      threatLevel = 'cautious';
    } else if (ratio < 2.0) {
      threatLevel = 'danger';
    } else {
      threatLevel = 'critical';
    }
  }

  return { threatLevel, enemyMilitaryStrength, ownMilitaryStrength, visibleEnemyCities, visibleEnemyUnits };
}

/** Check if a unit is a scout (high movement civilian or has scout ability) */
function isScout(unitDef: { category: string; movement: number; abilities: ReadonlyArray<string> }): boolean {
  // Settlers are not scouts even though they're fast civilians
  if (unitDef.abilities.includes('found_city')) return false;
  return unitDef.abilities.includes('scout') ||
    (unitDef.category === 'civilian' && unitDef.movement >= 3);
}

/**
 * AISystem generates actions for non-human players.
 * Uses priority-based decision making:
 * 1. Threat assessment
 * 2. Research (always pick the cheapest available tech)
 * 3. City management (set production based on needs + threat level)
 * 4. Settler movement and city founding
 * 5. Scout exploration (independent of military strategy)
 * 6. Military movement and combat
 */
export function generateAIActions(state: GameState): ReadonlyArray<GameAction> {
  const player = state.players.get(state.currentPlayerId);
  if (!player || player.isHuman) return [];

  const personality = getLeaderPersonality(player.leaderId);
  const visibility = player.visibility;

  const actions: GameAction[] = [];
  const ourCities = [...state.cities.values()].filter(c => c.owner === player.id);
  const ourUnits = [...state.units.values()].filter(u => u.owner === player.id);
  const militaryUnits = ourUnits.filter(u => {
    const def = state.config.units.get(u.typeId);
    return def && def.category !== 'civilian';
  });

  // 0. Threat assessment — informs all subsequent decisions
  const threat = assessThreats(state, player.id, visibility);

  // 1. Research — pick cheapest unresearched tech with met prerequisites
  if (!player.currentResearch) {
    const techId = pickBestTech(state, personality);
    if (techId) {
      actions.push({ type: 'SET_RESEARCH', techId });
    }
  }

  // 0b. Resolve any active crises affecting this player
  for (const crisis of state.crises) {
    if (!crisis.active) continue;
    if (crisis.choices.length === 0) continue;
    // Pick the first choice (simple AI — could be smarter based on personality)
    // Aggressive leaders prefer the first choice (often "fight"), peaceful prefer last (often "compromise")
    const choiceIndex = personality.aggressiveness > 0.6 ? 0 : crisis.choices.length - 1;
    const choice = crisis.choices[choiceIndex];
    if (choice) {
      actions.push({ type: 'RESOLVE_CRISIS', crisisId: crisis.id, choice: choice.id });
    }
  }

  // 1a2. Civic research — pick cheapest unresearched civic
  if (!player.currentCivic) {
    const researchedCivics = new Set(player.researchedCivics);
    let bestCivic: string | null = null;
    let bestCost = Infinity;
    for (const [civicId, civic] of state.config.civics) {
      if (researchedCivics.has(civicId)) continue;
      if (civic.age !== player.age) continue;
      // Check civ-specific civics
      if (civic.civId && civic.civId !== player.civilizationId) continue;
      const prereqsMet = civic.prerequisites.every(p => researchedCivics.has(p));
      if (!prereqsMet) continue;
      if (civic.cost < bestCost) {
        bestCost = civic.cost;
        bestCivic = civicId;
      }
    }
    if (bestCivic) {
      actions.push({ type: 'SET_CIVIC', civicId: bestCivic });
    }
  }

  // 1b. Age transition — if we've earned enough age progress, transition to next age
  const nextAge = player.age === 'antiquity' ? 'exploration' : player.age === 'exploration' ? 'modern' : null;
  if (nextAge) {
    const threshold = state.age.ageThresholds[nextAge];
    if (player.ageProgress >= threshold) {
      // Pick a civilization from the next age
      const nextAgeCivs = [...state.config.civilizations.values()].filter(c => c.age === nextAge);
      if (nextAgeCivs.length > 0) {
        // Avoid picking civs already used by other players
        const usedCivIds = new Set([...state.players.values()].map(p => p.civilizationId));
        const availableCivs = nextAgeCivs.filter(c => !usedCivIds.has(c.id));
        const pool = availableCivs.length > 0 ? availableCivs : nextAgeCivs;
        // Deterministic pick based on turn + player id
        const civIndex = (state.turn + player.id.charCodeAt(player.id.length - 1)) % pool.length;
        actions.push({ type: 'TRANSITION_AGE', newCivId: pool[civIndex].id });
      }
    }
  }

  // 2. City production — based on current needs, adjusted for threat level
  for (const city of ourCities) {
    if (city.settlementType === 'town') {
      // Set town specialization first (always — this is free and gives passive bonuses)
      if (!city.specialization) {
        const specialization = pickTownSpecialization(state, city, player);
        if (specialization) {
          actions.push({ type: 'SET_SPECIALIZATION', cityId: city.id, specialization });
        }
      }

      // Towns must purchase with gold — only purchase if we can actually afford it
      const itemId = pickProduction(state, city, ourCities.length, militaryUnits.length, personality, threat.threatLevel);
      const itemType = state.config.buildings.has(itemId) ? 'building' as const : 'unit' as const;
      const baseCost = state.config.units.get(itemId)?.cost ?? state.config.buildings.get(itemId)?.cost ?? 100;
      const purchaseCost = baseCost * 2; // towns pay double
      if (player.gold >= purchaseCost) {
        actions.push({ type: 'PURCHASE_ITEM', cityId: city.id, itemId, itemType });
      }
      // else: town remains idle this turn — no IDLE production action needed (engine handles it)
    } else if (city.productionQueue.length === 0) {
      const itemId = pickProduction(state, city, ourCities.length, militaryUnits.length, personality, threat.threatLevel);
      const itemType = state.config.buildings.has(itemId) ? 'building' as const : 'unit' as const;
      actions.push({ type: 'SET_PRODUCTION', cityId: city.id, itemId, itemType });
    } else if (threat.threatLevel === 'critical') {
      // Critical threat: override any non-military production in the queue
      const currentItemId = city.productionQueue[0]?.id;
      if (currentItemId && state.config.buildings.has(currentItemId)) {
        const age = player.age ?? 'antiquity';
        const military = findCheapestMilitary(state, age, isCityCoastal(state, city));
        if (military) {
          actions.push({ type: 'SET_PRODUCTION', cityId: city.id, itemId: military, itemType: 'unit' });
        }
      }
    }
  }

  // 3. Diplomacy — war declarations and peace proposals
  const otherPlayerIds = [...state.players.keys()].filter(id => id !== player.id);
  for (const targetId of otherPlayerIds) {
    const relKey = aiRelationKey(player.id, targetId);
    const relation = state.diplomacy.relations.get(relKey) ?? AI_DEFAULT_RELATION;
    const alreadyAtWar = relation.status === 'war';

    if (!alreadyAtWar) {
      // War declaration: aggressive + military advantage + visible enemy city nearby
      const warThreshold = 0.6 - personality.riskTolerance * 0.2; // e.g. 0.6 for riskTolerance=0, 0.4 for riskTolerance=1
      if (personality.aggressiveness > warThreshold) {
        const targetPlayerUnits = [...state.units.values()].filter(u => u.owner === targetId);
        const ourMilitaryCount = militaryUnits.length;
        const theirVisibleMilitaryCount = targetPlayerUnits.filter(u => {
          if (!canSee(visibility, u.position)) return false;
          const def = state.config.units.get(u.typeId);
          return def && def.category !== 'civilian' && def.category !== 'religious';
        }).length;
        const hasMilitaryAdvantage = ourMilitaryCount > theirVisibleMilitaryCount;

        // Check for a visible enemy city within 15 hexes
        const enemyCityNearby = [...state.cities.values()].some(
          city => city.owner === targetId &&
          canSee(visibility, city.position) &&
          ourCities.some(oc => distance(oc.position, city.position) <= 15)
        );

        if (hasMilitaryAdvantage && enemyCityNearby) {
          // Use surprise war (no hostile relationship required)
          actions.push({
            type: 'PROPOSE_DIPLOMACY',
            targetId,
            proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
          });
        }
      }
    } else {
      // Peace proposal: losing the war AND personality is not aggressive
      if (personality.aggressiveness < 0.5) {
        const losingWar =
          threat.threatLevel === 'danger' || threat.threatLevel === 'critical';
        if (losingWar) {
          actions.push({
            type: 'PROPOSE_DIPLOMACY',
            targetId,
            proposal: { type: 'PROPOSE_PEACE' },
          });
        }
      }

      // Peaceful leaders may propose peace when they are losing. The
      // diplomacy system resolves only explicit peace proposals; turn counters
      // do not passively end wars.
    }
  }

  // 4. Process each unit
  for (const unit of ourUnits) {
    if (unit.movementLeft <= 0) continue;
    const unitDef = state.config.units.get(unit.typeId);
    if (!unitDef) continue;

    if (unitDef.category === 'civilian') {
      // Scouts: explore independently, flee from enemies
      if (isScout(unitDef)) {
        moveScout(state, unit, player.explored, visibility, actions);
        continue;
      }

      // Units with found_city ability: move to good spot and found city
      if (unitDef.abilities.includes('found_city') && ourCities.length < 4) {
        const founded = tryFoundCity(state, unit, ourCities, actions);
        if (!founded) {
          // Move toward a good city location
          moveTowardGoodCitySpot(state, unit, ourCities, actions, player.explored);
        }
      }
    } else {
      // Military: when threatened, pull back defenders to cities first
      if (threat.threatLevel === 'danger' || threat.threatLevel === 'critical') {
        if (shouldDefendCity(state, unit, ourCities, visibility)) {
          const step = moveTowardNearestCity(state, unit, ourCities);
          if (step) {
            actions.push({ type: 'MOVE_UNIT', unitId: unit.id, path: [step] });
          }
          continue;
        }
      }

      // Attack nearby enemy units first, then enemy cities, or move strategically
      const attacked = tryAttackNearby(state, unit, visibility, actions);
      if (!attacked) {
        const attackedCity = tryAttackNearbyCity(state, unit, visibility, actions);
        if (!attackedCity) {
          moveStrategically(state, unit, ourCities, visibility, personality, actions);
        }
      }
    }
  }

  // 5. Unit upgrades — upgrade units that have an available upgrade path and sufficient gold
  // Simulate gold after previously queued purchases to avoid over-spending
  let projectedGold = player.gold;
  for (const a of actions) {
    if (a.type === 'PURCHASE_ITEM') {
      const baseCost =
        state.config.units.get(a.itemId)?.cost ??
        state.config.buildings.get(a.itemId)?.cost ??
        100;
      projectedGold -= baseCost * 2;
    }
  }

  // Collect upgradeable units, prefer damaged/older units (lower health first)
  const upgradeableUnits = ourUnits
    .filter(unit => {
      const def = state.config.units.get(unit.typeId);
      if (!def || !def.upgradesTo) return false;
      const targetDef = state.config.units.get(def.upgradesTo);
      if (!targetDef) return false;
      if (targetDef.requiredTech && !player.researchedTechs.includes(targetDef.requiredTech)) return false;
      return true;
    })
    .sort((a, b) => a.health - b.health); // damaged units first

  for (const unit of upgradeableUnits) {
    const def = state.config.units.get(unit.typeId)!;
    const targetDef = state.config.units.get(def.upgradesTo!)!;
    const upgradeCost = targetDef.cost * 2;
    // AI upgrades when it has ample gold (personality.riskTolerance scales the threshold)
    const goldThreshold = upgradeCost * (1.5 - personality.riskTolerance * 0.5);
    if (projectedGold >= goldThreshold) {
      actions.push({ type: 'UPGRADE_UNIT', unitId: unit.id });
      projectedGold -= upgradeCost;
    }
  }

  // 6. Unit promotions — promote units that have earned enough XP
  for (const unit of ourUnits) {
    // Only promote if unit has reached tier-1 threshold and has no promotions yet
    if (unit.experience < PROMOTION_THRESHOLDS[1]) continue;
    if (unit.promotions.length > 0) continue;

    const unitDef = state.config.units.get(unit.typeId);
    if (!unitDef || unitDef.category === 'civilian') continue;

    // Find a valid tier-1 promotion for this unit's category
    let chosenPromotion: string | null = null;
    for (const [promoId, promoDef] of state.config.promotions) {
      if (promoDef.tier !== 1) continue;
      if (promoDef.category !== 'all' && promoDef.category !== unitDef.category) continue;
      chosenPromotion = promoId;
      break;
    }

    if (chosenPromotion) {
      actions.push({ type: 'PROMOTE_UNIT', unitId: unit.id, promotionId: chosenPromotion });
    }
  }

  // 7. Trade routes — move merchants toward foreign cities; create route when adjacent
  const merchantUnits = ourUnits.filter(u => {
    const def = state.config.units.get(u.typeId);
    return def?.abilities.includes('create_trade_route');
  });

  for (const merchant of merchantUnits) {
    // Find visible foreign cities to trade with
    let nearestForeignCity: CityState | null = null;
    let nearestDist = Infinity;

    for (const city of state.cities.values()) {
      if (city.owner === player.id) continue;
      if (!canSee(visibility, city.position)) continue;
      const d = distance(merchant.position, city.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearestForeignCity = city;
      }
    }

    if (!nearestForeignCity) continue;

    if (nearestDist <= 1) {
      // Adjacent to (or on) target city — create the trade route
      actions.push({ type: 'CREATE_TRADE_ROUTE', merchantId: merchant.id, targetCityId: nearestForeignCity.id });
    } else {
      // Move toward the foreign city
      const step = getOneStepToward(merchant.position, nearestForeignCity.position, state);
      if (step && merchant.movementLeft > 0) {
        actions.push({ type: 'MOVE_UNIT', unitId: merchant.id, path: [step] });
      }
    }
  }

  // 8. Tech mastery — master a researched tech when not currently mastering anything
  if (!player.currentMastery) {
    // Find the cheapest masterable tech (researched but not yet mastered)
    let bestMasteryTech: string | null = null;
    let bestMasteryCost = Infinity;
    for (const techId of player.researchedTechs) {
      if (player.masteredTechs.includes(techId)) continue;
      const techDef = state.config.technologies.get(techId);
      if (!techDef) continue;
      const masteryCost = Math.ceil(techDef.cost * 0.8);
      if (masteryCost < bestMasteryCost) {
        bestMasteryCost = masteryCost;
        bestMasteryTech = techId;
      }
    }
    if (bestMasteryTech) {
      actions.push({ type: 'SET_MASTERY', techId: bestMasteryTech });
    }
  }

  // 8b. Civic mastery — master a researched civic when not currently mastering anything
  if (!player.currentCivicMastery) {
    let bestMasteryCivic: string | null = null;
    let bestMasteryCivicCost = Infinity;
    for (const civicId of player.researchedCivics) {
      if (player.masteredCivics.includes(civicId)) continue;
      const civicDef = state.config.civics.get(civicId);
      if (!civicDef) continue;
      const masteryCost = Math.ceil(civicDef.cost * 0.8);
      if (masteryCost < bestMasteryCivicCost) {
        bestMasteryCivicCost = masteryCost;
        bestMasteryCivic = civicId;
      }
    }
    if (bestMasteryCivic) {
      actions.push({ type: 'SET_CIVIC_MASTERY', civicId: bestMasteryCivic });
    }
  }

  // TODO: PURCHASE_TILE — AI territorial expansion is complex to prioritize correctly

  // 9. Civ VII parity emissions (low priority — at most ONE per turn).
  //    Order: pantheon → religion → government → policy. Each guarded by its own
  //    prerequisites. These never block the existing core AI flow above.
  const parityAction = pickCivVIIParityAction(state, player, ourCities);
  if (parityAction) {
    actions.push(parityAction as GameAction);
  }

  // 10. PROMOTE_COMMANDER — promote any commander unit with unspent promotion picks.
  for (const unit of ourUnits) {
    if (!aiIsCommander(unit, state)) continue;
    const level = aiCommanderLevelForXp(unit.experience);
    const unspent = level - unit.promotions.length;
    if (unspent <= 0) continue;
    // Pick first available promotion: tier 1 with no prerequisites, or any with met prereqs.
    let chosenPromotion: string | null = null;
    if (state.config.commanderPromotions) {
      for (const [promoId, promo] of state.config.commanderPromotions) {
        if (unit.promotions.includes(promoId)) continue;
        const prereqsMet = promo.prerequisites.every(p => unit.promotions.includes(p));
        if (!prereqsMet) continue;
        chosenPromotion = promoId;
        break; // pick first eligible
      }
    }
    if (chosenPromotion) {
      actions.push({ type: 'PROMOTE_COMMANDER', commanderId: unit.id, promotionId: chosenPromotion });
    }
  }

  // 11. ASSIGN_RESOURCE — assign any unassigned owned resources to cities with capacity.
  const ownedResources = (player as PlayerState & { ownedResources?: ReadonlyArray<string> }).ownedResources;
  if (ownedResources && ownedResources.length > 0) {
    // Collect resources already assigned to any city
    const alreadyAssigned = new Set<string>();
    for (const city of ourCities) {
      const assigned = (city as CityState & { assignedResources?: ReadonlyArray<string> }).assignedResources;
      if (assigned) {
        for (const r of assigned) alreadyAssigned.add(r);
      }
    }
    // Sort cities by population descending (assign to largest first)
    const sortedCities = [...ourCities].sort((a, b) => b.population - a.population);
    for (const resourceId of ownedResources) {
      if (alreadyAssigned.has(resourceId)) continue;
      // Find first city with spare slot
      for (const city of sortedCities) {
        const assigned = (city as CityState & { assignedResources?: ReadonlyArray<string> }).assignedResources ?? [];
        const cap = city.settlementType === 'city' ? 2 : 1;
        if (assigned.length < cap) {
          actions.push({ type: 'ASSIGN_RESOURCE', resourceId, cityId: city.id, playerId: player.id });
          alreadyAssigned.add(resourceId);
          break;
        }
      }
    }
  }

  // 12. PLACE_CODEX — place any unplaced codices into buildings with spare codex slots.
  if (state.codices) {
    for (const [codexId, codex] of state.codices) {
      if (codex.playerId !== player.id) continue;
      if (codex.placedInCityId !== undefined) continue; // already placed
      // Find a city + building with spare codex slots
      let placed = false;
      for (const city of ourCities) {
        for (const buildingId of city.buildings) {
          const buildingDef = state.config.buildings.get(buildingId);
          const slots = buildingDef?.codexSlots ?? 0;
          if (slots <= 0) continue;
          // Count codices already placed in this building
          let usedSlots = 0;
          for (const c of state.codices.values()) {
            if (c.placedInCityId === city.id && c.placedInBuildingId === buildingId) {
              usedSlots++;
            }
          }
          if (usedSlots < slots) {
            actions.push({ type: 'PLACE_CODEX', codexId, buildingId, cityId: city.id });
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }
  }

  actions.push({ type: 'END_TURN' });
  return actions;
}

/**
 * Pick exactly one Civ VII parity action (ADOPT_PANTHEON, FOUND_RELIGION,
 * SET_GOVERNMENT, or SLOT_POLICY) for the current AI player, or null if none
 * apply.
 *
 * Priority order:
 *   1. Adopt a pantheon when the player has none AND has enough faith AND
 *      at least one city with Temple AND at least one pantheon entry is not
 *      yet claimed by any player.
 *   2. Found a religion when player has researched the Piety civic AND has
 *      at least one city with Temple (no pantheon prerequisite — Civ VII §18 / F-03).
 *   3. Set a government when the player has none AND has researched the
 *      unlock civic for at least one GovernmentDef.
 *   4. Slot a policy when the player HAS a government AND has at least
 *      one empty (null) slot in the flat wildcard array AND a PolicyDef
 *      whose unlockCivic is researched exists (W2-03 flat wildcard model).
 */
function pickCivVIIParityAction(
  state: GameState,
  player: Pick<
    PlayerState,
    'id' | 'civilizationId' | 'faith' | 'researchedCivics' | 'pantheonId' | 'governmentId' | 'slottedPolicies' | 'pendingGovernmentChoice'
  >,
  ourCities: ReadonlyArray<CityState>,
): GameAction | null {
  const pendingGovernmentChoice = player.pendingGovernmentChoice ?? null;
  if (pendingGovernmentChoice !== null && pendingGovernmentChoice.options.length > 0) {
    return {
      type: 'SET_GOVERNMENT',
      playerId: player.id,
      governmentId: pendingGovernmentChoice.options[0],
    };
  }

  // Shared helper: does the player have any city with a Temple?
  const hasTempleCity = ourCities.some(c =>
    (c.buildings as ReadonlyArray<string>).includes('temple'),
  );

  // 1. Pantheon — requires Temple + sufficient faith
  if (!player.pantheonId && player.faith >= AI_PANTHEON_FAITH_COST && hasTempleCity) {
    const claimedByAny = new Set<string>();
    for (const p of state.players.values()) {
      if (p.pantheonId) claimedByAny.add(p.pantheonId);
    }
    // Also honour any religion-slot pantheon claims, if present.
    const religionSlot = state.religion;
    if (religionSlot?.pantheonClaims) {
      for (const pid of religionSlot.pantheonClaims.keys()) {
        claimedByAny.add(pid);
      }
    }
    const available = [...state.config.pantheons.values()].find(p => !claimedByAny.has(p.id));
    if (available) {
      return {
        type: 'ADOPT_PANTHEON',
        playerId: player.id,
        pantheonId: available.id,
      };
    }
  }

  // 2. Found Religion — requires Piety civic + Temple city (no pantheon prerequisite per Civ VII §18 / F-03)
  if (
    (player.researchedCivics as ReadonlyArray<string>).includes('piety') &&
    hasTempleCity
  ) {
    // Only found if player doesn't already have a religion
    const existingReligions = state.religion?.religions ?? [];
    const alreadyFounded = existingReligions.some(r => r.founderPlayerId === player.id);
    if (!alreadyFounded) {
      // Pick the first city with a Temple as the holy city
      const holyCity = ourCities.find(c =>
        (c.buildings as ReadonlyArray<string>).includes('temple'),
      );
      // Pick beliefs not already taken by other religions
      const takenFounderBeliefs = new Set(existingReligions.map(r => r.founderBeliefId));
      const takenFollowerBeliefs = new Set(existingReligions.map(r => r.followerBeliefId));
      const founderBelief = [...state.config.founderBeliefs.keys()].find(
        b => !takenFounderBeliefs.has(b),
      );
      const followerBelief = [...state.config.followerBeliefs.keys()].find(
        b => !takenFollowerBeliefs.has(b),
      );
      if (holyCity && founderBelief && followerBelief) {
        // FOUND_RELIGION is in ReligionAction (not GameAction yet); cast through unknown.
        // The GameEngine's adaptReligion adapter handles it at runtime.
        return {
          type: 'FOUND_RELIGION',
          playerId: player.id,
          cityId: holyCity.id,
          religionName: `Religion of ${player.id}`,
          founderBelief,
          followerBelief,
        } as unknown as GameAction;
      }
    }
  }

  // 3. Government
  if (!player.governmentId) {
    const researched = new Set(player.researchedCivics);
    const candidate = [...state.config.governments.values()].find(g =>
      g.age === state.age.currentAge &&
      researched.has(g.unlockCivic) &&
      g.crisisRequired === undefined &&
      (g.civRequired === undefined || g.civRequired === player.civilizationId)
    );
    if (candidate) {
      return {
        type: 'SET_GOVERNMENT',
        playerId: player.id,
        governmentId: candidate.id,
      };
    }
  }

  // 4. Slot a policy — W2-03 flat wildcard model: slottedPolicies is a
  //    flat ReadonlyArray<string | null>; any null entry is an open slot.
  if (player.governmentId && player.slottedPolicies) {
    const researched = new Set(player.researchedCivics);
    const alreadySlotted = new Set<string>(
      player.slottedPolicies.filter((p): p is string => p !== null),
    );
    const slotIndex = player.slottedPolicies.findIndex(s => s === null);
    if (slotIndex >= 0) {
      const policy = [...state.config.policies.values()].find(
        p => researched.has(p.unlockCivic) && !alreadySlotted.has(p.id),
      );
      if (policy) {
        return {
          type: 'SLOT_POLICY',
          playerId: player.id,
          slotIndex,
          policyId: policy.id,
        };
      }
    }
  }

  return null;
}

/** Check whether a hex position is in the player's visibility set */
function canSee(visibility: ReadonlySet<string>, position: HexCoord): boolean {
  return visibility.has(coordToKey(position));
}

/** Pick the best tech based on strategic needs, not just cost */
function pickBestTech(state: GameState, personality: AIPersonality): string | null {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const researched = new Set(player.researchedTechs);
  const availableTechs: Array<{id: string, cost: number, score: number}> = [];

  // Analyze current situation
  const cityCount = [...state.cities.values()].filter(c => c.owner === player.id).length;
  const militaryCount = [...state.units.values()].filter(
    u => u.owner === player.id && u.typeId !== 'settler'
  ).length;
  const atWar = checkAtWar(state, player.id);

  // Personality-scaled multipliers
  const scienceMultiplier = 1 + personality.scienceFocus;        // 1.0–2.0
  const militaryMultiplier = 1 + personality.aggressiveness;     // 1.0–2.0

  for (const [techId, tech] of state.config.technologies) {
    if (researched.has(techId)) continue;
    if (tech.age !== player.age) continue;
    const prereqsMet = tech.prerequisites.every(p => researched.has(p));
    if (!prereqsMet) continue;

    let score = 0;

    // Base score from tech (cheaper is slightly better)
    score += (200 - tech.cost);

    // Check what this tech unlocks
    for (const unlockId of tech.unlocks) {
      // Check if it's a unit
      const unit = state.config.units.get(unlockId);
      if (unit) {
        if (atWar || militaryCount < cityCount * personality.militaryRatio) {
          if (unit.combat > 0 || unit.rangedCombat > 0) {
            score += 50 * militaryMultiplier; // Military units weighted by aggressiveness
          }
        }
        if (unit.abilities.includes('found_city') && cityCount < 4) {
          score += 40; // Settlers valuable early game
        }
      }

      // Check if it's a building
      const building = state.config.buildings.get(unlockId);
      if (building) {
        if (building.yields.food && cityCount < 4) score += 30; // Food early game
        if (building.yields.production) score += 40; // Production always good
        if (building.yields.gold) score += 30;
        if (building.yields.science) score += 50 * scienceMultiplier; // Science weighted by focus
      }

      // Check if it's an improvement
      const improvement = state.config.improvements.get(unlockId);
      if (improvement) {
        score += 40; // Improvements are very valuable
      }
    }

    availableTechs.push({ id: techId, cost: tech.cost, score });
  }

  // Sort by score and pick best
  availableTechs.sort((a, b) => b.score - a.score);
  return availableTechs[0]?.id ?? null;
}

/** Check if player is at war with anyone */
function checkAtWar(state: GameState, playerId: string): boolean {
  for (const [key, relation] of state.diplomacy.relations) {
    if (relation.status === 'war') {
      if (key.includes(playerId)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check whether a city is coastal — i.e., any neighbor of the city tile is a water tile.
 * Naval units should only be considered for coastal cities.
 */
function isCityCoastal(state: GameState, city: CityState): boolean {
  for (const neighbor of neighbors(city.position)) {
    const tile = state.map.tiles.get(coordToKey(neighbor));
    if (!tile) continue;
    const terrain = state.config.terrains.get(tile.terrain);
    if (terrain?.isWater) return true;
  }
  return false;
}

/** Pick what to produce based on game state and threat level */
function pickProduction(
  state: GameState,
  city: CityState,
  cityCount: number,
  militaryCount: number,
  personality: AIPersonality,
  threatLevel: ThreatLevel = 'safe',
): string {
  const player = state.players.get(state.currentPlayerId);
  const age = player?.age ?? 'antiquity';
  const coastal = isCityCoastal(state, city);

  // Under critical threat: produce military units only
  if (threatLevel === 'critical') {
    return findCheapestMilitary(state, age, coastal) ?? 'warrior';
  }

  // Under danger: prioritize military over buildings regardless of personality
  if (threatLevel === 'danger') {
    const military = findCheapestMilitary(state, age, coastal);
    if (military) return military;
  }

  // Personality-driven targets
  const targetMilitaryPerCity = personality.militaryRatio;
  // High expansionism → start building settlers earlier (need fewer cities)
  const maxCitiesBeforeSettle = personality.expansionism >= 0.7 ? 5 : 3;

  // Priority 1: Ensure at least 1 defender per city before expanding
  const minMilitary = Math.max(cityCount, 1); // at least 1 unit per city
  if (militaryCount < minMilitary) {
    const military = pickMilitaryUnit(state, age, personality, coastal);
    if (military) return military;
  }

  // Priority 2: First food building (granary) if city has none — only when not threatened
  if (threatLevel === 'safe' || threatLevel === 'cautious') {
    const hasFoodBuilding = city.buildings.some(bId => {
      const b = state.config.buildings.get(bId);
      return b && (b.yields.food ?? 0) > 0;
    });
    if (!hasFoodBuilding) {
      for (const [buildingId, building] of state.config.buildings) {
        if (building.age !== age) continue;
        if (city.buildings.includes(buildingId)) continue;
        if (building.requiredTech && !player?.researchedTechs.includes(building.requiredTech)) continue;
        if ((building.yields.food ?? 0) > 0) return buildingId;
      }
    }
  }

  // Priority 3: Build up to personality-driven military ratio before expanding
  if (militaryCount < cityCount * targetMilitaryPerCity) {
    const military = pickMilitaryUnit(state, age, personality, coastal);
    if (military) return military;
  }

  // Priority 4: Settler — high-expansion civs want more cities (only when safe/cautious)
  // Note: 'danger' and 'critical' already returned early above, so here we are safe/cautious
  if (cityCount < maxCitiesBeforeSettle && !hasUnitAbility(state, 'found_city') && militaryCount >= cityCount) {
    const settler = findCheapestUnitByAbility(state, 'found_city');
    if (settler) return settler;
  }

  // Priority 5: Production building, then science building (one of each)
  const hasProductionBuilding = city.buildings.some(bId => {
    const b = state.config.buildings.get(bId);
    return b && (b.yields.production ?? 0) > 0;
  });
  if (!hasProductionBuilding) {
    for (const [buildingId, building] of state.config.buildings) {
      if (building.age !== age) continue;
      if (city.buildings.includes(buildingId)) continue;
      if (building.requiredTech && !player?.researchedTechs.includes(building.requiredTech)) continue;
      if ((building.yields.production ?? 0) > 0) return buildingId;
    }
  }

  // Priority 6: More military (maintain army) — cap varies by personality; use varied unit types
  if (militaryCount < cityCount * (targetMilitaryPerCity + 1)) {
    const military = pickMilitaryUnit(state, age, personality, coastal);
    if (military) return military;
  }

  // Priority 7: Any remaining building
  for (const [buildingId, building] of state.config.buildings) {
    if (building.age !== age) continue;
    if (city.buildings.includes(buildingId)) continue;
    if (building.requiredTech && !player?.researchedTechs.includes(building.requiredTech)) continue;
    return buildingId;
  }

  return pickMilitaryUnit(state, age, personality, coastal) ?? 'warrior';
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

function findCheapestMilitary(state: GameState, age: string, allowNaval = false): string | null {
  const player = state.players.get(state.currentPlayerId);
  const researchedTechs = player ? new Set(player.researchedTechs) : new Set<string>();

  let cheapest: string | null = null;
  let cheapestCost = Infinity;
  for (const [id, def] of state.config.units) {
    if (def.age !== age) continue;
    if (def.category === 'civilian' || def.category === 'religious') continue;
    if (!allowNaval && def.category === 'naval') continue;
    if (def.combat <= 0 && def.rangedCombat <= 0) continue;
    if (def.requiredTech && !researchedTechs.has(def.requiredTech)) continue;
    if (def.cost < cheapestCost) { cheapestCost = def.cost; cheapest = id; }
  }

  // Fallback: if nothing is buildable at this age (all locked by unresearched techs),
  // try any age's units so the AI always has something to produce.
  if (!cheapest) {
    for (const [id, def] of state.config.units) {
      if (def.category === 'civilian' || def.category === 'religious') continue;
      if (!allowNaval && def.category === 'naval') continue;
      if (def.combat <= 0 && def.rangedCombat <= 0) continue;
      if (def.requiredTech && !researchedTechs.has(def.requiredTech)) continue;
      if (def.cost < cheapestCost) { cheapestCost = def.cost; cheapest = id; }
    }
  }

  return cheapest;
}

/**
 * Pick a military unit to build based on personality and the current unit composition.
 * After the first 2 warriors the AI diversifies — ranged, cavalry, melee depending on
 * personality and how many of each type it already owns.
 * Pass isCoastal=true to allow naval units (only for cities adjacent to water).
 */
function pickMilitaryUnit(
  state: GameState,
  age: string,
  personality: AIPersonality,
  isCoastal = false,
): string | null {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return findCheapestMilitary(state, age, isCoastal);

  // Count current military unit types owned
  let meleeCount = 0;
  let rangedCount = 0;
  let cavalryCount = 0;
  for (const unit of state.units.values()) {
    if (unit.owner !== player.id) continue;
    const def = state.config.units.get(unit.typeId);
    if (!def || def.category === 'civilian' || def.category === 'religious') continue;
    if (def.combat <= 0 && def.rangedCombat <= 0) continue;
    if (def.category === 'cavalry') cavalryCount++;
    else if (def.rangedCombat > 0 && def.combat === 0) rangedCount++;
    else meleeCount++;
  }
  const totalMilitary = meleeCount + rangedCount + cavalryCount;

  // For the first 2 units always build the cheapest melee (warrior)
  if (totalMilitary < 2) return findCheapestMilitary(state, age, isCoastal);

  // Determine desired composition by personality
  // aggressive:  50% melee, 20% ranged, 30% cavalry
  // balanced:    40% melee, 40% ranged, 20% cavalry
  // defensive:   30% melee, 55% ranged, 15% cavalry
  const targetMeleeFrac  = 0.4 - personality.aggressiveness * 0.1 + (1 - personality.aggressiveness) * 0.0;
  const targetCavFrac    = 0.15 + personality.aggressiveness * 0.15;
  const targetRangedFrac = 1.0 - targetMeleeFrac - targetCavFrac;

  const meleeFrac  = totalMilitary > 0 ? meleeCount  / totalMilitary : 0;
  const rangedFrac = totalMilitary > 0 ? rangedCount  / totalMilitary : 0;
  const cavFrac    = totalMilitary > 0 ? cavalryCount / totalMilitary : 0;

  // Determine which category is most under-represented
  const meleeDeficit  = targetMeleeFrac  - meleeFrac;
  const rangedDeficit = targetRangedFrac - rangedFrac;
  const cavDeficit    = targetCavFrac    - cavFrac;

  // Prefer the most-deficient category; ties broken by: melee > ranged > cavalry
  type Category = 'melee' | 'ranged' | 'cavalry';
  const order: Category[] = ['melee', 'ranged', 'cavalry'];
  const deficits: Record<Category, number> = { melee: meleeDeficit, ranged: rangedDeficit, cavalry: cavDeficit };
  order.sort((a, b) => deficits[b] - deficits[a]);

  for (const category of order) {
    const candidate = findBestMilitaryByCategory(state, age, category, isCoastal);
    if (candidate) return candidate;
  }

  return findCheapestMilitary(state, age, isCoastal);
}

/** Find the best affordable military unit matching the desired category */
function findBestMilitaryByCategory(
  state: GameState,
  age: string,
  category: 'melee' | 'ranged' | 'cavalry',
  isCoastal = false,
): string | null {
  const player = state.players.get(state.currentPlayerId);
  const researchedTechs = player ? new Set(player.researchedTechs) : new Set<string>();

  let best: string | null = null;
  let bestScore = -Infinity;

  // Try current age first, then fall back to any age if nothing is buildable
  const ageFilter = (defAge: string) => defAge === age;
  const anyAgeFilter = (_defAge: string) => true;

  for (const ageCheck of [ageFilter, anyAgeFilter]) {
    for (const [id, def] of state.config.units) {
      if (!ageCheck(def.age)) continue;
      if (def.category === 'civilian' || def.category === 'religious') continue;
      if (!isCoastal && def.category === 'naval') continue;
      if (def.combat <= 0 && def.rangedCombat <= 0) continue;
      // Check tech requirement
      if (def.requiredTech && !researchedTechs.has(def.requiredTech)) continue;

      // Classify this unit
      const isCavalry = def.category === 'cavalry';
      const isRanged  = !isCavalry && def.rangedCombat > 0 && def.combat === 0;
      const isMelee   = !isCavalry && !isRanged;

      const matches =
        (category === 'cavalry' && isCavalry) ||
        (category === 'ranged'  && isRanged)  ||
        (category === 'melee'   && isMelee);

      if (!matches) continue;

      // Score: prefer stronger units; among equals prefer cheaper
      const combatStrength = Math.max(def.combat, def.rangedCombat);
      const score = combatStrength * 10 - def.cost * 0.1;
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    if (best) break; // found something at the preferred age
  }

  return best;
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

/** Move settler toward a good city location (only considers explored tiles) */
function moveTowardGoodCitySpot(
  state: GameState,
  settler: UnitState,
  ourCities: CityState[],
  actions: GameAction[],
  explored: ReadonlySet<string>,
): void {
  // Find a land tile far enough from all cities — only among explored tiles
  let bestTarget: HexCoord | null = null;
  let bestScore = -Infinity;

  // Sample nearby tiles (2 hex range)
  for (const n of neighbors(settler.position)) {
    for (const nn of neighbors(n)) {
      const key = coordToKey(nn);
      // Only evaluate tiles the AI has already seen
      if (!explored.has(key)) continue;
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

  // Fallback: if no explored tiles found nearby, just move toward an unexplored neighbor
  if (!bestTarget) {
    for (const n of neighbors(settler.position)) {
      const key = coordToKey(n);
      const tile = state.map.tiles.get(key);
      if (!tile) continue;
      const terrain = state.config.terrains.get(tile.terrain);
      if (!terrain || terrain.isWater) continue;
      if (tile.feature && state.config.features.get(tile.feature)?.blocksMovement) continue;
      bestTarget = n;
      break;
    }
  }

  if (bestTarget) {
    const step = getOneStepToward(settler.position, bestTarget, state);
    if (step) {
      actions.push({ type: 'MOVE_UNIT', unitId: settler.id, path: [step] });
    }
  }
}

/** Try to attack an adjacent enemy (only enemies the AI can see) */
function tryAttackNearby(
  state: GameState,
  unit: UnitState,
  visibility: ReadonlySet<string>,
  actions: GameAction[],
): boolean {
  const unitDef = state.config.units.get(unit.typeId);
  const attackRange = unitDef?.range ?? 0;
  const maxRange = attackRange > 0 ? attackRange : 1;

  let bestTarget: UnitState | null = null;
  let bestScore = -Infinity;

  for (const enemy of state.units.values()) {
    if (enemy.owner === unit.owner) continue;
    // Only attack enemies the AI can see
    if (!canSee(visibility, enemy.position)) continue;
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

/** Try to attack an adjacent enemy city (only cities the AI can see) */
function tryAttackNearbyCity(
  state: GameState,
  unit: UnitState,
  visibility: ReadonlySet<string>,
  actions: GameAction[],
): boolean {
  const unitDef = state.config.units.get(unit.typeId);
  const attackRange = unitDef?.range ?? 0;
  const maxRange = attackRange > 0 ? attackRange : 1;

  let bestTarget: CityState | null = null;
  let bestScore = -Infinity;

  for (const city of state.cities.values()) {
    if (city.owner === unit.owner) continue;
    // Only attack cities the AI can see
    if (!canSee(visibility, city.position)) continue;
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

/**
 * Move a scout unit toward unexplored territory.
 * Scouts avoid occupied tiles but do NOT flee from enemies — they push outward
 * toward unexplored areas using a scoring system biased toward the map center.
 */
function moveScout(
  state: GameState,
  unit: UnitState,
  explored: ReadonlySet<string>,
  visibility: ReadonlySet<string>,
  actions: GameAction[],
): void {
  const mapCenterQ = state.map.width / 2;
  const mapCenterR = state.map.height / 2;

  // How explored is the immediate vicinity? Count explored tiles in a 3-hex radius.
  let nearbyExploredCount = 0;
  let nearbyTotalCount = 0;
  for (const n of neighbors(unit.position)) {
    nearbyTotalCount++;
    if (explored.has(coordToKey(n))) nearbyExploredCount++;
    for (const nn of neighbors(n)) {
      nearbyTotalCount++;
      if (explored.has(coordToKey(nn))) nearbyExploredCount++;
    }
  }
  // When >60% of nearby tiles are already explored, add a strong center bias
  const locallyExplored = nearbyTotalCount > 0 && (nearbyExploredCount / nearbyTotalCount) > 0.6;

  // Score each passable adjacent tile
  let bestStep: HexCoord | null = null;
  let bestScore = -Infinity;

  for (const n of neighbors(unit.position)) {
    const tile = state.map.tiles.get(coordToKey(n));
    if (!tile) continue;
    if (state.config.terrains.get(tile.terrain)?.isWater) continue;
    if (tile.feature && state.config.features.get(tile.feature)?.blocksMovement) continue;

    // Skip tiles occupied by any unit (friendly or enemy)
    let occupied = false;
    for (const u of state.units.values()) {
      if (coordToKey(u.position) === coordToKey(n)) { occupied = true; break; }
    }
    if (occupied) continue;

    let score = 0;

    // +10 per unexplored neighbor (2-hex look-ahead)
    for (const nn of neighbors(n)) {
      if (!explored.has(coordToKey(nn))) score += 10;
    }
    // Heavily prefer stepping onto an unexplored tile itself
    if (!explored.has(coordToKey(n))) score += 30;

    // Bias toward map center when the local area is well-explored.
    // This pushes scouts away from their starting corner and toward other players.
    if (locallyExplored) {
      const distToCenter = distance(n, { q: Math.round(mapCenterQ), r: Math.round(mapCenterR) });
      const currentDistToCenter = distance(unit.position, { q: Math.round(mapCenterQ), r: Math.round(mapCenterR) });
      // +20 for every step closer to center, -5 for every step further
      if (distToCenter < currentDistToCenter) {
        score += 20;
      } else if (distToCenter > currentDistToCenter) {
        score -= 5;
      }
    }

    // Tiebreak deterministically using unit id + turn (avoids ping-pong)
    score += ((unit.id.charCodeAt(unit.id.length - 1) + state.turn) % 7) * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestStep = n;
    }
  }

  if (bestStep) {
    actions.push({ type: 'MOVE_UNIT', unitId: unit.id, path: [bestStep] });
  }
}

/** Get a step that moves away from a threat position */
function getFleeStep(from: HexCoord, threat: HexCoord, state: GameState): HexCoord | null {
  const ns = neighbors(from);
  let bestDist = distance(from, threat);
  let bestHex: HexCoord | null = null;

  for (const n of ns) {
    const tile = state.map.tiles.get(coordToKey(n));
    if (!tile) continue;
    const cost = getMovementCost(tile);
    if (cost === null) continue;

    let occupied = false;
    for (const u of state.units.values()) {
      if (coordToKey(u.position) === coordToKey(n)) { occupied = true; break; }
    }
    if (occupied) continue;

    const d = distance(n, threat);
    if (d > bestDist) {
      bestDist = d;
      bestHex = n;
    }
  }

  return bestHex;
}

/**
 * Determine whether a military unit should pull back toward a city.
 * Returns true when the unit is far from any friendly city while enemies are nearby.
 */
function shouldDefendCity(
  state: GameState,
  unit: UnitState,
  ourCities: CityState[],
  visibility: ReadonlySet<string>,
): boolean {
  if (ourCities.length === 0) return false;

  // Find nearest friendly city
  let nearestCityDist = Infinity;
  for (const city of ourCities) {
    const d = distance(unit.position, city.position);
    if (d < nearestCityDist) nearestCityDist = d;
  }

  // Only pull back if not already at the city
  if (nearestCityDist <= 2) return false;

  // Check if there's a visible enemy within 4 hexes of any of our cities
  for (const city of ourCities) {
    for (const enemy of state.units.values()) {
      if (enemy.owner === unit.owner) continue;
      if (!canSee(visibility, enemy.position)) continue;
      if (distance(enemy.position, city.position) <= 4) {
        return true;
      }
    }
  }

  return false;
}

/** Move one step toward the nearest friendly city */
function moveTowardNearestCity(
  state: GameState,
  unit: UnitState,
  ourCities: CityState[],
): HexCoord | null {
  let nearestCity: CityState | null = null;
  let nearestDist = Infinity;
  for (const city of ourCities) {
    const d = distance(unit.position, city.position);
    if (d < nearestDist) { nearestDist = d; nearestCity = city; }
  }
  if (!nearestCity) return null;
  return getOneStepToward(unit.position, nearestCity.position, state);
}

/** Move military units strategically */
function moveStrategically(
  state: GameState,
  unit: UnitState,
  ourCities: CityState[],
  visibility: ReadonlySet<string>,
  personality: AIPersonality,
  actions: GameAction[],
): void {
  // Priority 1: Aggressive personalities move toward visible enemies
  // Low-aggression personalities skip this unless the enemy is very close
  const aggressionRange = Math.round(5 + personality.aggressiveness * 10); // 5–15 hexes
  let nearestEnemy: HexCoord | null = null;
  let nearestDist = Infinity;
  for (const enemy of state.units.values()) {
    if (enemy.owner === unit.owner) continue;
    // Only move toward enemies the AI can see
    if (!canSee(visibility, enemy.position)) continue;
    const d = distance(unit.position, enemy.position);
    if (d < nearestDist) {
      nearestDist = d;
      nearestEnemy = enemy.position;
    }
  }

  if (nearestEnemy && nearestDist <= aggressionRange) {
    const step = getOneStepToward(unit.position, nearestEnemy, state);
    if (step) {
      actions.push({ type: 'MOVE_UNIT', unitId: unit.id, path: [step] });
    }
    return;
  }

  // Priority 2: If no visible enemy, defend cities
  if (ourCities.length > 0) {
    // Find least-defended city
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

    if (leastDefended) {
      const distToCity = distance(unit.position, leastDefended.position);

      // Already within guard range — fortify to get defense bonus and stop moving
      if (distToCity <= 2) {
        if (!unit.fortified) {
          actions.push({ type: 'FORTIFY_UNIT', unitId: unit.id });
        }
        // else: stay fortified, no action needed
        return;
      }

      // Not yet at city — move toward it (unless personality prefers exploring)
      // High scout frequency personalities may instead explore rather than sit at city
      const turnSeedForScout = (state.turn + unit.id.charCodeAt(unit.id.length - 1)) % 100;
      const shouldExplore = turnSeedForScout < personality.scoutFrequency * 100;
      if (!shouldExplore) {
        const step = getOneStepToward(unit.position, leastDefended.position, state);
        if (step) {
          actions.push({ type: 'MOVE_UNIT', unitId: unit.id, path: [step] });
        }
        return;
      }
    }
  }

  // Priority 3: Explore — high scoutFrequency personalities explore more
  // Pick a passable neighbor, preferring unexplored tiles
  const ns = neighbors(unit.position);
  const passable: HexCoord[] = [];
  const unexplored: HexCoord[] = [];
  for (const n of ns) {
    const tile = state.map.tiles.get(coordToKey(n));
    if (!tile) continue;
    if (state.config.terrains.get(tile.terrain)?.isWater) continue;
    if (tile.feature && state.config.features.get(tile.feature)?.blocksMovement) continue;
    // Skip tiles occupied by any unit
    let occupied = false;
    for (const u of state.units.values()) {
      if (coordToKey(u.position) === coordToKey(n)) { occupied = true; break; }
    }
    if (!occupied) {
      passable.push(n);
      if (!visibility.has(coordToKey(n))) {
        unexplored.push(n);
      }
    }
  }

  // High scout frequency: prefer unexplored tiles; low: any passable tile
  const candidates = personality.scoutFrequency >= 0.5 && unexplored.length > 0
    ? unexplored
    : passable;

  if (candidates.length > 0) {
    // Use a simple deterministic offset based on unit id + turn so we rotate through neighbors
    const turnSeed = (state.turn + unit.id.charCodeAt(unit.id.length - 1)) % candidates.length;
    const exploreTarget = candidates[turnSeed];
    actions.push({ type: 'MOVE_UNIT', unitId: unit.id, path: [exploreTarget] });
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

/** Pick the best town specialization based on tile yields and strategic needs */
function pickTownSpecialization(state: GameState, city: CityState, player: PlayerState): TownSpecialization | null {
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
      const imp = state.config.improvements.get(tile.improvement);
      if (imp) {
        foodScore += imp.yields.food ?? 0;
        productionScore += imp.yields.production ?? 0;
        goldScore += imp.yields.gold ?? 0;
      }
    }
  }

  // Calculate resource needs based on game state
  const cityCount = [...state.cities.values()].filter(c => c.owner === player.id).length;
  const militaryCount = [...state.units.values()].filter(u => u.owner === player.id && u.typeId !== 'settler').length;

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
