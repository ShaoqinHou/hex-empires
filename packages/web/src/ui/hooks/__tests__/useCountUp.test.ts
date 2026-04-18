// @vitest-environment jsdom

/**
 * useCountUp — unit tests.
 *
 * Covers:
 *   - On increase: displayed value ticks through intermediate values toward target.
 *   - On decrease with direction="up-only" (default): snaps immediately to target.
 *   - On decrease with direction="both": animates downward.
 *   - startDelayMs defers the animation start.
 *   - Lands exactly on target at end.
 *
 * RAF simulation: we maintain a queue of scheduled callbacks and advance them
 * by running all pending callbacks with the requested timestamp. Each tick
 * may schedule one new RAF callback; we run those in a subsequent advance.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useCountUp } from '../useCountUp';

// ── RAF fake ─────────────────────────────────────────────────────────────────

let pendingRafs: Array<(ts: number) => void> = [];
let currentTime = 0;

/**
 * Advance the virtual clock by `ms` and fire all pending RAF callbacks at
 * that timestamp. Then keep firing any newly-queued callbacks at the same
 * timestamp (same frame). This matches how a real browser fires one RAF
 * per frame per timestamp.
 */
function advanceRaf(ms: number): void {
  currentTime += ms;
  // Drain all callbacks queued at this time (including ones queued by callbacks).
  let safety = 0;
  while (pendingRafs.length > 0 && safety++ < 1000) {
    const cbs = [...pendingRafs];
    pendingRafs = [];
    for (const cb of cbs) cb(currentTime);
  }
}

beforeEach(() => {
  pendingRafs = [];
  currentTime = 0;
  vi.useFakeTimers();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    pendingRafs.push(cb);
    return pendingRafs.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  // prefers-reduced-motion: assume OFF (no media query match) in tests.
  vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useCountUp — increase', () => {
  it('starts at initial target and displays it immediately', () => {
    const { result } = renderHook(() => useCountUp(100));
    expect(result.current).toBe(100);
  });

  it('ticks toward the new target after an increase', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target, { duration: 400 }),
      { initialProps: { target: 0 } },
    );
    expect(result.current).toBe(0);

    // Raise the target.
    rerender({ target: 100 });

    // t=0 — fire the initial RAF (sets startTime and enqueues next).
    act(() => { advanceRaf(0); });
    // At t=0, elapsed=0 → easeOutCubic(0)=0 → displayed=0.
    expect(result.current).toBe(0);

    // t=200ms — halfway through the 400ms duration.
    // easeOutCubic(0.5) ≈ 0.875 → displayed ≈ 88.
    act(() => { advanceRaf(200); });
    const midVal = result.current;
    expect(midVal).toBeGreaterThan(0);
    expect(midVal).toBeLessThan(100);

    // t=400ms — animation complete.
    act(() => { advanceRaf(200); });
    expect(result.current).toBe(100);
  });
});

describe('useCountUp — decrease up-only mode (default)', () => {
  it('snaps immediately when target decreases', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target, { direction: 'up-only' }),
      { initialProps: { target: 100 } },
    );
    expect(result.current).toBe(100);

    rerender({ target: 50 });

    // Should have snapped — no RAF tick needed.
    expect(result.current).toBe(50);
  });
});

describe('useCountUp — decrease both mode', () => {
  it('interpolates downward when direction="both"', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target, { direction: 'both', duration: 400 }),
      { initialProps: { target: 100 } },
    );

    rerender({ target: 0 });

    // t=0 — initial RAF fires, sets startTime, displayed=100.
    act(() => { advanceRaf(0); });
    expect(result.current).toBe(100);

    // t=200ms — partway, value between 0 and 100.
    act(() => { advanceRaf(200); });
    const midVal = result.current;
    expect(midVal).toBeGreaterThan(0);
    expect(midVal).toBeLessThan(100);

    // t=400ms — exactly 0.
    act(() => { advanceRaf(200); });
    expect(result.current).toBe(0);
  });
});

describe('useCountUp — startDelayMs', () => {
  it('does not start the animation until after the delay', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target, { duration: 400, startDelayMs: 120 }),
      { initialProps: { target: 0 } },
    );

    rerender({ target: 100 });

    // No RAF before delay fires — still at 0.
    expect(result.current).toBe(0);

    // Advance fake timers to fire the setTimeout, then advance RAF to complete.
    act(() => { vi.advanceTimersByTime(120); });
    act(() => { advanceRaf(0); }); // fire first RAF (sets startTime)
    act(() => { advanceRaf(400); }); // complete
    expect(result.current).toBe(100);
  });
});

describe('useCountUp — lands exactly on target', () => {
  it('never over/under-shoots — final value equals target', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useCountUp(target, { duration: 400 }),
      { initialProps: { target: 0 } },
    );

    rerender({ target: 57 });

    // Fire first RAF (t=0, sets startTime).
    act(() => { advanceRaf(0); });
    // Jump well past the duration.
    act(() => { advanceRaf(500); });
    expect(result.current).toBe(57);
  });
});
