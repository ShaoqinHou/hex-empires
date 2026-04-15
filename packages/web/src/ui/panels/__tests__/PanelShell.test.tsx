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
import { cleanup, fireEvent, render } from '@testing-library/react';
import { PanelShell } from '../PanelShell';

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
});
