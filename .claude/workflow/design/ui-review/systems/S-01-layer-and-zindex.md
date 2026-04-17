---
title: S-01 — Layer & z-index system
purpose: A single z-axis for every pixel in the web package. Replaces the parallel `--panel-z-*` / `--hud-z-*` fragmentation with one authored layer scale so overlay conflicts become impossible, not tolerated.
scope: Every positioned element in packages/web (chrome, panels, HUD overlays, tooltips, toasts, modals, canvas, minimap, system dialogs, drag previews, transient animations)
created: 2026-04-17
phase: 1.1 — design-token expansion (foundations, parallels the layout architecture in Phase 1.5)
supersedes: --panel-z-info, --panel-z-chrome, --panel-z-overlay, --panel-z-modal, --hud-z-minimap, --hud-z-fixed-corner, --hud-z-toast, --hud-z-tooltip, --hud-z-floating-control
---

# S-01 — Layer and z-index system

## Purpose

Z-index in hex-empires grew in two independent passes. `panel-tokens.css` landed first and chose a tight 90-210 range with four slots; `hud-tokens.css` arrived later and inserted its own tiers **between and around** the panel slots — `--hud-z-fixed-corner: 120`, `--hud-z-toast: 140`, `--hud-z-tooltip: 150`, plus a floating-control value that re-uses `110` (the same plane as `--panel-z-overlay`). The two systems coexist only because their authors negotiated numeric values by hand, leaving comments like "HUD tiers layer around and above those" inside the HUD tokens sheet. That coordination is a liability — every new overlay re-opens the same negotiation, and any surface that forgets to reach for a token (Civ/Tech tree panels still carry `style={{ zIndex: 0 }}`; old CombatHoverPreview had a `1000`) silently breaks the ordering.

Holistic audit H-8 is the visible symptom: click a city hex on Antiquity turn 2 and three overlays render at the same anchor simultaneously — the CityPanel (overlay, z-110), a tile tooltip (HUD tooltip, z-150), and a `City 2 founded` toast (HUD toast, z-140). The tooltip is numerically **above** the panel, so it floats over the CityPanel's body chrome; the toast sits below the tooltip but above the panel; the panel at z-110 loses its information hierarchy because the HUD layer paints on top of it. The fragmentation also leaks a subtler bug the audit caught (H-2): the chrome layer (TopBar/BottomBar, z-100) sits *below* panel overlays (z-110), so an open panel can visually cover the TopBar in viewports where the panel's top edge extends above 56px — a minor issue today, a serious issue when the panel system becomes docking-aware at wide/ultra viewports.

One authored layer scale fixes all three: no negotiation, no hand-written numeric comments, no possibility of a HUD tier accidentally landing between two panel tiers. The scale lives in one sheet, all existing token names become aliases pointing into that scale, and every new positioned element picks a layer by **semantic role**, not by guessing a number.

## Scope

**In scope:**
- Every positioned element in `packages/web/src/`: chrome bars, panels, HUD overlays, tooltips, toasts, modals, canvas layers (hex grid, overlays, drag previews), minimap, validation feedback, turn-transition wash, system dialogs (save/load), stack-cycle indicators, focus rings, debug overlays.
- The z-index value for every `position: fixed` / `position: absolute` / `position: sticky` element in the web tree.
- The numeric scheme, the token names, the aliasing strategy from the current panel/HUD tokens.
- Click-through rules (which layers allow pointer events to reach lower layers).

**Out of scope:**
- Z-index *within* a single component tree (nested elements that use `z-index` relative to their own stacking context, e.g. the `zIndex: 0` on tech-tree lines inside the `TechTreePanel` body — that's intra-panel, handled by the panel's own CSS).
- DOM order / stacking contexts as a mechanism — `isolation: isolate` or `transform: translateZ(0)` create new stacking contexts but are not primary positioning mechanics; this doc focuses on layers in the app's single document-level stacking context.
- Canvas-internal draw order. The hex grid, unit sprites, overlay sprites all render into one `<canvas>` and their z-ordering is controlled by draw sequence in the renderer, not CSS. Canvas itself appears at **one** layer in this scale.
- Engine state. Z-order here is presentation, not game data.

## Current state

### Token sets that exist today

