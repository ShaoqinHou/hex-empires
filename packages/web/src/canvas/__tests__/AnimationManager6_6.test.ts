// @vitest-environment jsdom
/**
 * Phase 6.6 — AnimationManager tests for startAgeShake + startBackdropFlash.
 *
 * Behaviour under test:
 *  1. startAgeShake applies a CSS animation (transform-based) to the target element.
 *  2. Under prefers-reduced-motion, startAgeShake is a no-op for the transform
 *     and delegates to startBackdropFlash instead.
 *  3. startBackdropFlash appends a [data-testid="age-backdrop-flash"] overlay to
 *     the element's parent container.
 *  4. startAgeShake with null element does not throw.
 *  5. startBackdropFlash with null element does not throw.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { AnimationManager } from '../AnimationManager';
import { refreshMotionConstants } from '../motionConstants';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal HTMLElement stand-in for JSDOM-based env. */
function makeElement(tag = 'canvas'): HTMLElement {
  return document.createElement(tag);
}

/** Create a manager with window.matchMedia mocked. */
function makeManager(reducedMotion = false): AnimationManager {
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({
      matches: query.includes('reduce') ? reducedMotion : false,
      addEventListener: vi.fn(),
      addListener: vi.fn(),
    }),
  });
  refreshMotionConstants();
  return new AnimationManager();
}

afterEach(() => {
  vi.restoreAllMocks();
  if (typeof vi.unstubAllGlobals === 'function') vi.unstubAllGlobals();
  refreshMotionConstants();
  // Clean up any injected style tags from the flash animation
  const staleStyle = document.getElementById('age-backdrop-flash-style');
  if (staleStyle) staleStyle.remove();
});

// ── 1. startAgeShake — applies animation to element ─────────────────────────

describe('startAgeShake', () => {
  it('sets a CSS animation on the target element (reduced-motion OFF)', () => {
    const manager = makeManager(false);
    const el = makeElement();
    document.body.appendChild(el);

    manager.startAgeShake(el);

    // The animation property should be set to a non-empty value
    expect(el.style.animation).not.toBe('');
    // The value should contain "age-shake-" (the generated keyframe name)
    expect(el.style.animation).toMatch(/age-shake-/);

    el.remove();
  });

  it('includes the shake duration in the animation value', () => {
    const manager = makeManager(false);
    const el = makeElement();
    document.body.appendChild(el);

    manager.startAgeShake(el);

    // Duration should be 200ms (fallback TOKEN_FALLBACKS['--motion-shake'])
    expect(el.style.animation).toMatch(/200ms/);

    el.remove();
  });

  it('injects a <style> keyframe into document.head', () => {
    const manager = makeManager(false);
    const el = makeElement();
    document.body.appendChild(el);

    const styleBefore = document.head.querySelectorAll('style').length;
    manager.startAgeShake(el);
    const styleAfter = document.head.querySelectorAll('style').length;

    expect(styleAfter).toBeGreaterThan(styleBefore);

    el.remove();
  });

  it('does not throw when element is null', () => {
    const manager = makeManager(false);
    expect(() => manager.startAgeShake(null)).not.toThrow();
  });

  // ── 2. startAgeShake — reduced-motion fallback ──────────────────────────

  it('does NOT set a CSS transform animation under prefers-reduced-motion', () => {
    const manager = makeManager(true);
    const el = makeElement();
    // el needs a parent so backdrop flash can append to it
    const parent = document.createElement('div');
    parent.appendChild(el);
    document.body.appendChild(parent);

    manager.startAgeShake(el);

    // The element itself should NOT have a shake animation
    expect(el.style.animation).toBe('');

    parent.remove();
  });

  it('calls startBackdropFlash under prefers-reduced-motion (overlay appears in parent)', () => {
    const manager = makeManager(true);
    const el = makeElement();
    const parent = document.createElement('div');
    parent.appendChild(el);
    document.body.appendChild(parent);

    manager.startAgeShake(el);

    // Backdrop flash overlay should be in the parent
    const overlay = parent.querySelector('[data-testid="age-backdrop-flash"]');
    expect(overlay).not.toBeNull();

    parent.remove();
  });
});

// ── 3. startBackdropFlash — overlay creation ─────────────────────────────────

describe('startBackdropFlash', () => {
  it('appends a [data-testid="age-backdrop-flash"] element to the element parent', () => {
    const manager = makeManager(false);
    const el = makeElement();
    const parent = document.createElement('div');
    parent.appendChild(el);
    document.body.appendChild(parent);

    manager.startBackdropFlash(el);

    const overlay = parent.querySelector('[data-testid="age-backdrop-flash"]');
    expect(overlay).not.toBeNull();

    parent.remove();
  });

  it('sets position:absolute and pointer-events:none on the overlay', () => {
    const manager = makeManager(false);
    const el = makeElement();
    const parent = document.createElement('div');
    parent.appendChild(el);
    document.body.appendChild(parent);

    manager.startBackdropFlash(el);

    const overlay = parent.querySelector<HTMLElement>('[data-testid="age-backdrop-flash"]');
    expect(overlay).not.toBeNull();
    expect(overlay!.style.position).toBe('absolute');
    expect(overlay!.style.pointerEvents).toBe('none');

    parent.remove();
  });

  it('injects the age-backdrop-flash-style <style> tag once (idempotent)', () => {
    const manager = makeManager(false);
    const el1 = makeElement();
    const p1 = document.createElement('div');
    p1.appendChild(el1);
    document.body.appendChild(p1);

    const el2 = makeElement();
    const p2 = document.createElement('div');
    p2.appendChild(el2);
    document.body.appendChild(p2);

    manager.startBackdropFlash(el1);
    manager.startBackdropFlash(el2);

    // Only one style tag with id 'age-backdrop-flash-style'
    const styleTags = document.querySelectorAll('#age-backdrop-flash-style');
    expect(styleTags.length).toBe(1);

    p1.remove();
    p2.remove();
  });

  it('does not throw when element is null', () => {
    const manager = makeManager(false);
    expect(() => manager.startBackdropFlash(null)).not.toThrow();
  });

  it('falls back to document.body when element has no parent', () => {
    const manager = makeManager(false);
    // Element NOT appended to DOM — parentElement is null
    const el = makeElement();

    manager.startBackdropFlash(el);

    const overlay = document.body.querySelector('[data-testid="age-backdrop-flash"]');
    expect(overlay).not.toBeNull();

    // Cleanup
    overlay?.remove();
  });
});
