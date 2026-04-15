# HUD / Overlay Rules

## The Rule

HUD and overlay elements in `packages/web/src/` — tooltips, notifications, toasts, validation feedback, hover previews, turn transitions, minimap, hint badges — are managed by a single React context (`HUDManager`), wrapped in a shared chrome component (`TooltipShell`) when the element is tooltip-shaped, styled exclusively from tokens in `packages/web/src/styles/hud-tokens.css` plus the existing `panel-tokens.css`, and positioned through a shared strategy — never via ad-hoc `position: absolute` with magic-number offsets.

Panels (explicit player-triggered surfaces that block panel-level interaction) are governed by `.claude/rules/panels.md`. This document governs everything else — the transient, cursor-driven, engine-driven overlays that float over the map.

The foundation shipped across HUD cycles a–k (M-HUD1 → M-HUD3): `HUDManager`, `TooltipShell`, `hudRegistry`, and `hud-tokens.css` all live in the tree, and every overlay catalogued by the audit has been migrated. The running registry of every HUD element currently in the tree is `.claude/workflow/design/hud-elements.md` — cross-check it whenever you add or rename one.

These rules exist because, in parallel with the panel manager audit (M31 → M33), the HUD layer had accumulated the same class of drift: three tooltip positioning strategies, two duplicate-content bugs (M37-B regression test still in place), validation feedback that stole focus from the canvas, minimap components re-implementing `user-select: none` locally, and at least four overlays with hard-coded pixel offsets that clipped at small viewports. The audit (`.claude/workflow/design/hud-ui-audit.md`) catalogued that drift; HUD cycles a–k retired it. Following the rules below keeps it from re-accumulating.

---

## What Counts as a HUD / Overlay

An overlay is any non-panel UI that appears or disappears based on game state, cursor movement, or engine events — anything absolutely positioned, transient, or responsive to canvas events rather than menu buttons.

Include:

- **Hover tooltips** — tile info, unit info, combat preview, building placement preview, adjacency hint bubbles.
- **Notifications / toasts** — save-complete messages, age-progress ticks, tech-unlocked toasts.
- **Validation feedback** — "can't do that here", "not enough gold", "requires researching X first".
- **Turn transitions** — the brief interstitial between player turns.
- **Minimap** — the map-overview viewport frame.
- **Hint badges** — urban placement scores, adjacency previews, best-tile highlights.
- **Enemy activity summary** — post-AI-turn surfaces.

Do NOT include (these are panels, governed by `.claude/rules/panels.md`):

- Anything triggered by a TopBar button or keyboard shortcut that opens a dashboard.
- Anything with a title bar and close button.
- Anything that blocks the player until resolved (age transition, crisis, victory).

**Rule of thumb:** if it has a `<PanelShell>`, it's a panel. If it's floating text attached to a cursor, a tile, or a fixed screen corner, it's an overlay.

---

## HUDManager Context

**Location:** `packages/web/src/ui/hud/HUDManager.tsx`

A single React context that owns HUD-level state and coordinated dismiss. Provider is mounted once near the top of the React tree, same nesting level as `PanelManagerProvider`.

### API

```typescript
interface HUDManagerValue {
  // Registration — overlays announce themselves when mounted so the manager
  // can coordinate dismiss, focus, and stack-cycle.
  readonly register:   (id: HUDElementId, entry: HUDEntry) => () => void;   // returns unregister
  readonly dismiss:    (id: HUDElementId) => void;
  readonly dismissAll: () => void;

  // Stack-cycle — for hover targets holding multiple entities (e.g. two units
  // + a district on one hex), the manager tracks which is being shown.
  readonly cycleIndex:      (anchorKey: string) => number;
  readonly advanceCycle:    (anchorKey: string) => void;
  readonly resetCycle:      (anchorKey: string) => void;

  // Query — other HUD elements occasionally need to know "is the tile
  // tooltip currently visible at this anchor?" (e.g. to suppress a redundant
  // hint badge).
  readonly isActive: (id: HUDElementId) => boolean;
}

const { register, dismiss, cycleIndex, advanceCycle } = useHUDManager();
```

