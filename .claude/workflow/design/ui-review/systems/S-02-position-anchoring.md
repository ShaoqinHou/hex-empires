---
title: S-02 — Position anchoring rules
purpose: Define the four anchor categories every UI surface belongs to, the positioning formula for each, and the viewport-responsive behavior per anchor. Eliminate ad-hoc `position: absolute` with magic numbers across the web package.
created: 2026-04-17
phase: Phase 1.5 — Layout architecture (parallel to Phase 1 Design system)
related_systems:
  - S-01 (Layer & z-index)
  - S-03 (Sizing per viewport)
  - S-05 (Map entity stacking)
  - S-06 (Occlusion & dismissal)
  - S-10 (Multi-surface interaction)
holistic_audit_refs: [H-1, H-8, H-11, H-15]
---

# S-02 — Position anchoring rules

## Purpose

The single most common shape of UI drift in hex-empires today is **each component picking its own positioning strategy**. The HUD audit (`03-group-b-hover-ui.md`, B.1) caught two surfaces rendering the same tile data in two places at the same time: a floating cursor-anchored tooltip AND a bottom-left caption. The holistic audit (H-1) caught a canvas that behaved like a minimap because it was statically sized regardless of viewport. The CityPanel screenshot (19, H-8) captured three overlays fighting for the right-hand column: the panel itself, a tile tooltip floating mid-canvas, and a "City 2 founded" toast directly below the panel.

All three symptoms trace to one root cause: **there is no shared contract for how a surface decides where to appear.** TooltipShell has good formulas (quadrant-aware offset, viewport-clamp, flip-to-opposite-diagonal), PanelShell has a right-column formula, and the minimap, yields-toggle, floating controls each wrote their own. When the four positioning strategies do not coordinate, overlays collide, occlude their anchors, or break at non-standard viewports.

This doc defines the **four anchor categories** every screen-level UI surface belongs to, the exact positioning formula for each, and the viewport-responsive behavior. It is the layout equivalent of `S-01` (z-index): S-01 picks the vertical plane (`--panel-z-*`, `--hud-z-*`), S-02 picks the 2D position on that plane. Together with S-03 (sizing), a surface rect becomes deterministic and reviewable.

The doc resolves H-1 (canvas fills viewport) and H-8 (overlays fighting for the same anchor) by forcing every new surface into one of the four categories, making collisions observable at write-time instead of at playtest-time.

---

## Scope

**In scope:**

- Every React surface rendered above the canvas: panels, tooltips, toasts, validation feedback, minimap, floating controls (yields toggle), turn-transition interstitial, placement hints, enemy activity summary.
- The canvas itself, whose sizing is downstream of which panel is open.
- TopBar and BottomBar, whose positions are trivially top and bottom but whose heights affect every other anchor available space.
- The rules for what happens when two surfaces want the same visual anchor (cursor + panel edge, e.g.).

**Out of scope:**

- In-world rendering (hex sprites, unit sprites, selection ring) — handled inside canvas, not a React anchor concern. See S-05 for stack-cycle rules when the cursor is hovering a hex with multiple entities.
- Focus / keyboard navigation between surfaces — S-08.
- Motion (how a surface arrives at its computed position) — S-07.
- Depth order on the Z axis (what covers what) — S-01.


---

## Anchoring taxonomy — the four anchor categories

Every surface has exactly one anchor category. Introducing a fifth category is a design decision that must land in this doc first. The four:

### 1. Cursor-anchored

The surface orbits the mouse cursor. Hover tooltips (tile, unit, combat preview compact tier), placement-hint badges (urban placement score), drag previews.

**Defining trait:** the surface would not exist at this position if the cursor were elsewhere. As the cursor moves, the surface moves with it (with some smoothing).

**Implementation:** `TooltipShell` with `position: floating` and `anchor.kind === screen` (the cursor coordinate) or `anchor.kind === hex` (the hovered tile resolved via projector).

### 2. Entity-anchored