`packages/web/src/styles/panel-tokens.css`:
- `--panel-z-info: 90` — EventLog panel, Minimap (via `--hud-z-minimap: 90` alias), below TopBar dropdowns
- `--panel-z-chrome: 100` — TopBar / BottomBar
- `--panel-z-overlay: 110` — every non-modal panel (City, Tech, Civics, Diplomacy, Governor, Government, Religion, Commanders, Help, VictoryProgress, Log)
- `--panel-z-modal: 210` — AgeTransition, Crisis, Victory, TurnSummary

`packages/web/src/styles/hud-tokens.css`:
- `--hud-z-floating-control: 110` — YieldsToggle (same plane as panel overlays, deliberately; the comment notes "floating controls must not layer above open panels")
- `--hud-z-minimap: 90` — re-exported to panel sheet
- `--hud-z-fixed-corner: 120` — ValidationFeedback, CombatPreviewPanel, EnemyActivitySummary, urban placement hint badge
- `--hud-z-toast: 140` — Notifications
- `--hud-z-tooltip: 150` — TileTooltip, UnitInfoTooltip, CombatHoverPreview, TurnTransition interstitial

### What works

The **six semantic tiers** the current tokens encode are broadly right: info < chrome < overlay/controls < fixed-corner-HUD < toast < tooltip < modal. Surface categories map cleanly to them. The problem is not the set of tiers but the numeric spacing (too tight — gaps of 10 or less between neighbours), the naming (split across two sheets with overlapping purposes), and the absence of headroom for layers this design didn't anticipate (a drag preview, a loading spinner, a debug overlay, a force-quit dialog).

### What's uncontrolled

