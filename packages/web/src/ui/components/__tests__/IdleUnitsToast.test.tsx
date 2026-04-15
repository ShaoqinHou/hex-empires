// @vitest-environment jsdom

/**
 * IdleUnitsToast — smoke tests for the J-key "No idle units" transient toast.
 *
 * Covers:
 *   - Nothing renders when triggerCount is 0.
 *   - The toast body renders inside a TooltipShell (fixed-corner) when
 *     triggerCount > 0.
 *   - The message text "No idle units" surfaces.
 *   - Re-triggering (incrementing triggerCount again) keeps the toast visible.
 *
 * Per HUD conventions, shell chrome behavior (positioning, pointer-events,
 * user-select) is covered by TooltipShell.test.tsx — we don't re-test it.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { HUDManagerProvider } from '../../hud/HUDManager';
import { IdleUnitsToast } from '../IdleUnitsToast';
import type { ReactElement } from 'react';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers();
});

function renderWithProviders(ui: ReactElement) {
  return render(<HUDManagerProvider>{ui}</HUDManagerProvider>);
}

describe('IdleUnitsToast', () => {
  it('renders nothing when triggerCount is 0', () => {
    const { container } = renderWithProviders(<IdleUnitsToast triggerCount={0} />);
    // Component returns null when triggerCount === 0, so container is empty.
    expect(container.firstChild).toBeNull();
  });

  it('renders the toast inside a TooltipShell for triggerCount > 0', () => {
    renderWithProviders(<IdleUnitsToast triggerCount={1} />);

    const shell = screen.getByTestId('tooltip-shell');
    expect(shell.getAttribute('data-hud-id')).toBe('idleUnitsToast');
    expect(shell.getAttribute('data-position')).toBe('fixed-corner');

    const toast = screen.getByTestId('idle-units-toast');
    expect(toast.textContent).toContain('No idle units');
  });

  it('has role="status" and aria-live="polite" on the toast body', () => {
    renderWithProviders(<IdleUnitsToast triggerCount={1} />);

    const toast = screen.getByTestId('idle-units-toast');
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
  });

  it('remains visible on a second trigger (triggerCount increments)', () => {
    const { rerender } = renderWithProviders(<IdleUnitsToast triggerCount={1} />);

    // Trigger again — toast stays mounted.
    rerender(
      <HUDManagerProvider>
        <IdleUnitsToast triggerCount={2} />
      </HUDManagerProvider>,
    );

    const toast = screen.getByTestId('idle-units-toast');
    expect(toast.textContent).toContain('No idle units');
  });

  it('auto-dismisses after 2500 ms (toast disappears)', async () => {
    renderWithProviders(<IdleUnitsToast triggerCount={1} />);

    // Toast is visible before the timer fires.
    expect(screen.getByTestId('idle-units-toast')).toBeTruthy();

    // Advance timers inside act so React flushes the resulting state update.
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    // After the timer, isVisible flips to false — the toast body should
    // no longer be in the document.
    expect(screen.queryByTestId('idle-units-toast')).toBeNull();
  });
});
