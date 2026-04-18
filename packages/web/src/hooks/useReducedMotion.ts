/**
 * useReducedMotion — returns true when the user has requested reduced motion
 * via the OS/browser `prefers-reduced-motion: reduce` media query.
 *
 * Subscribes to MediaQueryList change events so React re-renders when the
 * preference changes at runtime (e.g. via OS settings while the game is open).
 *
 * SSR-safe: guards on `typeof window` so this hook can be imported from a
 * Node.js test environment or SSR context without throwing.
 */

import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function getInitialValue(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState<boolean>(getInitialValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof window.matchMedia !== 'function') return;

    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);

    mql.addEventListener('change', handler);
    // Sync once on mount in case matchMedia state changed between SSR and hydration.
    setReducedMotion(mql.matches);

    return () => {
      mql.removeEventListener('change', handler);
    };
  }, []);

  return reducedMotion;
}
