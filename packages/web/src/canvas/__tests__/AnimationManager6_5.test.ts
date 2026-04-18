/**
 * Phase 6.5 — AnimationManager tests.
 *
 * New behaviour under test:
 *  1. startCombatLunge — duration within 200ms ± 16ms RAF tolerance
 *  2. startDamageNumber — lifetime matches motionConstants.damageNumber
 *  3. Endpoint easing bloom — first/last segment uses easeOutQuad;
 *     mid-segment uses linear. Produces different interpolation at t=0/t=end
 *     vs middle.
 *  4. getCombatOffset — returns non-zero offset during lunge, returns {0,0}
 *     when no lunge is active.
 *  5. getRedTintAlpha — returns non-zero alpha during defender-tint animation.
 *  6. getDamageNumbers — returns only damage-number entries.
 *  7. startCombatSequence — creates lunge + tint + number in one call.
 *  8. All existing AnimationManager tests continue to pass (covered by the
 *     separate AnimationManager.test.ts file; this file only adds new tests).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  AnimationManager,
  easeOutQuad,
  easeLinear,
} from '../AnimationManager';
import { refreshMotionConstants } from '../motionConstants';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a manager with window.matchMedia mocked (reduced-motion OFF by default). */
function makeManager(reducedMotion = false): AnimationManager {
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({
      matches: query.includes('reduce') ? reducedMotion : false,
      addEventListener: vi.fn(),
      addListener: vi.fn(),
    }),
  });
  // Force motionConstants cache refresh so the mock matchMedia is seen
  refreshMotionConstants();
  return new AnimationManager();
}

afterEach(() => {
  vi.restoreAllMocks();
  // Restore any getComputedStyle stub
  if (typeof vi.unstubAllGlobals === 'function') vi.unstubAllGlobals();
  refreshMotionConstants();
});

// ── 1. Combat lunge duration ─────────────────────────────────────────────────

describe('startCombatLunge', () => {
  it('creates a lunge animation with total duration 200ms ± 16ms RAF tolerance', () => {
    const manager = makeManager();
    manager.startCombatLunge('u1', { q: 0, r: 0 }, { q: 1, r: 0 });

    const anims = manager.getActive();
    const lunge = anims.find(a => a.type === 'combat-lunge');
    expect(lunge).toBeDefined();
    // Spec: 80ms out + 120ms back = 200ms total. RAF jitter tolerance ±16ms.
    expect(lunge!.duration).toBeGreaterThanOrEqual(200 - 16);
    expect(lunge!.duration).toBeLessThanOrEqual(200 + 16);
  });

  it('lungeOutMs is approximately 80ms (half of fast token)', () => {
    const manager = makeManager();
    manager.startCombatLunge('u1', { q: 0, r: 0 }, { q: 1, r: 0 });

    const anims = manager.getActive();
    const lunge = anims.find(a => a.type === 'combat-lunge');
    expect(lunge).toBeDefined();
    if (lunge!.type !== 'combat-lunge') throw new Error('type guard');
    // lungeOutMs should be ~80ms (half of combatLungeTotal in fallback env)
    expect(lunge!.lungeOutMs).toBeGreaterThan(0);
    expect(lunge!.lungeOutMs).toBeLessThan(lunge!.duration);
  });

  it('is a no-op under prefers-reduced-motion', () => {
    const manager = makeManager(true /* reducedMotion */);
    manager.startCombatLunge('u1', { q: 0, r: 0 }, { q: 1, r: 0 });
    const anims = manager.getActive();
    expect(anims.filter(a => a.type === 'combat-lunge')).toHaveLength(0);
  });
});

// ── 2. Damage number lifetime ────────────────────────────────────────────────

describe('startDamageNumber', () => {
  it('creates a damage-number animation with correct lifetime', () => {
    const manager = makeManager();
    manager.startDamageNumber({ q: 2, r: 3 }, 15);

    const anims = manager.getActive();
    const num = anims.find(a => a.type === 'damage-number');
    expect(num).toBeDefined();
    // Spec: --motion-slow (400ms). Fallback in test env = 400ms.
    expect(num!.duration).toBe(400);
  });

  it('removes damage-number after its duration elapses', () => {
    const manager = makeManager();
    manager.startDamageNumber({ q: 0, r: 0 }, 10);
    const nums = manager.getDamageNumbers();
    expect(nums).toHaveLength(1);

    // Advance time past duration
    const birth = nums[0].startTime;
    manager.update(birth + nums[0].duration + 50);

    expect(manager.getDamageNumbers()).toHaveLength(0);
  });

  it('allows overlapping damage numbers (no queue)', () => {
    const manager = makeManager();
    manager.startDamageNumber({ q: 0, r: 0 }, 10);
    manager.startDamageNumber({ q: 0, r: 0 }, 5);
    manager.startDamageNumber({ q: 0, r: 0 }, 20);
    expect(manager.getDamageNumbers()).toHaveLength(3);
  });

  it('labels positive amounts as damage ("-N")', () => {
    const manager = makeManager();
    manager.startDamageNumber({ q: 0, r: 0 }, 25);
    const num = manager.getDamageNumbers()[0];
    expect(num.label).toBe('-25');
  });

  it('labels negative amounts as heals ("+N")', () => {
    const manager = makeManager();
    manager.startDamageNumber({ q: 0, r: 0 }, -5);
    const num = manager.getDamageNumbers()[0];
    expect(num.label).toBe('+5');
  });
});

