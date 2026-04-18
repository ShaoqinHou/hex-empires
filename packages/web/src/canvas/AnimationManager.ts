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
import { getMotionConstants } from './motionConstants';

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

/**
 * Combat lunge — attacker shoves 8px toward target then returns.
 * Spec §4 row 10: 80ms out (ease-out) + 120ms back (ease-in) = 200ms total.
 * Under prefers-reduced-motion this animation is skipped entirely.
 */
export interface CombatLungeAnimation extends Animation {
  readonly type: 'combat-lunge';
  readonly attackerId: string;
  /** Pixel offset at peak of lunge (always 8px toward target). */
  readonly peakOffsetX: number;
  readonly peakOffsetY: number;
  /** Duration of the outward shove phase in ms. */
  readonly lungeOutMs: number;
}

/**
 * Damage number float — a floating "-N" label anchored to a defender hex.
 * Spec §4 row 12: translateY(0 → -24px) + fade-out over --motion-slow (400ms).
 * Overlapping entries are allowed; no queue.
 */
export interface DamageNumberAnimation extends Animation {
  readonly type: 'damage-number';
  readonly position: HexCoord;
  readonly amount: number;
  /** Display label. Negative amounts use '-'; positive use '+' (heals). */
  readonly label: string;
}

/**
 * Defender red tint — rendered as a semi-transparent overlay on the sprite.
 * Spec §4 row 11: red tint pulse over --motion-fast (160ms), ease-out.
 * Concurrent with attacker lunge return stroke.
 */
export interface DefenderTintAnimation extends Animation {
  readonly type: 'defender-tint';
  readonly targetId: string;
  readonly position: HexCoord;
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
  | FloatingDamageAnimation
  | CombatLungeAnimation
  | DamageNumberAnimation
  | DefenderTintAnimation;

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
        anim.type === 'damage-flash' && anim.targetId === targetId ||
        anim.type === 'combat-lunge' && anim.attackerId === targetId ||
        anim.type === 'defender-tint' && anim.targetId === targetId
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the current pixel offset for a unit undergoing a combat lunge.
   * Returns {x:0, y:0} if no lunge is active for the unit.
   * Used by AnimationRenderer to displace the unit sprite during the lunge.
   */
  getCombatOffset(unitId: string, currentTime: number): { readonly x: number; readonly y: number } {
    for (const anim of this.activeAnimations.values()) {
      if (anim.type !== 'combat-lunge' || anim.attackerId !== unitId) continue;

      const elapsed = currentTime - anim.startTime;
      const { lungeOutMs } = anim;
      const totalMs = anim.duration; // lungeOutMs + lungeBackMs

      let t: number;
      if (elapsed <= lungeOutMs) {
        // Out phase: ease-out from 0 → peak offset
        const raw = elapsed / lungeOutMs;
        t = easeOutQuad(raw);
        return { x: anim.peakOffsetX * t, y: anim.peakOffsetY * t };
      } else {
        // Back phase: ease-in from peak offset → 0
        const backMs = totalMs - lungeOutMs;
        const raw = Math.min(1, (elapsed - lungeOutMs) / backMs);
        t = easeInQuad(raw);
        return {
          x: anim.peakOffsetX * (1 - t),
          y: anim.peakOffsetY * (1 - t),
        };
      }
    }
    return { x: 0, y: 0 };
  }

  /**
   * Get the red tint alpha for a unit undergoing a defender flash.
   * Returns 0 if no tint animation is active for the unit.
   * Spec §4 row 11: alpha ramps 0→peak→0 over --motion-fast (ease-out).
   */
  getRedTintAlpha(targetId: string, currentTime: number): number {
    for (const anim of this.activeAnimations.values()) {
      if (anim.type !== 'defender-tint' || anim.targetId !== targetId) continue;
      const elapsed = currentTime - anim.startTime;
      const raw = Math.max(0, Math.min(1, elapsed / anim.duration));
      // Peak at t=0.3, fade to 0 at t=1 (like a hit flash: quick in, slow out)
      const shaped = raw < 0.3 ? (raw / 0.3) : (1 - (raw - 0.3) / 0.7);
      return easeOutQuad(shaped) * 0.55; // max alpha 0.55 — readable but not opaque
    }
    return 0;
  }

