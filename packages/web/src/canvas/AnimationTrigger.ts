/**
 * AnimationTrigger — Triggers visual animations based on game actions.
 *
 * This module provides helper functions to trigger animations when actions are dispatched.
 * Animations are queued in the AnimationManager and rendered by AnimationRenderer.
 */

import type { HexCoord, GameState } from '@hex/engine';
import { coordToKey } from '@hex/engine';
import type {
  UnitMoveAnimation,
  MeleeAttackAnimation,
  RangedAttackAnimation,
  DamageFlashAnimation,
  UnitDeathAnimation,
  CityFoundedAnimation,
  ProductionCompleteAnimation,
  CityGrowthAnimation,
} from './AnimationManager';
import { AnimationManager } from './AnimationManager';
import type { GameAction } from '@hex/engine';

export interface UnitMoveAnimationPlan {
  readonly ownerId: string;
  readonly unitTypeId: string;
  readonly path: ReadonlyArray<HexCoord>;
}

export function createUnitMoveAnimationPlan(
  prevState: GameState,
  newState: GameState,
  action: { type: 'MOVE_UNIT'; unitId: string; path: ReadonlyArray<HexCoord> },
): UnitMoveAnimationPlan | null {
  const prevUnit = prevState.units.get(action.unitId);
  const unit = newState.units.get(action.unitId);
  if (!prevUnit || !unit) return null;

  const prevKey = coordToKey(prevUnit.position);
  const nextKey = coordToKey(unit.position);
  if (prevKey === nextKey) return null;

  const actualPathEndIndex = action.path.findIndex(coord => coordToKey(coord) === nextKey);
  const traversedPath = actualPathEndIndex >= 0
    ? action.path.slice(0, actualPathEndIndex + 1)
    : [unit.position];

  return {
    ownerId: unit.owner,
    unitTypeId: unit.typeId,
    path: [prevUnit.position, ...traversedPath],
  };
}

/**
 * Trigger animations based on state changes after an action.
 * Compares previous and new state to determine what animations to play.
 */
export function triggerAnimationsForAction(
  manager: AnimationManager,
  prevState: GameState,
  newState: GameState,
  action: GameAction,
): void {
  switch (action.type) {
    case 'MOVE_UNIT':
      triggerMoveAnimation(manager, prevState, newState, action);
      break;
    case 'ATTACK_UNIT':
      triggerAttackAnimation(manager, prevState, newState, action);
      break;
    case 'ATTACK_CITY':
      triggerCityAttackAnimation(manager, prevState, newState, action);
      break;
    case 'FOUND_CITY':
      triggerCityFoundedAnimation(manager, action);
      break;
  }

  // Check for production complete (city finished producing something)
  triggerProductionCompleteAnimations(manager, prevState, newState);

  // Check for city growth (population increased)
  triggerCityGrowthAnimations(manager, prevState, newState);

  // Check for unit deaths (can happen from multiple action types)
  triggerDeathAnimations(manager, prevState, newState);
}

/**
 * Trigger unit movement animation
 */
function triggerMoveAnimation(
  manager: AnimationManager,
  prevState: GameState,
  newState: GameState,
  action: { type: 'MOVE_UNIT'; unitId: string; path: ReadonlyArray<HexCoord> },
): void {
  const plan = createUnitMoveAnimationPlan(prevState, newState, action);
  if (!plan) return;

  const anim = manager.createUnitMoveAnimation(
    action.unitId,
    plan.ownerId,
    plan.unitTypeId,
    plan.path,
    400, // 400ms duration
  );
  manager.add(anim);
}

/**
 * Trigger attack animations (melee or ranged)
 */
function triggerAttackAnimation(
  manager: AnimationManager,
  prevState: GameState,
  newState: GameState,
  action: { type: 'ATTACK_UNIT'; attackerId: string; targetId: string },
): void {
  const attacker = newState.units.get(action.attackerId);
  const defender = prevState.units.get(action.targetId); // Use prev state for position

  if (!attacker || !defender) return;

  // Check if attacker is ranged
  const attackerDef = newState.config.units.get(attacker.typeId);
  const isRanged = (attackerDef?.rangedCombat ?? 0) > 0;

  if (isRanged) {
    // Ranged attack: projectile + damage flash
    const rangedAnim = manager.createRangedAttackAnimation(
      action.attackerId,
      attacker.typeId,
      attacker.owner,
      action.targetId,
      defender.typeId,
      defender.owner,
      attacker.position,
      defender.position,
      '#ff5722', // projectile color
      300,
    );
    manager.add(rangedAnim);

    // Damage flash on target after delay
    setTimeout(() => {
      const flashAnim = manager.createDamageFlashAnimation(
        action.targetId,
        defender.position,
        false, // not a city
        150,
      );
      manager.add(flashAnim);
    }, 200);
  } else {
    // Melee attack: lunge + damage flash
    const meleeAnim = manager.createMeleeAttackAnimation(
      action.attackerId,
      attacker.typeId,
      attacker.owner,
      action.targetId,
      defender.typeId,
      defender.owner,
      attacker.position,
      defender.position,
      200,
    );
    manager.add(meleeAnim);

    // Damage flash on target
    setTimeout(() => {
      const flashAnim = manager.createDamageFlashAnimation(
        action.targetId,
        defender.position,
        false,
        150,
      );
      manager.add(flashAnim);
    }, 100);
  }
}

