// @vitest-environment jsdom

/**
 * PanelManager — context tests.
 *
 * Covers the full public API:
 *   - open / close / toggle (single-slot semantics)
 *   - isOpen reactive readout
 *   - hook throws outside provider
 *   - ESC closes the active panel via window keydown
 */

import { describe, it, expect, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PanelManagerProvider, usePanelManager } from '../PanelManager';

afterEach(() => {
  cleanup();
});

function wrapper({ children }: { children: ReactNode }) {
  return <PanelManagerProvider>{children}</PanelManagerProvider>;
}

describe('PanelManager', () => {
  it('openPanel sets activePanel to the given id', () => {
    const { result } = renderHook(() => usePanelManager(), { wrapper });
    expect(result.current.activePanel).toBeNull();
    act(() => {
      result.current.openPanel('help');
    });
    expect(result.current.activePanel).toBe('help');
  });

  it('closePanel clears the active panel', () => {
    const { result } = renderHook(() => usePanelManager(), { wrapper });
    act(() => {
      result.current.openPanel('tech');
    });
    expect(result.current.activePanel).toBe('tech');
    act(() => {
      result.current.closePanel();
    });
    expect(result.current.activePanel).toBeNull();
  });

  it('togglePanel opens when closed and closes when the same id is already open', () => {
    const { result } = renderHook(() => usePanelManager(), { wrapper });
    act(() => {
      result.current.togglePanel('help');
    });
    expect(result.current.activePanel).toBe('help');
    act(() => {
      result.current.togglePanel('help');
    });
    expect(result.current.activePanel).toBeNull();
  });

  it('togglePanel switches to a different panel (single-slot model)', () => {
    const { result } = renderHook(() => usePanelManager(), { wrapper });
    act(() => {
      result.current.openPanel('help');
    });
    expect(result.current.activePanel).toBe('help');
    act(() => {
      result.current.togglePanel('city');
    });
    expect(result.current.activePanel).toBe('city');
  });

  it('isOpen reports true for the active panel and false for all others', () => {
    const { result } = renderHook(() => usePanelManager(), { wrapper });
    act(() => {
      result.current.openPanel('help');
    });
    expect(result.current.isOpen('help')).toBe(true);
    expect(result.current.isOpen('city')).toBe(false);
    expect(result.current.isOpen('diplomacy')).toBe(false);
  });

  it('usePanelManager throws when called outside a PanelManagerProvider', () => {
    // Suppress the React error-boundary console noise for this negative case.
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(() => renderHook(() => usePanelManager())).toThrow(
        /usePanelManager must be called inside a PanelManagerProvider/,
      );
    } finally {
      console.error = originalError;
    }
  });

  it('ESC keydown closes the active panel', () => {
    const { result } = renderHook(() => usePanelManager(), { wrapper });
    act(() => {
      result.current.openPanel('help');
    });
    expect(result.current.activePanel).toBe('help');

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(result.current.activePanel).toBeNull();
  });

  it('ESC keydown is a no-op when no panel is open', () => {
    const { result } = renderHook(() => usePanelManager(), { wrapper });
    expect(result.current.activePanel).toBeNull();
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(result.current.activePanel).toBeNull();
  });

  it('respects initialPanel prop', () => {
    const { result } = renderHook(() => usePanelManager(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <PanelManagerProvider initialPanel="diplomacy">{children}</PanelManagerProvider>
      ),
    });
    expect(result.current.activePanel).toBe('diplomacy');
  });

  it('re-renders consumers when activePanel changes', () => {
    function Probe() {
      const { activePanel, openPanel } = usePanelManager();
      return (
        <div>
          <span data-testid="probe-active">{activePanel ?? 'none'}</span>
          <button type="button" onClick={() => openPanel('log')}>go</button>
        </div>
      );
    }

    const { getByTestId, getByText } = render(
      <PanelManagerProvider>
        <Probe />
      </PanelManagerProvider>,
    );
    expect(getByTestId('probe-active').textContent).toBe('none');
    fireEvent.click(getByText('go'));
    expect(getByTestId('probe-active').textContent).toBe('log');
  });
});
