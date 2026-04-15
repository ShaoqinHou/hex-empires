// @vitest-environment jsdom

/**
 * HUDManager — context tests.
 *
 * Covers the full public API:
 *   - register returns an unregister closure
 *   - registering the same id twice overwrites (not duplicates)
 *   - isActive reflects current registrations
 *   - dismiss / dismissAll remove entries
 *   - cycleIndex / advanceCycle / resetCycle semantics
 *   - ESC no-op when no sticky + no active cycle
 *   - ESC dismisses sticky overlays when present
 *   - ESC resets cycles when no sticky overlay
 *   - useHUDManager throws outside provider
 */

import { describe, it, expect, afterEach } from 'vitest';
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { HUDManagerProvider, useHUDManager } from '../HUDManager';

afterEach(() => {
  cleanup();
  // Clean up any DOM state the ESC tests may have introduced.
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});

function wrapper({ children }: { children: ReactNode }) {
  return <HUDManagerProvider>{children}</HUDManagerProvider>;
}

describe('HUDManager', () => {
  it('register returns an unregister closure that removes the entry', () => {
    const { result } = renderHook(() => useHUDManager(), { wrapper });

    let unregister = () => {};
    act(() => {
      unregister = result.current.register('tileTooltip', {});
    });
    expect(result.current.isActive('tileTooltip')).toBe(true);

    act(() => {
      unregister();
    });
    expect(result.current.isActive('tileTooltip')).toBe(false);
  });

  it('registering the same id twice overwrites instead of duplicating', () => {
    const { result } = renderHook(() => useHUDManager(), { wrapper });

    act(() => {
      result.current.register('notification', { sticky: false });
    });
    expect(result.current.isActive('notification')).toBe(true);

    // Second registration with different entry overwrites the first.
    let unregisterSecond = () => {};
    act(() => {
      unregisterSecond = result.current.register('notification', { sticky: true });
    });
    expect(result.current.isActive('notification')).toBe(true);

    // Single unregister from the second call removes the (only)
    // registration — proves no duplicate lingered.
    act(() => {
      unregisterSecond();
    });
    expect(result.current.isActive('notification')).toBe(false);
  });

  it('isActive reflects current registrations and dismiss removes them', () => {
    const { result } = renderHook(() => useHUDManager(), { wrapper });

    act(() => {
      result.current.register('tileTooltip', {});
      result.current.register('combatPreview', { sticky: true });
    });
    expect(result.current.isActive('tileTooltip')).toBe(true);
    expect(result.current.isActive('combatPreview')).toBe(true);
    expect(result.current.isActive('notification')).toBe(false);

    act(() => {
      result.current.dismiss('tileTooltip');
    });
    expect(result.current.isActive('tileTooltip')).toBe(false);
    expect(result.current.isActive('combatPreview')).toBe(true);

    act(() => {
      result.current.dismissAll();
    });
    expect(result.current.isActive('combatPreview')).toBe(false);
  });

  it('cycleIndex starts at 0, advanceCycle increments, resetCycle goes back to 0', () => {
    const { result } = renderHook(() => useHUDManager(), { wrapper });

    const key = 'q:1,r:2';
    expect(result.current.cycleIndex(key)).toBe(0);

    act(() => {
      result.current.advanceCycle(key);
    });
    expect(result.current.cycleIndex(key)).toBe(1);

    act(() => {
      result.current.advanceCycle(key);
    });
    expect(result.current.cycleIndex(key)).toBe(2);

    act(() => {
      result.current.resetCycle(key);
    });
    expect(result.current.cycleIndex(key)).toBe(0);

    // Independent anchors track independent cycles.
    act(() => {
      result.current.advanceCycle('q:0,r:0');
    });
    expect(result.current.cycleIndex('q:0,r:0')).toBe(1);
    expect(result.current.cycleIndex(key)).toBe(0);
  });

  it('ESC is a no-op when no sticky overlay is registered and no cycle is active', () => {
    const { result } = renderHook(() => useHUDManager(), { wrapper });

    // Register a non-sticky overlay — ESC must not dismiss it.
    act(() => {
      result.current.register('tileTooltip', { sticky: false });
    });
    expect(result.current.isActive('tileTooltip')).toBe(true);

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(result.current.isActive('tileTooltip')).toBe(true);
  });

  it('ESC dismisses the most-recently-registered sticky overlay', () => {
    const { result } = renderHook(() => useHUDManager(), { wrapper });

    act(() => {
      result.current.register('combatPreview', { sticky: true });
      result.current.register('tileTooltip', { sticky: true });
    });
    expect(result.current.isActive('combatPreview')).toBe(true);
    expect(result.current.isActive('tileTooltip')).toBe(true);

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    // Most-recent (tileTooltip) dismissed; earlier sticky remains.
    expect(result.current.isActive('tileTooltip')).toBe(false);
    expect(result.current.isActive('combatPreview')).toBe(true);
  });

  it('ESC resets active cycles when no sticky overlay is registered', () => {
    const { result } = renderHook(() => useHUDManager(), { wrapper });

    const key = 'q:3,r:-1';
    act(() => {
      result.current.advanceCycle(key);
      result.current.advanceCycle(key);
    });
    expect(result.current.cycleIndex(key)).toBe(2);

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(result.current.cycleIndex(key)).toBe(0);
  });

  it('ESC yields to PanelManager when a panel shell is mounted in the DOM', () => {
    const { result } = renderHook(() => useHUDManager(), { wrapper });

    // Simulate a mounted panel shell the way PanelShell stamps it.
    const fakePanel = document.createElement('div');
    fakePanel.setAttribute('data-panel-id', 'help');
    document.body.appendChild(fakePanel);

    act(() => {
      result.current.register('tileTooltip', { sticky: true });
    });
    expect(result.current.isActive('tileTooltip')).toBe(true);

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    // HUD manager yielded — sticky overlay still registered.
    expect(result.current.isActive('tileTooltip')).toBe(true);
  });

  it('useHUDManager throws when called outside a HUDManagerProvider', () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(() => renderHook(() => useHUDManager())).toThrow(
        /useHUDManager must be called inside a HUDManagerProvider/,
      );
    } finally {
      console.error = originalError;
    }
  });
});
