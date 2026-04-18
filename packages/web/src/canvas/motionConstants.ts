/**
 * motionConstants.ts — Canvas-side numeric motion constants.
 *
 * Canvas animations are RAF-driven and cannot consume CSS custom properties
 * directly. This module reads the motion tokens from :root computed style
 * at app mount, parses the `ms` suffix, and caches the values. Listening
 * for prefers-reduced-motion changes re-reads the cache so reduced-motion
 * updates propagate to the canvas without a full page reload.
 *
 * Duration mapping (per phase-6-motion-spec.md §4):
 *   unitMoveSlow   → --motion-slow   (400ms, normal→200 under reduced)
 *   unitMoveNormal → --motion-medium (240ms, normal→120 under reduced)
 *   unitMoveFast   → --motion-fast   (160ms, normal→80  under reduced)
 *   combatLungeOut → fixed 80ms (half of --motion-fast envelope)
 *   combatLungeBack→ fixed 120ms (other half, slightly longer for weight)
 *   damageNumber   → --motion-slow   (400ms)
 *   ageShake       → --motion-shake  (200ms)
 *
 * Token halving under reduced-motion is handled entirely in motion-tokens.css;
 * this module just re-reads the already-halved values when the media query fires.
 */

/** Parse a CSS time value (e.g. "240ms" or "0.24s") to milliseconds. */
function parseCssTimeMs(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed.endsWith('ms')) {
    return parseFloat(trimmed);
  }
  if (trimmed.endsWith('s')) {
    return parseFloat(trimmed) * 1000;
  }
  // Fallback: treat as ms
  return parseFloat(trimmed) || 0;
}

/** Read a single CSS custom property from :root computed style. */
function readCssTimeToken(token: string): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // Node / test environment — return sensible hardcoded fallbacks
    return TOKEN_FALLBACKS[token] ?? 160;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token);
  if (!raw || !raw.trim()) {
    return TOKEN_FALLBACKS[token] ?? 160;
  }
  return parseCssTimeMs(raw);
}

/** Fallback values (mirrors motion-tokens.css :root block) for test environments. */
const TOKEN_FALLBACKS: Record<string, number> = {
  '--motion-instant': 80,
  '--motion-fast': 160,
  '--motion-medium': 240,
  '--motion-slow': 400,
  '--motion-ceremony': 1200,
  '--motion-shake': 200,
  '--motion-modal-stagger': 80,
};

/** Mutable cache populated/refreshed by readAllTokens(). */
let _cache: MotionConstants | null = null;

export interface MotionConstants {
  /** Per-hex move duration for a slow unit (default 400ms). */
  readonly unitMoveSlow: number;
  /** Per-hex move duration for a normal unit (default 240ms). */
  readonly unitMoveNormal: number;
  /** Per-hex move duration for a fast unit (default 160ms). */
  readonly unitMoveFast: number;
  /** Duration of the forward shove phase of a combat lunge (fixed 80ms). */
  readonly combatLungeOut: number;
  /** Duration of the return phase of a combat lunge (fixed 120ms). */
  readonly combatLungeBack: number;
  /** Total lunge round-trip duration (out + back). */
  readonly combatLungeTotal: number;
  /** Duration of a floating damage number animation (default 400ms). */
  readonly damageNumber: number;
  /** Duration of the age-transition screen shake (default 200ms). */
  readonly ageShake: number;
}

/** Read all tokens from CSS computed style (or fallback) and cache them. */
function readAllTokens(): MotionConstants {
  const slow = readCssTimeToken('--motion-slow');
  const medium = readCssTimeToken('--motion-medium');
  const fast = readCssTimeToken('--motion-fast');
  const shake = readCssTimeToken('--motion-shake');

  // combatLunge durations are FIXED fractions of the --motion-fast envelope
  // (80ms out + 120ms back = 200ms total). Under reduced-motion, lunge is
  // disabled entirely in AnimationManager so these values are never used in
  // that path. We still halve them proportionally so they stay coherent if
  // someone queries MOTION during a reduced-motion session.
  const lngOut = Math.round(fast * 0.5);   // 80ms normally, 40ms reduced
  const lngBack = Math.round(fast * 0.75); // 120ms normally, 60ms reduced

  return {
    unitMoveSlow:       slow,
    unitMoveNormal:     medium,
    unitMoveFast:       fast,
    combatLungeOut:     lngOut,
    combatLungeBack:    lngBack,
    combatLungeTotal:   lngOut + lngBack,
    damageNumber:       slow,
    ageShake:           shake,
  };
}

/**
 * Get (or initialise) the cached motion constants.
 * Call this once per RAF frame or at the start of an animation factory call.
 */
export function getMotionConstants(): MotionConstants {
  if (!_cache) {
    _cache = readAllTokens();
  }
  return _cache;
}

/**
 * Force a re-read of all CSS tokens and update the cache.
 * Called automatically when prefers-reduced-motion fires; also useful for tests.
 */
export function refreshMotionConstants(): void {
  _cache = readAllTokens();
}

// Register a listener for prefers-reduced-motion changes so reduced-motion
// updates propagate to the canvas without a page reload.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Use addEventListener if available (modern), fall back to addListener (Safari < 14)
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', refreshMotionConstants);
  } else if (typeof (mq as MediaQueryList).addListener === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    (mq as MediaQueryList).addListener(refreshMotionConstants);
  }
}