- **Raw `zIndex: 0` siblings.** `TechTreePanel.tsx:405` and `CivicTreePanel.tsx:411` set `zIndex: 0` on internal SVG elements without going through any token. These are intra-panel and harmless today, but the pattern (reach for a literal) is the same one that produced the audit-flagged `zIndex: 1000` on `CombatHoverPreview` before it was migrated.
- **The canvas itself.** `GameCanvas.tsx` renders the `<canvas>` element with no explicit z-index; it picks up `z-index: auto` and establishes the baseline (layer 0) by document order. That's lucky coincidence, not policy. A future canvas wrapper with an inline `zIndex: 1` would silently float above everything at layer 0 in the new scheme.
- **Drag previews, file-picker dialogs, error boundaries.** None of these have dedicated tokens. When they land they either borrow inappropriate tokens (the save toast on `TopBar.tsx:153` sits at chrome-level, which is below open panels — you can't see confirmation while the save was triggered from a panel) or pick a literal.
- **Focus ring overlays.** Keyboard-focused interactive elements draw outlines via the browser's default `:focus` styles and nested `z-index: auto`. When the app introduces a custom focus ring (see S-08) it will need its own layer, consistently above the content of whatever surface it belongs to.

## The layer system

### Design rules

1. **One scale, one sheet.** The definitive scale lives in `packages/web/src/styles/layer-tokens.css` (new). `panel-tokens.css` and `hud-tokens.css` re-export their existing token names as aliases so no consumer breaks. Once cycle 1 migration completes the aliases can be deprecated.
2. **Decimal / decade numbering.** Layers are multiples of 10 (`0, 10, 20, 30, …`). Any value between two sanctioned layers is reserved for future use. A contributor who wants to slot an overlay *between* tooltip (60) and modal (70) adds layer 65 in the scale sheet — not inline.
3. **Semantic names first, numeric values second.** Call sites never reach for `var(--z-40)`. They reach for `var(--z-overlay-panel)`. The numeric value is an implementation detail of the sheet.
4. **Drama beats data.** When two layers are conceptually adjacent, the one with more narrative weight sits higher. Modal moments (age transition, victory, crisis) above informational tooltips. Critical dialogs (unsaved-changes, error boundary, connection-lost) above modal moments. "Critical" here means *you cannot ignore this without data loss*, not *this is important*.
5. **Every layer has a pointer-events policy.** Layers above the map can either block pointer events (open panels, modals) or pass them through (tooltips, toasts, the yield overlay). The policy lives next to the layer definition; call sites don't improvise.

### The scale (bottom → top)

| Layer | Token name | Semantic role | Pointer-events | Example consumers |
|------:|------------|---------------|----------------|-------------------|
|  **0** | `--z-map`                     | The map canvas — the game itself.                                              | yes (canvas handles all gameplay clicks) | `GameCanvas` `<canvas>` |
| **10** | `--z-map-overlay`             | Canvas-sibling overlays the renderer doesn't own: tile-yield badges drawn as DOM, adjacency guide arrows, selection glow CSS elements, grid toggle lines if rendered via DOM rather than canvas. | yes (transparent; overlay content is decorative or receives specific hitboxes) | future yield-overlay DOM layer, future tile-coord debug stamp |
| **20** | `--z-map-control`             | Persistent map-scoped controls that dock near the canvas without being chrome: yield toggle, grid toggle, zoom buttons, rotate/reset-view buttons, compass. Together they form the map-controls cluster proposed in A.5. | yes on controls, ignored on gaps (controls are small) | `YieldsToggle`, future `MapControlCluster` |
| **30** | `--z-chrome-bar`              | TopBar and BottomBar. The frame around the map.                                | yes (buttons, resource chips, stat chips) | `TopBar`, `BottomBar` |
| **40** | `--z-panel-info`              | Docked informational panels that do not steal focus: EventLog, future persistent Unit-dossier sidebar (wide+ viewports), future permanent Minimap frame. Sits above TopBar **content** but is visually a peer — the chrome bar still wins where they overlap. | yes | `EventLog`, future docked sidebars |
| **45** | `--z-minimap`                 | The minimap chip.                                                              | yes (click-teleport, drag-pan) | `Minimap` |
| **50** | `--z-panel-overlay`           | Every right-anchored overlay panel: City, Tech, Civics, Diplomacy, Governor, Government, Religion, Commanders, Help, VictoryProgress. | yes (blocks clicks within its rect so chrome underneath stays inert) | `PanelShell` with `priority: 'overlay'` |
| **55** | `--z-panel-float-control`     | Floating controls that legitimately overlay open panels (the rare case): a map-controls cluster the player can still reach while a panel is open, e.g. zoom in/out while reading CityPanel details. | yes on controls | future `QuickActionPalette` if it needs to stay visible over panels |
| **60** | `--z-hud-fixed-corner`        | Fixed-corner HUD surfaces that appear while panels are open and the player is still interacting with the map: ValidationFeedback ("not enough gold"), CombatPreviewPanel (detailed tier anchored to a canvas corner), EnemyActivitySummary, placement hint badge. These surfaces are *response* overlays — the player just did something and the game is responding. They out-rank open panels because the response is more immediate than the panel the response refers to. | conditional — see click-through rules | `ValidationFeedback`, `CombatPreviewPanel`, `EnemyActivitySummary`, placement hint |
| **65** | `--z-hud-toast`               | Notifications: "City 2 founded", "Tech researched", "Age advancing", save complete. Short-lived and ignorable. | no — toasts do NOT block pointer events; see rules. Their close button is a pointer-events exception. | `Notifications`, save-confirmation toast, future achievement unlock toast |
| **70** | `--z-hud-tooltip`             | Cursor-anchored and fixed-corner tooltips: TileTooltip, UnitInfoTooltip, CombatHoverPreview. Always above toasts and panels — a tooltip describes what the cursor is on, and the player's cursor is the most immediate anchor in the UI. | no (floating, pointer-events: none) | `TooltipShell` with `position: 'floating'` |
| **80** | `--z-modal`                   | Modal panels: AgeTransition, Crisis, Victory, TurnSummary. The narrative moments the game actively forces on the player. | yes (with backdrop) — see click-through rules | `PanelShell` with `priority: 'modal'`, future `DramaModal` wrapper |
| **85** | `--z-modal-affordance`        | Overlays that need to sit on top of a modal: a tooltip inside an AgeTransition panel describing a civ's bonus, a toast spawned during a modal moment ("Autosaved"), a validation feedback from within a modal form. Same pointer-events policy as their parent tier (tooltip = pass-through, toast = pass-through, validation = conditional). | varies | future hover-card inside a modal body |
| **90** | `--z-transition`              | Full-screen transition overlays that temporarily mask the UI: the turn-transition interstitial, fade-to-black on autosave replay, era-advancing cinematic wipe. Outlive modals because a transition can begin on top of an open modal (rare but legal). | no — transition is visual only; clicks pass through to whatever is beneath once the transition fades | `TurnTransition`, future era-wipe animation |
| **95** | `--z-drag-preview`            | Drag previews: the ghost image while the player drags a unit card, a tech node, or (future) a production queue item. Sits above everything except system-critical because the drag is literally attached to the cursor. | no (preview is visual; the cursor owns input) | future drag-and-drop system |
|**100** | `--z-system-critical`         | Dialogs the game cannot hide: unsaved-changes confirm, connection-lost, error-boundary fallback, force-quit-turn warning. The player must address these before the game continues. Never spawned by gameplay alone. | yes (captures all input; no bypass) | future `SystemDialog`, future `ErrorBoundary` fallback |

### Why the specific ordering

Three design choices deserve calling out:

**Tooltip above toast above panel.** Toasts (65) sit *above* overlay panels (50) because a notification like "City founded" is the game's acknowledgment of an action the player just took — burying it behind a panel the player opened 0.5 seconds later would lose the feedback loop (audit H-8). Tooltips (70) sit *above* toasts because the cursor is the most immediate anchor in the interface; if the player is hovering a hex while a toast fades, the hex info is what they're looking at *now* and the toast is what happened *then*.

**Fixed-corner HUD (60) above overlay panel (50).** When an open CityPanel triggers a ValidationFeedback ("not enough gold"), the feedback belongs on top of the panel — otherwise the player can't see the response to the action they just tried. This inverts the audit's initial intuition that panels should be the "frontmost" surface; in fact panels are furniture and HUD surfaces are live responses.

**Modal (80) above tooltip (70) but modal-affordance (85) above modal.** Modal panels are dramatic moments and out-rank everything informational. But once the player is *inside* a modal, they still need hover tooltips on the modal's own content (hovering a civ in AgeTransition to see its bonuses). Those tooltips sit at 85 — above the modal body, but still bound to the modal's lifetime (they unmount when the modal closes).

## Token set

The full contents of `packages/web/src/styles/layer-tokens.css` (new):

```css
/*
 * layer-tokens.css — the canonical z-axis for every positioned element
 * in packages/web. Referenced by panel-tokens.css and hud-tokens.css as
 * aliases; those sheets re-export the names individual components use
 * today.
 *
 * Numeric values use a decade scheme (0, 10, 20, ...). Any intermediate
 * value (15, 25, 55) is reserved; when a new layer is needed, insert
 * here, not at the call site. See .claude/workflow/design/ui-review/
 * systems/S-01-layer-and-zindex.md for rationale.
 */

:root {
  /* Map + map-scoped chrome */
  --z-map:                 0;
  --z-map-overlay:        10;
  --z-map-control:        20;

  /* Application chrome */
  --z-chrome-bar:         30;

  /* Panels */
  --z-panel-info:         40;
  --z-minimap:            45;
  --z-panel-overlay:      50;
  --z-panel-float-control:55;

  /* HUD layer (responsive to player action) */
  --z-hud-fixed-corner:   60;
  --z-hud-toast:          65;
  --z-hud-tooltip:        70;

  /* Drama + system */
  --z-modal:              80;
  --z-modal-affordance:   85;
  --z-transition:         90;
  --z-drag-preview:       95;
  --z-system-critical:   100;
}
```

Aliases (added to `panel-tokens.css` and `hud-tokens.css`):

```css
/* panel-tokens.css — kept for source compatibility */
--panel-z-info:    var(--z-panel-info);     /* was 90  -> 40 */
--panel-z-chrome:  var(--z-chrome-bar);     /* was 100 -> 30 */
--panel-z-overlay: var(--z-panel-overlay);  /* was 110 -> 50 */
--panel-z-modal:   var(--z-modal);          /* was 210 -> 80 */

/* hud-tokens.css — kept for source compatibility */
--hud-z-minimap:          var(--z-minimap);              /* was 90  -> 45 */
--hud-z-floating-control: var(--z-panel-float-control);  /* was 110 -> 55 */
--hud-z-fixed-corner:     var(--z-hud-fixed-corner);     /* was 120 -> 60 */
--hud-z-toast:            var(--z-hud-toast);            /* was 140 -> 65 */
--hud-z-tooltip:          var(--z-hud-tooltip);          /* was 150 -> 70 */
```

The absolute numeric values shift downward (old range 90-210 becomes new range 0-100) but **relative ordering is preserved** for every existing consumer. No component needs to change in cycle 1 of the migration — aliases carry the behavior.

## Examples

### Example 1 — resolving the city-panel + tile-tooltip + notification triple-stack (audit H-8)

**Today:** player clicks a city hex. Three surfaces render at the same anchor:

- CityPanel, `--panel-z-overlay` = 110, right-anchored column
- TileTooltip, `--hud-z-tooltip` = 150, floating near cursor
- `City 2 founded` toast, `--hud-z-toast` = 140, bottom-right corner

The tooltip sits at 150, the toast at 140, the panel at 110. The tooltip literally paints on top of the CityPanel's body chrome where they overlap. The panel, which is the most information-rich surface, is visually the *lowest*.

**Under S-01:** layer order is identical in relative terms (tooltip 70 > toast 65 > panel 50) so the literal paint order does not change. But two things become possible:

1. **Occlusion logic** (S-06) reads from the layer registry and knows that when `CityPanel` (layer 50) opens, `TileTooltip` (layer 70) should suppress itself while the cursor is inside the CityPanel's rect. The two surfaces are related by being at layers 50 and 70 — S-06 can write one rule ("tooltips suppress over any panel body") rather than case-by-case logic per panel.
2. **The toast** becomes auto-dismissing (per H-14 Rule 1) when a panel opens that describes the same entity — CityPanel describes the city the toast is announcing, so the toast fades on panel-open. Layer 65 knows it lives above layer 50 and can listen for layer-50 mount events to self-dismiss if the new panel's entity matches the toast's payload.

### Example 2 — validation feedback during an open panel

Player opens ProductionPanel (inside CityPanel, overlay, layer 50), clicks "Build Settler", gets "Not enough food" error.

**Today:** ValidationFeedback appears at `--hud-z-fixed-corner` = 120, above the panel. Correct behavior, but the layer relationship is implicit.

**Under S-01:** layer 60 above layer 50 is the explicit contract. Any future panel that hosts similar interaction inherits the contract — the panel author doesn't need to think about whether validation will be visible.

### Example 3 — modal + internal tooltip

During age transition, player hovers a civ card to see its legacy bonus.

**Today:** AgeTransitionPanel at `--panel-z-modal` = 210; a tooltip inside it would have nowhere explicit to go. In practice the current code doesn't render such tooltips — when a tooltip was needed it was left as inline text.

**Under S-01:** layer 85 (`--z-modal-affordance`) is the home for "tooltips and feedback inside an active modal". A future `LegacyBonusTooltip` slots there without coordination. When the modal dismisses, affordance layer contents unmount with it (via component tree).

### Example 4 — the save-confirmation toast

`TopBar.tsx:153` currently renders a save-complete toast using chrome-level tokens (implicitly layer 30). If the save was triggered from a panel (e.g. a future "save from menu" option), the toast appears *below* the panel that triggered it — the player closes the panel before seeing the confirmation.

**Under S-01:** the save toast moves to `--z-hud-toast` = 65. It appears above any open panel, stays visible for its 3-second fade, and the player gets feedback without closing the panel.

## Click-through rules

Every layer declares whether it blocks pointer events for the layers below it. The rule is explicit at the layer level; call sites never think about it.

| Layer | Default pointer-events | Rationale |
|------:|------------------------|-----------|
|   0 | `auto` (canvas handles everything)      | The canvas IS the game; never suppress. |
|  10 | `none` on container, `auto` on widgets   | Map-overlay decorations (yield numbers drawn as DOM) must not block tile hover. Individual widgets opt in if they need clicks. |
|  20 | `auto`                                   | Map controls are small, deliberately placed; a click on them *is* a decision not a tile interaction. |
|  30 | `auto`                                   | Chrome bars contain buttons. |
|  40 | `auto`                                   | Info panels are read-only primarily but contain toggleable entries (event-log filters). |
|  45 | `auto`                                   | Minimap wants click-teleport and drag-pan. |
|  50 | `auto`                                   | Overlay panels must capture clicks on their body. Clicks outside the panel go to chrome/canvas. |
|  55 | `auto`                                   | Float-controls handle their own clicks. |
|  60 | `auto`                                   | HUD fixed-corner surfaces are interactive (dismiss button, Tab-to-cycle). |
|  65 | **`none` on the toast body, `auto` on the close button** | Toasts must NOT block the player's click on what's beneath them. Critical: a toast that swallowed a canvas click while it was auto-fading would be the worst kind of frustration. |
|  70 | **`none`**                               | Tooltips are descriptions, never interactive. They pass every event through. |
|  80 | `auto` on shell, `auto` on backdrop (captures clicks; backdrop clicks close modal unless dismissible = false) | Modals block by definition. The backdrop is their capture surface. |
|  85 | same policy as parent tier                | A tooltip inside a modal is still pass-through; a toast inside a modal is still pass-through. |
|  90 | **`none`**                               | Transitions are visual-only — the player's input is queued, not captured. |
|  95 | **`none`**                               | Drag previews are attached to the cursor; the cursor owns input, not the preview. |
| 100 | `auto`                                   | System-critical dialogs block everything. |

### The placement-hint question

The question in the task brief: *should placement hints pass through? should tooltips pass through?*

Both pass through. A placement hint lives at layer 60 (fixed-corner, urban-placement-hint-badge) when it's a categorical feedback chip; its body is `pointer-events: none` except for any explicit dismiss control. A tooltip at layer 70 is always `pointer-events: none`. The principle: **if a surface exists to describe what the player is looking at or about to do, it must not interrupt the thing it's describing.**

The inverse: modal panels, system-critical dialogs, and the backdrop behind them all block, because their purpose is to demand the player's attention.

## Interaction with other systems

### S-06 — Occlusion & dismissal rules

S-06 depends on this layer scale to write occlusion rules in general form. Example rules S-06 will express:

- "Tooltips (layer 70) suppress while the cursor is inside any panel body (layer 50) or a modal (layer 80)."
- "Toasts (layer 65) about entity X auto-dismiss when a panel (layer 50) describing entity X opens."
- "Validation feedback (layer 60) overrides any toast (layer 65) about the same action."

These rules are tractable because layer numbers make the relationships explicit.

### S-10 — Multi-surface interaction (panel + panel, panel + modal, HUD + HUD)

S-10 handles the "two surfaces coexist" cases permitted at wide/ultra viewports. The layer scale constrains which combinations are legal:

- Two panels cannot both occupy layer 50 at the same anchor (single-slot model in PanelManager). At wide+ viewports a docked EventLog (layer 40) coexists with an overlay CityPanel (layer 50) — different layers, no conflict.
- A modal (layer 80) and a panel (layer 50) coexist only when the modal explicitly allows underlying interaction (rare; usually modal blocks). When they do coexist, layer order is enforced; S-10 owns the semantic rules.
- Two HUD surfaces at the same layer (two toasts at layer 65) stack within-layer — that's S-10's territory, not S-01's. S-01 guarantees they both sit above the panel below; within-layer ordering is chronological.

### S-02 — Position anchoring rules

Position and layer are orthogonal. A right-anchored overlay panel and a cursor-anchored tooltip can both be at layer 50 in different call sites if the design warranted (they don't in this system — panels are 50, tooltips are 70). The layer scale doesn't constrain where things go on screen; S-02 does that. This doc only constrains the z-axis.

### S-03 — Sizing table per element per viewport

Size doesn't cross-reference layer. A panel that grows wider at ultra viewports stays at layer 50. A minimap that grows from 200×140 to 360×240 stays at layer 45.

### S-07 — Motion & animation contracts

Layer position affects the animation contract for entering / leaving surfaces. A tooltip (layer 70, `pointer-events: none`) can fade instantly because there's no interaction concern. A modal (layer 80) must respect focus trap timing: it enters, focuses, and only then becomes interactive — the layer transition and the focus transition are linked. S-07 specifies timing; this doc provides the layer identity.

### S-08 — Focus & keyboard navigation

Focus order within a single layer is a traversal problem (S-08). Layer order constrains which layers own the focus at a given moment — modal (80) traps focus, canvas (0) is default focus when nothing else claims it, tooltips (70) never take focus. S-01 supplies the identity; S-08 supplies the rules.

## Implementation phase

**Phase 1.1 — Token expansion (2-3 days, one developer).**

Subtasks:

1. **Create `packages/web/src/styles/layer-tokens.css`** with the full scale. Import from `App.tsx` so tokens are available app-wide (pattern matches how panel-tokens are imported inside PanelShell today).
2. **Add alias declarations** in `panel-tokens.css` and `hud-tokens.css` mapping existing names to `var(--z-*)`. Existing consumers see no behavior change.
3. **Replace the two hard-coded `zIndex: 0` call sites** in `TechTreePanel.tsx:405` and `CivicTreePanel.tsx:411` with a panel-scoped token (`--panel-tree-line-z`, defaulting to `0`, defined inside the panel's own stacking context via `isolation: isolate` on the panel body). These are intra-panel and live below the app-wide scale; documenting them here prevents regression.
4. **Add a CI check** — a simple `grep` pass that fails the build if `zIndex: <number>` literals appear in `.tsx` files outside the `layer-tokens.css` sheet. The existing hook pipeline in `.claude/hooks/check-edited-file.sh` is the natural home.
5. **Update `.claude/rules/panels.md` and `.claude/rules/ui-overlays.md`** sections that document z-indices to reference the new token names + the layer scale doc. The existing doc comments in both sheets point at each other's values; those comments collapse to "see layer-tokens.css".
6. **Playwright smoke test** — `packages/web/src/__tests__/playwright/layer-ordering.spec.ts`. Open each overlay panel, verify its computed `z-index` is 50; open a modal and verify 80; hover to trigger a tooltip over an open panel and verify the tooltip's computed z-index is 70. One spec catches every future regression.

**Phase 1.2 (follow-up, ships after Phase 2 starts).** Migrate call sites from `--panel-z-*` / `--hud-z-*` names to the canonical `--z-*` names. Alias layer remains in place during this cycle; removed at end.

**Phase 1.3 (shipped alongside new overlays).** New surfaces added in Phase 2+ reach for `--z-*` names directly. No work until those surfaces land.

## Open questions

1. **Should Help panel sit at the normal overlay layer (50) or get its own "reference" layer above toasts?** Today Help is a normal overlay. If the player opens Help to look up a shortcut while a tutorial toast is active, the Help overlay is below the toast — is that right? Proposal: keep Help at 50. Tutorial toasts should target Help explicitly if they want layering above it.

2. **Does the error boundary go to `--z-system-critical` (100) or a new layer above 100?** If a runtime error crashes a panel, the error boundary replaces the panel in-place at layer 50. If the error crashes the *app root*, the error boundary needs layer 100 to be visible above any modal. Proposal: per-panel error boundaries stay at the panel's layer; the app-root error boundary is 100. S-10 elaborates.

3. **Should drag preview sit above modal (yes) or above system-critical (no)?** Current scale puts drag at 95, system at 100. This means a drag in progress when a system dialog fires (network dropped mid-drag) would have the preview momentarily visible above the dialog, then snap under once the dialog captures input. Proposal: accept the momentary flicker; system-critical winning is more important than drag continuity.

4. **Debug overlay tier.** Do we want a `--z-debug` layer (above system-critical) for dev-build-only HUDs (FPS counter, state inspector, turn-profiler)? Proposal: add it when we need it. Skipping now keeps the scale tight.

5. **Intra-canvas layers.** The renderer currently draws unit sprites, selection glow, path preview, combat arrow all into the same canvas. If those become DOM-layered (e.g. selection glow as CSS, path preview as SVG overlay) they'd need layers between 0 and 10. Proposal: reserve 1-9 for future canvas-sibling layers but don't assign them until a concrete surface arrives.

6. **Audit H-2 (chrome uniformity).** The chrome bar (layer 30) and panel overlay (50) being at different layers gives the visual redesign freedom to differentiate them — chrome can be heavier and denser (the "frame"), panels lighter and warmer (the "documents"). This system doesn't specify the visual treatment; that's the visual system's concern (S-03 + the Phase 1 design-token overhaul). Flagged here only because S-01 unblocks the visual freedom: once chrome is explicitly *under* panels, the visual designer knows the chrome can be the darker, denser surface without worrying about panels needing to visually dominate it.
