/**
 * useCountUp — animates a numeric value from its previous state to the
 * current target using requestAnimationFrame + easeOutCubic.
 *
 * Spec: phase-6-motion-spec.md §4 (rows 13–15) and §5.
 *
 * Behaviour:
 * - Increase: interpolate from current displayed value to target over
 *   `duration` ms (default 400ms = --motion-slow).
 * - Decrease with direction="up-only" (default): snap immediately.
 * - Decrease with direction="both": interpolate in both directions.
 * - startDelayMs: wait N ms before beginning the interpolation (stagger /
 *   ripple effect — gold=0, science=120, culture=240, production=360).
 * - prefers-reduced-motion: duration is halved at the CSS-token level but
 *   JS also reads the media query to halve the JS-side duration for parity.
 * - SSR-safe: `typeof window === "undefined"` guard on matchMedia.
 */

import { useState, useEffect, useRef } from 'react';

export type CountUpDirection = 'up-only' | 'both';

export interface CountUpOptions {
  /** Total animation duration in ms. Default 400 (--motion-slow). */
  readonly duration?: number;
  /** "up-only" snaps on decrease; "both" animates both ways. Default "up-only". */
  readonly direction?: CountUpDirection;
  /** Wait N ms before starting the interpolation (for ripple staggers). */
  readonly startDelayMs?: number;
}

/** easeOutCubic — matches --ease-out (fast arrival, soft landing). */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Returns true if the user has requested reduced motion. SSR-safe. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useCountUp(
  target: number,
  options: CountUpOptions = {},
): number {
  const {
    duration: rawDuration = 400,
    direction = 'up-only',
    startDelayMs = 0,
  } = options;

  // Halve duration when reduced-motion is requested (mirrors CSS token halving).
  const duration = prefersReducedMotion() ? rawDuration / 2 : rawDuration;

  const [displayed, setDisplayed] = useState<number>(target);

  // Track the animation frame and timestamps.
  const rafRef = useRef<number | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(target);

  useEffect(() => {
    const prev = displayed;

    // Snap-on-decrease (up-only mode) — immediately set and bail out.
    if (direction === 'up-only' && target < prev) {
      setDisplayed(target);
      return;
    }

    // No change — nothing to animate.
    if (target === prev) return;

    // Cancel any in-flight animation.
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (delayTimerRef.current !== null) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }

    const fromValue = prev;

    function startAnimation() {
      startValueRef.current = fromValue;
      startTimeRef.current = null;

      function tick(now: number) {
        if (startTimeRef.current === null) startTimeRef.current = now;
        const elapsed = now - startTimeRef.current;
        const t = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(t);
        const next = Math.round(fromValue + (target - fromValue) * eased);
        setDisplayed(next);

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          // Ensure we land exactly on target (avoid rounding drift).
          setDisplayed(target);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    if (startDelayMs > 0) {
      delayTimerRef.current = setTimeout(startAnimation, startDelayMs);
    } else {
      startAnimation();
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (delayTimerRef.current !== null) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    };
    // `displayed` is intentionally excluded from deps — it is the output, not
    // the trigger. We only re-run when the external `target` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, direction, duration, startDelayMs]);

  return displayed;
}