/**
 * Trigger city attack animations
 */
function triggerCityAttackAnimation(
  manager: AnimationManager,
  prevState: GameState,
  newState: GameState,
  action: { type: 'ATTACK_CITY'; attackerId: string; cityId: string },
): void {
  const attacker = newState.units.get(action.attackerId);
  const city = newState.cities.get(action.cityId);

  if (!attacker || !city) return;

  const attackerDef = newState.config.units.get(attacker.typeId);
  const isRanged = (attackerDef?.rangedCombat ?? 0) > 0;

  if (isRanged) {
    // Ranged attack on city
    const rangedAnim = manager.createRangedAttackAnimation(
      action.attackerId,
      attacker.typeId,
      attacker.owner,
      action.cityId,
      'city',
      city.owner,
      attacker.position,
      city.position,
      '#ff5722',
      300,
    );
    manager.add(rangedAnim);

    // Damage flash on city
    setTimeout(() => {
      const flashAnim = manager.createDamageFlashAnimation(
        action.cityId,
        city.position,
        true, // isCity
        150,
      );
      manager.add(flashAnim);
    }, 200);
  } else {
    // Melee attack on city (lunge)
    const meleeAnim = manager.createMeleeAttackAnimation(
      action.attackerId,
      attacker.typeId,
      attacker.owner,
      action.cityId,
      'city',
      city.owner,
      attacker.position,
      city.position,
      200,
    );
    manager.add(meleeAnim);

    // Damage flash on city
    setTimeout(() => {
      const flashAnim = manager.createDamageFlashAnimation(
        action.cityId,
        city.position,
        true,
        150,
      );
      manager.add(flashAnim);
    }, 100);
  }

  // Check if city was captured (melee only)
  const prevCity = prevState.cities.get(action.cityId);
  if (prevCity && prevCity.owner !== city.owner && !isRanged) {
    // City was captured - show special effect
    // This could be expanded with a "city captured" animation
  }
}

/**
 * Trigger city founded animation
 */
function triggerCityFoundedAnimation(
  manager: AnimationManager,
  action: { type: 'FOUND_CITY'; unitId: string; name: string },
): void {
  // Get the unit position from prevState before it was consumed
  // We need to track the unit position - for now use a placeholder
  // In a full implementation, we'd pass the unit position

  // For now, skip this animation as we need the unit position
  // TODO: Track unit positions before consumption
}

/**
 * Trigger production complete animations by detecting state changes
 */
function triggerProductionCompleteAnimations(
  manager: AnimationManager,
  prevState: GameState,
  newState: GameState,
): void {
  // Check each city for production queue changes
  for (const [cityId, newCity] of newState.cities) {
    const prevCity = prevState.cities.get(cityId);
    if (!prevCity) {
      // City was just founded - skip for now
      continue;
    }

    // Check if production queue changed (item was completed and new item started)
    if (newCity.productionQueue.length > 0 && prevCity.productionQueue.length > 0) {
      const prevItem = prevCity.productionQueue[0];
      const newItem = newCity.productionQueue[0];

      // Different item means previous one completed
      if (prevItem && newItem && prevItem.id !== newItem.id) {
        const anim = manager.createProductionCompleteAnimation(
          cityId,
          newCity.position,
          prevItem.id,
          prevItem.type,
          800,
        );
        manager.add(anim);
      }
    }
  }
}

/**
 * Trigger city growth animations by detecting population changes
 */
function triggerCityGrowthAnimations(
  manager: AnimationManager,
  prevState: GameState,
  newState: GameState,
): void {
  // Check each city for population increases
  for (const [cityId, newCity] of newState.cities) {
    const prevCity = prevState.cities.get(cityId);
    if (!prevCity) continue;

    // Check if population increased
    if (newCity.population > prevCity.population) {
      const anim = manager.createCityGrowthAnimation(
        cityId,
        newCity.position,
        prevCity.population,
        newCity.population,
        400,
      );
      manager.add(anim);
    }
  }
}

/**
 * Trigger death animations for units that were destroyed
 */
function triggerDeathAnimations(
  manager: AnimationManager,
  prevState: GameState,
  newState: GameState,
): void {
  // Find units that existed before but don't exist now
  for (const [id, unit] of prevState.units) {
    if (!newState.units.has(id)) {
      // Unit was destroyed
      const anim = manager.createUnitDeathAnimation(
        id,
        unit.position,
        unit.owner,
        unit.typeId,
        500,
      );
      manager.add(anim);
    }
  }
}
