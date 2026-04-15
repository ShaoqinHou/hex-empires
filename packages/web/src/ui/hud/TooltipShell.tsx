/**
 * TooltipShell — shared chrome for tooltip-shaped HUD overlays.
 *
 * Sibling to `PanelShell` but tuned for the transient, cursor-driven
 * overlay layer. Owns:
 *   - Anchor → screen-coordinate translation (hex anchors are resolved
 *     through the caller-supplied `hexToScreen` projector; screen
 *     anchors are used as-is),
 *   - Quadrant-aware diagonal offset so the overlay does not occlude
 *     the hovered tile,
 *   - Viewport clamping with flip-to-opposite-diagonal when the first
 *     placement would overflow,
 *   - Pointer-events discipline (floating + non-sticky is
 *     `pointer-events: none` so hover is not stolen from the canvas),
 *   - `user-select: none` + `contextmenu` suppression on the shell root,
 *   - Data attributes (`data-hud-id`, `data-position`, `data-tier`) for
 *     E2E + visual-regression selectors.
 *
 * Styling uses `var(--hud-*)` with `var(--panel-*)` fallbacks so the
 * shell renders correctly even before `hud-tokens.css` lands (cycle
 * (a)) and keeps rendering correctly after.
 *
 * Cycle (b) of the HUD refactor. No overlay migrates to use this shell
 * yet — migrations start in cycle (c).
 */

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

// HUDElementId is defined locally here because cycle (a) (HUDManager +
// hudRegistry) may not yet be present on `main` when this cycle is
// cherry-picked. When the registry lands, this union can be replaced by
// a type-only import from `./hudRegistry` without touching callers.
export type HUDElementId = string;

export type TooltipAnchor =
  | { readonly kind: 'hex'; readonly q: number; readonly r: number }
  | { readonly kind: 'screen'; readonly x: number; readonly y: number };

export type TooltipPosition = 'floating' | 'fixed-corner' | 'side';
export type TooltipTier = 'compact' | 'detailed';
export type TooltipOffset = 'auto' | 'small' | 'large';

export interface TooltipShellProps {
  /** Optional for ad-hoc usage. When provided, surfaces as `data-hud-id`. */
  readonly id?: HUDElementId;
  readonly anchor: TooltipAnchor;
  readonly position: TooltipPosition;
  /** Default 'compact'. */
  readonly tier?: TooltipTier;
  /**
   * When true, overlay does not dismiss on pointer-leave — the caller
   * owns the dismiss decision. Also switches the shell to
   * `pointer-events: auto` so content can be interactive. Default false.
   */
  readonly sticky?: boolean;
  /** Default 'auto' — computed from the anchor's viewport quadrant. */
  readonly offset?: TooltipOffset;
  /**
   * Required when `anchor.kind === 'hex'`. Translates axial hex coords
   * into absolute screen pixels (page coordinates). Returning `null`
   * means the hex is not currently projectable (off-camera, etc.) —
   * the shell then renders at (0, 0) and remains clamped on-screen.
   */
  readonly hexToScreen?: (q: number, r: number) => { readonly x: number; readonly y: number } | null;
  readonly children: ReactNode;
}

// Viewport margin used by every clamp computation.
const VIEWPORT_MARGIN_PX = 8;

// Quadrant-aware base offset from the anchor to the tooltip's TL
// corner. 'auto' resolves to OFFSET_AUTO_PX per-axis; 'small' / 'large'
// override the magnitude but keep the direction inferred from the
// anchor's viewport quadrant.
const OFFSET_AUTO_PX = 40;
const OFFSET_SMALL_PX = 24;
const OFFSET_LARGE_PX = 72;