The surface is pinned to a specific map entity — a hex, a unit sprite, a city sprite, a hex-cluster (e.g., the three tiles being affected by an adjacency). Combat preview in detailed tier, placement-hint badge (when attached to a specific candidate hex, not the cursor), the tile tooltip detailed tier (Alt-held) when the cursor leaves but the tooltip is pinned.

**Defining trait:** moving the camera moves the surface. Zooming the camera changes the surface screen position but not its identity. The surface persists across unrelated cursor moves.

**Implementation:** `TooltipShell` with `position: floating` + `anchor.kind === hex` + `sticky: true`. The `hexToScreen` projector is the bridge between hex coordinates and pixel position; the shell re-places on camera pan/zoom.

### 3. Screen-anchored

The surface sits at a fixed viewport position regardless of what the player is looking at. TopBar, BottomBar, toasts, turn-counter badge, turn-transition interstitial, minimap, yields toggle, press-Enter-to-end-turn hint.

**Defining trait:** the surface does not care where the camera is or where the cursor is. It answers where on the screen does this category of UI live once and for all.

**Implementation:** direct `position: fixed` through a class-based utility (not inline magic numbers) wired to the viewport class. Tokens in `panel-tokens.css` / `hud-tokens.css` supply the offsets.

### 4. Dock-anchored

The surface lives in the right-hand column reserved for panels. `PanelShell` with `priority: overlay` or `priority: info`. Optionally also a left-hand dock for unit dossier at wide+ viewports.

**Defining trait:** a dedicated column of the viewport is allocated to this surface. The canvas shrinks to make room. At narrower viewports the dock overlays the canvas; at wider viewports it pushes the canvas; at ultra-wide viewports two docks can be co-visible.

**Implementation:** `PanelShell` with `priority: overlay` or `info`. The shell sets top / right / bottom / width, and the canvas-sizing hook (new in Phase 1.5) subscribes to which panel is active and shrinks the canvas width accordingly.

---

## Per-category rules

### C1. Cursor-anchored — offset, flip, clamp

**Formula (from TooltipShell today, re-stated as the rule):**

1. Resolve cursor to (cx, cy) in page coordinates.
2. Choose diagonal direction from cursor to the nearer viewport center — default opens toward the side with more room. If cx <= viewport.width/2 open right (dirX = +1); else open left (dirX = -1). Same for Y.
3. Place the shell at (cx + dirX * OFFSET, cy + dirY * OFFSET) where OFFSET = 40px (`--hud-offset-auto`, new token aliasing the existing OFFSET_AUTO_PX).
4. If the placed rect overflows the viewport margin (8px, `--hud-viewport-margin`), **flip** to the opposite diagonal.
5. If still overflows, **clamp** to [margin, viewport − shell − margin] per axis.

**Offset variants:**

| Token | Value | Use |
|---|---|---|
| `--hud-offset-small` | 24px | Inline-compact tooltips where cursor precision matters (adjacency preview while dragging a placement). |
| `--hud-offset-auto`  | 40px | **Default.** Tile hover tooltip, unit hover tooltip, validation feedback. |
| `--hud-offset-large` | 72px | Tooltips with art / wide bodies — push farther so the hovered tile stays visible. |

**Default anchor offset from the cursor glyph itself** — the cursor bounding box is ~16x16 including the shadow; the 40px base offset clears that plus a visible gap. Per P2 (diegetic first), the tile being queried remains unobscured.

**Smoothing:**
- Tooltips MUST smooth cursor-follow over 80–120ms (S-07 motion). Unsmoothed follow looks jittery on busy mouse moves. TooltipShell currently re-measures on every cursor change; add a 60ms smoothing window.

**Traps:**
- Magic-number offset (top: cy + 12) in a hover component → forbidden. Use the OFFSET token.
- Forgetting to invert for left-edge cursor → tooltip clips. Let the shell handle it; do not pre-compute.

---

### C2. Entity-anchored — project, offset-to-side, occlusion-switch

**Formula:**

