// @vitest-environment jsdom

/**
 * Tests for useViewportClass hook.
 * Mocks window.matchMedia to simulate breakpoint crossings.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportClass } from '../useViewportClass';

// matchMedia mock — returns a fake MediaQueryList that stores its listener
// and exposes a `fire(matches)` method for test control.
function makeMatchMedia(initialMatches: boolean) {
  let listener: ((e: { matches: boolean }) => void) | null = null;
  const mql = {
    matches: initialMatches,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
      listener = fn;
    },
    removeEventListener: () => {
      listener = null;
    },
    fire: (matches: boolean) => {
      mql.matches = matches;
      if (listener) listener({ matches });
    },
  };
  return mql;
}

describe('useViewportClass', () => {
  let wideMql: ReturnType<typeof makeMatchMedia>;
  let ultraMql: ReturnType<typeof makeMatchMedia>;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function setWidth(w: number) {
    Object.defineProperty(window, 'innerWidth', { value: w, writable: true, configurable: true });
    // 'wide' query: min-width 1920px
    wideMql  = makeMatchMedia(w >= 1920);
    // 'ultra' query: min-width 2560px
    ultraMql = makeMatchMedia(w >= 2560);
    window.matchMedia = (query: string): MediaQueryList => {
      if (query.includes('2560')) return ultraMql as unknown as MediaQueryList;
      return wideMql as unknown as MediaQueryList;
    };
  }

  it('returns standard for width 1600', () => {
    setWidth(1600);
    const { result } = renderHook(() => useViewportClass());
    expect(result.current).toBe('standard');
  });

  it('returns wide for width 1920', () => {
    setWidth(1920);
    const { result } = renderHook(() => useViewportClass());
    expect(result.current).toBe('wide');
  });

  it('returns ultra for width 2560', () => {
    setWidth(2560);
    const { result } = renderHook(() => useViewportClass());
    expect(result.current).toBe('ultra');
  });

  it('returns standard for width 1919 (just below wide breakpoint)', () => {
    setWidth(1919);
    const { result } = renderHook(() => useViewportClass());
    expect(result.current).toBe('standard');
  });

  it('re-renders when crossing the wide breakpoint (standard to wide)', () => {
    setWidth(1600);
    const { result } = renderHook(() => useViewportClass());
    expect(result.current).toBe('standard');

    // Simulate resize crossing into wide territory
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true, configurable: true });
      wideMql.fire(true);
    });
    expect(result.current).toBe('wide');
  });

  it('re-renders when crossing the ultra breakpoint (wide to ultra)', () => {
    setWidth(1920);
    const { result } = renderHook(() => useViewportClass());
    expect(result.current).toBe('wide');

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 2560, writable: true, configurable: true });
      ultraMql.fire(true);
    });
    expect(result.current).toBe('ultra');
  });

  it('re-renders when shrinking back from wide to standard', () => {
    setWidth(1920);
    const { result } = renderHook(() => useViewportClass());
    expect(result.current).toBe('wide');

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1400, writable: true, configurable: true });
      wideMql.fire(false);
    });
    expect(result.current).toBe('standard');
  });
});
