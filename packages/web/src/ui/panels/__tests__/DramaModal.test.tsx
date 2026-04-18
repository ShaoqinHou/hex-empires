// @vitest-environment jsdom

/**
 * DramaModal — unit tests for the Phase 4.5 ceremony-modal shell.
 *
 * Covers:
 * - Title + subtitle + body + hero slot render.
 * - Choice click fires onSelect but does NOT auto-call onResolve.
 * - No close button rendered (DramaModal is dismissible=false by design).
 * - data-testid and data-dismissible attributes present.
 * - Viewport-class switch: stacked layout at standard, 2-column at wide.
 * - Phase 6.3: reveal="fade" applies .drama-modal-reveal class.
 *   reveal="instant" omits it (existing tests use instant for sync rendering).
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { DramaModal } from '../DramaModal';
import type { DramaChoice } from '../DramaModal';

// Mock useViewportClass so we can control layout mode per test.
const viewportClassRef = { value: 'standard' as 'standard' | 'wide' | 'ultra' };

vi.mock('../../../hooks/useViewportClass', () => ({
  useViewportClass: () => viewportClassRef.value,
}));

// Mock useReducedMotion — default to false (full motion).
const reducedMotionRef = { value: false };

vi.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => reducedMotionRef.value,
}));

beforeEach(() => {
  reducedMotionRef.value = false;
});

afterEach(() => {
  cleanup();
  viewportClassRef.value = 'standard';
  reducedMotionRef.value = false;
});

const noop = () => {};

describe('DramaModal', () => {
  it('renders the title', () => {
    const { getByText } = render(
      <DramaModal id="crisis" title="Plague!" onResolve={noop} />,
    );
    expect(getByText('Plague!')).toBeTruthy();
  });

  it('renders the subtitle when provided', () => {
    const { getByText } = render(
      <DramaModal
        id="age"
        title="A New Age Dawns"
        subtitle="Antiquity → Exploration"
        onResolve={noop}
      />,
    );
    expect(getByText('Antiquity → Exploration')).toBeTruthy();
  });

  it('does not render subtitle when omitted', () => {
    const { queryByText } = render(
      <DramaModal id="crisis" title="Crisis" onResolve={noop} />,
    );
    // No subtitle text node should be present
    expect(queryByText(/→/)).toBeNull();
  });

  it('renders hero slot content when hero prop is provided', () => {
    const { getByTestId } = render(
      <DramaModal
        id="age"
        title="Title"
        hero={<div data-testid="hero-content">⚡</div>}
        onResolve={noop}
      />,
    );
    expect(getByTestId('hero-content')).toBeTruthy();
  });

  it('renders body content', () => {
    const { getByTestId } = render(
      <DramaModal
        id="crisis"
        title="Crisis"
        body={<div data-testid="body-content">Some flavor text</div>}
        onResolve={noop}
      />,
    );
    expect(getByTestId('body-content')).toBeTruthy();
  });

  it('renders choice buttons from choices prop', () => {
    const choices: DramaChoice[] = [
      { id: 'c1', label: 'Quarantine', tone: 'primary',   onSelect: noop },
      { id: 'c2', label: 'Ignore',     tone: 'secondary', onSelect: noop },
    ];
    const { getByText } = render(
      <DramaModal id="crisis" title="Crisis" choices={choices} onResolve={noop} />,
    );
    expect(getByText('Quarantine')).toBeTruthy();
    expect(getByText('Ignore')).toBeTruthy();
  });

  it('renders hint line below choice label', () => {
    const choices: DramaChoice[] = [
      { id: 'c1', label: 'Quarantine', hint: '-1 Food/turn', tone: 'secondary', onSelect: noop },
    ];
    const { getByText } = render(
      <DramaModal id="crisis" title="Crisis" choices={choices} onResolve={noop} />,
    );
    expect(getByText('-1 Food/turn')).toBeTruthy();
  });

  it('choice click fires onSelect and does NOT auto-call onResolve', () => {
    const onSelect = vi.fn();
    const onResolve = vi.fn();
    const choices: DramaChoice[] = [
      { id: 'c1', label: 'Act', tone: 'primary', onSelect },
    ];
    const { getByText } = render(
      <DramaModal id="crisis" title="Crisis" choices={choices} onResolve={onResolve} />,
    );
    fireEvent.click(getByText('Act'));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('sets data-testid="panel-shell-{id}" on the container', () => {
    const { getByTestId } = render(
      <DramaModal id="victory" title="Victory!" onResolve={noop} />,
    );
    expect(getByTestId('panel-shell-victory')).toBeTruthy();
  });

  it('sets data-dismissible="false" on the container', () => {
    const { getByTestId } = render(
      <DramaModal id="crisis" title="Crisis" onResolve={noop} />,
    );
    expect(getByTestId('panel-shell-crisis').getAttribute('data-dismissible')).toBe('false');
  });

  it('does NOT render a close button', () => {
    const { queryByRole } = render(
      <DramaModal id="age" title="A New Age Dawns" onResolve={noop} />,
    );
    // No button with aria-label matching "Close …"
    const closeBtn = queryByRole('button', { name: /close/i });
    expect(closeBtn).toBeNull();
  });

  it('renders a dialog role with the title as aria-label', () => {
    const { getByRole } = render(
      <DramaModal id="crisis" title="Barbarian Invasion" onResolve={noop} />,
    );
    const dialog = getByRole('dialog', { name: 'Barbarian Invasion' });
    expect(dialog).toBeTruthy();
  });

  it('uses stacked layout (no 2-col grid class) at standard viewport', () => {
    viewportClassRef.value = 'standard';
    const { queryByText, container } = render(
      <DramaModal id="age" title="Title" onResolve={noop} />,
    );
    // The 2-column grid wrapper should not be present at standard
    const grid = container.querySelector('.drama-modal-layout-2col');
    expect(grid).toBeNull();
    // Title should still be visible
    expect(queryByText('Title')).toBeTruthy();
  });

  it('uses 2-column grid layout at wide viewport', () => {
    viewportClassRef.value = 'wide';
    const { container } = render(
      <DramaModal id="age" title="Title" onResolve={noop} />,
    );
    const grid = container.querySelector('.drama-modal-layout-2col');
    expect(grid).toBeTruthy();
  });

  it('uses 2-column grid layout at ultra viewport', () => {
    viewportClassRef.value = 'ultra';
    const { container } = render(
      <DramaModal id="age" title="Title" onResolve={noop} />,
    );
    const grid = container.querySelector('.drama-modal-layout-2col');
    expect(grid).toBeTruthy();
  });

  it('sets data-panel-tone attribute from tone prop', () => {
    const { getByTestId } = render(
      <DramaModal id="victory" title="Victory" tone="triumph" onResolve={noop} />,
    );
    expect(getByTestId('panel-shell-victory').getAttribute('data-panel-tone')).toBe('triumph');
  });

  it('renders the backdrop with correct testid', () => {
    const { getByTestId } = render(
      <DramaModal id="crisis" title="Crisis" onResolve={noop} />,
    );
    expect(getByTestId('panel-backdrop-crisis')).toBeTruthy();
  });

  // ── Phase 6.3: reveal="fade" behavior ──────────────────────────────────────

  it('reveal="fade" applies drama-modal-reveal class to container', () => {
    const { getByTestId } = render(
      <DramaModal id="age" title="Title" reveal="fade" onResolve={noop} />,
    );
    expect(getByTestId('panel-shell-age').classList.contains('drama-modal-reveal')).toBe(true);
  });

  it('reveal="fade" applies drama-backdrop-reveal class to backdrop', () => {
    const { getByTestId } = render(
      <DramaModal id="age" title="Title" reveal="fade" onResolve={noop} />,
    );
    expect(getByTestId('panel-backdrop-age').classList.contains('drama-backdrop-reveal')).toBe(true);
  });

  it('reveal="instant" omits drama-modal-reveal class', () => {
    const { getByTestId } = render(
      <DramaModal id="crisis" title="Crisis" reveal="instant" onResolve={noop} />,
    );
    expect(getByTestId('panel-shell-crisis').classList.contains('drama-modal-reveal')).toBe(false);
  });

  it('reveal="instant" omits drama-backdrop-reveal class', () => {
    const { getByTestId } = render(
      <DramaModal id="crisis" title="Crisis" reveal="instant" onResolve={noop} />,
    );
    expect(getByTestId('panel-backdrop-crisis').classList.contains('drama-backdrop-reveal')).toBe(false);
  });

  it('default reveal is "fade" (drama-modal-reveal class present when no reveal prop)', () => {
    const { getByTestId } = render(
      <DramaModal id="victory" title="Victory!" onResolve={noop} />,
    );
    expect(getByTestId('panel-shell-victory').classList.contains('drama-modal-reveal')).toBe(true);
  });

  it('sets data-reduced-motion="false" when useReducedMotion returns false', () => {
    reducedMotionRef.value = false;
    const { getByTestId } = render(
      <DramaModal id="crisis" title="Crisis" reveal="fade" onResolve={noop} />,
    );
    expect(getByTestId('panel-shell-crisis').getAttribute('data-reduced-motion')).toBe('false');
  });

  it('sets data-reduced-motion="true" when useReducedMotion returns true', () => {
    reducedMotionRef.value = true;
    const { getByTestId } = render(
      <DramaModal id="crisis" title="Crisis" reveal="fade" onResolve={noop} />,
    );
    expect(getByTestId('panel-shell-crisis').getAttribute('data-reduced-motion')).toBe('true');
  });
});