1. Resolve entity to hex coord (q, r) or unit/city id.
2. Call hexToScreen(q, r) to get pixel position (ex, ey) — the top-center of the hex.
3. Default placement is C1-floating from that point, with one critical addition: the hex on-screen rect is computed and used for an **occlusion check**.
4. If the proposed tooltip rect would occlude >30% of the hex visible area (token `--hud-entity-max-occlusion = 0.30`), **switch to `position: fixed-corner`** instead of floating. The hex stays visible; the tooltip lives in the screen corner.
5. On camera pan/zoom, re-project and re-place.
6. On zoom level below `--hud-entity-zoom-min` (the zoom where hexes are too small to reliably anchor to), fall back to cursor-anchoring for the duration of that camera state.

**The 30% occlusion rule:** This is the existing ui-overlays.md contract, spelled out here with a number. TooltipShell owns the switch — callers pass `position: floating` and the shell upgrades to `fixed-corner` internally when the anchor is entity-kind and the occlusion check fails.

**Sticky behavior:**
- Entity-anchored surfaces are typically sticky=true (detailed combat preview, pinned tile tooltip). They persist across cursor moves and dismiss via ESC, a second click, or when the entity leaves the map.

**Traps:**
- Using cursor position as a proxy for entity position while the camera is moving → the surface drifts off the entity. Always re-project from (q, r).
- Using screen-center as the anchor for a city tooltip → cities can be anywhere on the map. Use the city hex.
- Not handling the entity-off-camera case (projector returns null) → the surface renders at (0, 0). Fall back to fixed-corner in this case and show an on-screen arrow toward the off-camera direction.

---

### C3. Screen-anchored — fixed edges, viewport-class-aware

Each screen-anchored surface has a **named corner / edge** and its own token for offset from that edge. Positions are expressed via utility CSS classes (not inline styles), so changing a viewport class is a single rule swap.

**Canonical screen anchors and their tokens:**

| Surface | Anchor | Token(s) |
|---|---|---|
| TopBar | top edge, full width | `--chrome-topbar-height` (48px), `--chrome-topbar-top` (0) |
| BottomBar | bottom edge, full width | `--chrome-bottombar-height` (56px at standard, 64 wide, 72 ultra), `--chrome-bottombar-bottom` (0) |
| Minimap | bottom-right, above BottomBar | `--hud-minimap-bottom` (calc: bottombar-height + 12px), `--hud-minimap-right` (12px) |
| Yields toggle + map controls | bottom-right, above minimap | `--hud-floating-control-bottom` (calc: minimap-bottom + minimap-height + 8px), `--hud-floating-control-right` (12px) |
| Toasts (notifications) | bottom-right at standard; bottom-right at wide; right-dock-column at ultra when dock open | `--hud-toast-*` (see table below) |
| Validation feedback | above the cursor hex, or screen-center-bottom as fallback | `--hud-validation-*` |
| Turn-transition interstitial | screen-center, full viewport | `--hud-turn-transition-*` |
| Turn counter + era banner | top-left, inside TopBar zone | — (internal to TopBar) |
| End Turn button | top-right, inside TopBar zone | — (internal to TopBar) |

**Toast positioning by viewport class:**

| Viewport class | Toast origin | Stack direction | Width |
|---|---|---|---|
| standard (1367-1919) | bottom-right (right 12px, bottom 72px — above BottomBar) | stack upward | 360px |
| wide (1920-2559) | bottom-right (right 12px, bottom 80px) | stack upward | 400px |
| ultra (2560+) | **bottom-right, inside the right dock column** when a dock panel is open; bottom-right of canvas when none | stack upward | 400px |

Notes:
- Narrow was dropped per _loop-state.md decision 7. No narrow-specific rule needed.
- At ultra when the dock is open, toasts shift into the dock column so they do not compete with the open panel for screen-right space. They still float above the panel content visually — z-index hierarchy is panel < toast (S-01).

**Minimap sizing per viewport class** (anchoring only — full sizing in S-03):

