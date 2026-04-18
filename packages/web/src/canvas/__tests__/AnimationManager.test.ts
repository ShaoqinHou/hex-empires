/**
 * Animation system tests
 *
 * Tests interpolation accuracy and animation behavior without visual testing.
 */

import { describe, it, expect } from 'vitest';
import {
  AnimationManager,
  easeLinear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInOutCubic,
  easeOutBack,
  easeOutElastic,
  type UnitMoveAnimation,
  type MeleeAttackAnimation,
  type RangedAttackAnimation,
} from '../AnimationManager';
import { coordToKey } from '@hex/engine';
import { hexToPixel } from '../../utils/hexMath';

describe('AnimationManager', () => {
  describe('Easing Functions', () => {
    it('easeLinear should return t unchanged', () => {
      expect(easeLinear(0)).toBe(0);
      expect(easeLinear(0.5)).toBe(0.5);
      expect(easeLinear(1)).toBe(1);
    });

    it('easeInQuad should accelerate', () => {
      expect(easeInQuad(0)).toBe(0);
      expect(easeInQuad(0.5)).toBe(0.25);
      expect(easeInQuad(1)).toBe(1);
      // Should be lower than linear for t < 1
      expect(easeInQuad(0.3)).toBeLessThan(easeLinear(0.3));
    });

    it('easeOutQuad should decelerate', () => {
      expect(easeOutQuad(0)).toBe(0);
      expect(easeOutQuad(0.5)).toBe(0.75);
      expect(easeOutQuad(1)).toBe(1);
      // Should be higher than linear for t < 1
      expect(easeOutQuad(0.3)).toBeGreaterThan(easeLinear(0.3));
    });

    it('easeInOutQuad should be symmetric', () => {
      expect(easeInOutQuad(0)).toBe(0);
      expect(easeInOutQuad(0.5)).toBe(0.5);
      expect(easeInOutQuad(1)).toBe(1);
      // Symmetric around 0.5
      const t1 = 0.25;
      const t2 = 0.75;
      expect(easeInOutQuad(t1) + easeInOutQuad(t2)).toBeCloseTo(1, 5);
    });

    it('easeInOutCubic should be smoother than quad', () => {
      expect(easeInOutCubic(0)).toBe(0);
      expect(easeInOutCubic(0.5)).toBe(0.5);
      expect(easeInOutCubic(1)).toBe(1);
      // Should be different from quad
      expect(easeInOutCubic(0.25)).not.toBe(easeInOutQuad(0.25));
    });

    it('easeOutBack should overshoot at end', () => {
      expect(easeOutBack(0)).toBeCloseTo(0, 10);
      expect(easeOutBack(1)).toBeCloseTo(1, 10);
      // Should exceed 1 before settling back
      let maxVal = 0;
      for (let t = 0; t <= 1; t += 0.01) {
        maxVal = Math.max(maxVal, easeOutBack(t));
      }
      expect(maxVal).toBeGreaterThan(1);
    });

    it('easeOutElastic should be bouncy', () => {
      expect(easeOutElastic(0)).toBe(0);
      expect(easeOutElastic(1)).toBe(1);
      // Should oscillate around 1 before settling
      let hasOvershoot = false;
      for (let t = 0.5; t <= 1; t += 0.01) {
        if (easeOutElastic(t) > 1 || easeOutElastic(t) < 0) {
          hasOvershoot = true;
          break;
        }
      }
      expect(hasOvershoot).toBe(true);
    });
  });

  describe('Animation Lifecycle', () => {
    it('should track active animations', () => {
      const manager = new AnimationManager();
      expect(manager.getActive()).toHaveLength(0);

      const anim = manager.createUnitMoveAnimation('u1', 'p1', 'warrior', [{ q: 0, r: 0 }, { q: 1, r: 0 }]);
      manager.add(anim);

      expect(manager.getActive()).toHaveLength(1);
      expect(manager.getActive()[0]).toBe(anim);
    });

    it('should remove completed animations', () => {
      const manager = new AnimationManager();
      const anim = manager.createUnitMoveAnimation('u1', 'p1', 'warrior', [{ q: 0, r: 0 }, { q: 1, r: 0 }], 10);
      manager.add(anim);

      // Before completion
      expect(manager.getActive()).toHaveLength(1);

      // After completion (advance time past duration)
      manager.update(anim.startTime + anim.duration + 10);

      expect(manager.getActive()).toHaveLength(0);
    });

    it('should clear all animations', () => {
      const manager = new AnimationManager();
      manager.add(manager.createUnitMoveAnimation('u1', 'p1', 'warrior', [{ q: 0, r: 0 }, { q: 1, r: 0 }]));
      manager.add(manager.createUnitMoveAnimation('u2', 'p1', 'scout', [{ q: 2, r: 0 }, { q: 3, r: 0 }]));

      expect(manager.getActive()).toHaveLength(2);

      manager.clear();

      expect(manager.getActive()).toHaveLength(0);
    });

    it('should check if animation exists for target', () => {
      const manager = new AnimationManager();
      manager.add(manager.createUnitMoveAnimation('u1', 'p1', 'warrior', [{ q: 0, r: 0 }, { q: 1, r: 0 }]));

      expect(manager.hasAnimationFor('u1')).toBe(true);
      expect(manager.hasAnimationFor('u2')).toBe(false);
    });
  });

  describe('Unit Movement Animation', () => {
    it('should calculate progress correctly', () => {
      const manager = new AnimationManager();
      const anim = manager.createUnitMoveAnimation('u1', 'p1', 'warrior', [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 }
      ], 1000);

      manager.add(anim);

      // At start
      let progress = manager.getProgress(anim, anim.startTime);
      expect(progress).toBe(0);

      // At halfway
      progress = manager.getProgress(anim, anim.startTime + 500);
      expect(progress).toBeCloseTo(0.5, 1);

      // At end
      progress = manager.getProgress(anim, anim.startTime + 1000);
      expect(progress).toBeCloseTo(1, 1);
    });

    it('should interpolate position along path', () => {
      const manager = new AnimationManager();
      const path = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 }
      ];
      const anim = manager.createUnitMoveAnimation('u1', 'p1', 'warrior', path, 1000);
      manager.add(anim);

      // At start (t=0), rawGlobal=0 → segmentProgress=0 → hexToPixel({q:0,r:0})
      let pos = manager.getUnitPosition(anim, anim.startTime);
      expect(pos).not.toBeNull();
      expect(pos!.x).toBeCloseTo(hexToPixel({ q: 0, r: 0 }).x, 5);
      expect(pos!.y).toBeCloseTo(hexToPixel({ q: 0, r: 0 }).y, 5);

      // At t=500ms: rawGlobal=0.5, globalSegProgress=0.5*2=1.0
      // segmentIndex=min(floor(1.0),1)=1, rawSegT=0 → easeOutQuad(0)=0
      // → start of last segment = hexToPixel({q:1,r:0})
      pos = manager.getUnitPosition(anim, anim.startTime + 500);
      expect(pos).not.toBeNull();
      expect(pos!.x).toBeCloseTo(hexToPixel({ q: 1, r: 0 }).x, 5);
      expect(pos!.y).toBeCloseTo(hexToPixel({ q: 1, r: 0 }).y, 5);

      // At end (t=1000ms, progress=1), segmentIndex >= path.length-1 → last hex
      pos = manager.getUnitPosition(anim, anim.startTime + 1000);
      expect(pos).not.toBeNull();
      expect(pos!.x).toBeCloseTo(hexToPixel({ q: 2, r: 0 }).x, 5);
      expect(pos!.y).toBeCloseTo(hexToPixel({ q: 2, r: 0 }).y, 5);
    });

    it('should handle single-step movement', () => {
      const manager = new AnimationManager();
      const path = [
        { q: 0, r: 0 },
        { q: 1, r: 0 }
      ];
      const anim = manager.createUnitMoveAnimation('u1', 'p1', 'warrior', path, 1000);
      manager.add(anim);

      // Phase 6.5 endpoint easing: for a single-segment path (which is both
      // the first AND last segment), easeOutQuad applies.
      // At t=500ms: rawGlobal=0.5, rawSegT=0.5, easeOutQuad(0.5)=0.75
      // → position is 75% of the way from hex0 to hex1.
      const hex0 = hexToPixel({ q: 0, r: 0 });
      const hex1 = hexToPixel({ q: 1, r: 0 });
      const expected75X = hex0.x + (hex1.x - hex0.x) * 0.75;
      const expected75Y = hex0.y + (hex1.y - hex0.y) * 0.75;

      const pos = manager.getUnitPosition(anim, anim.startTime + 500);
      expect(pos).not.toBeNull();
      expect(pos!.x).toBeCloseTo(expected75X, 5);
      expect(pos!.y).toBeCloseTo(expected75Y, 5);

      // Start and end pixel positions are exactly on the hex centers
      const startPos = manager.getUnitPosition(anim, anim.startTime);
      const endPos = manager.getUnitPosition(anim, anim.startTime + 1000);
      expect(startPos!.x).toBeCloseTo(hex0.x, 5);
      expect(endPos!.x).toBeCloseTo(hex1.x, 5);
    });

    it('should include unit type ID in animation', () => {
      const manager = new AnimationManager();
      const anim = manager.createUnitMoveAnimation('u1', 'p1', 'scout', [
        { q: 0, r: 0 },
        { q: 1, r: 0 }
      ]);

      expect(anim.unitTypeId).toBe('scout');
    });
  });

  describe('Melee Attack Animation', () => {
    it('should include unit type and owner information', () => {
      const manager = new AnimationManager();
      const anim = manager.createMeleeAttackAnimation(
        'u1', 'warrior', 'p1',
        'u2', 'archer', 'p2',
        { q: 0, r: 0 },
        { q: 1, r: 0 }
      );

      expect(anim.attackerTypeId).toBe('warrior');
      expect(anim.attackerOwnerId).toBe('p1');
      expect(anim.targetTypeId).toBe('archer');
      expect(anim.targetOwnerId).toBe('p2');
    });

    it('should calculate lunge position', () => {
      const manager = new AnimationManager();
      const anim = manager.createMeleeAttackAnimation(
        'u1', 'warrior', 'p1',
        'u2', 'archer', 'p2',
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        1000
      );

      // At start, should be at attacker position
      let pos = manager.getMeleeLungePosition(anim, anim.startTime);
      expect(pos).not.toBeNull();

      // At peak (halfway), should be lunged toward target
      pos = manager.getMeleeLungePosition(anim, anim.startTime + 500);
      expect(pos).not.toBeNull();

      // At end, should be back at attacker position
      pos = manager.getMeleeLungePosition(anim, anim.startTime + 1000);
      expect(pos).not.toBeNull();
    });
  });

  describe('Ranged Attack Animation', () => {
    it('should include unit type and owner information', () => {
      const manager = new AnimationManager();
      const anim = manager.createRangedAttackAnimation(
        'u1', 'archer', 'p1',
        'u2', 'warrior', 'p2',
        { q: 0, r: 0 },
        { q: 3, r: 0 },
        '#ff5722'
      );

      expect(anim.attackerTypeId).toBe('archer');
      expect(anim.attackerOwnerId).toBe('p1');
      expect(anim.targetTypeId).toBe('warrior');
      expect(anim.targetOwnerId).toBe('p2');
      expect(anim.projectileColor).toBe('#ff5722');
    });

    it('should calculate projectile position with arc', () => {
      const manager = new AnimationManager();
      const anim = manager.createRangedAttackAnimation(
        'u1', 'archer', 'p1',
        'u2', 'warrior', 'p2',
        { q: 0, r: 0 },
        { q: 3, r: 0 },
        '#ff5722',
        1000
      );

      // At start, should be at attacker position
      let pos = manager.getProjectilePosition(anim, anim.startTime);
      expect(pos).not.toBeNull();

      // At peak (halfway), should be arced upward (lower y in canvas)
      const midPos = manager.getProjectilePosition(anim, anim.startTime + 500);
      expect(midPos).not.toBeNull();

      // The arc should make y lower (more negative) than direct line
      const directY = (pos!.y + manager.getProjectilePosition(anim, anim.startTime + 1000)!.y) / 2;
      expect(midPos!.y).toBeLessThan(directY);

      // At end, should be at target position
      pos = manager.getProjectilePosition(anim, anim.startTime + 1000);
      expect(pos).not.toBeNull();
    });
  });

  describe('Damage Flash Animation', () => {
    it('should create flash animation with correct properties', () => {
      const manager = new AnimationManager();
      const anim = manager.createDamageFlashAnimation('u1', { q: 1, r: 1 }, false, 200);

      expect(anim.targetId).toBe('u1');
      expect(anim.position).toEqual({ q: 1, r: 1 });
      expect(anim.isCity).toBe(false);
      expect(anim.duration).toBe(200);
    });
  });

  describe('Unit Death Animation', () => {
    it('should include unit type and owner', () => {
      const manager = new AnimationManager();
      const anim = manager.createUnitDeathAnimation('u1', { q: 1, r: 1 }, 'p1', 'warrior', 600);

      expect(anim.unitId).toBe('u1');
      expect(anim.ownerId).toBe('p1');
      expect(anim.unitTypeId).toBe('warrior');
      expect(anim.position).toEqual({ q: 1, r: 1 });
    });
  });

  describe('City Founded Animation', () => {
    it('should create city animation with city name', () => {
      const manager = new AnimationManager();
      const anim = manager.createCityFoundedAnimation('c1', { q: 2, r: 2 }, 'p1', 'Rome', 800);

      expect(anim.cityId).toBe('c1');
      expect(anim.ownerId).toBe('p1');
      expect(anim.cityName).toBe('Rome');
      expect(anim.position).toEqual({ q: 2, r: 2 });
    });
  });

  describe('Production Complete Animation', () => {
    it('should create production animation with item type', () => {
      const manager = new AnimationManager();
      const anim = manager.createProductionCompleteAnimation('c1', { q: 2, r: 2 }, 'warrior', 'unit', 1000);

      expect(anim.cityId).toBe('c1');
      expect(anim.itemName).toBe('warrior');
      expect(anim.itemType).toBe('unit');
    });
  });

  describe('City Growth Animation', () => {
    it('should create growth animation with population values', () => {
      const manager = new AnimationManager();
      const anim = manager.createCityGrowthAnimation('c1', { q: 2, r: 2 }, 3, 4, 400);

      expect(anim.cityId).toBe('c1');
      expect(anim.fromPop).toBe(3);
      expect(anim.toPop).toBe(4);
    });
  });
});
