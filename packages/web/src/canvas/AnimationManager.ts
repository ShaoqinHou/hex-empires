/**
 * AnimationManager — Visual animation system for the hex canvas.
 *
 * Animations are PURELY VISUAL — game state is already updated when animations start.
 * This system interpolates visual properties over time for smooth transitions.
 *
 * Architecture:
 * - Animation queue: stores active animations
 * - update(): called every frame, advances animations, removes completed ones
 * - Individual animation types: each interpolates specific properties
 */

import type { HexCoord } from '@hex/engine';
import { hexToPixel } from './HexRenderer';
import { RANGED_PROJECTILE_COLOR } from './canvasTokens';

// ── Easing Functions ──

/** Linear easing (no easing) */
export function easeLinear(t: number): number {
  return t;
}

/** Quadratic ease-in (accelerates) */
export function easeInQuad(t: number): number {
  return t * t;
}

/** Quadratic ease-out (decelerates) */
export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

/** Quadratic ease-in-out (accelerates then decelerates) */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/** Cubic ease-in-out (smoother than quad) */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

/** Ease-out-back (overshoots slightly at end) */
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Ease-out-elastic (bouncy effect) */
export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// ── Animation Types ──

export interface Animation {
  readonly id: string;
  readonly startTime: number;
  readonly duration: number;
  readonly easing: (t: number) => number;
}

/** Unit movement along a path */
export interface UnitMoveAnimation extends Animation {
  readonly type: 'unit-move';
  readonly unitId: string;
  readonly ownerId: string;
  readonly unitTypeId: string;
  readonly path: ReadonlyArray<HexCoord>;
  readonly totalDistance: number;
}

/** Melee unit lunge attack */
export interface MeleeAttackAnimation extends Animation {
  readonly type: 'melee-attack';
  readonly attackerId: string;
  readonly attackerTypeId: string;
  readonly attackerOwnerId: string;
  readonly targetId: string;
  readonly targetTypeId: string;
  readonly targetOwnerId: string;
  readonly attackerFrom: HexCoord;
  readonly attackerTo: HexCoord;
}

/** Ranged unit projectile */
export interface RangedAttackAnimation extends Animation {
  readonly type: 'ranged-attack';
  readonly attackerId: string;
  readonly attackerTypeId: string;
  readonly attackerOwnerId: string;
  readonly targetId: string;
  readonly targetTypeId: string;
  readonly targetOwnerId: string;
  readonly from: HexCoord;
  readonly to: HexCoord;
  readonly projectileColor: string;
}

/** Damage flash on unit/city */
export interface DamageFlashAnimation extends Animation {
  readonly type: 'damage-flash';
  readonly targetId: string;
  readonly position: HexCoord;
  readonly isCity: boolean;
}

/** Unit death fade-out */
export interface UnitDeathAnimation extends Animation {
  readonly type: 'unit-death';
  readonly unitId: string;
  readonly position: HexCoord;
  readonly ownerId: string;
  readonly unitTypeId: string;
}

/** City founded ring expansion */
export interface CityFoundedAnimation extends Animation {
  readonly type: 'city-founded';
  readonly cityId: string;
  readonly position: HexCoord;
  readonly ownerId: string;
  readonly cityName: string;
}

/** Production complete popup */
export interface ProductionCompleteAnimation extends Animation {
  readonly type: 'production-complete';
  readonly cityId: string;
  readonly position: HexCoord;
  readonly itemName: string;
  readonly itemType: 'unit' | 'building' | 'wonder' | 'district';
}

/** City growth animation */
export interface CityGrowthAnimation extends Animation {
  readonly type: 'city-growth';
  readonly cityId: string;
  readonly position: HexCoord;
  readonly fromPop: number;
  readonly toPop: number;
}

/** Floating damage number (e.g. "-15 HP") */
export interface FloatingDamageAnimation extends Animation {
  readonly type: 'floating-damage';
  readonly targetId: string;
  readonly position: HexCoord;
  readonly damage: number;
}

export type AnyAnimation =
  | UnitMoveAnimation
  | MeleeAttackAnimation
  | RangedAttackAnimation
  | DamageFlashAnimation
  | UnitDeathAnimation
  | CityFoundedAnimation
  | ProductionCompleteAnimation
  | CityGrowthAnimation
  | FloatingDamageAnimation;

// ── Animation State ──

export interface AnimationState {
  /** Active animations queue */
  readonly active: ReadonlyArray<AnyAnimation>;
}