function offsetMagnitude(offset: TooltipOffset): number {
  if (offset === 'small') return OFFSET_SMALL_PX;
  if (offset === 'large') return OFFSET_LARGE_PX;
  return OFFSET_AUTO_PX;
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Compute final {x, y} for a 'floating' shell given an anchor, the
 * shell's measured size, and the viewport dimensions. Strategy:
 *   1. Choose a diagonal direction away from the nearer viewport edges
 *      (so the overlay opens toward the side with the most room).
 *   2. Place the shell at anchor + magnitude in that direction.
 *   3. If the result overflows, flip to the opposite diagonal.
 *   4. If still overflows, clamp to the viewport minus VIEWPORT_MARGIN.
 */
function placeFloating(
  anchorX: number,
  anchorY: number,
  shell: Rect,
  viewport: { readonly width: number; readonly height: number },
  magnitude: number,
): { readonly x: number; readonly y: number } {
  const midX = viewport.width / 2;
  const midY = viewport.height / 2;

  // Direction = away from the center (i.e. toward the more-spacious
  // side). +1 = right/down, -1 = left/up.
  const dirX: 1 | -1 = anchorX <= midX ? 1 : -1;
  const dirY: 1 | -1 = anchorY <= midY ? 1 : -1;

  const candidate = (dx: 1 | -1, dy: 1 | -1): { x: number; y: number } => {
    // When moving left/up, subtract shell width/height so the shell's
    // far edge sits `magnitude` away from the anchor rather than its
    // near edge overlapping it.
    const x = dx === 1 ? anchorX + magnitude : anchorX - magnitude - shell.width;
    const y = dy === 1 ? anchorY + magnitude : anchorY - magnitude - shell.height;
    return { x, y };
  };

  const overflows = (r: { x: number; y: number }): boolean => {
    return (
      r.x < VIEWPORT_MARGIN_PX ||
      r.y < VIEWPORT_MARGIN_PX ||
      r.x + shell.width > viewport.width - VIEWPORT_MARGIN_PX ||
      r.y + shell.height > viewport.height - VIEWPORT_MARGIN_PX
    );
  };

  let result = candidate(dirX, dirY);
  if (overflows(result)) {
    // Flip to opposite diagonal.
    const flipX: 1 | -1 = dirX === 1 ? -1 : 1;
    const flipY: 1 | -1 = dirY === 1 ? -1 : 1;
    result = candidate(flipX, flipY);
  }

  // Clamp to viewport regardless.
  const maxX = viewport.width - shell.width - VIEWPORT_MARGIN_PX;
  const maxY = viewport.height - shell.height - VIEWPORT_MARGIN_PX;
  const clampedX = Math.max(VIEWPORT_MARGIN_PX, Math.min(result.x, Math.max(VIEWPORT_MARGIN_PX, maxX)));
  const clampedY = Math.max(VIEWPORT_MARGIN_PX, Math.min(result.y, Math.max(VIEWPORT_MARGIN_PX, maxY)));
  return { x: clampedX, y: clampedY };
}

/**
 * Resolve an anchor down to absolute screen pixels. Returns null when
 * the hex anchor has no projector or the projector itself returns null
 * (tile off-camera). Callers render at (0, 0) in that case so the
 * shell is still mountable and measurable.
 */
function resolveAnchor(
  anchor: TooltipAnchor,
  hexToScreen: TooltipShellProps['hexToScreen'],
): { readonly x: number; readonly y: number } | null {
  if (anchor.kind === 'screen') return { x: anchor.x, y: anchor.y };
  if (!hexToScreen) return null;
  return hexToScreen(anchor.q, anchor.r);
}

// Tokenised chrome values with `--panel-*` fallbacks so the shell
// renders correctly even if `hud-tokens.css` has not been imported by
// the time the first TooltipShell mounts (cycle (a) lands in parallel).
// If neither token resolves, the final value after the commas is a
// literal CSS keyword/length the browser will accept — never a raw
// hex colour.
const SHELL_BG       = 'var(--hud-bg, var(--panel-bg, rgba(22, 27, 34, 0.96)))';
const SHELL_BORDER   = 'var(--hud-border, var(--panel-border, rgba(100, 116, 139, 0.45)))';
const SHELL_RADIUS   = 'var(--hud-radius, var(--panel-radius, 6px))';
const SHELL_SHADOW   = 'var(--hud-shadow, var(--panel-shadow, 0 4px 14px rgba(0, 0, 0, 0.5)))';
const SHELL_TEXT     = 'var(--hud-text-color, var(--panel-text-color, rgba(230, 237, 243, 0.95)))';
const SHELL_PAD_COMPACT  = 'var(--hud-padding-compact, var(--panel-padding-sm, 6px) var(--panel-padding-md, 10px))';
const SHELL_PAD_DETAILED = 'var(--hud-padding-detailed, var(--panel-padding-md, 10px) var(--panel-padding-lg, 14px))';
const SHELL_Z_INDEX  = 'var(--hud-z-floating, var(--panel-z-overlay, 110))';

function baseShellStyle(tier: TooltipTier, interactive: boolean): CSSProperties {
  return {
    position: 'fixed',
    backgroundColor: SHELL_BG,
    border: `1px solid ${SHELL_BORDER}`,
    borderRadius: SHELL_RADIUS,
    boxShadow: SHELL_SHADOW,
    color: SHELL_TEXT,
    padding: tier === 'detailed' ? SHELL_PAD_DETAILED : SHELL_PAD_COMPACT,
    zIndex: SHELL_Z_INDEX as unknown as number,
    pointerEvents: interactive ? 'auto' : 'none',
    userSelect: 'none',
    // Max widths keep the shell compact-first; callers pick the tier
    // and the shell adjusts via padding + a slightly wider max.
    maxWidth: tier === 'detailed' ? '360px' : '260px',
  };
}

export function TooltipShell({
  id,
  anchor,
  position,
  tier = 'compact',
  sticky = false,
  offset = 'auto',
  hexToScreen,
  children,
}: TooltipShellProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Measure the shell post-render and compute its final placement.
  // useLayoutEffect so the positioned frame paints in sync with the
  // anchor change — no visible flicker at 0,0.
  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    if (position === 'fixed-corner') {
      // Bottom-right for cycle (b). TODO(cycle-d): quadrant-aware
      // corner selection based on cursor location.
      const rect = node.getBoundingClientRect();
      const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
      const x = vw - rect.width - VIEWPORT_MARGIN_PX;
      const y = vh - rect.height - VIEWPORT_MARGIN_PX;
      setPlacement({
        x: Math.max(VIEWPORT_MARGIN_PX, x),
        y: Math.max(VIEWPORT_MARGIN_PX, y),
      });
      return;
    }

    if (position === 'side') {
      // Right edge, vertically centered. No dependence on anchor.
      const rect = node.getBoundingClientRect();
      const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
      const x = vw - rect.width - VIEWPORT_MARGIN_PX;
      const y = Math.max(VIEWPORT_MARGIN_PX, vh / 2 - rect.height / 2);
      setPlacement({ x, y });
      return;
    }

    // position === 'floating'
    const resolved = resolveAnchor(anchor, hexToScreen);
    if (!resolved) return; // caller gave a hex anchor without projector — stay at 0,0

    const rect = node.getBoundingClientRect();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
    const placed = placeFloating(
      resolved.x,
      resolved.y,
      { x: 0, y: 0, width: rect.width, height: rect.height },
      { width: vw, height: vh },
      offsetMagnitude(offset),
    );
    setPlacement(placed);
  }, [anchor, position, offset, hexToScreen, tier, children]);

  // If the caller gave a hex anchor but no projector, we still mount
  // (so measurement can happen) but leave placement at (0, 0). Tests
  // assert this is the no-render fallback. Callers should avoid this
  // case in production by always wiring `hexToScreen` alongside a hex
  // anchor.
  const anchorResolvable =
    anchor.kind === 'screen' || (anchor.kind === 'hex' && typeof hexToScreen === 'function');
  if (position === 'floating' && !anchorResolvable) {
    // Render a non-positioned, zero-size placeholder so tests can
    // detect the "no-render" path deterministically. We keep the data
    // attributes so consumers and Playwright specs still see a stable
    // hook, even though the overlay is visually absent.
    return (
      <div
        ref={rootRef}
        data-testid="tooltip-shell"
        data-hud-id={id}
        data-position={position}
        data-tier={tier}
        data-rendered="false"
        style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, pointerEvents: 'none' }}
        aria-hidden={tier === 'compact'}
      />
    );
  }

  const interactive = position === 'fixed-corner' || sticky;
  const preventContextMenu = (e: ReactMouseEvent) => {
    e.preventDefault();
  };

  const style: CSSProperties = {
    ...baseShellStyle(tier, interactive),
    left: `${placement.x}px`,
    top: `${placement.y}px`,
  };

  return (
    <div
      ref={rootRef}
      data-testid="tooltip-shell"
      data-hud-id={id}
      data-position={position}
      data-tier={tier}
      data-sticky={sticky ? 'true' : 'false'}
      data-rendered="true"
      role={tier === 'detailed' ? 'tooltip' : undefined}
      aria-hidden={tier === 'compact'}
      tabIndex={interactive && position === 'fixed-corner' ? -1 : undefined}
      style={style}
      onContextMenu={preventContextMenu}
    >
      {children}
    </div>
  );
}