| Class | Minimap size | Bottom offset |
|---|---|---|
| standard | 200x140 | bottombar + 12px |
| wide | 280x200 | bottombar + 12px |
| ultra | 360x240 | bottombar + 16px |

**Traps:**
- Hard-coded `bottom: 14rem` on YieldsToggle (see `hud-tokens.css` line 158) → remove, replace with the computed-offset token chain. The current 14rem is a hack to clear BottomBar + minimap; a computed chain `calc(var(--chrome-bottombar-height) + var(--hud-minimap-height) + 28px)` adapts automatically when BottomBar height changes per class.
- Duplicate absolute rules at component level (`bottom: 12px` in 4 files) → extract to the token table above.

---

### C4. Dock-anchored — overlay, push, or co-visible

Panels with `priority: overlay` or `priority: info` occupy the **right dock column**. The dock behavior changes dramatically per viewport class per P12.

**Dock behavior per viewport class:**

| Class | Dock mode | Panel width | Canvas behavior | Multiple panels? |
|---|---|---|---|---|
| standard | **overlay** — dock floats above canvas, canvas keeps full width; panel has drop-shadow | 440px (overlay), 320px (info) | canvas 100% width; panel occludes right 440px | One panel at a time |
| wide | **push** — dock pushes canvas left; canvas shrinks | 480px (overlay), 360px (info) | canvas `viewport − 480px − margins` | One overlay + concurrently-open info (event log) — co-visible |
| ultra | **co-visible** — TWO panels can dock simultaneously (e.g., CityPanel + EventLog) | 520px x 2 + gap (overlay + info), or 440 + 440 for two overlays | canvas `viewport − 1080px` (when two docked); still >=1200px canvas remains | Up to 2 non-modal panels |

**Dock geometry tokens** (land in `panel-tokens.css`):

```
--dock-right-width-standard: 440px;
--dock-right-width-wide: 480px;
--dock-right-width-ultra: 520px;
--dock-right-width-info-standard: 320px;
--dock-right-width-info-wide: 360px;
--dock-right-width-info-ultra: 440px;
--dock-right-top: calc(var(--chrome-topbar-height) + 8px);
--dock-right-bottom: calc(var(--chrome-bottombar-height) + 8px);
--dock-right-gutter: 12px;  /* gap between two co-visible panels at ultra */
```

**Mode selection:**

The viewport-class hook (new in Phase 1.5, exposed as `useViewportClass()`) returns `standard | wide | ultra`. A companion hook `useDockMode()` translates this into `overlay | push | co-visible` and the dock-width tokens. PanelShell containerStyle reads from the hook and sets `right: var(--dock-right-*)` + width.

**Canvas subscribes to the dock:**

The canvas hook `useCanvasBounds()` subscribes to (a) the viewport class, (b) which panels are active via `usePanelManager().activePanel`, and (c) the dock mode. It returns `{ width, height, offsetLeft }` for the canvas. In overlay mode offsetLeft = 0 and width = full; in push mode offsetLeft = 0 but width = `viewport − dock-width`; in ultra co-visible, the canvas floats centered between the docks if two exist.

**Modal panels are NOT dock-anchored:**

`priority: modal` panels (age transition, turn summary, crisis, victory) are centered screen-anchored at every viewport class. They earn their interruption (P9) and take the full center with a backdrop. The dock is unrelated to them.

**Traps:**
- CityPanel currently renders at a fixed `right: 8px, top: 56px, bottom: 64px` regardless of viewport (see `PanelShell.tsx:94-100`). This works at standard but wastes space at wide+ and forces the canvas to render underneath at ultra. Fix is the per-class dock table above.
- Make the dock always overlay because push mode breaks canvas rendering → regression. The canvas hook must properly handle width change; the fix is in the hook, not in defaulting to overlay.

---

## Collision avoidance — priority table

When two surfaces want the same anchor point, priority resolves which one displays and which one moves / suppresses / defers. Priority is declarative via the `anchor-priority` token on each surface.

**Collision priority, highest wins:**

