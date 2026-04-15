// @vitest-environment jsdom

/**
 * ValidationFeedback — smoke tests for the HUD-cycle (h-1) migration to
 * `<TooltipShell>` + `var(--hud-validation-*)` tokens.
 *
 * Covers:
 *   - Nothing renders when validation is valid / null.
 *   - The bubble renders through `TooltipShell` (position="fixed-corner")
 *     when validation is invalid.
 *   - The reason + category text surface.
 *   - Per-category accent tokens swap without touching the shell chrome.
 *
 * The shell's own chrome (positioning, context-menu suppression,
 * `user-select: none`) is covered in `ui/hud/__tests__/TooltipShell.test.tsx`
 * — we do not re-test it here, per the HUD rules.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import type { ValidationResult } from '@hex/engine';

import type { ReactElement } from 'react';
import { HUDManagerProvider } from '../../hud/HUDManager';
import { ValidationFeedback } from '../ValidationFeedback';

// Helper: wrap component under test in the required providers.
function renderWithProviders(ui: ReactElement) {
  return render(<HUDManagerProvider>{ui}</HUDManagerProvider>);
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  // jsdom does not ship an AudioContext; stub it so playErrorSound
  // bails out cleanly without polluting the DOM under test.
  (window as unknown as { AudioContext?: unknown }).AudioContext = undefined;
});

describe('ValidationFeedback', () => {
  it('renders nothing when validation is null', () => {
    const { container } = renderWithProviders(<ValidationFeedback validation={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when validation is valid', () => {
    const validation: ValidationResult = { valid: true };
    const { container } = renderWithProviders(<ValidationFeedback validation={validation} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the bubble inside a TooltipShell for an invalid validation', () => {
    const validation: ValidationResult = {
      valid: false,
      reason: 'Not enough gold',
      category: 'production',
    };
    renderWithProviders(<ValidationFeedback validation={validation} />);

    const shell = screen.getByTestId('tooltip-shell');
    expect(shell.getAttribute('data-hud-id')).toBe('validationFeedback');
    expect(shell.getAttribute('data-position')).toBe('fixed-corner');
    expect(shell.getAttribute('data-sticky')).toBe('true');

    const bubble = screen.getByTestId('validation-feedback-bubble');
    expect(bubble.textContent).toContain('Not enough gold');
    expect(bubble.textContent?.toLowerCase()).toContain('production');
  });

  it('uses the category accent token for the icon color', () => {
    const validation: ValidationResult = {
      valid: false,
      reason: 'Cannot attack that tile',
      category: 'combat',
    };
    renderWithProviders(<ValidationFeedback validation={validation} />);

    const bubble = screen.getByTestId('validation-feedback-bubble');
    const icon = bubble.querySelector('span[aria-hidden="true"]') as HTMLElement | null;
    expect(icon).not.toBeNull();
    // Inline-style color resolves to the category's CSS variable — we
    // assert the literal `var(--hud-validation-icon-error)` on the style
    // attribute, not a resolved hex, because jsdom does not resolve
    // custom properties.
    expect(icon!.style.color).toBe('var(--hud-validation-icon-error)');
  });

  it('renders the shake overlay alongside the bubble while animating', () => {
    const validation: ValidationResult = {
      valid: false,
      reason: 'Out of movement',
      category: 'movement',
    };
    renderWithProviders(<ValidationFeedback validation={validation} />);

    const shake = screen.getByTestId('validation-feedback-shake');
    expect(shake).not.toBeNull();
    expect(shake.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses only token-based chrome — no raw Tailwind color utilities on the bubble', () => {
    const validation: ValidationResult = {
      valid: false,
      reason: 'Invalid move',
      category: 'general',
    };
    renderWithProviders(<ValidationFeedback validation={validation} />);

    const bubble = screen.getByTestId('validation-feedback-bubble');
    // The bubble carries layout utilities (`flex`, `gap-3`, `px-4`,
    // `py-3`) but must not ship Tailwind color utilities or raw gradient
    // classes — the HUD audit flagged this file as 100 %
    // Tailwind-gradient chrome.
    const className = bubble.className;
    expect(className).not.toMatch(/bg-gradient-to-/);
    expect(className).not.toMatch(/\bfrom-/);
    expect(className).not.toMatch(/\bto-/);
    expect(className).not.toMatch(/\bbg-(red|amber|blue|gray|slate|rose|orange|indigo)-/);
    // Chrome colors come from inline style referencing tokens.
    expect(bubble.style.backgroundColor).toContain('var(--hud-validation-bg)');
    expect(bubble.style.color).toBe('var(--hud-validation-text)');
  });
});