`useHUDManager` throws if called outside `HUDManagerProvider` — same pattern as `useGame` / `usePanelManager`. Silent no-ops hide mis-wirings.

### ESC handling

ESC is delegated to the provider. It runs in **capture phase**, after `PanelManagerProvider`'s ESC handler in the registration order. Precedence:

1. If a panel is open → panel manager handles ESC and stops propagation. HUD manager never sees it.
2. If no panel is open but a sticky overlay (`sticky: true`) is visible → HUD manager dismisses that overlay and stops propagation.
3. If no panel and no sticky overlay but a stack-cycle is active → HUD manager resets the cycle index for the currently-hovered anchor.
4. Otherwise → falls through to the canvas' ESC-deselect handler.

Per-overlay ESC handlers are forbidden. One handler at the manager level, period.

### What the provider does NOT do

- Render any overlay components. Overlays are rendered by App.tsx (or the existing `GameUI`) and by canvas-adjacent components based on engine state and cursor events.
- Hold cursor position or map-hover state. That lives in canvas hooks (`useHexHover`, etc.). The manager only receives the hover target identity when an overlay decides to register.
- Decide positioning. `TooltipShell` owns that (see below).

---

## TooltipShell Component

**Location:** `packages/web/src/ui/hud/TooltipShell.tsx`

Shared chrome for tooltip-shaped overlays. Not every HUD element uses it — toasts and the minimap have their own shell patterns — but every hover tooltip, combat preview, placement hint, and validation bubble does.

### Props

```typescript
interface TooltipShellProps {
  readonly id: HUDElementId;
  readonly anchor: HexCoord | ScreenCoord;      // what the shell orbits
  readonly position: 'floating' | 'fixed-corner' | 'side';
  readonly tier: 'compact' | 'detailed';        // responds to Alt-held state
  readonly sticky?: boolean;                    // if true, does not dismiss on pointer-leave
  readonly offset?: 'auto' | 'small' | 'large'; // 'auto' picks by tile-occlusion math
  readonly children: ReactNode;
}
```

### Position strategies

| Strategy | When to use | Behavior |
|----------|-------------|----------|
| `floating` | Follows the cursor / anchor; used for quick-read tooltips. | Positioned relative to anchor, auto-offset to avoid occluding the hovered tile. Clamped to viewport. |
| `fixed-corner` | Detailed info panel that would occlude the anchor if floating (combat preview in detailed tier, multi-entity tile info). | Snaps to a fixed screen corner (default bottom-right, configurable). No arrow / connector; the anchor gets a highlight outline instead. |
| `side` | Secondary content that should stay visible while the cursor moves on the map (placement hint with adjacency preview). | Anchored to one side of the viewport, persistent while the parent interaction is active. |

The shell chooses the corner (`fixed-corner`) based on cursor quadrant; it chooses the offset (`floating`) based on the anchor's projected screen rect vs. viewport edge.

### What the shell handles for you

- Translating `anchor` (`HexCoord` or `ScreenCoord`) to a clamped screen position.
- Applying `user-select: none` and suppressing the browser context menu on the shell surface (canvas right-click for gameplay is unaffected — the shell is transparent to events outside its bounds).
- Setting `aria-hidden={tier === 'compact'}` so screen readers pick up the detailed tier but not the per-tile flicker.
- Exposing `data-hud-id={id}`, `data-hud-position={position}`, `data-hud-tier={tier}` — used by Playwright specs and visual-regression snapshots.
- Applying tokens for bg, border, padding, radius.
- Pointer-events discipline: `floating` shells are `pointer-events: none` so they do not interrupt tile hover; `fixed-corner` and `sticky` shells allow pointer events so their content can be interactive.

### What the shell does NOT do

- Decide **whether** to mount. The caller does the conditional render.
- Own the tier. `tier` is a prop driven by the Alt-held state (a hook reads the keyboard; every tooltip consumer passes the same value).
- Style the body. Children render freely inside the shell's body slot.
- Duplicate content when multiple entities are on one hex. That's a caller concern — the caller consumes `cycleIndex` from `HUDManager` and renders one entity at a time with a "1 / 3 — Tab to cycle" indicator.

