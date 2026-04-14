import type { GameState, GameAction, System } from './types/GameState';

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
import { commanderPromotionSystem } from './systems/commanderPromotionSystem';
import { promotionSystem } from './systems/promotionSystem';
import { fortifySystem } from './systems/fortifySystem';
import { improvementSystem } from './systems/improvementSystem';
import { buildingPlacementSystem } from './systems/buildingPlacementSystem';
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
import { victorySystem } from './systems/victorySystem';

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
function adaptCommanderPromotion(state: GameState, action: GameAction): GameState {
  return commanderPromotionSystem(state, action);
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
  adaptCommanderPromotion,
  promotionSystem,
  fortifySystem,
  improvementSystem,
  buildingPlacementSystem,
  districtSystem,
  growthSystem,
  productionSystem,
  resourceSystem,
  researchSystem,
  civicSystem,
  ageSystem,
  diplomacySystem,
  updateDiplomacyCounters,
  specialistSystem,
  tradeSystem,
  governorSystem,
  crisisSystem,
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
}
