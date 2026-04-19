import type { GameState, GameAction, System } from './types/GameState';
import type { AccountState } from './types/AccountState';
import { evaluateLegends } from './systems/legendsSystem';
import type { LegendsResult } from './systems/legendsSystem';

// ── M12 Integration: new systems wired in via DEFAULT_SYSTEMS ──

import { turnSystem } from './systems/turnSystem';
import { visibilitySystem } from './systems/visibilitySystem';
import { effectSystem } from './systems/effectSystem';
import { movementSystem } from './systems/movementSystem';
import { citySystem } from './systems/citySystem';
import { combatSystem } from './systems/combatSystem';
import { religionSystem } from './systems/religionSystem';
import { governmentSystem } from './systems/governmentSystem';
import { urbanBuildingSystem } from './systems/urbanBuildingSystem';
import { resourceAssignmentSystem } from './systems/resourceAssignmentSystem';
import { commanderPromotionSystem } from './systems/commanderPromotionSystem';
import { commanderArmySystem } from './systems/commanderArmySystem';
import { promotionSystem } from './systems/promotionSystem';
import { fortifySystem } from './systems/fortifySystem';
import { improvementSystem } from './systems/improvementSystem';
// buildingPlacementSystem retired in Cycle F (W4-01): PLACE_BUILDING superseded by PLACE_URBAN_BUILDING.
// File kept at ./systems/buildingPlacementSystem.ts with @deprecated comment for backward compat.
import { districtSystem } from './systems/districtSystem';
import { growthSystem } from './systems/growthSystem';
import { productionSystem } from './systems/productionSystem';
import { resourceSystem } from './systems/resourceSystem';
import { researchSystem } from './systems/researchSystem';
import { civicSystem } from './systems/civicSystem';
import { ageSystem } from './systems/ageSystem';
import { diplomacySystem, updateDiplomacyCounters } from './systems/diplomacySystem';
import { specialistSystem } from './systems/specialistSystem';
import { tradeSystem } from './systems/tradeSystem';
import { governorSystem } from './systems/governorSystem';
import { crisisSystem } from './systems/crisisSystem';
import { narrativeEventSystem } from './systems/narrativeEventSystem';
import { victorySystem } from './systems/victorySystem';
import { independentPowerSystem } from './systems/independentPowerSystem';
import { attributeSystem } from './systems/attributeSystem';

/**
 * Default engine pipeline. Ordered to match the documented system
 * sequence in CLAUDE.md.
 *
 * M12 Integration wired four standalone systems into this pipeline
 * AFTER `combatSystem` and BEFORE `resourceSystem`:
 *   - religionSystem            — pantheon adoption
 *   - governmentSystem          — government + policy slotting
 *   - urbanBuildingSystem       — V2 spatial building placement
 *   - commanderPromotionSystem  — commander XP + promotions
 *
 * The four systems adapt narrower action unions to the widened
 * `GameAction` via the `Extended*Action` types they export; at the
 * pipeline seam we coerce through a thin `adapt*` wrapper so the
 * pipeline remains strictly typed as `System`.
 */
function adaptReligion(state: GameState, action: GameAction): GameState {
  return religionSystem(state, action);
}
function adaptGovernment(state: GameState, action: GameAction): GameState {
  return governmentSystem(state, action);
}
function adaptUrbanBuilding(state: GameState, action: GameAction): GameState {
  return urbanBuildingSystem(state, action);
}
function adaptResourceAssignment(state: GameState, action: GameAction): GameState {
  return resourceAssignmentSystem(state, action);
}
function adaptCommanderPromotion(state: GameState, action: GameAction): GameState {
  return commanderPromotionSystem(state, action);
}
function adaptCommanderArmy(state: GameState, action: GameAction): GameState {
  return commanderArmySystem(state, action);
}

export const DEFAULT_SYSTEMS: ReadonlyArray<System> = [
  turnSystem,
  visibilitySystem,
  effectSystem,
  movementSystem,
  citySystem,
  combatSystem,
  // M12: insert after combat, before resource
  adaptReligion,
  adaptGovernment,
  adaptUrbanBuilding,
  adaptResourceAssignment,
  adaptCommanderPromotion,
  adaptCommanderArmy,
  promotionSystem,
  fortifySystem,
  improvementSystem,
  // buildingPlacementSystem removed in Cycle F (W4-01) — retired in favour of
  // adaptUrbanBuilding (PLACE_URBAN_BUILDING). See ./systems/buildingPlacementSystem.ts.
  districtSystem,
  growthSystem,
  productionSystem,
  resourceSystem,
  researchSystem,
  civicSystem,
  ageSystem,
  diplomacySystem,
  updateDiplomacyCounters,
  independentPowerSystem,
  specialistSystem,
  tradeSystem,
  governorSystem,
  crisisSystem,
  narrativeEventSystem,
  attributeSystem,
  victorySystem,
];

/**
 * The game engine processes actions through a pipeline of systems.
 * Each system is a pure function: (state, action) => newState.
 * Systems are called in order. Each processes the actions it cares about
 * and passes state through unchanged for others.
 */
export class GameEngine {
  private readonly systems: ReadonlyArray<System>;

  constructor(systems: ReadonlyArray<System> = DEFAULT_SYSTEMS) {
    this.systems = systems;
  }

  /** Apply an action through the entire system pipeline */
  applyAction(state: GameState, action: GameAction): GameState {
    let next = state;
    for (const system of this.systems) {
      next = system(next, action);
    }
    return next;
  }

  /** Apply multiple actions in sequence */
  applyActions(state: GameState, actions: ReadonlyArray<GameAction>): GameState {
    let next = state;
    for (const action of actions) {
      next = this.applyAction(next, action);
    }
    return next;
  }

  /**
   * Apply the legends meta-progression layer on END_TURN.
   *
   * Call this AFTER applyAction(state, { type: 'END_TURN' }) from the web layer.
   * Returns the (unchanged) state plus an AccountStateDelta that the web layer
   * should merge into its stored AccountState via applyAccountDelta().
   *
   * @param state - post-END_TURN GameState
   * @param account - the player's current persisted AccountState
   * @param humanPlayerId - which player to evaluate challenges for
   */
  applyLegends(state: GameState, account: AccountState, humanPlayerId: string): LegendsResult {
    return evaluateLegends(state, account, humanPlayerId);
  }
}
