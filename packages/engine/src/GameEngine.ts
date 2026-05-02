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
import { commanderRespawnSystem } from './systems/commanderRespawnSystem';
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
import { projectsSystem } from './systems/projectsSystem';
import { espionageSystem } from './systems/espionageSystem';
import { treatySystem } from './systems/treatySystem';
import { wonderPlacementSystem } from './systems/wonderPlacementSystem';
import { discoverySystem } from './systems/discoverySystem';

/**
 * Default engine pipeline. Ordered to match the documented system
 * sequence in the Codex workflow docs.
 *
 * M12 Integration wired standalone systems into this pipeline
 * AFTER `combatSystem` and BEFORE `resourceSystem`:
 *   - religionSystem            — pantheon adoption
 *   - governmentSystem          — government + policy slotting
 *   - urbanBuildingSystem       — V2 spatial building placement
 *   - commanderPromotionSystem  — commander XP + promotions
 *
 * These systems adapt narrower action unions to the widened
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
function adaptCommanderRespawn(state: GameState, action: GameAction): GameState {
  return commanderRespawnSystem(state, action);
}

export const DEFAULT_SYSTEMS: ReadonlyArray<System> = [
  turnSystem,
  effectSystem,
  movementSystem,
  citySystem,
  combatSystem,
  adaptCommanderRespawn,
  visibilitySystem,
  // M12: insert after combat, before resource
  adaptReligion,
  adaptGovernment,
  adaptUrbanBuilding,
  adaptResourceAssignment,
  adaptCommanderPromotion,
  adaptCommanderArmy,
  promotionSystem,
  fortifySystem,
  discoverySystem,
  improvementSystem,
  // buildingPlacementSystem removed in Cycle F (W4-01) — retired in favour of
  // adaptUrbanBuilding (PLACE_URBAN_BUILDING). See ./systems/buildingPlacementSystem.ts.
  districtSystem,
  growthSystem,
  productionSystem,
  wonderPlacementSystem,
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
  projectsSystem,
  espionageSystem,
  treatySystem,
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
    if (action.type === 'TRANSITION_AGE') {
      return this.applyTransitionAge(state, action);
    }

    let next = state;
    for (const system of this.systems) {
      const before = next;
      next = system(next, action);
      if (isRejectedEndTurn(action, before, next)) {
        return next;
      }
    }
    return next;
  }

  private applyTransitionAge(state: GameState, action: GameAction): GameState {
    const ageSystemIndex = this.systems.indexOf(ageSystem);
    if (ageSystemIndex === -1) {
      return this.applyPipeline(state, action);
    }

    const afterAgeSystem = this.systems[ageSystemIndex](state, action);
    if (!isAcceptedAgeTransition(state, afterAgeSystem)) {
      return afterAgeSystem;
    }

    let next = afterAgeSystem;
    for (let i = 0; i < this.systems.length; i++) {
      if (i === ageSystemIndex) continue;
      next = this.systems[i](next, action);
    }
    return next;
  }

  private applyPipeline(state: GameState, action: GameAction): GameState {
    let next = state;
    for (const system of this.systems) {
      const before = next;
      next = system(next, action);
      if (isRejectedEndTurn(action, before, next)) {
        return next;
      }
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

function isRejectedEndTurn(action: GameAction, before: GameState, after: GameState): boolean {
  return action.type === 'END_TURN'
    && after.lastValidation?.valid === false
    && after.turn === before.turn
    && after.currentPlayerId === before.currentPlayerId
    && after.phase === before.phase;
}

function isAcceptedAgeTransition(before: GameState, after: GameState): boolean {
  const beforePlayer = before.players.get(before.currentPlayerId);
  const afterPlayer = after.players.get(before.currentPlayerId);
  return beforePlayer !== undefined
    && afterPlayer !== undefined
    && beforePlayer.age !== afterPlayer.age;
}
