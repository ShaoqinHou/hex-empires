// @vitest-environment jsdom

/**
 * PanelShell — chrome rendering tests.
 *
 * The shell is a pure presentational component — no hooks, no context.
 * Tests cover: title + children render, close callback, modal backdrop,
 * overlay has no backdrop, and the `width` prop is surfaced through
 * data attributes so we can assert the variant.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { PanelShell } from '../PanelShell';
import { PanelManagerProvider, usePanelManager } from '../PanelManager';

afterEach(() => {
  cleanup();
});

describe('PanelShell', () => {
  it('renders the title and child content', () => {
    const { getByText, getByTestId } = render(
      <PanelShell id="help" title="Help Topics" onClose={() => {}}>
        <div data-testid="shell-child">body content</div>
      </PanelShell>,
    );
    expect(getByText('Help Topics')).toBeTruthy();
    expect(getByTestId('shell-child').textContent).toBe('body content');
  });

  it('fires onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <PanelShell id="city" title="City" onClose={onClose}>
        <div>x</div>
      </PanelShell>,
    );
    fireEvent.click(getByTestId('panel-close-city'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a backdrop element when priority is modal', () => {
    const { queryByTestId } = render(
      <PanelShell id="age" title="Age" onClose={() => {}} priority="modal">
        <div>x</div>
      </PanelShell>,
    );
    expect(queryByTestId('panel-backdrop-age')).not.toBeNull();
    expect(queryByTestId('panel-shell-age')?.getAttribute('data-panel-priority')).toBe('modal');
  });

  it('does NOT render a backdrop when priority is overlay', () => {
    const { queryByTestId } = render(
      <PanelShell id="tech" title="Tech" onClose={() => {}} priority="overlay">
        <div>x</div>
      </PanelShell>,
    );
    expect(queryByTestId('panel-backdrop-tech')).toBeNull();
    expect(queryByTestId('panel-shell-tech')?.getAttribute('data-panel-priority')).toBe('overlay');
  });

  it('does NOT render a backdrop when priority is info', () => {
    const { queryByTestId } = render(
      <PanelShell id="log" title="Log" onClose={() => {}} priority="info">
        <div>x</div>
      </PanelShell>,
    );
    expect(queryByTestId('panel-backdrop-log')).toBeNull();
    expect(queryByTestId('panel-shell-log')?.getAttribute('data-panel-priority')).toBe('info');
  });

  it('surfaces the width prop via data-panel-width', () => {
    const { getByTestId, rerender } = render(
      <PanelShell id="diplomacy" title="Diplomacy" onClose={() => {}} width="narrow">
        <div>x</div>
      </PanelShell>,
    );
    expect(getByTestId('panel-shell-diplomacy').getAttribute('data-panel-width')).toBe('narrow');

    rerender(
      <PanelShell id="diplomacy" title="Diplomacy" onClose={() => {}} width="full">
        <div>x</div>
      </PanelShell>,
    );
    expect(getByTestId('panel-shell-diplomacy').getAttribute('data-panel-width')).toBe('full');
  });

  it('defaults priority to overlay and width to wide when props omitted', () => {
    const { getByTestId } = render(
      <PanelShell id="governors" title="Governors" onClose={() => {}}>
        <div>x</div>
      </PanelShell>,
    );
    const shell = getByTestId('panel-shell-governors');
    expect(shell.getAttribute('data-panel-priority')).toBe('overlay');
    expect(shell.getAttribute('data-panel-width')).toBe('wide');
  });

  it('gives the close button an accessible label derived from the title', () => {
    const { getByLabelText } = render(
      <PanelShell id="turnSummary" title="Turn Summary" onClose={() => {}}>
        <div>x</div>
      </PanelShell>,
    );
    expect(getByLabelText('Close Turn Summary')).toBeTruthy();
  });

  // --- Game-feel polish: click-outside-to-close + no browser context menu ---

  it('fires onClose when the modal backdrop is clicked', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <PanelShell id="age" title="Age" onClose={onClose} priority="modal">
        <div>x</div>
      </PanelShell>,
    );
    fireEvent.click(getByTestId('panel-backdrop-age'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onClose when a click lands inside the panel body', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <PanelShell id="age" title="Age" onClose={onClose} priority="modal">
        <div data-testid="shell-body-content">body</div>
      </PanelShell>,
    );
    fireEvent.click(getByTestId('shell-body-content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('prevents the default browser context menu on panel root', () => {
    const { getByTestId } = render(
      <PanelShell id="tech" title="Tech" onClose={() => {}}>
        <div>x</div>
      </PanelShell>,
    );
    const shell = getByTestId('panel-shell-tech');
    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    const prevented = !shell.dispatchEvent(evt);
    expect(prevented).toBe(true);
  });

  it('prevents the default browser context menu on modal backdrop', () => {
    const { getByTestId } = render(
      <PanelShell id="age" title="Age" onClose={() => {}} priority="modal">
        <div>x</div>
      </PanelShell>,
    );
    const backdrop = getByTestId('panel-backdrop-age');
    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    const prevented = !backdrop.dispatchEvent(evt);
    expect(prevented).toBe(true);
  });

  // --- dismissible={false} (blocking-modal opt-in) ---

  it('defaults data-dismissible to "true" when dismissible prop is omitted', () => {
    const { getByTestId } = render(
      <PanelShell id="help" title="Help" onClose={() => {}}>
        <div>x</div>
      </PanelShell>,
    );
    expect(getByTestId('panel-shell-help').getAttribute('data-dismissible')).toBe('true');
  });

  it('stamps data-dismissible="false" on the shell root when dismissible={false}', () => {
    const { getByTestId } = render(
      <PanelShell id="age" title="Age" onClose={() => {}} priority="modal" dismissible={false}>
        <div>x</div>
      </PanelShell>,
    );
    expect(getByTestId('panel-shell-age').getAttribute('data-dismissible')).toBe('false');
  });

  it('does NOT render the close X button when dismissible={false}', () => {
    const { queryByTestId, queryByLabelText } = render(
      <PanelShell id="age" title="Age" onClose={() => {}} priority="modal" dismissible={false}>
        <div>x</div>
      </PanelShell>,
    );
    expect(queryByTestId('panel-close-age')).toBeNull();
    expect(queryByLabelText('Close Age')).toBeNull();
  });

  it('does NOT fire onClose when the backdrop is clicked with dismissible={false}', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <PanelShell id="age" title="Age" onClose={onClose} priority="modal" dismissible={false}>
        <div>x</div>
      </PanelShell>,
    );
    fireEvent.click(getByTestId('panel-backdrop-age'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('still suppresses the browser context menu on backdrop when dismissible={false}', () => {
    const { getByTestId } = render(
      <PanelShell id="age" title="Age" onClose={() => {}} priority="modal" dismissible={false}>
        <div>x</div>
      </PanelShell>,
    );
    const backdrop = getByTestId('panel-backdrop-age');
    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    const prevented = !backdrop.dispatchEvent(evt);
    expect(prevented).toBe(true);
  });

  it('ESC keydown does NOT close a PanelManager-tracked panel when its shell has dismissible={false}', () => {
    // Integration: PanelShell stamps `data-dismissible="false"` on its
    // root, PanelManager's ESC handler short-circuits when it sees such
    // a shell anywhere in the DOM. Net effect: ESC is inert for blocking
    // modals without any per-panel plumbing.
    function ProbePanel() {
      const { activePanel } = usePanelManager();
      if (activePanel !== 'age') return null;
      return (
        <PanelShell id="age" title="Age" onClose={() => {}} priority="modal" dismissible={false}>
          <div data-testid="blocking-body">pick a civ</div>
        </PanelShell>
      );
    }
    function Probe() {
      const { activePanel } = usePanelManager();
      return <span data-testid="active-probe">{activePanel ?? 'none'}</span>;
    }
    const { getByTestId, queryByTestId } = render(
      <PanelManagerProvider initialPanel="age">
        <Probe />
        <ProbePanel />
      </PanelManagerProvider>,
    );
    expect(getByTestId('active-probe').textContent).toBe('age');
    expect(queryByTestId('blocking-body')).not.toBeNull();

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    // Panel must still be open — ESC was intercepted as a no-op.
    expect(getByTestId('active-probe').textContent).toBe('age');
    expect(queryByTestId('blocking-body')).not.toBeNull();
  });

  it('ESC keydown DOES close a PanelManager-tracked panel when its shell is dismissible (default)', () => {
    // Control case: confirms the inert-ESC behavior above is specifically
    // caused by `dismissible={false}`, not by PanelShell existence.
    function ProbePanel() {
      const { activePanel, closePanel } = usePanelManager();
      if (activePanel !== 'help') return null;
      return (
        <PanelShell id="help" title="Help" onClose={closePanel} priority="overlay">
          <div>body</div>
        </PanelShell>
      );
    }
    function Probe() {
      const { activePanel } = usePanelManager();
      return <span data-testid="active-probe">{activePanel ?? 'none'}</span>;
    }
    const { getByTestId } = render(
      <PanelManagerProvider initialPanel="help">
        <Probe />
        <ProbePanel />
      </PanelManagerProvider>,
    );
    expect(getByTestId('active-probe').textContent).toBe('help');

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });

    expect(getByTestId('active-probe').textContent).toBe('none');
  });
});
