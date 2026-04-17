/**
 * useViewportClass — returns the current viewport class based on window.innerWidth.
 *
 * Classes (per locked decision #7 in _loop-state.md):
 *   standard  — < 1920px
 *   wide      — 1920–2559px
 *   ultra     — ≥ 2560px
 *
 * Uses window.matchMedia with two breakpoints so there is no polling.
 * SSR-safe: checks `typeof window` before accessing browser APIs.
 *
 * Related: packages/web/src/styles/layout-tokens.css provides CSS-level
 * `--viewport-class` via @media queries for components that prefer CSS.
 */

import { useState, useEffect } from 'react';

export type ViewportClass = 'standard' | 'wide' | 'ultra';

const WIDE_BREAKPOINT  = 1920;
const ULTRA_BREAKPOINT = 2560;

function getViewportClass(): ViewportClass {
  if (typeof window === 'undefined') return 'standard';
  const w = window.innerWidth;
  if (w >= ULTRA_BREAKPOINT) return 'ultra';
  if (w >= WIDE_BREAKPOINT)  return 'wide';
  return 'standard';
}

/**
 * Returns the current viewport class and re-renders when a breakpoint
 * boundary is crossed. Uses matchMedia change events — no polling.
 */
export function useViewportClass(): ViewportClass {
  const [vc, setVc] = useState<ViewportClass>(getViewportClass);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wideQuery  = window.matchMedia(`(min-width: ${WIDE_BREAKPOINT}px)`);
    const ultraQuery = window.matchMedia(`(min-width: ${ULTRA_BREAKPOINT}px)`);

    const update = () => setVc(getViewportClass());

    wideQuery.addEventListener('change', update);
    ultraQuery.addEventListener('change', update);

    // Sync in case window resized before listeners attached.
    update();

    return () => {
      wideQuery.removeEventListener('change', update);
      ultraQuery.removeEventListener('change', update);
    };
  }, []);

  return vc;
}
