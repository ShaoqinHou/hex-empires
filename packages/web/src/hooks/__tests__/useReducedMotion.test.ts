// @vitest-environment jsdom

/**
 * Tests for useReducedMotion hook.
 * Mocks window.matchMedia to simulate prefers-reduced-motion changes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from '../useReducedMotion';

type ChangeHandler = (e: MediaQueryListEvent) => void;

function makeMatchMedia(initialMatches: boolean) {
  let listener: ChangeHandler | null = null;
  const mql = {
    matches: initialMatches,
    addEventListener: (_: string, fn: ChangeHandler) => {
      listener = fn;
    },
    removeEventListener: () => {
      listener = null;
    },
    fire: (matches: boolean) => {
      mql.matches = matches;
      if (listener) listener({ matches } as MediaQueryListEvent);
    },
  };
  return mql;
}

let mql: ReturnType<typeof makeMatchMedia>;

beforeEach(() => {
  mql = makeMatchMedia(false);
  vi.stubGlobal('matchMedia', (_query: string) => mql);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useReducedMotion', () => {
  it('returns false when prefers-reduced-motion is not set', () => {
    mql = makeMatchMedia(false);
    vi.stubGlobal('matchMedia', () => mql);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when prefers-reduced-motion: reduce is active', () => {
    mql = makeMatchMedia(true);
    vi.stubGlobal('matchMedia', () => mql);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates to true when media query fires with matches=true', () => {
    mql = makeMatchMedia(false);
    vi.stubGlobal('matchMedia', () => mql);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mql.fire(true);
    });

    expect(result.current).toBe(true);
  });

  it('updates back to false when media query fires with matches=false', () => {
    mql = makeMatchMedia(true);
    vi.stubGlobal('matchMedia', () => mql);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);

    act(() => {
      mql.fire(false);
    });

    expect(result.current).toBe(false);
  });

  it('removes the event listener on unmount', () => {
    const removeSpy = vi.fn();
    mql = makeMatchMedia(false);
    const originalRemove = mql.removeEventListener;
    mql.removeEventListener = (...args) => {
      removeSpy(...args);
      originalRemove(...args);
    };
    vi.stubGlobal('matchMedia', () => mql);

    const { unmount } = renderHook(() => useReducedMotion());
    unmount();

    expect(removeSpy).toHaveBeenCalledOnce();
  });
});