| Rank | Surface | Rationale |
|---|---|---|
| 1 | Modal panel | Blocks the game; everything else suppresses. |
| 2 | Dock-anchored panel (overlay priority) | Player explicitly opened this. |
| 3 | Dock-anchored panel (info priority) | Player explicitly opened this. |
| 4 | Entity-anchored sticky tooltip | Player pinned it. |
| 5 | Screen-anchored validation feedback | Short-lived, user-initiated (failed action). |
| 6 | Cursor-anchored tooltip (detailed tier) | Player is actively interrogating with Alt held. |
| 7 | Cursor-anchored tooltip (compact tier) | Default hover. |
| 8 | Screen-anchored toast (non-critical) | Ephemeral info. |
| 9 | Screen-anchored floating controls (minimap, yields) | Persistent but low-attention. |

**Resolution rules per collision:**

- **Modal open + cursor tooltip trying to render:** tooltip suppressed entirely. `HUDManager.isActive(tooltipId)` returns false while any modal is open (checked via the `data-panel-id` + `data-panel-priority=modal` DOM attribute).
- **Dock panel open + cursor tooltip trying to render inside the dock screen area:** tooltip renders at the opposite side (flip rule in C1). If that would still overlap, the tooltip switches to fixed-corner in the opposite corner.
- **Dock panel open + tile tooltip redundant to panel content:** suppressed. Example: CityPanel open + cursor on that city hex → tile tooltip does not render (the panel already shows everything the tooltip would). This is the H-8 fix. Implementation: the tile tooltip checks `if (panelManager.isOpen(city) && state.selectedCityId === hoveredHex.cityId) return null`.
- **Toast wants bottom-right, dock panel occupies bottom-right at standard:** toast shifts to bottom-center at standard when a dock panel is open (override of the per-class rule).
- **Two cursor-anchored tooltips** (shouldn't happen, but paranoia): HUDManager rejects the second registration and the second call returns the first entry.

**Decision latency:**

Collision resolution runs at register-time (synchronous) and on every dock-state change. No wait-for-next-frame — the provider dispatches immediately so a newly-opened panel immediately hides a conflicting tooltip.

---

## Viewport responsiveness — the 8 locked decisions, concretized

Per `_loop-state.md` decisions 6 (desktop only), 7 (standard/wide/ultra), 8 (ultra shows more info, not same info bigger):

- **Standard (1367–1919px):** dock = overlay, one panel at a time, minimap 200x140, toasts bottom-right, canvas 100% width with panel overlaying.
- **Wide (1920–2559px):** dock = push, canvas shrinks when a panel opens, minimap 280x200, toasts bottom-right, info panel (event log) can stay open alongside one overlay panel.
- **Ultra (2560+):** dock = co-visible, two non-modal panels allowed, minimap 360x240 with surrounding info readouts, toasts shift into right dock column when dock is occupied.

**Breakpoint behavior:**

Resize crossing a boundary re-computes every anchor. Panels currently open remain open (same id), but may re-dock if the class changed. Tooltips in flight may re-anchor. Toasts in flight re-position to the new class target corner. Minimap resizes immediately. Canvas re-fits.

**Breakpoint tokens** (new in Phase 1.5, `layout-tokens.css`):

```
--breakpoint-standard: 1367px;
--breakpoint-wide: 1920px;
--breakpoint-ultra: 2560px;
```

Read only by the `useViewportClass` hook — not referenced elsewhere. Other surfaces read the class, not the breakpoints.

---

## Examples — resolving the real-world issues

### Example 1: Screenshot 19 mess (H-8)

**Observed:** CityPanel opens when a city is clicked; simultaneously, the tile tooltip shows Grassland + Forest; simultaneously, a City 2 founded at (-3, 6) toast renders in the bottom-right.

**Anchoring diagnosis:**
- CityPanel: dock-anchored (priority 2).
- Tile tooltip: cursor-anchored (priority 7).
- Toast: screen-anchored (priority 8).

**Resolution per the priority table:**
1. The dock panel suppresses the tile tooltip when the cursor is over the panel own subject city (H-8 specific fix). Tooltip does not render.
2. The toast checks for is the relevant panel already open — yes, CityPanel is open on City 2. Toast auto-dismisses on panel-open instead of adding noise. (This is a S-10 rule, cross-reference.)
3. CityPanel alone is visible.

At standard, CityPanel is overlay-mode, occupies right 440px. At ultra, it is co-visible with the event log (if the player had it open).

### Example 2: Yields toggle hard-coded bottom 14rem

**Observed:** `hud-tokens.css` line 158 defines `--hud-floating-control-offset-bottom: 14rem` as a hack to clear the BottomBar and minimap.

**Anchoring diagnosis:** screen-anchored floating control, category C3.

**Resolution per the token chain:**
Replace 14rem with:
```
--hud-floating-control-bottom: calc(
  var(--chrome-bottombar-height) +
  var(--hud-minimap-height) +
  28px
);
```
- At standard: 56 + 140 + 28 = 224px ≈ 14rem (matches).
- At wide: 64 + 200 + 28 = 292px.
- At ultra: 72 + 240 + 28 = 340px.
The yields toggle now self-adjusts when BottomBar or minimap change size. No more magic-number drift.

### Example 3: Canvas at 720x340 regardless of viewport (H-1, H-15)

**Observed:** at 1440x900 the canvas renders at 720x340 — half the viewport. Reads as a mini-map next to a huge black void.

**Anchoring diagnosis:** the canvas IS a sized surface, but its sizing was decoupled from the viewport and from which panels are open. Effectively uncategorized.

**Resolution:** canvas becomes C3 screen-anchored to the region (TopBar bottom) → (BottomBar top) horizontally (0) → (viewport.width − dock-width-if-dock-mode-push). Concretely, `useCanvasBounds()` returns `{ width, height }` based on viewport class + active panels + dock mode. The `GameCanvas` component subscribes via hook and renders `<canvas width={bounds.width} height={bounds.height} />`.

Fixes H-1 (canvas fills viewport) and H-15 (canvas adapts to viewport) in one anchoring decision.

---

## Interaction with other systems

- **S-01 (Layer & z-index):** S-02 picks X/Y; S-01 picks Z. The collision-priority table in S-02 mirrors the z-tier order in S-01, but they are distinct concerns — a high-priority surface (dock panel) and a low-priority surface (toast) can coexist on-screen as long as their X/Y do not collide; if they do, the priority table resolves.
- **S-03 (Sizing per viewport):** S-02 gives the anchor; S-03 gives the size. Together they specify the rect. Some sizing rules (minimap dimensions per class, panel width per class) are referenced here for context but owned by S-03.
- **S-05 (Map entity stacking):** when an entity anchor resolves to a hex with multiple entities (scout + troop + building), the anchor itself is the same but the content cycles. S-05 defines the cycle indicator (1 / 3 — Tab to cycle) and the Tab interaction; S-02 just guarantees the anchor is stable across the cycle.
- **S-06 (Occlusion & dismissal):** the auto-switch to fixed-corner if >30% occlusion rule is shared. S-02 defines where the surface is; S-06 defines when it should be dismissed or switched.
- **S-07 (Motion):** the 80-120ms cursor-follow smoothing is motion detail. S-02 requires smoothing exists; S-07 specifies the curve.
- **S-10 (Multi-surface interaction):** the collision priority table is duplicated here for local clarity, but S-10 is the authoritative source. Example: when CityPanel opens, the tile tooltip for that city hex suppresses is a coordination rule defined in S-10 that S-02 references.

---

## Implementation phase

**Phase 1.5 — Layout architecture** (parallel to Phase 1 Design system, per master plan).

Phase 1.5 deliverables related to S-02:

1. `useViewportClass()` hook — reads `window.innerWidth`, returns `standard | wide | ultra`, re-runs on resize.
2. `useDockMode()` hook — translates viewport class + active panel into `overlay | push | co-visible` and dock-width token.
3. `useCanvasBounds()` hook — returns the canvas rect based on viewport class + dock mode + active panels.
4. `layout-tokens.css` — breakpoint constants, chrome heights per class, dock widths per class, minimap dimensions per class, toast anchors per class. Referenced by `panel-tokens.css` and `hud-tokens.css` for the derived values.
5. Refactor of `PanelShell` containerStyle — replace hard-coded 8px / 56px / 64px with tokens.
6. Refactor of `TooltipShell` OFFSET_AUTO_PX / SMALL / LARGE constants → `--hud-offset-*` tokens.
7. Removal of `--hud-floating-control-offset-bottom: 14rem` — replaced with the computed chain.
8. New Playwright specs at 1440x900, 1920x1080, 2560x1440 verifying: canvas fills viewport, panel width matches class, toasts anchor correctly, no raw magic-pixel overrides remain.
9. A lint check (token-conformance test) that fails if any component ships with inline top / right / bottom / left N px without referencing a token.

Effort: ~1 week for one dev, parallel to the design-system work in Phase 1. Phase 2+ surface redesigns build on this foundation; without it, every surface would need a retrofit.

---

## Open questions

1. **Co-visible at ultra: which two panels?** The table says up to 2 non-modal panels simultaneously. At ultra (say 3840px wide) there is room for TWO dock panels, but the UX of CityPanel on the right + EventLog on the far right is uncertain. Recommend: info panels (EventLog) dock at the rightmost slot; overlay panels dock inward of them. This maps to the current priority scheme (info at 90, overlay at 110) and keeps the event log always-most-peripheral.

2. **Ultra with multiple monitor setups.** A 3840-wide viewport spanning two 1920 monitors has the panel centered on the seam. Rare enough to defer but worth considering. Recommend: detect `screen.availWidth / window.screen.width` ratio, cap dock column at `screen.width − chrome` per physical monitor.

3. **Tooltip re-anchor on camera pan:** when the camera pans (WASD), the entity-anchored tooltip should re-project. But should the cursor-anchored compact tooltip also re-render for the hex under the cursor new screen position? If it is the same hex, yes; if pan moved the cursor over a different hex, yes (new hover event). Recommend: the cursor-anchored tooltip always renders from the current cursor-over-hex, regardless of how the camera moved. This falls out naturally if hover events fire on camera moves.

4. **Dock push-mode animation:** when a panel opens in push mode, does the canvas resize with an animation (200-300ms ease) or snap? Visually, snapping is jarring; animating is a potential perf concern on slower machines. Recommend: animate with CSS `transition: width 200ms ease-out` on the canvas container, but skip the animation if the panel switch is within the same viewport class (user already rendering at that size).

5. **Validation feedback position:** proposed above the cursor hex but implementation today lives center-bottom. Which is canonical going forward? The validation-feedback overlay today dispatches based on cursor coord, which argues for cursor-anchored (C1). But validation errors are category-3-ish (screen-anchored) in that they are more like toasts than tooltips. Recommend: cursor-anchored for action-target errors (can't move here); screen-anchored for global errors (not enough gold). Decision to finalize when V5 goes through its own redesign cycle.

6. **Left dock for unit dossier at wide+?** The BottomBar audit (A.2) proposed a unit dossier that lives in BottomBar. At wide+ there is argument for a persistent left sidebar showing the last N selected units. Whether that is a second dock category (C4 with left variant) or still just a wider BottomBar is undecided. Recommend: not a new category — treat as BottomBar variant. Revisit if the left-sidebar pattern grows more features.

7. **Placement-hint badge anchor:** today `UrbanPlacementHintBadge` is entity-anchored (to a candidate hex). But the cursor IS over that hex, so it could also be cursor-anchored. Difference shows up when the cursor moves within the hex — does the badge twitch with sub-pixel cursor moves, or stay fixed to the hex center? Recommend: entity-anchored (C2), hex-center projection, so the badge reads as part of the tile rather than a cursor follower.

Resolution of these open questions should land as amendments to this doc, not as freshly-written systems code.
