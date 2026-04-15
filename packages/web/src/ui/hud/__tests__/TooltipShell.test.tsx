// @vitest-environment jsdom

/**
 * TooltipShell — chrome rendering + positioning tests.
 *
 * The shell is presentational. Tests cover:
 *   - children render in the shell body
 *   - data-position / data-tier attributes reflect props
 *   - default tier is 'compact'
 *   - pointer-events discipline (floating + non-sticky = none;
 *     fixed-corner or sticky = auto)
 *   - context-menu suppression
 *   - hex anchor + projector positions near the computed screen coord
 *   - hex anchor without projector renders the no-render placeholder
 *   - anchor far off-screen still results in a clamped placement inside
 *     the viewport
 */

import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { TooltipShell } from '../TooltipShell';

afterEach(() => {
  cleanup();
});

// jsdom returns width/height = 0 from getBoundingClientRect by default.
// Stub it to a known rect so placement math is exercised against a
// sensible "measured shell" size.
function stubShellRect(width: number, height: number) {
  const originalGBCR = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function stub() {
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON() {
        return {};
      },
    } as DOMRect;
  };
  return () => {
    HTMLElement.prototype.getBoundingClientRect = originalGBCR;
  };
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

describe('TooltipShell', () => {
  it('renders children', () => {
    setViewport(1024, 768);
    const restore = stubShellRect(120, 60);
    try {
      const { getByText } = render(
        <TooltipShell anchor={{ kind: 'screen', x: 100, y: 100 }} position="floating">
          <div>body content</div>
        </TooltipShell>,
      );
      expect(getByText('body content')).toBeTruthy();
    } finally {
      restore();
    }
  });

  it('surfaces data-position via prop', () => {
    setViewport(1024, 768);
    const restore = stubShellRect(120, 60);
    try {
      const { getByTestId, rerender } = render(
        <TooltipShell anchor={{ kind: 'screen', x: 100, y: 100 }} position="floating">
          <div>x</div>
        </TooltipShell>,
      );
      expect(getByTestId('tooltip-shell').getAttribute('data-position')).toBe('floating');

      rerender(
        <TooltipShell anchor={{ kind: 'screen', x: 100, y: 100 }} position="fixed-corner">
          <div>x</div>
        </TooltipShell>,
      );
      expect(getByTestId('tooltip-shell').getAttribute('data-position')).toBe('fixed-corner');

      rerender(
        <TooltipShell anchor={{ kind: 'screen', x: 100, y: 100 }} position="side">
          <div>x</div>
        </TooltipShell>,
      );
      expect(getByTestId('tooltip-shell').getAttribute('data-position')).toBe('side');
    } finally {
      restore();
    }
  });

  it('defaults tier to "compact" and reflects explicit tier', () => {
    setViewport(1024, 768);
    const restore = stubShellRect(120, 60);
    try {
      const { getByTestId, rerender } = render(
        <TooltipShell anchor={{ kind: 'screen', x: 100, y: 100 }} position="floating">
          <div>x</div>
        </TooltipShell>,
      );
      expect(getByTestId('tooltip-shell').getAttribute('data-tier')).toBe('compact');

      rerender(
        <TooltipShell anchor={{ kind: 'screen', x: 100, y: 100 }} position="floating" tier="detailed">
          <div>x</div>
        </TooltipShell>,
      );
      expect(getByTestId('tooltip-shell').getAttribute('data-tier')).toBe('detailed');
    } finally {
      restore();
    }
  });

  it('applies pointer-events: none on floating + non-sticky shells', () => {
    setViewport(1024, 768);
    const restore = stubShellRect(120, 60);
    try {
      const { getByTestId } = render(
        <TooltipShell anchor={{ kind: 'screen', x: 100, y: 100 }} position="floating">
          <div>x</div>
        </TooltipShell>,
      );
      const shell = getByTestId('tooltip-shell') as HTMLElement;
      expect(shell.style.pointerEvents).toBe('none');
    } finally {
      restore();
    }
  });

  it('applies pointer-events: auto on fixed-corner OR sticky shells', () => {
    setViewport(1024, 768);
    const restore = stubShellRect(120, 60);
    try {
      const { getByTestId, rerender } = render(
        <TooltipShell anchor={{ kind: 'screen', x: 100, y: 100 }} position="fixed-corner">
          <div>x</div>
        </TooltipShell>,
      );
      expect((getByTestId('tooltip-shell') as HTMLElement).style.pointerEvents).toBe('auto');

      rerender(
        <TooltipShell anchor={{ kind: 'screen', x: 100, y: 100 }} position="floating" sticky>
          <div>x</div>
        </TooltipShell>,
      );
      expect((getByTestId('tooltip-shell') as HTMLElement).style.pointerEvents).toBe('auto');
    } finally {
      restore();
    }
  });

  it('suppresses the browser context menu on the shell root', () => {
    setViewport(1024, 768);
    const restore = stubShellRect(120, 60);
    try {
      const { getByTestId } = render(
        <TooltipShell anchor={{ kind: 'screen', x: 100, y: 100 }} position="floating">
          <div>x</div>
        </TooltipShell>,
      );
      const shell = getByTestId('tooltip-shell');
      const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      const prevented = !shell.dispatchEvent(evt);
      expect(prevented).toBe(true);
    } finally {
      restore();
    }
  });

  it('positions the shell via hexToScreen when anchor.kind === "hex"', () => {
    // Viewport large enough that a 500x500 anchor + ~40px diagonal
    // offset lands nowhere near the edges, so the placement result is
    // the un-flipped, un-clamped diagonal.
    setViewport(2000, 2000);
    const shellW = 120;
    const shellH = 60;
    const restore = stubShellRect(shellW, shellH);
    try {
      const projector = (q: number, r: number) => ({ x: 500 + q * 10, y: 500 + r * 10 });
      const { getByTestId } = render(
        <TooltipShell
          anchor={{ kind: 'hex', q: 3, r: 2 }}
          position="floating"
          hexToScreen={projector}
        >
          <div>x</div>
        </TooltipShell>,
      );
      const shell = getByTestId('tooltip-shell') as HTMLElement;
      expect(shell.getAttribute('data-rendered')).toBe('true');

      // Anchor projects to (530, 520). Since it's in the top-left
      // quadrant of a 2000x2000 viewport, the shell opens +x / +y with
      // the default 40px offset — expected top-left = (570, 560).
      expect(shell.style.left).toBe('570px');
      expect(shell.style.top).toBe('560px');
    } finally {
      restore();
    }
  });

  it('renders a no-render placeholder when hex anchor has no hexToScreen projector', () => {
    setViewport(1024, 768);
    const restore = stubShellRect(120, 60);
    try {
      const { getByTestId } = render(
        <TooltipShell anchor={{ kind: 'hex', q: 1, r: 1 }} position="floating">
          <div>x</div>
        </TooltipShell>,
      );
      const shell = getByTestId('tooltip-shell') as HTMLElement;
      expect(shell.getAttribute('data-rendered')).toBe('false');
      // Placeholder sits at the origin with zero size — the caller
      // should not have shipped this configuration, but if it does,
      // nothing visible leaks onto the game surface.
      expect(shell.style.left).toBe('0px');
      expect(shell.style.top).toBe('0px');
      expect(shell.style.width).toBe('0px');
      expect(shell.style.height).toBe('0px');
    } finally {
      restore();
    }
  });

  it('clamps to viewport when the anchor sits far beyond viewport bounds', () => {
    // Anchor is 10,000 px right of the 1024-wide viewport — both the
    // initial diagonal and the flipped diagonal overflow. The shell
    // must clamp into viewport bounds minus margin.
    setViewport(1024, 768);
    const shellW = 120;
    const shellH = 60;
    const restore = stubShellRect(shellW, shellH);
    try {
      const { getByTestId } = render(
        <TooltipShell
          anchor={{ kind: 'screen', x: 11000, y: 11000 }}
          position="floating"
        >
          <div>x</div>
        </TooltipShell>,
      );
      const shell = getByTestId('tooltip-shell') as HTMLElement;
      const left = parseFloat(shell.style.left);
      const top = parseFloat(shell.style.top);
      // Shell must lie entirely within [8, viewport - 8] bounds.
      expect(left).toBeGreaterThanOrEqual(8);
      expect(top).toBeGreaterThanOrEqual(8);
      expect(left + shellW).toBeLessThanOrEqual(1024 - 8);
      expect(top + shellH).toBeLessThanOrEqual(768 - 8);
    } finally {
      restore();
    }
  });

  it('places fixed-corner shells near the bottom-right of the viewport', () => {
    setViewport(1024, 768);
    const shellW = 200;
    const shellH = 100;
    const restore = stubShellRect(shellW, shellH);
    try {
      // Anchor is irrelevant for fixed-corner, but we pass a valid one.
      const { getByTestId } = render(
        <TooltipShell anchor={{ kind: 'screen', x: 10, y: 10 }} position="fixed-corner">
          <div>x</div>
        </TooltipShell>,
      );
      const shell = getByTestId('tooltip-shell') as HTMLElement;
      expect(shell.style.left).toBe(`${1024 - shellW - 8}px`);
      expect(shell.style.top).toBe(`${768 - shellH - 8}px`);
    } finally {
      restore();
    }
  });
});