// ── AnimationManager ──

export class AnimationManager {
  private activeAnimations: Map<string, AnyAnimation> = new Map();
  private nextId = 0;

  /** Get all active animations */
  getActive(): ReadonlyArray<AnyAnimation> {
    return Array.from(this.activeAnimations.values());
  }

  /** Check if an animation exists for a unit/city */
  hasAnimationFor(targetId: string): boolean {
    for (const anim of this.activeAnimations.values()) {
      if (
        anim.type === 'unit-move' && anim.unitId === targetId ||
        anim.type === 'unit-death' && anim.unitId === targetId ||
        anim.type === 'damage-flash' && anim.targetId === targetId
      ) {
        return true;
      }
    }
    return false;
  }

  /** Add an animation to the queue */
  add(anim: AnyAnimation): void {
    this.activeAnimations.set(anim.id, anim);
  }

  /** Remove a specific animation */
  remove(id: string): void {
    this.activeAnimations.delete(id);
  }

  /** Clear all animations */
  clear(): void {
    this.activeAnimations.clear();
  }

  /** Update all animations, remove completed ones. Returns count of active animations. */
  update(currentTime: number): number {
    const toRemove: string[] = [];

    for (const [id, anim] of this.activeAnimations) {
      const elapsed = currentTime - anim.startTime;
      if (elapsed >= anim.duration) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.activeAnimations.delete(id);
    }

    return this.activeAnimations.size;
  }

  /** Get the progress (0-1) of an animation, with easing applied */
  getProgress(anim: AnyAnimation, currentTime: number): number {
    const elapsed = currentTime - anim.startTime;
    const raw = Math.max(0, Math.min(1, elapsed / anim.duration));
    return anim.easing(raw);
  }

  /** Get interpolated pixel position for a unit during movement animation */
  getUnitPosition(anim: UnitMoveAnimation, currentTime: number): { x: number; y: number } | null {
    const progress = this.getProgress(anim, currentTime);

    // Calculate which segment of the path we're on
    const segmentProgress = progress * (anim.path.length - 1);
    const segmentIndex = Math.floor(segmentProgress);
    const segmentT = segmentProgress - segmentIndex;

    if (segmentIndex >= anim.path.length - 1) {
      // At final position
      return hexToPixel(anim.path[anim.path.length - 1]);
    }

    // Interpolate between two hexes
    const from = hexToPixel(anim.path[segmentIndex]);
    const to = hexToPixel(anim.path[segmentIndex + 1]);

    return {
      x: from.x + (to.x - from.x) * segmentT,
      y: from.y + (to.y - from.y) * segmentT,
    };
  }

  /** Get lunge position for melee attack */
  getMeleeLungePosition(anim: MeleeAttackAnimation, currentTime: number): { x: number; y: number } | null {
    const progress = this.getProgress(anim, currentTime);

    // Lunge forward to 60% of the way to target, then return
    const from = hexToPixel(anim.attackerFrom);
    const to = hexToPixel(anim.attackerTo);

    // Use a curve that goes out and comes back
    const lungeProgress = progress < 0.5
      ? progress * 2 * 0.6 // Go out to 60%
      : (1 - progress) * 2 * 0.6; // Come back

    return {
      x: from.x + (to.x - from.x) * lungeProgress,
      y: from.y + (to.y - from.y) * lungeProgress,
    };
  }

  /** Get projectile position for ranged attack */
  getProjectilePosition(anim: RangedAttackAnimation, currentTime: number): { x: number; y: number } | null {
    const progress = this.getProgress(anim, currentTime);
    const from = hexToPixel(anim.from);
    const to = hexToPixel(anim.to);

    // Add an arc to the projectile (parabolic)
    const directX = from.x + (to.x - from.x) * progress;
    const directY = from.y + (to.y - from.y) * progress;

    // Arc height based on distance
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const arcHeight = distance * 0.3;

    // Sine wave arc: 0 at start and end, peak at middle
    const arcOffset = Math.sin(progress * Math.PI) * arcHeight;

    return {
      x: directX,
      y: directY - arcOffset, // Negative y is up in canvas
    };
  }

  /** Generate a unique animation ID */
  private generateId(): string {
    return `anim-${Date.now()}-${this.nextId++}`;
  }

  // ── Factory Methods ──