### Example usage

```tsx
import { TooltipShell } from '../hud/TooltipShell';
import { useHUDManager } from '../hud/HUDManager';

export function TileTooltip({ anchor, tile }: TileTooltipProps) {
  const { cycleIndex, advanceCycle } = useHUDManager();
  const stacked = tile.units;
  const i = cycleIndex(coordToKey(anchor));
  const shownUnit = stacked[i % stacked.length];

  return (
    <TooltipShell
      id="tileTooltip"
      anchor={anchor}
      position="floating"
      tier="compact"
    >
      <div style={{ color: 'var(--panel-text-color)', fontSize: '13px' }}>
        {tile.terrain.name}
        {stacked.length > 1 && (
          <span style={{ color: 'var(--panel-muted-color)', marginLeft: 'var(--panel-padding-sm)' }}>
            ({i + 1} / {stacked.length} — Tab to cycle)
          </span>
        )}
      </div>
      {shownUnit && <UnitLine unit={shownUnit} />}
    </TooltipShell>
  );
}
```

---

## Positioning Rules

Positioning is the #1 drift vector. These are non-negotiable:

1. **No ad-hoc `absolute` positioning with magic numbers.** Every overlay goes through `TooltipShell` (tooltip-shaped) or, for toasts / minimap / turn-transition surfaces that have their own shell pattern, through the existing fixed-position helpers in `packages/web/src/ui/hud/` and `packages/web/src/ui/components/`. Inline `style={{ position: 'absolute', top: 16, right: 24 }}` is forbidden.
2. **Overlays must not cover their anchor.** For a hovered tile, the overlay either offsets far enough to keep the tile visible, or switches to `fixed-corner`. The threshold is ~30% visible-tile occlusion; `TooltipShell` computes this and auto-switches when needed.
3. **Stack-cycle support.** When the anchor has multiple entities (two units on a hex, a unit + a district), the overlay must indicate cycle-ability (`Tab to cycle`, or on-click arrows) and render through `HUDManager.cycleIndex`. Never silently show only one entity; never duplicate-render (regression test in `packages/web/src/__tests__/playwright/tooltip.spec.ts` guards the duplicate-content bug fixed in M37-B).
4. **Clamp to viewport.** Every shell clamps its final position into viewport bounds minus a small margin. No overlay may be partially or fully off-screen.
5. **Stable layout on Alt toggle.** When the tier changes from `compact` to `detailed`, the overlay's anchor stays fixed — only the body grows. The shell handles re-clamping without flicker.

---

## Game-Feel Invariants

Overlays inherit the panel layer's game-feel rules and add their own:

- **No browser text selection on the game surface.** `user-select: none` is set globally on `.game-app` by the panel layer's CSS. Overlays must not re-enable it (no `user-select: text` overrides).
- **No default right-click context menu** in canvas or overlay regions. The canvas suppresses it for gameplay right-click; overlays suppress it via `TooltipShell`.
- **ESC dismisses transient overlays** OR resets the stack-cycle index — routed through `HUDManager`.
- **Overlays never steal keyboard focus.** Hover tooltips, toasts, and validation feedback are non-interactive; `fixed-corner` detailed tooltips may be interactive but must use `tabindex="-1"` on the container to stay out of the tab order. The player's tab order is: TopBar buttons → BottomBar buttons → panel content (when open).
- **No autoscroll or viewport jumps.** When an overlay appears, the canvas camera stays put. No `scrollIntoView` calls in overlay code.
- **Cursor stays unchanged** unless the overlay is explicitly announcing a drag-select or hot-zone. Tooltips don't change the cursor.

---

## Styling

The rule mirrors panels: **tokens only, never raw hex**.

