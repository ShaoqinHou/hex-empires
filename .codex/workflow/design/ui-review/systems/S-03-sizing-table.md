---
title: S-03 — Sizing table per element per viewport class
purpose: One canonical table of dimensions, spacing, and typography for every persistent and transient UI surface at every supported viewport class. Ad-hoc sizing is a BLOCK.
created: 2026-04-17
depends_on:
  - 00-philosophy.md (P6 typography, P10 density, P11 system-first, P12 responsive)
  - 01-holistic-audit.md (H-10 density inconsistency, H-15 fixed-pixel layout)
  - 02..07-group-*.md (per-surface sizing hints)
  - panels.md / ui-overlays.md (PanelShell widths narrow/wide/full, TooltipShell position strategies)
  - _loop-state.md (locked decision #7 — viewport classes: standard / wide / ultra)
phase: Phase 1.1 (token expansion), parallel to Phase 1.5 (layout architecture)
---

# S-03 — Sizing table

## Purpose

Ad-hoc sizing is the #1 cross-cutting drift vector in the current UI. Every panel picks a width "that felt right"; every tooltip stamps its own padding; every button decides locally how tall it should be. The audit caught this as **H-10 (density inconsistency)** and **H-15 (fixed-pixel layout)**. Per principle P10 (density is a feature) and P11 (system-first), density is not a per-surface creative choice — it's a three-tier token that every surface consumes.

The deliverable is a **single machine-verifiable sizing table** that covers:

1. Every persistent surface (TopBar, BottomBar, minimap, floating controls).
2. Every transient surface (panels, tooltips, toasts, validation, turn transition, placement hints).
3. Every viewport class (standard / wide / ultra, per locked decision #7 — narrow is dropped).
4. Every visual primitive that sizes matter for: spacing, typography, icons, click targets, hex render size.

Once these tables land, implementation becomes: wire `--sizing-*` + `--spacing-*` + `--type-*` tokens into components; remove every inline pixel literal; the Reviewer greps for raw `px`/`rem` in chrome JSX as a BLOCK. Drift stops because the system no longer has room for it.

## Scope

**In scope:**

- Chrome dimensions (TopBar height, BottomBar height, minimap size, end-turn width).
- Panel widths per priority (modal / overlay / info) x viewport class.
- HUD sizes (tooltip tiers, toasts, validation, turn transition, placement hints).
- Spacing scale tokens (xs/sm/md/lg/xl/2xl) with canonical use sites.
- Typography scale (display / heading / body / label / numeric) with family, size, weight, leading.
- Icon sizes per category (yields / actions / categories / states / portraits).
- Canvas hex render size + zoom levels (on-map, since hex visual footprint is a UI concern).
- Click-target minimums (32x32 enforced baseline, with frequency-weighted exceptions).

**Out of scope:**

- Color tokens (that is S-01 / asset-pipeline / existing panel-tokens.css).
- Motion (S-07 — sizes do not change in-place when transitioning; motion affects opacity/transform, not layout).
- Z-index / layering (S-01).
- Narrow viewport (<=1366). Locked decision: desktop-only, narrow dropped.
- Mobile / touch targets (desktop-only, locked decision #6).

## Spacing scale

One scale, six steps. Every padding, gap, margin, border-offset inside UI chrome picks ONE step. Ad-hoc values (`padding: 10px`, `gap: 7px`) are a BLOCK.

| Token | Value | Primary use |
|---|---|---|
| `--space-xs` | **4px** | Icon-to-text gap in a chip; inner padding of a pill; gap between numeric and superscript delta; internal padding of tiny badge. |
| `--space-sm` | **8px** | Gap between list items in a panel body; padding inside a compact tooltip; horizontal gap between two sibling icons; border-to-content offset in an empty-state card. |
| `--space-md` | **12px** | Body padding on medium chrome (current `--panel-padding-md`); gap between section-label and first content row; inner padding of ActionPalette buttons. |
| `--space-lg` | **20px** | Section-break inside a panel body (gap between two `<SectionHeader>` groups); outer padding of a dramatic card; horizontal padding of the TopBar chrome; inset of a CityPanel hero block. |
| `--space-xl` | **32px** | Gap between panel-wide columns; outer padding of DramaModal at standard; vertical rhythm between hero-title and first body paragraph. |
| `--space-2xl` | **48px** | Outer padding of a full-screen modal (SetupScreen, AgeTransition ceremonial); gap between stanzas in a victory screen; vertical rhythm in a hero layout's primary/secondary separation. |

**Alias layer (kept for backwards compatibility during Phase 1.1 migration):**

- `--panel-padding-sm` → `--space-sm`
- `--panel-padding-md` → `--space-md`
- `--panel-padding-lg` → `--space-lg`
- `--hud-padding-sm` → `--space-xs` (6px was a compromise; snap to 4px)
- `--hud-padding-md` → `--space-sm` (10px → 8px — HUD is denser than panels by design)

The alias migration happens once in Phase 1.1 token expansion; after the sweep, raw `--panel-padding-*` / `--hud-padding-*` stay as aliases only (Reviewer grep flags any NEW introduction).

## Typography scale

Five roles. Each role is **one token set** that packages size + weight + line-height + family. Every text node in chrome JSX picks ONE role. Inline font-size / font-weight values in chrome are a BLOCK.

Fonts per role reflect the Civ VII-tier aesthetic decided in locked decision #4: **serif for drama** (display + heading), **sans for density** (body + label + numeric with tabular-nums).

| Role | Token prefix | Family | Size | Weight | Leading | Tracking | Use |
|---|---|---|---|---|---|---|---|
| **display** | `--type-display-*` | `"Cormorant Garamond", "Crimson Pro", Georgia, serif` | **32px std / 40px wide / 48px ultra** | 500 | 1.10 | 0.005em | Era banners (ANTIQUITY); setup title (HEX EMPIRES); victory declaration; turn-transition announcement. Rare. |
| **heading** | `--type-heading-*` | `"Cormorant Garamond", Georgia, serif` | **18px std / 20px wide / 22px ultra** | 600 | 1.25 | 0 | Panel titles (PanelShell title bar); DramaModal hero headlines; section headers that need warmth. |
| **body** | `--type-body-*` | `"Inter", system-ui, sans-serif` | **14px std / 14px wide / 15px ultra** | 400 | 1.45 | 0 | Paragraphs inside panels; tooltip detailed tier; flavor copy; help lessons. |
| **label** | `--type-label-*` | `"Inter", system-ui, sans-serif` | **11px std / 11px wide / 12px ultra** | 600 | 1.2 | 0.08em (UPPERCASE) | Section headings inside panels (YIELDS, PRODUCTION); chip labels; button keyboard-hint badges. |
| **numeric** | `--type-numeric-*` | `"Inter", "SF Pro Text", system-ui, sans-serif` with `font-variant-numeric: tabular-nums` | **15px std / 16px wide / 18px ultra** | 600 | 1.0 | 0 | Resource chip numbers in TopBar; yield cells in CityPanel; combat-preview HP; cost numerals on tech cards; any digit-heavy value the player SCANS. |

**Numeric enforcement rules:**

- `font-variant-numeric: tabular-nums` is applied globally to `.numeric` class and the `--type-numeric-*` composite; no exception.
- Resource numbers have a **max digit budget**: 5 digits (99,999). If a game state can produce 6+ digits (late-age gold hoarding at Deity) the render collapses to "99k+" formatted text — the chip layout is designed around 5 digits max.
- No lining vs oldstyle toggles; numeric role is always lining for monitor-legibility.
- Negative-delta chip ("-2") uses `--type-numeric-*` at 11px label-size (compact, subscript-like) — NOT a separate size bucket.

**Why serif for display + heading and sans for body:** Civ VII mixes Trajan (serif, caps, imperial) for era/victory moments with a clean sans for everything else. Replicating that split lands 80% of the visual identity. Open-source Cormorant Garamond is a passable free substitute for Trajan; Inter is the industry default sans that plays well at 11–16px on Windows (where MINGW is the dev environment per `tech-conventions.md`).

## Per-element sizing tables (the meat)

All values are **rem in code, px in this doc** for readability. Root font-size = 16px. Values with `*` denote a frequency-weighted exception to the 32x32 click-target baseline; see the click-target section.

### Chrome: TopBar

| Property | standard | wide | ultra |
|---|---|---|---|
| Height | **56px** | 64px | 72px |
| Horizontal padding | 20px (`--space-lg`) | 24px | 32px (`--space-xl`) |
| Vertical padding | 8px (`--space-sm`) | 10px | 12px (`--space-md`) |
| Turn badge width | 96px | 112px | 128px |
| Era banner width | 160px | 180px | 220px |
| Resource chip width (each) | 72px | 84px | 100px |
| Resource chip icon size | 16px | 18px | 20px |
| Resource chip number size (token) | `--type-numeric-std` (15px) | `--type-numeric-wide` (16px) | `--type-numeric-ultra` (18px) |
| Gap between resource chips | 8px (`--space-sm`) | 10px | 12px (`--space-md`) |
| End Turn button width | 176px | 200px | 232px |
| End Turn button height | 48px | 52px | 56px |
| End Turn idle-badge diameter | 20px | 22px | 24px |
| End Turn keyboard-hint glyph | 14px | 14px | 16px |

### Chrome: BottomBar

| Property | standard | wide | ultra |
|---|---|---|---|
| Height (no unit selected) | 48px | 56px | 64px |
| Height (unit selected — dossier mode) | 96px | 112px | 128px |
| Horizontal padding | 16px (`--space-lg` snapped) | 20px | 24px |
| Stat chip width | 120px | 132px | 148px |
| Unit portrait size (dossier mode) | 80x80px | 96x96px | 112x112px |
| Unit-action-button size | 44x44px | 48x48px | 52x52px |
| Unit-action-button gap | 8px (`--space-sm`) | 8px | 12px (`--space-md`) |
| Minimap container size | 200x140px | 280x200px | 360x240px |
| Minimap camera-frame stroke | 2px | 2px | 3px |
| Keyboard-hint row height (hold-SHIFT reveal) | 20px | 22px | 24px |

### Panel widths by priority x viewport class

The existing `PanelShell` already has three width slots (`narrow` 320, `wide` 480, `full` 720). This table REFINES those per viewport class. `PanelShell` gains a `density` prop that picks the right column.

| Priority | Width slot | standard | wide | ultra |
|---|---|---|---|---|
| **overlay** (default) | narrow | 320px | 360px | 400px |
| **overlay** (default) | wide | **440px** | **480px** | **520px** |
| **overlay** (default) | full | 640px | 720px | 800px |
| **info** (EventLog, etc.) | narrow | 280px | 320px | 360px |
| **info** (EventLog, etc.) | wide | 320px | 360px | 400px |
| **modal** (DramaModal — AgeTransition, Crisis, Victory, TurnSummary) | narrow | 480px | 540px | 600px |
| **modal** (DramaModal — AgeTransition, Crisis, Victory, TurnSummary) | wide | 720px | 800px | 900px |
| **modal** (DramaModal — AgeTransition, Crisis, Victory, TurnSummary) | full | 1024px | 1280px | 1440px |
| **modal — full-screen** (SetupScreen, final VictoryPanel) | full-screen | viewport-80%-clamped(1024, 1600) | viewport-80%-clamped(1280, 1920) | viewport-70%-clamped(1600, 2400) |

**Heights for modal priority:**

| Type | standard | wide | ultra |
|---|---|---|---|
| DramaModal (hero headline + choice cards) | min 420px, max 70% viewport | min 480px | min 540px |
| DramaModal (text-heavy, like Crisis flavor) | min 320px, max 60% viewport | min 360px | min 400px |
| SetupScreen full-screen modal | 100% viewport | 100% | 100% |

**Panel dock behavior by class (cross-ref to S-02 positioning + Phase 1.5.3 in master plan):**

| Priority | standard | wide | ultra |
|---|---|---|---|
| overlay | right-anchored overlay, pushes canvas via flexbox | right-docked, canvas re-flows, one panel visible | right-docked, ONE overlay + ONE info can co-exist |
| info | right-anchored collapsed to icon strip, expands on hover | docked 360px permanent, default-collapsed | docked 400px permanent, default-open (EventLog especially) |
| modal | centered, backdrop | centered, backdrop | centered, backdrop; DramaModal can use more viewport |

### Tooltip sizes (TooltipShell)

`TooltipShell` has a `tier` prop (`compact` | `detailed`) and a `position` prop (`floating` | `fixed-corner` | `side`). Size table runs per tier x viewport.

| Property | compact, standard | compact, wide | compact, ultra | detailed, standard | detailed, wide | detailed, ultra |
|---|---|---|---|---|---|---|
| Width | 180px | 200px | 220px | 320px | 360px | 400px |
| Max height | 80px | 90px | 100px | 360px | 420px | 480px |
| Padding | 8px (`--space-sm`) | 10px | 12px (`--space-md`) | 12px (`--space-md`) | 16px (between md and lg) | 20px (`--space-lg`) |
| Heading role | label (11px) | label | label | heading (18px) | heading (20px) | heading (22px) |
| Body role | body at 13px (ultra-compact) | body 13 | body 14 | body (14px) | body 14 | body 15 |
| Numeric role | numeric-std (15px) | 15 | 16 | numeric-std (15px) | 16 | 18 |
| Icon size | 14px | 14px | 16px | 20px | 22px | 24px |
| Fixed-corner offset | 16px from corner | 20px | 24px | 16px | 20px | 24px |
| Cycle-indicator pill height | 18px | 18px | 20px | 20px | 22px | 24px |

Stacked-entity cycle indicator (`(1 / 3 — Tab to cycle)`) always uses `--type-label-*` with `--hud-cycle-indicator-bg`.

### Notification toast size

Toasts are category-aware (foundational / military / diplomatic / resource / warning) per Group B redesign. Chrome dimensions are shared; category ICON differs.

| Property | standard | wide | ultra |
|---|---|---|---|
| Width | 320px | 360px | 400px |
| Min height | 56px | 60px | 64px |
| Max height (before scroll) | 120px | 132px | 148px |
| Padding | 12px (`--space-md`) | 14px | 16px (`--space-lg` snapped) |
| Category icon size | 24x24px | 24x24px | 28x28px |
| Title font role | label (11px UPPERCASE) | label | label |
| Body font role | body (14px) | body | body (15) |
| Close x target size | 24x24px | 24x24px | 28x28px |
| Stack gap (between toasts) | 8px (`--space-sm`) | 10px | 12px (`--space-md`) |
| Auto-dismiss timer | 4000ms (ephemeral) / persistent (warnings) | 4000 | 4500 |

### Validation feedback (ValidationFeedback HUD)

Validation is the "can't do that here" pill. Lives under TooltipShell with a red-accent variant. Smaller than a tooltip; appears cursor-adjacent; auto-dismisses fast.

| Property | standard | wide | ultra |
|---|---|---|---|
| Width | 200px | 220px | 240px |
| Padding | 8px (`--space-sm`) | 10px | 12px (`--space-md`) |
| Icon size | 16px | 18px | 20px |
| Body role | body 13px | body 13 | body 14 |
| Auto-dismiss timer | 1500ms | 1500 | 1500 |

### Turn transition interstitial

Brief full-screen overlay between turns. Shown when state changes require a beat (new turn starts, AI acted, etc.).

| Property | standard | wide | ultra |
|---|---|---|---|
| Backdrop | full viewport, `--hud-turn-transition-backdrop` | full | full |
| Announcement font role | `--type-display-*` (32px / 40px / 48px) | display | display |
| Announcement max width | 600px | 720px | 840px |
| Glow (shadow behind text) | 20px blur | 24px blur | 28px blur |
| Duration | 500ms | 500 | 500 |

### Tile preview mini-cards (used inside panels, NOT on map)

Used by CityPanel's tile-ring preview, ImprovementPanel's preview hex list, placement hint detail. Shape is a flat-top hex mini tile with yield dots.

| Property | standard | wide | ultra |
|---|---|---|---|
| Mini-hex diameter (corner-to-corner) | 48px | 56px | 64px |
| Yield dot size | 8px | 10px | 10px |
| Label font role | label (11px) | label | label (12) |
| Gap between mini-hexes | 4px (`--space-xs`) | 6px | 8px (`--space-sm`) |

### Hex render size on canvas

Canvas is outside the CSS token system, but hex visual size IS a UI concern — a hex too small is unreadable; too big and the map doesn't fit. These values go into the canvas renderer as constants, named `HEX_SIZE_*` and keyed by zoom-level + viewport class.

| Zoom level | standard | wide | ultra |
|---|---|---|---|
| Zoom 1 (overview — "whole world view") | 24px hex radius | 28px | 32px |
| Zoom 2 (strategic — default on load) | **40px hex radius** | **44px** | **48px** |
| Zoom 3 (tactical — one army visible) | 64px | 72px | 80px |
| Zoom 4 (close — tile-level detail) | 96px | 108px | 120px |
| Zoom 5 (portrait — unit/art detail) | 144px | 160px | 176px |

Camera-smooth interpolates between levels but snaps to discrete steps on mouse-wheel. The starting zoom (game load + after panel open/close) is Zoom 2 at the viewport class.

Minimap uses a **fixed** 8px hex radius regardless of zoom — it's not a zoom level of the canvas, it's an independent render.

## Icon sizing per category

Icon registry lives in `packages/web/public/assets/images/icons/` per S-01 + asset-pipeline. Every icon renders at ONE of the sizes below, picked from the use-site. Raw values like `width: 22px` on an icon are a BLOCK.

| Category | Token | Values (std / wide / ultra) | Use |
|---|---|---|---|
| **yield-chip** | `--icon-yield-chip` | 16 / 18 / 20 | Resource chips in TopBar; resource row in CityPanel yields section; tooltip compact-tier yield numbers |
| **yield-large** | `--icon-yield-large` | 24 / 28 / 32 | Yield lines in tooltip detailed tier; resource breakdown cards; CityPanel hero "per turn" row |
| **action-inline** | `--icon-action-inline` | 20 / 22 / 24 | Inside a button label (Found City button's city glyph); BottomBar unit-action-button glyph |
| **action-large** | `--icon-action-large` | 32 / 36 / 40 | ActionPalette full-sized buttons; unit-dossier primary-action showcase |
| **category-panel** | `--icon-category-panel` | 20 / 22 / 24 | Panel title-bar icon; TopBar category button (Tech/Civics/Diplo) |
| **category-hero** | `--icon-category-hero` | 48 / 56 / 64 | DramaModal hero icon; empty-state illustration anchor |
| **state-badge** | `--icon-state-badge` | 14 / 14 / 16 | Lock/unlock/selected markers on tech cards; on-map status blips |
| **portrait-mini** | `--icon-portrait-mini` | 32 / 40 / 48 | Unit portrait in stacked-entity tooltip; commander mini-portrait in Commanders list |
| **portrait-card** | `--icon-portrait-card` | 120 / 144 / 168 | Leader portrait in SetupScreen selection card; Diplomacy leader card |
| **portrait-hero** | `--icon-portrait-hero` | 240 / 280 / 320 | AgeTransition ceremonial leader art; Victory hero portrait |

**Cross-ref to S-01 / asset-pipeline:** These sizes match the "Icon" and "Portrait" rows in the asset-pipeline dimension expectations table. SVG icons scale from any source size; portraits are rendered at the exact values above with `object-fit: cover` on a source WebP sized per the pipeline min/target/max.

**Emoji deprecation:** any emoji currently used as a UI-chrome icon (money, science, culture, faith, influence, cities, swords, bow, rocket, heart, fort) MUST migrate to an SVG icon at the matching size-token above by end of Phase 1.2. Emoji persists ONLY inside game-data rendering (as a placeholder until art lands) and inside `HelpPanel` text examples.

## Numeric formatting rules

Beyond type-scale enforcement:

1. **`font-variant-numeric: tabular-nums`** is set on the `.numeric` class and in the `--type-numeric-*` composite. No opt-out.
2. **Digit budget per chip** = 5 (99,999). 6+ collapses to compact form: 100k, 1.2M. Formatter is a shared `formatResourceNumber(value: number)` helper.
3. **Delta chips** ("+2 per turn") are 11px `--type-label-*` with `--type-numeric-*` applied for the digits. Plus/minus sign is full-width (dedicated glyph U+002B / U+2212), not the ASCII variant, so tabular alignment holds.
4. **Percentage formatting**: integer only (no "47.3%" in chrome — always "47%"). Fractional percentages are a BLOCK in panel bodies; allowed only in developer/debug overlays.
5. **Turn numbers** use `--type-numeric-*` at the SAME size as the chip around them — the turn badge is a numeric slot, not a heading.
6. **In-world year** (BC/AD) — per A.1.8, render as `<YEAR><space><ERA>` with tabular-nums on YEAR only, era suffix in `--type-label-*` at 11px UPPERCASE. Example: `3200 BC` / `1066 AD`.

## Click-target minimum

**Baseline: 32x32px** click target for every interactive element in chrome. This floor is enforced by:

1. A Reviewer grep for `width: *(?:1[0-9]|2[0-9]|30|31)px.*height` patterns on buttons/chips/icons — any sub-32 hit is a BLOCK or requires the exception justification inline.
2. A Playwright invariant that computes `getBoundingClientRect()` for every `[data-testid*="btn"]` / `[role="button"]` / `[data-panel-trigger]` / `[data-hud-id]` element and asserts `Math.min(w, h) >= 32`.

### Exceptions (frequency-weighted)

Not every element justifies 32x32. Exceptions have a FREQUENCY cap and must be keyboardable if they fall below the floor.

| Element | Actual size | Frequency | Justification | Keyboard equivalent |
|---|---|---|---|---|
| Notification close x | 24x24 | 0-5x/turn | Cluster; enlarging to 32 crowds the toast header. The REAL fix is auto-dismiss (Q1). | press-any-key dismisses topmost |
| Panel close x | 28x28 | 1-3x/turn | Lives inside shell header; 32 would eat into title. Close button is the LAST visual in the title row; 28 with 4px inset reads spacious. | ESC closes active panel |
| Mini-hex in CityPanel tile ring | 48px (hex outer) | 0-6x/turn | Hover only; click optional. | Arrow keys cycle tiles (future) |
| Resource chip in TopBar | 16px icon inside 60+px chip | hover (not click) | Chip is hover-only; whole chip is 60+px wide so area is fine. | — |
| State badge on tech card | 14x14 | 0 clicks (decorative) | Not interactive; the CARD is the click target (200x100). | — |
| Stack-cycle indicator pill | 18px tall | 0 clicks (decorative) | Text-only indicator; Tab cycles. | Tab |
| Keyboard-hint glyph badge | 14x14 | 0 clicks (decorative) | Badge is read-only reminder; the WRAPPING button is the 32+ target. | the button |

Every row in this table must have either size >=32 OR justification + keyboard equivalent. A row without one of those is a BLOCK.

## Examples — resolving H-10 density inconsistency

H-10 caught three concrete density violations. Each gets its token in the new system:

### Example 1 — CityPanel (was "generously padded")

Before (paraphrased from 02-group-a audit):

```css
.city-section { padding: 16px; margin-bottom: 20px; }
.city-yield-row { gap: 12px; font-size: 13px; }
.city-yield-number { font-size: 14px; font-weight: 500; }
```

After (S-03 compliant):

```css
.city-section { padding: var(--space-lg); margin-bottom: var(--space-lg); }
.city-yield-row { gap: var(--space-md); font: var(--type-body-std); }
.city-yield-number { font: var(--type-numeric-std); }
```

The actual pixel values are the same at `standard` viewport, but they now respond to `wide` and `ultra` automatically AND the Reviewer can verify by greppable pattern.

### Example 2 — TechTree cards (was "nearly touching")

Before:

```css
.tech-card { padding: 8px 10px; margin: 2px; font-size: 12px; }
```

After:

```css
.tech-card {
  padding: var(--space-sm) var(--space-md);
  margin: var(--space-xs);
  font: var(--type-body-std);
}
```

Density now matches the "strategic" density token used by Group D panels; no more reinvention per panel.

### Example 3 — Notifications (was over-wide, text-button dismiss)

Before:

```css
.notif { width: 280px; padding: 10px 14px; }
.notif-dismiss { width: 100%; height: 32px; font-size: 12px; }
```

After:

```css
.notif {
  width: var(--sizing-notif-width-std); /* 320px standard, 360px wide, 400px ultra */
  padding: var(--space-md);
}
.notif-close {
  width: var(--sizing-notif-close-std); /* 24x24 */
  height: var(--sizing-notif-close-std);
}
```

Plus the text-label dismiss is replaced by a 24x24 x button (frequency-weighted exception justified), and auto-dismiss kicks in at 4s (H-14 interaction economics fix).

## Density tokens per panel type

Per P10 and the recurring audit findings, different panel TYPES deserve different density presets. The sizing tables above assume "standard-density". These four density tokens ride on top:

| Density | Primary use | Override effect |
|---|---|---|
| `--density-tactical` | Group C panels (CityPanel, CommanderPanel, ImprovementPanel) | Values as tabled; baseline. |
| `--density-strategic` | Group D panels (Tech, Civics, Diplo, Government, Religion, VictoryProgress) | `--space-md` → `--space-sm` for inner list rows; `--type-body` leading 1.45 → 1.4; `--type-label` size unchanged. **More data per square inch** for information-heavy trees and ledgers. |
| `--density-dramatic` | Group E modals (AgeTransition, Crisis, Victory, SetupScreen) | `--space-lg` → `--space-xl`; `--type-body` → 15px; more breathing room; feels "earned". |
| `--density-compact` | HUD tooltips, toasts, validation | `--space-sm` → `--space-xs`; `--type-body` → 13px at standard; maximally glanceable. |

A panel picks its density via prop on `PanelShell` (`density: 'tactical' | 'strategic' | 'dramatic'`) which flips a CSS class on the shell root. HUD elements use `--density-compact` implicitly via their shells. No panel can go bespoke; the prop picker is the whole API.

## Interaction with other systems

- **S-01 (layer & z-index):** S-03 does NOT set z-index. It assumes the z scale from S-01 and panel-tokens. Changes in S-03 (bigger panel width at `ultra`) DO affect layout flow (whether a panel pushes canvas vs overlays) but never z order.
- **S-02 (position anchoring):** Sizes in S-03 flow INTO the positioning rules of S-02 (a panel's width determines how far left the canvas edge sits). S-02 owns anchor semantics; S-03 owns extents.
- **S-04 (transparency / opacity):** Opacity does NOT change size. A hover state that dims to 60% opacity keeps the same 32x32 box. A faded-in toast keeps its target width.
- **S-05 (map entity stacking):** The cycle indicator size (`(1 / 3 — Tab to cycle)`) is in S-03's tooltip table. Stacking behavior (which entity renders) is S-05.
- **S-06 (occlusion / dismissal):** The DURATION tokens (auto-dismiss 4000ms, validation 1500ms) live in S-03; the RULES for WHEN to dismiss live in S-06.
- **S-07 (motion):** Motion moves things around at their own size. A panel sliding in at 240ms KEEPS its width per this table. A button pressed-state does a 2% scale — that's a transform, doesn't change the layout size. S-07 owns timing; S-03 owns static dimensions.
- **S-08 (focus / keyboard):** Focus rings are 2px outside the size in this table. Tab-order doesn't affect sizes.
- **S-09 (state transitions):** Hover/pressed/disabled affect VISUALS (opacity, saturation, scale transform) but NOT layout. A disabled button still takes 32x32 space.
- **S-10 (multi-surface):** When panel + modal coexist (rare — modal is exclusive by design), sizes come from this table per the WINNING priority's class. No resize on stack.

## Implementation phase

Phase 1.1 (token expansion), per 08-master-plan.md. Concrete deliverables:

1. **New CSS sheet** `packages/web/src/styles/sizing-tokens.css` with every `--space-*`, `--type-*`, `--icon-*`, `--sizing-*`, `--density-*` token scoped `:root`. Responsive values use `@media (min-width: <breakpoint>)` cascades against the breakpoint tokens from S-02 / Phase 1.5.1.
2. **TypeScript token typing** `packages/web/src/styles/tokens.ts` — a union type `SizeToken = 'xs' | 'sm' | ...` etc. — so components accept `size="md"` instead of inline px. The `<PanelShell>` gains `density?: 'tactical' | 'strategic' | 'dramatic'`, defaulting to `tactical`.
3. **Alias layer** keeps `--panel-padding-*` and `--hud-padding-*` working during migration; marked deprecated in comments; Reviewer grep flags new introductions.
4. **Code migration** sweep: every JSX `style={{ padding: '10px' }}` / `fontSize: 13` / `width: '440px'` inline in chrome becomes a class or `var(--*)`. Target: zero raw pixels in the chrome tree (game-data rendering like canvas Hex sizing stays as constants).
5. **Reviewer rules** added to `.codex/rules/` or inline grep patterns:
   - `fontSize:\s*['"]?\d+` in chrome JSX → BLOCK (use `--type-*`).
   - `padding:\s*['"]?\d+` / `margin:\s*['"]?\d+` in chrome JSX → BLOCK (use `--space-*`).
   - Raw `width: N` / `height: N` on known-button selectors under 32px without a comment justifying → BLOCK (click-target minimum).
   - New `--panel-padding-*` / `--hud-padding-*` token definitions after the Phase 1.1 sweep → BLOCK (use `--space-*`).
6. **Test artifacts**:
   - A Playwright invariant that iterates every `[role="button"]` / `[data-hud-id]` / `[data-panel-trigger]` at each of the three viewport classes and asserts `min(w, h) >= 32` OR the element is flagged as an exception via `data-size-exception` attribute.
   - A unit test that parses `sizing-tokens.css` and asserts the three-column cascade (standard → wide → ultra) is filled for every responsive token (no orphan breakpoint).

Estimate: 1 week for a developer to build the token sheet + typing + lint. Follow-up 2 weeks for the mechanical migration sweep across panels and HUDs. Migration is parallelizable (one agent per panel group in worktrees) per `.codex/skills/spawn-worktree/`.

## Open questions

1. **Font licensing** — Cormorant Garamond is OFL. Inter is OFL. No per-use license issue. But if the commissioned art track eventually lands a custom display face, slot it as `--type-display-family` and the tables stay stable. Confirm nobody wants a paid font now (assuming OFL-only during Phase 1).
2. **Narrow viewport dropped — confirmed?** Locked decision #7 drops `narrow` (<=1366). This doc assumes that; if reversed, add a `narrow` column (values would be ~80% of `standard` with panel collapse to full-screen).
3. **Tabular-nums on ALL numerics vs only on currency/resources?** Specified universal; if turn badges or combat damage numbers read wrong with tabular-nums, a per-component opt-out is possible but avoid it.
4. **Hex size at ultra-wide (21:9) vs ultra-tall** — table assumes 16:9 at each class. Ultra-wide (3440x1440) uses the `ultra` numbers; portrait-oriented 2560x1440 rotated would break hex sizing assumptions, but locked decision #6 drops mobile/touch so ultra-tall is unreachable. Confirm.
5. **DramaModal max-width at ultra (1440px)** — will this leave too much dead space on a 3840x2160 ultra-wide? Maybe DramaModal should clamp to `min(1440, 80vw)`. Flag for UI spot-check when ultra hardware is available.
6. **Icon cat "portrait-hero" at 240/280/320** — does the asset-pipeline source (up to 1024x1536) downscale cleanly? Should be fine given WebP + native img-srcset, but verify during Phase 1.3 icon sweep.
7. **Density tokens per sub-component** — currently all panels inherit one density. Should `<ResourceRow>` always be compact regardless of enclosing panel density? Implicitly said yes (the shared sub-component picks ITS density). Revisit if a panel needs a spacious ResourceRow for a hero moment.