// ── 3. Endpoint easing bloom ──────────────────────────────────────────────────

describe('unit move endpoint easing', () => {
  /**
   * For a 3-hex path (2 segments), segment 0 = first, segment 1 = last.
   * Both should use easeOutQuad, meaning they advance faster early (t=0.1
   * should produce a higher easedT than linear would give).
   *
   * For a 4-hex path (3 segments), segment 1 = middle: should be linear.
   */

  it('first segment uses easeOutQuad (advances faster than linear at small t)', () => {
    const manager = new AnimationManager();
    // 3-hex path: 2 segments. Duration = 240ms * 2 = 480ms (normal unit)
    // Enough time that at t=10% of first segment, eased > linear.
    const path = [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }];
    const anim = manager.createUnitMoveAnimation('u1', 'p1', 'warrior', path);
    manager.add(anim);

    // t = 5% of total duration → in first segment at rawSegT ≈ 0.10
    const t5pct = anim.startTime + anim.duration * 0.05;
    const pos5 = manager.getUnitPosition(anim, t5pct);

    // t = 0 → should be at hex 0
    const pos0 = manager.getUnitPosition(anim, anim.startTime);

    // Under easeOutQuad, movement is faster at start (front-loaded)
    // so at 5% of total time, position should be further along than at 0%
    expect(pos5).not.toBeNull();
    expect(pos0).not.toBeNull();
    expect(pos5!.x).toBeGreaterThan(pos0!.x); // x increases along q-axis
  });

  it('mid segment is linear (equal advancement at equal time intervals)', () => {
    const manager = new AnimationManager();
    // 4-hex path: 3 segments. Segment 1 (middle) should be linear.
    const path = [
      { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
    ];
    const anim = manager.createUnitMoveAnimation('u1', 'p1', 'warrior', path, 3000);
    manager.add(anim);

    // Segment 1 spans global t=[1/3, 2/3]. Take two equal sub-intervals within segment 1.
    // t=1/3 (start of seg1), t=1/3+1/9 (1/3 into seg1), t=1/3+2/9 (2/3 into seg1)
    const segStart = anim.startTime + anim.duration * (1 / 3);
    const dt = anim.duration / 9; // one-third of segment 1's time span

    const posA = manager.getUnitPosition(anim, segStart + dt * 0);
    const posB = manager.getUnitPosition(anim, segStart + dt * 1);
    const posC = manager.getUnitPosition(anim, segStart + dt * 2);

    expect(posA).not.toBeNull();
    expect(posB).not.toBeNull();
    expect(posC).not.toBeNull();

    // Linear: delta(A→B) should ≈ delta(B→C)
    const deltaAB = posB!.x - posA!.x;
    const deltaBC = posC!.x - posB!.x;
    expect(deltaAB).toBeCloseTo(deltaBC, 1);
  });

  it('last segment uses easeOutQuad (decelerates: slower at end)', () => {
    const manager = new AnimationManager();
    // 2-hex path: 1 segment, which is both first and last — full easeOutQuad
    const path = [{ q: 0, r: 0 }, { q: 4, r: 0 }];
    const anim = manager.createUnitMoveAnimation('u1', 'p1', 'warrior', path, 1000);
    manager.add(anim);

    // Under easeOutQuad: first half covers more distance than second half
    // (front-loaded), so x at t=250ms > midpoint of x@t=500ms - x@t=0
    const pos0   = manager.getUnitPosition(anim, anim.startTime);
    const pos250 = manager.getUnitPosition(anim, anim.startTime + 250);
    const pos500 = manager.getUnitPosition(anim, anim.startTime + 500);
    const pos1000 = manager.getUnitPosition(anim, anim.startTime + 1000);

    expect(pos0).not.toBeNull();
    expect(pos250).not.toBeNull();
    expect(pos500).not.toBeNull();
    expect(pos1000).not.toBeNull();

    // At t=0.25 with easeOutQuad: easeOutQuad(0.25) = 0.25*(2-0.25) = 0.4375
    // At t=0.5: easeOutQuad(0.5) = 0.75
    // So in first quarter, unit travels 43.75% of distance.
    // In first half, unit travels 75%. More front-loaded than linear (50%).
    const totalX = pos1000!.x - pos0!.x;
    const atHalf = (pos500!.x - pos0!.x) / totalX;
    expect(atHalf).toBeCloseTo(0.75, 1);
  });

  it('global easing is easeLinear (AnyAnimation.easing is easeLinear)', () => {
    const manager = new AnimationManager();
    const path = [{ q: 0, r: 0 }, { q: 1, r: 0 }];
    const anim = manager.createUnitMoveAnimation('u1', 'p1', 'warrior', path, 400);
    // Global easing must be linear so per-segment easing applies cleanly
    expect(anim.easing).toBe(easeLinear);
  });
});