- **Chrome-adjacent surfaces** (shell bg, border, divider, typography base) → `var(--panel-*)` tokens from `panel-tokens.css` so HUD chrome matches panel chrome; the two systems share the dark-slate aesthetic.
- **HUD-specific values** (tooltip arrow color, toast fade timing, validation-red accent, stack-cycle indicator pill) → `var(--hud-*)` tokens from `hud-tokens.css`. Add new tokens here before introducing a new HUD-specific value anywhere in code.
- **Game-data display** (faction colors in a player-activity toast, yield icons in a combat preview) → existing global tokens in `packages/web/src/index.css` (`--color-gold`, `--color-surface`), same as panels.
- **Never raw hex.** Not in inline styles, not in className utilities (`bg-red-500/20`), not in lookup tables. The panel audit logged six violations; the HUD audit logged three (validation feedback's red, toast success green, turn-transition overlay opacity), all retired during HUD cycles a–k. Do not regress.

```tsx
// GOOD
<div style={{
  backgroundColor: 'var(--panel-bg)',
  border: '1px solid var(--panel-border)',
  padding: 'var(--panel-padding-sm) var(--panel-padding-md)',
  borderRadius: 'var(--panel-radius)',
  color: 'var(--panel-text-color)',
}}>
  Not enough gold.
</div>

// BAD
<div style={{ background: '#1f2937', border: '1px solid #dc2626', padding: 8 }}>
  Not enough gold.
</div>
<div className="bg-red-500/20 border-red-500 px-2 py-1">Not enough gold.</div>
```

If a value is genuinely new (e.g. a HUD-specific timing or accent), add it to `hud-tokens.css` first, then reference the variable. The rule is add-a-token, not add-a-literal.

---

## Information Hierarchy (for hover tooltips)

The tile tooltip is the most-read HUD element in the game. Its information density must be deliberate:

### Compact tier (default, always-on)

- Terrain name (Grassland, Forest, Mountain …)
- Feature (River, Woods, Marsh) inline with terrain
- Improvement if present (Farm, Mine, …)
- Resource if visible to the active player
- **Summed yields** (Food 2, Production 3, Gold 1 — one number per yield type)
- **Top entity only** on stacked hexes, with an "(1 / N — Tab to cycle)" indicator

### Detailed tier (Alt-held)

- Yield breakdown by source (Grassland +1, Farm +1, Adjacency +1)
- Full stats for the currently-cycled unit (hp, xp, promotions, movement)
- Building details (effect, maintenance, adjacencies) if anchor is a city tile
- Adjacency preview for districts (which neighbors contribute which yield)

Do not put detailed-tier info into the compact tier "to be helpful". The compact tier is optimised for glance-reading at 4-second hover cadence. The detailed tier is optimised for deliberate reading. Respect that split.

---

## Anti-Patterns

| Anti-pattern | Why it's wrong | Do this instead |
|--------------|----------------|-----------------|
| `<div style={{ position: 'absolute', top: 24, right: 16 }}>` inline on a component | Three positioning strategies in the codebase; each adjusts magic numbers independently; clips at small viewports. | Wrap in `TooltipShell` with an explicit `position` prop. |
| Raw hex or Tailwind color utilities in overlay chrome (`bg-slate-900`, `'#dc2626'`) | Drifts from the dark-slate aesthetic; blocks future theming; violates `tech-conventions.md`. | `var(--panel-*)` or `var(--hud-*)` tokens. |
| Rendering all stacked entities simultaneously, stacked visually | Occludes the tile; defeats the stacking-is-intentional design; was the M37-B duplicate-content bug. | One entity at a time via `HUDManager.cycleIndex`; "(i / N — Tab to cycle)" indicator. |
| `useEffect(() => addEventListener('keydown', escClose))` per overlay | Fights the `HUDManager` ESC handler; capture-vs-bubble order matters; produces "ESC does nothing" bugs. | `HUDManager` owns ESC in capture phase after `PanelManager`. |
| `tabIndex={0}` on a hover tooltip | Steals keyboard focus; breaks the TopBar → panel tab order; screen readers read stale content. | Tooltips are non-interactive; use `tabindex="-1"` only when the shell is `fixed-corner` and sticky. |
| `style={{ width: 420 }}` fixed pixel width on the shell | Clips at narrow viewports; ignores the tier switch (compact should be narrower than detailed). | Let `TooltipShell` size itself via `width: 'narrow' \| 'wide' \| 'full'` tokens (matches panel width vocabulary). |
| Re-implementing `user-select: none` or `onContextMenu={e => e.preventDefault()}` on every overlay | Four overlays do this locally today; one forgets it and the shell's game-feel breaks on that surface. | The shell applies both. Remove the local overrides as overlays migrate. |
| Hold overlay visibility in `useState<boolean>` and toggle from three places | Two sources of truth for "is the combat preview visible"; dismissed one way does not clear the other. | `HUDManager.register` with an engine-derived predicate; dismiss via `HUDManager.dismiss` only. |
| A tooltip that scrolls the canvas into view | Camera drift on hover is disorienting. | Overlays are read-only over whatever the player is already looking at; camera control is the player's. |

---

## Testing

### Body tests (per overlay)

Smoke tests live next to the overlay:

```
packages/web/src/ui/hud/__tests__/<OverlayName>.test.tsx
```

Wrap in a test `HUDManagerProvider` with an `initialCycleIndex` or mocked register, so the overlay renders in isolation. Verify:

- The body renders the expected content for a known state.
- The correct tier shows the correct fields (compact vs detailed).
- Stack-cycle is respected (given cycleIndex=1, entity #2 renders, not #1).

Do **not** re-test `TooltipShell` chrome. Do **not** re-test `HUDManager` ESC. Those have their own test files.

### Shell tests (once)

`TooltipShell` chrome behavior — position clamping, tier switching, cycle indicator, pointer-events discipline — is tested once in `packages/web/src/ui/hud/__tests__/TooltipShell.test.tsx`. `HUDManager` state — register/dismiss, cycle index, ESC precedence — is tested once in `HUDManager.test.tsx`.

### Cross-cutting invariants (Playwright)

The HUD has a small set of game-feel invariants that only an E2E can confirm. Covered in `packages/web/src/__tests__/playwright/hud.spec.ts`:

- Zero `pageerror` on hover over any tile in a freshly-started game.
- Tile tooltip text appears within 200ms of hover (via `.toContainText`).
- Duplicate-content regression: given two units + a city on one hex, exactly one unit name appears in the tooltip body at any time (guards the M37-B fix).
- ESC with a sticky tooltip visible dismisses the tooltip, not the canvas selection.
- `user-select` computed style on `.game-app` is `none`.

---

## References

- **Audit / migration plan:** `.claude/workflow/design/hud-ui-audit.md` — the original catalogue of HUD drift and the plan that landed `HUDManager`, `TooltipShell`, `hud-tokens.css`.
- **Running registry:** `.claude/workflow/design/hud-elements.md` — every HUD element currently in the tree, with shell mode, tier, sticky flag, and source file. Cross-checked against `hudRegistry.ts`.
- **Sibling rules:** `.claude/rules/panels.md` — the panel layer this doc mirrors. Read both; they share vocabulary and philosophy.
- **Skill (step-by-step):** `.claude/skills/add-hud-element/SKILL.md` — add a new tooltip, notification, or hint overlay following the canonical pattern. Invoke as `/add-hud-element`.
- **Implementation:**
  - `packages/web/src/ui/hud/HUDManager.tsx` — context + ESC
  - `packages/web/src/ui/hud/TooltipShell.tsx` — chrome for tooltip-shaped overlays
  - `packages/web/src/ui/hud/hudRegistry.ts` — id union + metadata
  - `packages/web/src/styles/hud-tokens.css` — design tokens
- **Related rules:**
  - `.claude/rules/architecture.md` — engine/renderer separation
  - `.claude/rules/tech-conventions.md` — "never hardcode colors", no DOM in engine
  - `.claude/rules/import-boundaries.md` — `canvas/` and `ui/` cannot cross-import; the HUD sits in `ui/` and reads engine state but never mutates it
