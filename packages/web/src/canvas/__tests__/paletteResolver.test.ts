// @vitest-environment jsdom
/**
 * Tests for paletteResolver.ts
 *
 * paletteResolver reads CSS custom properties from the document and memoizes them.
 * In jsdom (vitest's DOM environment), CSS variables are NOT set by default, so
 * we test the resolution path by setting them manually on the element style.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getPaletteColor, invalidatePaletteCache } from '../paletteResolver';

describe('paletteResolver', () => {
  beforeEach(() => {
    // Clear cache before each test so reads are fresh
    invalidatePaletteCache();
  });

  afterEach(() => {
    // Clean up any properties set during tests
    document.documentElement.style.removeProperty('--test-color-a');
    document.documentElement.style.removeProperty('--test-color-b');
    invalidatePaletteCache();
  });

  it('returns the resolved value for a token that is set', () => {
    document.documentElement.style.setProperty('--test-color-a', '#978546');
    const result = getPaletteColor('--test-color-a');
    expect(result).toBe('#978546');
  });

  it('returns empty string for a token that is not set', () => {
    const result = getPaletteColor('--nonexistent-token-xyz');
    expect(result).toBe('');
  });

  it('memoizes the result on second call (does not re-read computed style)', () => {
    document.documentElement.style.setProperty('--test-color-b', '#abc123');

    const spy = vi.spyOn(window, 'getComputedStyle');

    const first  = getPaletteColor('--test-color-b');
    const second = getPaletteColor('--test-color-b');

    // Both calls return the same value
    expect(first).toBe('#abc123');
    expect(second).toBe('#abc123');

    // getComputedStyle was called AT MOST ONCE (the second call hits the cache)
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('invalidatePaletteCache forces re-read on next call', () => {
    document.documentElement.style.setProperty('--test-color-a', '#first');
    const before = getPaletteColor('--test-color-a');
    expect(before).toBe('#first');

    // Update the property value
    document.documentElement.style.setProperty('--test-color-a', '#second');

    // Without cache bust, returns stale value
    const stale = getPaletteColor('--test-color-a');
    expect(stale).toBe('#first'); // still cached

    // After invalidation, re-reads from DOM
    invalidatePaletteCache();
    const fresh = getPaletteColor('--test-color-a');
    expect(fresh).toBe('#second');
  });

  it('handles multiple distinct tokens independently', () => {
    document.documentElement.style.setProperty('--test-color-a', '#111111');
    document.documentElement.style.setProperty('--test-color-b', '#222222');

    expect(getPaletteColor('--test-color-a')).toBe('#111111');
    expect(getPaletteColor('--test-color-b')).toBe('#222222');
  });
});