  /**
   * Get all active damage-number animations for rendering.
   * AnimationRenderer uses this to draw the floating-number pass.
   */
  getDamageNumbers(): ReadonlyArray<DamageNumberAnimation> {
    const result: DamageNumberAnimation[] = [];
    for (const anim of this.activeAnimations.values()) {
      if (anim.type === 'damage-number') result.push(anim);
    }
    return result;
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

  /**
   * Get interpolated pixel position for a unit during movement animation.
   *
   * Endpoint easing bloom (spec §4 row 9):
   * - First hex segment: easeOutQuad (unit accelerates out of its start tile)
   * - Last hex segment:  easeOutQuad (unit decelerates into its destination)
   * - Middle segments:   linear (constant speed across interior hexes)
   *
   * Multi-hex paths chain without re-easing; each segment receives the whole
   * segment's local t=[0,1] so the bloom is per-segment, not global.
   */
  getUnitPosition(anim: UnitMoveAnimation, currentTime: number): { x: number; y: number } | null {
    const numSegments = anim.path.length - 1;
    if (numSegments <= 0) {
      return hexToPixel(anim.path[0]);
    }

    // Global elapsed ratio across the entire path (no easing at global level)
    const elapsed = currentTime - anim.startTime;
    const rawGlobal = Math.max(0, Math.min(1, elapsed / anim.duration));

    // Each segment occupies an equal slice of global time
    const globalSegProgress = rawGlobal * numSegments;
    const segmentIndex = Math.min(Math.floor(globalSegProgress), numSegments - 1);
    const rawSegT = globalSegProgress - segmentIndex; // 0→1 within this segment

    if (segmentIndex >= numSegments) {
      return hexToPixel(anim.path[anim.path.length - 1]);
    }

    // Apply per-segment easing: ease-out on first and last, linear in the middle
    let easedT: number;
    const isFirst = segmentIndex === 0;
    const isLast = segmentIndex === numSegments - 1;

    if (isFirst || isLast) {
      easedT = easeOutQuad(rawSegT);
    } else {
      easedT = rawSegT; // linear
    }

    const from = hexToPixel(anim.path[segmentIndex]);
    const to   = hexToPixel(anim.path[segmentIndex + 1]);

    return {
      x: from.x + (to.x - from.x) * easedT,
      y: from.y + (to.y - from.y) * easedT,
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

  /**
   * Create a unit movement animation.
   *
   * Per-hex duration is derived from unit category when duration is omitted:
   *   slow  (catapult, etc.) → MOTION.unitMoveSlow   (400ms/hex default)
   *   fast  (cavalry, scout) → MOTION.unitMoveFast   (160ms/hex default)
   *   normal (everything else) → MOTION.unitMoveNormal (240ms/hex default)
   *
   * Pass an explicit duration to override (e.g. from AnimationTrigger).
   * Total animation duration = perHexMs × (path.length - 1), minimum 1 hex.
   */
  createUnitMoveAnimation(
    unitId: string,
    ownerId: string,
    unitTypeId: string,
    path: ReadonlyArray<HexCoord>,
    duration?: number,
  ): UnitMoveAnimation {
    const numHexes = Math.max(1, path.length - 1);
    const resolvedDuration = duration ?? this.resolveUnitMoveDuration(unitTypeId, numHexes);
    return {
      id: this.generateId(),
      type: 'unit-move',
      startTime: performance.now(),
      duration: resolvedDuration,
      easing: easeLinear, // Easing is applied per-segment in getUnitPosition; global easing must be linear
      unitId,
      ownerId,
      unitTypeId,
      path,
      totalDistance: numHexes,
    };
  }

  /**
   * Resolve per-path move duration from unit type and number of hexes.
   * Slow units: --motion-slow per hex. Fast units: --motion-fast per hex.
   * Normal units: --motion-medium per hex.
   */
  private resolveUnitMoveDuration(unitTypeId: string, numHexes: number): number {
    const MOTION = getMotionConstants();
    // Unit categories by type ID prefix / keyword.
    // Slow: siege, catapult, trebuchet, bombard.
    // Fast: cavalry, horseman, knight, scout, ranger, hussar, light.
    const lower = unitTypeId.toLowerCase();
    const isSlow = /catapult|trebuchet|bombard|siege|cannon/.test(lower);
    const isFast = /cavalry|horseman|knight|scout|ranger|hussar|cuirassier|light_/.test(lower);

    let perHex: number;
    if (isSlow) {
      perHex = MOTION.unitMoveSlow;
    } else if (isFast) {
      perHex = MOTION.unitMoveFast;
    } else {
      perHex = MOTION.unitMoveNormal;
    }

    return perHex * numHexes;
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

  // ── Phase 6.5 additions ──────────────────────────────────────────────────

  /**
   * Start a combat lunge animation for the attacker.
   *
   * Spec §4 row 10: 8px shove toward target over 80ms (ease-out), then
   * return over 120ms (ease-in). Total 200ms envelope = --motion-fast.
   *
   * Under prefers-reduced-motion the lunge is disabled entirely — call
   * `startDamageNumber` / `startDefenderTint` regardless.
   *
   * @param attackerId - unit ID of the attacker
   * @param attackerHex - current hex of the attacker (pixel origin)
   * @param targetHex   - hex of the target (used to compute lunge direction)
   */
  startCombatLunge(attackerId: string, attackerHex: HexCoord, targetHex: HexCoord): void {
    if (this.isReducedMotion()) return;

    const MOTION = getMotionConstants();
    const fromPx = hexToPixel(attackerHex);
    const toPx   = hexToPixel(targetHex);

    const dx = toPx.x - fromPx.x;
    const dy = toPx.y - fromPx.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // 8px offset toward target (spec: "8px shove toward target")
    const LUNGE_PX = 8;
    const peakOffsetX = (dx / dist) * LUNGE_PX;
    const peakOffsetY = (dy / dist) * LUNGE_PX;

    const lunge: CombatLungeAnimation = {
      id: this.generateId(),
      type: 'combat-lunge',
      startTime: performance.now(),
      duration: MOTION.combatLungeTotal,
      easing: easeLinear, // easing is applied per-phase in getCombatOffset
      attackerId,
      peakOffsetX,
      peakOffsetY,
      lungeOutMs: MOTION.combatLungeOut,
    };
    this.add(lunge);
  }

  /**
   * Start a floating damage number anchored to a hex.
   *
   * Spec §4 row 12: translateY(0 → -24px) + fade-out over --motion-slow (400ms).
   * Overlapping entries are allowed (no queue).
   * Under reduced-motion, duration is halved (already done in CSS token layer).
   *
   * @param hex    - hex position the number is anchored to
   * @param amount - numeric damage/heal value (positive = damage, negative = heal)
   */
  startDamageNumber(hex: HexCoord, amount: number): void {
    const MOTION = getMotionConstants();
    const label = amount >= 0 ? `-${amount}` : `+${Math.abs(amount)}`;

    const entry: DamageNumberAnimation = {
      id: this.generateId(),
      type: 'damage-number',
      startTime: performance.now(),
      duration: MOTION.damageNumber,
      easing: easeOutQuad,
      position: hex,
      amount,
      label,
    };
    this.add(entry);
  }

  /**
   * Start a red tint flash on a defending unit or city sprite.
   *
   * Spec §4 row 11: red tint pulse over --motion-fast (160ms), concurrent
   * with the attacker lunge return stroke.
   *
   * @param targetId - unit/city ID whose sprite should flash red
   * @param position - hex position of the target
   */
  startDefenderTint(targetId: string, position: HexCoord): void {
    const MOTION = getMotionConstants();

    const tint: DefenderTintAnimation = {
      id: this.generateId(),
      type: 'defender-tint',
      startTime: performance.now(),
      duration: MOTION.unitMoveFast, // --motion-fast (160ms)
      easing: easeOutQuad,
      targetId,
      position,
    };
    this.add(tint);
  }

  /**
   * Convenience method: start combat lunge on attacker + concurrent
   * defender tint + damage number on all defender hexes simultaneously.
   * Implements the Q2 "concurrent volley" decision: one lunge toward centroid
   * + simultaneous flash + numbers on all targets.
   *
   * @param attackerHex   - attacker position
   * @param targets       - array of { id, hex, damage } for each defender
   */
  startCombatSequence(
    attackerId: string,
    attackerHex: HexCoord,
    targets: ReadonlyArray<{ readonly id: string; readonly hex: HexCoord; readonly damage: number }>,
  ): void {
    if (targets.length === 0) return;

    // Compute centroid of all target hexes for the lunge direction
    const centroidHex: HexCoord = targets.length === 1
      ? targets[0].hex
      : {
          q: Math.round(targets.reduce((s, t) => s + t.hex.q, 0) / targets.length),
          r: Math.round(targets.reduce((s, t) => s + t.hex.r, 0) / targets.length),
        };

    this.startCombatLunge(attackerId, attackerHex, centroidHex);

    for (const target of targets) {
      this.startDefenderTint(target.id, target.hex);
      this.startDamageNumber(target.hex, target.damage);
    }
  }

  // ── Phase 6.6 additions ──────────────────────────────────────────────────

  /**
   * Start the age-transition screen shake on a DOM element (the canvas container).
   *
   * Spec §4 row 16: ±4px sinusoidal camera-container shake, 2 oscillations,
   * 200ms total (--motion-shake). Under prefers-reduced-motion the shake is
   * disabled entirely and `startBackdropFlash` is called instead.
   *
   * Implementation: injects a one-shot CSS keyframe animation on the element.
   * The animation name is unique per call so concurrent invocations don't
   * clobber each other (though in practice only one age transition fires per
   * game). Cleans up after itself via animationend.
   *
   * @param element - the canvas or its immediate container (e.g. canvasRef.current)
   */
  startAgeShake(element: HTMLElement | null): void {
    if (!element) return;

    if (this.isReducedMotion()) {
      this.startBackdropFlash(element);
      return;
    }

    const MOTION = getMotionConstants();
    const durationMs = MOTION.ageShake; // 200ms (--motion-shake)
    const animName = `age-shake-${this.generateId()}`;

    // Build a <style> tag with the keyframe.
    // 2 oscillations: 0% → +4px → -4px → +4px → -4px → 0%
    // Using 5 stops gives ≈2 full sinusoidal cycles.
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${animName} {
        0%   { transform: translateX(0); }
        20%  { transform: translateX(4px); }
        40%  { transform: translateX(-4px); }
        60%  { transform: translateX(4px); }
        80%  { transform: translateX(-4px); }
        100% { transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);

    element.style.animation = `${animName} ${durationMs}ms ease-in-out`;

    const cleanup = () => {
      element.style.animation = '';
      style.remove();
      element.removeEventListener('animationend', cleanup);
    };
    element.addEventListener('animationend', cleanup, { once: true });

    // Safety timeout: if animationend never fires (e.g. element hidden),
    // clean up after 2× the duration.
    setTimeout(cleanup, durationMs * 2);
  }

  /**
   * Reduced-motion fallback for the age transition: a 200ms white overlay
   * flash (opacity 0 → 0.15 peak → 0) preserving the "something happened"
   * beat without vestibular trigger.
   *
   * Creates a fixed-position div overlay on the element's parent (or body
   * if no parent). Removes itself after the animation completes.
   *
   * @param element - the canvas element (used to find the overlay container)
   */
  startBackdropFlash(element: HTMLElement | null): void {
    const container =
      (element?.parentElement) ??
      (typeof document !== 'undefined' ? document.body : null);
    if (!container) return;

    const MOTION = getMotionConstants();
    const durationMs = MOTION.ageShake; // uses --motion-shake (200ms or 100ms reduced)

    const overlay = document.createElement('div');
    overlay.setAttribute('data-testid', 'age-backdrop-flash');
    overlay.style.cssText = [
      'position:absolute',
      'inset:0',
      'pointer-events:none',
      'background:white',
      `animation:age-backdrop-flash-in ${durationMs}ms ease-in-out forwards`,
      'z-index:9999',
    ].join(';');

    // Inject the keyframe the first time (idempotent guard on the style id)
    const styleId = 'age-backdrop-flash-style';
    if (!document.getElementById(styleId)) {
      const ks = document.createElement('style');
      ks.id = styleId;
      ks.textContent = `
        @keyframes age-backdrop-flash-in {
          0%   { opacity: 0; }
          40%  { opacity: 0.15; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(ks);
    }

    container.appendChild(overlay);

    const remove = () => overlay.remove();
    overlay.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, durationMs * 2); // safety
  }

  /** Check whether prefers-reduced-motion is currently active. */
  private isReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
