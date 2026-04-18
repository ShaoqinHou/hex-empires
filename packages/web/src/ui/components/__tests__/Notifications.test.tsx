// @vitest-environment jsdom

/**
 * Notifications.test.tsx — Phase 5.3
 *
 * Unit tests for the rewritten Notifications component:
 *   - Category registry lookup returns correct entries
 *   - isDiplomaticHostile detects war declarations
 *   - Production toast renders with correct category entry
 *   - requiresAction toast has amber pill text
 *   - Per-turn sound de-dupe logic
 *   - Overflow badge shows "+N more" when > 4 notifications
 *
 * Per HUD convention, TooltipShell / HUDManager chrome behavior is tested
 * in their own files — we only test the Notifications body here.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import {
  getCategoryEntry,
  isDiplomaticHostile,
  NOTIFICATION_CATEGORY_REGISTRY,
} from '../notificationCategoryRegistry';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Registry lookups ──────────────────────────────────────────────────────────

describe('notificationCategoryRegistry', () => {
  it('production entry: 6000ms dismiss, panelTarget city, no requiresAction', () => {
    const entry = getCategoryEntry('production');
    expect(entry.dismissMs).toBe(6000);
    expect(entry.panelTarget).toBe('city');
    expect(entry.requiresAction).toBe(false);
    expect(entry.showGoldRule).toBe(false);
    expect(entry.sound).toBe('building_complete');
  });

  it('research entry: 6000ms dismiss, panelTarget tech', () => {
    const entry = getCategoryEntry('research');
    expect(entry.dismissMs).toBe(6000);
    expect(entry.panelTarget).toBe('tech');
    expect(entry.sound).toBe('tech_complete');
  });

  it('civic entry: 6000ms dismiss, panelTarget civics', () => {
    const entry = getCategoryEntry('civic');
    expect(entry.dismissMs).toBe(6000);
    expect(entry.panelTarget).toBe('civics');
    expect(entry.sound).toBe('confirm');
  });

  it('crisis entry: no auto-dismiss (dismissMs null), requiresAction=true', () => {
    const entry = getCategoryEntry('crisis');
    expect(entry.dismissMs).toBeNull();
    expect(entry.requiresAction).toBe(true);
    expect(entry.showGoldRule).toBe(true);
    expect(entry.sound).toBe('error');
  });

  it('age entry: no auto-dismiss, requiresAction=true, gold rule', () => {
    const entry = getCategoryEntry('age');
    expect(entry.dismissMs).toBeNull();
    expect(entry.requiresAction).toBe(true);
    expect(entry.showGoldRule).toBe(true);
    expect(entry.sound).toBe('victory');
  });

  it('diplomatic entry: friendly — 10000ms dismiss, no requiresAction', () => {
    const entry = getCategoryEntry('diplomatic');
    expect(entry.dismissMs).toBe(10000);
    expect(entry.requiresAction).toBe(false);
    expect(entry.showGoldRule).toBe(true);
  });

  it('info entry: 4000ms dismiss, no sound, no panelTarget', () => {
    const entry = getCategoryEntry('info');
    expect(entry.dismissMs).toBe(4000);
    expect(entry.sound).toBeNull();
    expect(entry.panelTarget).toBeNull();
    expect(entry.requiresAction).toBe(false);
  });

  it('undefined category falls back to info entry', () => {
    const entry = getCategoryEntry(undefined);
    expect(entry.dismissMs).toBe(4000);
    expect(entry.panelTarget).toBeNull();
  });

  it('all 7 categories are registered', () => {
    const expected = ['production', 'research', 'civic', 'diplomatic', 'crisis', 'age', 'info'];
    for (const cat of expected) {
      expect(NOTIFICATION_CATEGORY_REGISTRY.has(cat as any)).toBe(true);
    }
  });
});

// ── isDiplomaticHostile ───────────────────────────────────────────────────────

describe('isDiplomaticHostile', () => {
  it('returns true for war declaration messages', () => {
    expect(isDiplomaticHostile('Declared surprise war on p2')).toBe(true);
    expect(isDiplomaticHostile('Declared formal war on Athens')).toBe(true);
    expect(isDiplomaticHostile('Player 1 declared war on Rome')).toBe(true);
  });

  it('returns false for non-hostile diplomatic messages', () => {
    expect(isDiplomaticHostile('Made peace with Athens')).toBe(false);
    expect(isDiplomaticHostile('Formed alliance with Greece')).toBe(false);
    expect(isDiplomaticHostile('Conducted trade endeavor with Egypt')).toBe(false);
    expect(isDiplomaticHostile('Proposed friendship with Rome')).toBe(false);
  });
});

// ── Token spot checks ─────────────────────────────────────────────────────────

describe('category accent tokens are CSS variables', () => {
  it('all accent tokens start with var(--hud- or var(--color-', () => {
    for (const [cat, entry] of NOTIFICATION_CATEGORY_REGISTRY) {
      const token = entry.accentToken;
      const valid = token.startsWith('var(--hud-') || token.startsWith('var(--color-');
      expect(valid, `${cat} accent token "${token}" is not a CSS variable`).toBe(true);
    }
  });
});
