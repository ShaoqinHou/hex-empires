// @vitest-environment jsdom

/**
 * HelpPanel — smoke test for the PanelShell migration (cycle 3 batch 1).
 *
 * The panel is fully static (no engine context), so we just verify the
 * shell wrapper is present and onClose fires.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { HelpPanel } from '../HelpPanel';

afterEach(() => {
  cleanup();
});

describe('HelpPanel (PanelShell)', () => {
  it('renders inside PanelShell with the registry title', () => {
    const { getByTestId, getByText } = render(<HelpPanel onClose={() => {}} />);
    expect(getByTestId('panel-shell-help')).toBeTruthy();
    expect(getByText('Help & Tutorial')).toBeTruthy();
  });

  it('fires onClose when the shell close button is clicked', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<HelpPanel onClose={onClose} />);
    fireEvent.click(getByTestId('panel-close-help'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