  /** Create a unit movement animation */
  createUnitMoveAnimation(
    unitId: string,
    ownerId: string,
    unitTypeId: string,
    path: ReadonlyArray<HexCoord>,
    duration: number = 400,
  ): UnitMoveAnimation {
    return {
      id: this.generateId(),
      type: 'unit-move',
      startTime: performance.now(),
      duration,
      easing: easeInOutQuad,
      unitId,
      ownerId,
      unitTypeId,
      path,
      totalDistance: path.length - 1,
    };
  }

  /** Create a melee attack animation */
  createMeleeAttackAnimation(
    attackerId: string,
    attackerTypeId: string,
    attackerOwnerId: string,
    targetId: string,
    targetTypeId: string,
    targetOwnerId: string,
    attackerFrom: HexCoord,
    attackerTo: HexCoord,
    duration: number = 200,
  ): MeleeAttackAnimation {
    return {
      id: this.generateId(),
      type: 'melee-attack',
      startTime: performance.now(),
      duration,
      easing: easeInOutQuad,
      attackerId,
      attackerTypeId,
      attackerOwnerId,
      targetId,
      targetTypeId,
      targetOwnerId,
      attackerFrom,
      attackerTo,
    };
  }

  /** Create a ranged attack animation */
  createRangedAttackAnimation(
    attackerId: string,
    attackerTypeId: string,
    attackerOwnerId: string,
    targetId: string,
    targetTypeId: string,
    targetOwnerId: string,
    from: HexCoord,
    to: HexCoord,
    projectileColor: string = RANGED_PROJECTILE_COLOR,
    duration: number = 300,
  ): RangedAttackAnimation {
    return {
      id: this.generateId(),
      type: 'ranged-attack',
      startTime: performance.now(),
      duration,
      easing: easeOutQuad,
      attackerId,
      attackerTypeId,
      attackerOwnerId,
      targetId,
      targetTypeId,
      targetOwnerId,
      from,
      to,
      projectileColor,
    };
  }

  /** Create a damage flash animation */
  createDamageFlashAnimation(
    targetId: string,
    position: HexCoord,
    isCity: boolean,
    duration: number = 150,
  ): DamageFlashAnimation {
    return {
      id: this.generateId(),
      type: 'damage-flash',
      startTime: performance.now(),
      duration,
      easing: easeLinear,
      targetId,
      position,
      isCity,
    };
  }

  /** Create a unit death animation */
  createUnitDeathAnimation(
    unitId: string,
    position: HexCoord,
    ownerId: string,
    unitTypeId: string,
    duration: number = 500,
  ): UnitDeathAnimation {
    return {
      id: this.generateId(),
      type: 'unit-death',
      startTime: performance.now(),
      duration,
      easing: easeOutBack,
      unitId,
      position,
      ownerId,
      unitTypeId,
    };
  }

  /** Create a city founded animation */
  createCityFoundedAnimation(
    cityId: string,
    position: HexCoord,
    ownerId: string,
    cityName: string,
    duration: number = 600,
  ): CityFoundedAnimation {
    return {
      id: this.generateId(),
      type: 'city-founded',
      startTime: performance.now(),
      duration,
      easing: easeOutElastic,
      cityId,
      position,
      ownerId,
      cityName,
    };
  }

  /** Create a production complete animation */
  createProductionCompleteAnimation(
    cityId: string,
    position: HexCoord,
    itemName: string,
    itemType: 'unit' | 'building' | 'wonder' | 'district',
    duration: number = 800,
  ): ProductionCompleteAnimation {
    return {
      id: this.generateId(),
      type: 'production-complete',
      startTime: performance.now(),
      duration,
      easing: easeOutBack,
      cityId,
      position,
      itemName,
      itemType,
    };
  }

  /** Create a floating damage number animation */
  createFloatingDamageAnimation(
    targetId: string,
    position: HexCoord,
    damage: number,
    duration: number = 800,
  ): FloatingDamageAnimation {
    return {
      id: this.generateId(),
      type: 'floating-damage',
      startTime: performance.now(),
      duration,
      easing: easeOutQuad,
      targetId,
      position,
      damage,
    };
  }

  /** Create a city growth animation */
  createCityGrowthAnimation(
    cityId: string,
    position: HexCoord,
    fromPop: number,
    toPop: number,
    duration: number = 400,
  ): CityGrowthAnimation {
    return {
      id: this.generateId(),
      type: 'city-growth',
      startTime: performance.now(),
      duration,
      easing: easeOutBack,
      cityId,
      position,
      fromPop,
      toPop,
    };
  }
}