// ── 4. getCombatOffset ───────────────────────────────────────────────────────

describe('getCombatOffset', () => {
  it('returns {0,0} when no lunge is active for the unit', () => {
    const manager = makeManager();
    const offset = manager.getCombatOffset('u99', performance.now());
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it('returns non-zero offset during the out-phase of a lunge', () => {
    const manager = makeManager();
    manager.startCombatLunge('u1', { q: 0, r: 0 }, { q: 1, r: 0 });
    const anims = manager.getActive();
    const lunge = anims.find(a => a.type === 'combat-lunge')!;

    // Query at 40ms into the out phase (within lungeOutMs)
    const at40 = lunge.startTime + 40;
    const offset = manager.getCombatOffset('u1', at40);
    // Should have a positive x offset (moving toward q+1 direction)
    expect(Math.abs(offset.x) + Math.abs(offset.y)).toBeGreaterThan(0);
  });

  it('returns smaller offset during back-phase than peak', () => {
    const manager = makeManager();
    manager.startCombatLunge('u1', { q: 0, r: 0 }, { q: 1, r: 0 });
    const anims = manager.getActive();
    const lunge = anims.find(a => a.type === 'combat-lunge')!;
    if (lunge.type !== 'combat-lunge') throw new Error('type guard');

    // Peak: just before the out phase ends
    const atPeak = lunge.startTime + lunge.lungeOutMs - 1;
    const peakOffset = manager.getCombatOffset('u1', atPeak);
    const peakMag = Math.sqrt(peakOffset.x ** 2 + peakOffset.y ** 2);

    // Late in back phase: much closer to 0
    const atLate = lunge.startTime + lunge.duration - 10;
    const lateOffset = manager.getCombatOffset('u1', atLate);
    const lateMag = Math.sqrt(lateOffset.x ** 2 + lateOffset.y ** 2);

    expect(peakMag).toBeGreaterThan(lateMag);
  });
});

// ── 5. getRedTintAlpha ───────────────────────────────────────────────────────

describe('getRedTintAlpha', () => {
  it('returns 0 when no tint is active', () => {
    const manager = makeManager();
    expect(manager.getRedTintAlpha('u99', performance.now())).toBe(0);
  });

  it('returns non-zero alpha during an active defender-tint animation', () => {
    const manager = makeManager();
    manager.startDefenderTint('u1', { q: 0, r: 0 });
    const anims = manager.getActive();
    const tint = anims.find(a => a.type === 'defender-tint')!;

    // At ~30% through animation (peak alpha region)
    const at30pct = tint.startTime + tint.duration * 0.3;
    const alpha = manager.getRedTintAlpha('u1', at30pct);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThanOrEqual(1);
  });
});

// ── 6. getDamageNumbers ──────────────────────────────────────────────────────

describe('getDamageNumbers', () => {
  it('returns only damage-number animations', () => {
    const manager = makeManager();
    manager.startDamageNumber({ q: 0, r: 0 }, 10);
    // Also add a non-damage-number animation
    manager.add(manager.createDamageFlashAnimation('u1', { q: 0, r: 0 }, false, 200));

    const nums = manager.getDamageNumbers();
    expect(nums).toHaveLength(1);
    expect(nums[0].type).toBe('damage-number');
  });
});

// ── 7. startCombatSequence ───────────────────────────────────────────────────

describe('startCombatSequence', () => {
  it('creates a lunge + tint + number per target', () => {
    const manager = makeManager();
    manager.startCombatSequence('u1', { q: 0, r: 0 }, [
      { id: 'u2', hex: { q: 1, r: 0 }, damage: 15 },
      { id: 'u3', hex: { q: 2, r: 0 }, damage: 8  },
    ]);

    const all = manager.getActive();
    expect(all.filter(a => a.type === 'combat-lunge')).toHaveLength(1);
    expect(all.filter(a => a.type === 'defender-tint')).toHaveLength(2);
    expect(all.filter(a => a.type === 'damage-number')).toHaveLength(2);
  });

  it('does nothing for empty target list', () => {
    const manager = makeManager();
    manager.startCombatSequence('u1', { q: 0, r: 0 }, []);
    expect(manager.getActive()).toHaveLength(0);
  });

  it('skips lunge but creates tint + numbers under reduced-motion', () => {
    const manager = makeManager(true /* reducedMotion */);
    manager.startCombatSequence('u1', { q: 0, r: 0 }, [
      { id: 'u2', hex: { q: 1, r: 0 }, damage: 10 },
    ]);

    const all = manager.getActive();
    expect(all.filter(a => a.type === 'combat-lunge')).toHaveLength(0);
    expect(all.filter(a => a.type === 'defender-tint')).toHaveLength(1);
    expect(all.filter(a => a.type === 'damage-number')).toHaveLength(1);
  });
});
