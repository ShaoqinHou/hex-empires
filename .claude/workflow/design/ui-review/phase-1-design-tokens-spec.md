---
schema: design-spec/v1
phase: 1 (design tokens)
author: sonnet (designer)
created: 2026-04-18
---

# Phase 1 — Design tokens + palette + Google Fonts spec

## Purpose

Phase 1 establishes the foundational token layer that every subsequent phase depends on: a warm-earth color palette replacing the current cold dark-slate aesthetic, a dual-font Google Fonts setup (Cinzel serif for drama, Inter sans for density), a six-stop spacing scale, and five typography roles with concrete per-viewport values. Without this layer, Phase 4+ panel chrome refactors would each independently guess at which shades of olive and amber belong where — this doc makes those guesses once, up-front, so every later implementer has a single file to consult. The spec treats the warm-earth palette as CSS primitive variables that feed into semantic variables that feed into component chrome; raw hex is a reference only in this document, never in code.

## Scope

**In scope for Phase 1:**
- Primitive color palette (olive, amber, cream, bronze) — 10 stops each
- Semantic color variables (surface, bg, text, border, accent, danger, warning, success, info)
- Google Fonts integration (Cinzel + Inter) in `index.html`
- `font-family` declarations in `index.css`
- Typography role tokens (`--type-display-*`, `--type-heading-*`, `--type-body-*`, `--type-label-*`, `--type-numeric-*`) in a new `typography-tokens.css`
- Spacing scale confirmation (`--space-xs` through `--space-2xl`) in a new `spacing-tokens.css` (the values are already locked in S-03; this phase writes the actual CSS file)
- Alias declarations in `panel-tokens.css` and `hud-tokens.css` that point existing color variables at the new palette primitives — so existing consumers break nothing
- Migration table of every raw hex literal in chrome files that this phase replaces

**Out of scope for Phase 1:**
- Spacing or sizing changes (those CSS variables are created here, but component migration is Phase 4)
- z-index changes (S-01 — `layer-tokens.css` is a sibling deliverable in Phase 1.1)
- Opacity token CSS file (S-04 — `opacity-tokens.css` is also Phase 1.1; referenced here, not defined)
- Motion token CSS file (S-07 — `motion-tokens.css` is Phase 1.1; referenced here, not defined)
- Canvas renderer changes
- Viewport-class-conditional layout (Phase 1.5)
- Panel chrome refactors (Phase 4)

## Locked decisions (from `systems/_loop-state.md`)

The following decisions are locked and must not be re-opened:

1. **Aesthetic:** Modern Civ VII — warm earth tones (olive, amber, cream, bronze). Cinzel serif + Inter sans.
2. **Viewport classes:** standard (1367–1919) / wide (1920–2559) / ultra (2560+). Narrow (<=1366) is dropped.
3. **Ultra behavior:** reveal more info (denser HUD, extra stats), not scale up.
4. **Panel concurrency:** single-slot — one panel at a time.
5. **Screen shake:** age transition only; respects `prefers-reduced-motion`.
6. **Art budget:** hand-SVG + Game-icons.net (CC BY 3.0) + Kenney.nl (CC0) + Google Fonts + CSS textures. No raster art.
7. **Sound budget:** procedural WebAudio oscillator tones, off by default.
8. **Achievements:** behind `state.config.experimentalAchievements` flag.
9. **Notification dismissal:** right-click only; auto-dismiss non-blocking after ~8s.

Typography choices (Cinzel for display/heading, Inter for body/label/numeric) follow directly from decision #1 and are confirmed here as the implementation binding.

## Spacing scale — the 6 stops

These values are already defined in `systems/S-03-sizing-table.md`. Phase 1 creates the actual CSS file `packages/web/src/styles/spacing-tokens.css` with these exact values. The alias layer keeps existing `--panel-padding-*` and `--hud-padding-*` working during migration.

| Token | px | Primary purpose | Example use |
|---|---|---|---|
| `--space-xs` | **4px** | Icon-to-text gap; pill inner padding; badge inner padding | Icon gap in a resource chip; cycle-indicator pill |
| `--space-sm` | **8px** | Gap between list items; compact tooltip padding; gap between sibling icons | Panel body list rows; `--panel-padding-sm` alias target |
| `--space-md` | **12px** | Medium chrome body padding; gap between section label and first content row | `--panel-padding-md` alias target; ActionPalette button inner padding |
| `--space-lg` | **20px** | Section break inside panel body; outer padding of TopBar chrome | `--panel-padding-lg` alias target; CityPanel hero block inset |
| `--space-xl` | **32px** | Gap between panel-wide columns; DramaModal outer padding at standard | AgeTransition modal outer padding |
| `--space-2xl` | **48px** | Full-screen modal outer padding; hero layout primary/secondary separation | SetupScreen, Victory screen |

**Alias layer (added to `spacing-tokens.css`):**

```css
--panel-padding-sm: var(--space-sm);   /* was 8px  — no change */
--panel-padding-md: var(--space-md);   /* was 12px — no change */
--panel-padding-lg: var(--space-lg);   /* was 16px — CHANGES to 20px */
--hud-padding-sm:   var(--space-xs);   /* was 6px  — snaps to 4px */
--hud-padding-md:   var(--space-sm);   /* was 10px — snaps to 8px */
```

Note: `--panel-padding-lg` is currently 16px in `panel-tokens.css`. The new value is 20px. This is a real visual change — panels gain 4px outer padding. See open question #2.

## Typography roles

Five roles. Each role is a complete type specification — the call-site uses the composite token, never individual properties.

**Font family assignment (locked decision #1):**
- Cinzel: `display` and `heading` roles
- Inter: `body`, `label`, and `numeric` roles

Typography values are defined in `packages/web/src/styles/typography-tokens.css` (new file). Responsive values use `@media (min-width: 1920px)` and `@media (min-width: 2560px)` cascades.

| Role | CSS variable prefix | Family | Size (std / wide / ultra) | Weight | Line-height | Letter-spacing | Notes |
|---|---|---|---|---|---|---|---|
| **display** | `--type-display-` | `"Cinzel", "Georgia", "Times New Roman", serif` | 32px / 40px / 48px | 500 | 1.10 | 0.005em | Era banners, setup title, victory declaration, turn-transition. Used rarely; never in panel bodies. |
| **heading** | `--type-heading-` | `"Cinzel", "Georgia", serif` | 18px / 20px / 22px | 600 | 1.25 | 0 | Panel title bar, DramaModal hero headlines, section headers needing warmth |
| **body** | `--type-body-` | `"Inter", system-ui, -apple-system, sans-serif` | 14px / 14px / 15px | 400 | 1.45 | 0 | Panel body paragraphs, tooltip detailed tier, flavor copy, help text |
| **label** | `--type-label-` | `"Inter", system-ui, sans-serif` | 11px / 11px / 12px | 600 | 1.20 | 0.08em (with `text-transform: uppercase`) | Section headings (YIELDS, PRODUCTION), chip labels, keyboard-hint badges |
| **numeric** | `--type-numeric-` | `"Inter", "SF Pro Text", system-ui, sans-serif` with `font-variant-numeric: tabular-nums` | 15px / 16px / 18px | 600 | 1.0 | 0 | Resource chip numbers, yield cells, combat HP, tech card costs |

**CSS token composite format:**

```css
/* body role at standard viewport */
--type-body-family:   "Inter", system-ui, -apple-system, sans-serif;
--type-body-size:     14px;
--type-body-weight:   400;
--type-body-leading:  1.45;
--type-body-tracking: 0;
/* Composite — call sites use font: var(--type-body) */
--type-body: var(--type-body-weight) var(--type-body-size)/var(--type-body-leading) var(--type-body-family);
```

The composite maps to the CSS `font` shorthand. Call sites use `font: var(--type-body)` — never inline `font-size: 14px` in chrome TSX.

**Viewport-responsive cascade pattern:**

```css
:root {
  --type-display-size: 32px;
  --type-heading-size: 18px;
  --type-body-size:    14px;
  --type-label-size:   11px;
  --type-numeric-size: 15px;
}
@media (min-width: 1920px) {
  :root {
    --type-display-size: 40px;
    --type-heading-size: 20px;
    --type-body-size:    14px;
    --type-label-size:   11px;
    --type-numeric-size: 16px;
  }
}
@media (min-width: 2560px) {
  :root {
    --type-display-size: 48px;
    --type-heading-size: 22px;
    --type-body-size:    15px;
    --type-label-size:   12px;
    --type-numeric-size: 18px;
  }
}
```

## Color palette — warm earth tones

The existing codebase uses a cold dark-slate aesthetic (`#0d1117` bg, `#161b22` surface, `#30363d` borders — GitHub dark mode). The warm earth tones replacement: dark olive-brown backgrounds, amber/gold accents, cream text, bronze borders.

**How hex values are used in this document:** every hex value below is a visual reference only. No hex value is used directly in component code. Every hex value becomes a CSS custom property in `packages/web/src/styles/palette-tokens.css` (new file), and every component references a variable name.

### Primitive palette — four color families, 10 stops each

**Olive (dark muted green-brown — backgrounds, surfaces):**

| Stop | Token | Hex ref |
|---|---|---|
| 50 | `--olive-50` | `#f5f3e8` |
| 100 | `--olive-100` | `#e8e3c8` |
| 200 | `--olive-200` | `#d4cb9a` |
| 300 | `--olive-300` | `#b8a96a` |
| 400 | `--olive-400` | `#978546` |
| 500 | `--olive-500` | `#7a6f3a` |
| 600 | `--olive-600` | `#5e5428` |
| 700 | `--olive-700` | `#433b1c` |
| 800 | `--olive-800` | `#2a2511` |
| 900 | `--olive-900` | `#161409` |

**Amber (gold-orange — accents, highlights, interactive states):**

| Stop | Token | Hex ref |
|---|---|---|
| 50 | `--amber-50` | `#fffbeb` |
| 100 | `--amber-100` | `#fef3c7` |
| 200 | `--amber-200` | `#fde68a` |
| 300 | `--amber-300` | `#fcd34d` |
| 400 | `--amber-400` | `#fbbf24` |
| 500 | `--amber-500` | `#f59e0b` |
| 600 | `--amber-600` | `#d97706` |
| 700 | `--amber-700` | `#b45309` |
| 800 | `--amber-800` | `#92400e` |
| 900 | `--amber-900` | `#78350f` |

**Cream (warm white — text, light fills):**

| Stop | Token | Hex ref |
|---|---|---|
| 50 | `--cream-50` | `#fffef7` |
| 100 | `--cream-100` | `#fefce8` |
| 200 | `--cream-200` | `#fef9c3` |
| 300 | `--cream-300` | `#fef3d0` |
| 400 | `--cream-400` | `#f9e8b0` |
| 500 | `--cream-500` | `#f2d88a` |
| 600 | `--cream-600` | `#e8c86a` |
| 700 | `--cream-700` | `#d4a840` |
| 800 | `--cream-800` | `#b08820` |
| 900 | `--cream-900` | `#7a5e00` |

**Bronze (warm metallic — borders, surfaces, chrome detail):**

| Stop | Token | Hex ref |
|---|---|---|
| 50 | `--bronze-50` | `#fdf6ec` |
| 100 | `--bronze-100` | `#f7e5c8` |
| 200 | `--bronze-200` | `#e8c990` |
| 300 | `--bronze-300` | `#d4a85a` |
| 400 | `--bronze-400` | `#b8863a` |
| 500 | `--bronze-500` | `#9a6b20` |
| 600 | `--bronze-600` | `#7c5318` |
| 700 | `--bronze-700` | `#5e3d12` |
| 800 | `--bronze-800` | `#3e290c` |
| 900 | `--bronze-900` | `#1f1406` |

### Semantic color tokens

Semantic tokens alias into the primitive palette and carry meaning. They live in `palette-tokens.css` below the primitive definitions. Call sites always use semantic tokens; primitives are never referenced in component code.

| CSS variable | Hex ref | Primitive | Purpose | Used where |
|---|---|---|---|---|
| `--color-bg` | `#1a1510` | near `--olive-900` (warm-adjusted) | Page background, deepest surface | `html, body, #root` background |
| `--color-surface` | `#251e14` | near `--olive-800` | Default panel/card surface | `panel-bg` semantic alias |
| `--color-surface-hover` | `#2e261a` | near `--olive-700` | Hovered card surface | Interactive card hover state |
| `--color-surface-raised` | `#352c1e` | `--olive-700` | Raised chrome (TopBar, BottomBar interior) | Chrome bars |
| `--color-border` | `#4a3e28` | near `--bronze-700` | Default border | Panel borders, section dividers |
| `--color-border-subtle` | `#332a1a` | near `--olive-800` | Subtle/ambient border | Card interior borders, inset dividers |
| `--color-border-accent` | `#7a6030` | near `--bronze-500` | Highlighted border (hover, selected) | Selected card ring, active tab |
| `--color-text` | `#f2e8d0` | near `--cream-100` | Primary text | All body text, panel content |
| `--color-text-heading` | `#f8f0d8` | near `--cream-50` | Heading text (PanelShell title, display text) | Cinzel heading role |
| `--color-text-muted` | `#a89070` | between `--olive-300` and `--bronze-400` | Secondary/supplementary text | Keyboard hints, empty-state copy |
| `--color-text-subtle` | `#6e5c40` | near `--bronze-600` | Very muted text | Timestamps, decorative copy |
| `--color-accent` | `#d4943a` | near `--bronze-300` | Primary interactive accent | Hover states, focus rings, interactive affordances |
| `--color-accent-hover` | `#e8aa50` | near `--amber-400` | Hover state of accent | Deepened hover color |
| `--color-gold` | `#fbbf24` | `--amber-400` | Gold resource / primary yellow accent | TopBar gold chip, tech costs, existing `--color-gold` consumers |
| `--color-gold-soft` | `#fcd34d` | `--amber-300` | Softer gold — title underlines, hover accents | PanelShell title bar underline |
| `--color-danger` | `#c53030` | custom (warm red) | Error / combat / critical state | Validation feedback, combat damage, war status |
| `--color-danger-soft` | `#e05252` | custom | Softer danger | Hover on danger action |
| `--color-warning` | `#c47a1a` | near `--amber-700` | Warning / caution state | "Not enough gold" softer variant |
| `--color-success` | `#4a8c5a` | custom (warm green) | Positive / allied state | Friendly diplomacy, city growth, placement valid |
| `--color-success-soft` | `#6aaa7a` | custom | Softer success | Hovered friendly card |
| `--color-info` | `#4a72b8` | custom (warm blue) | Information state | Alliance, research, info panels |
| `--color-info-soft` | `#6a8ec8` | custom | Softer info | Hover on info state |

**Resource colors — warm-shifted equivalents:**

| CSS variable | New hex ref | Old hex (replaced) | Rationale |
|---|---|---|---|
| `--color-food` | `#6aaa3a` | `#7cfc00` | De-saturated, warmer green; less neon |
| `--color-production` | `#c06040` | `#ff6b6b` | Warm terracotta instead of pure red |
| `--color-science` | `#4a80c8` | `#4dabf7` | Warmer, less neon blue |
| `--color-culture` | `#9060c0` | `#cc5de8` | Warmer purple |
| `--color-faith` | `#c0a870` | `#a0aec0` | Warm bronze-cream instead of cool slate |
| `--color-health-high` | `#4a8c5a` | `#51cf66` | Matches `--color-success` |
| `--color-health-low` | `#c53030` | `#ff6b6b` | Matches `--color-danger` |

### Harmonizing with existing tokens

The existing token system is not deleted — it is aliased. `palette-tokens.css` defines primitives and semantics; existing token files are patched to point their values at the new variables. All existing component code that uses `--panel-bg`, `--hud-bg`, `--color-surface` etc. inherits the warm palette automatically.

Note: `--amber-300` = `#fcd34d` and `--amber-400` = `#fbbf24` exactly match the existing `--panel-accent-gold-bright` and `--panel-accent-gold-soft` in `panel-tokens.css`. Those tokens become aliases of the new primitives.

**Tokens intentionally NOT changed in Phase 1** (deferred to Phase 4):
- `--panel-status-*` (diplomacy relationship palette)
- `--panel-spec-*` (governor specialization palette)
- `--panel-accent-success`, `--panel-accent-danger`, `--panel-accent-info` and siblings
- `--hud-tooltip-*` (tooltip body palette)
- `--hud-notification-*` (category colors)
- `--hud-combat-*` (combat preview colors)
- `--color-glow`, `--color-glow-strong` in `index.css`
- `--color-panel-bg`, `--color-panel-border` in `index.css` (legacy aliases)

## Z-index, opacity, motion tokens

These three token sets are defined in parallel Phase 1.1 deliverables. This document cross-references where they live — it does not redefine them.

**Z-index — `packages/web/src/styles/layer-tokens.css` (new):**
Fully specified in `systems/S-01-layer-and-zindex.md`. Scale: `--z-map: 0` through `--z-system-critical: 100` in decade steps. `panel-tokens.css` and `hud-tokens.css` add alias declarations mapping existing `--panel-z-*` / `--hud-z-*` names to canonical `--z-*` names. No existing consumer changes behavior in Phase 1.

**Opacity — `packages/web/src/styles/opacity-tokens.css` (new):**
Fully specified in `systems/S-04-transparency-semantics.md`. 16 semantic tokens: `--opacity-disabled: 0.30`, `--opacity-locked: 0.40`, `--opacity-inactive: 0.55`, etc. Component migration is Phase 4.

**Motion — `packages/web/src/styles/motion-tokens.css` (new):**
Fully specified in `systems/S-07-motion-and-animation.md`. Five duration tokens: `--motion-instant: 80ms` through `--motion-ceremony: 1200ms`. Five easing curves. `prefers-reduced-motion` override block halves all durations. Applied to panel chrome in Phase 6 juice pass.

**Import order in `packages/web/src/App.tsx` (or root entry):**

```
layer-tokens.css         (new — Phase 1.1)
spacing-tokens.css       (new — Phase 1)
palette-tokens.css       (new — Phase 1)
typography-tokens.css    (new — Phase 1)
opacity-tokens.css       (new — Phase 1.1, parallel)
motion-tokens.css        (new — Phase 1.1, parallel)
panel-tokens.css         (existing — patched)
hud-tokens.css           (existing — patched)
index.css                (existing — patched)
```

## Google Fonts integration

### Fonts selected

**Cinzel** — Variable weight (400–900), Latin subset. Modern serif inspired by Roman inscriptions. Reads as imperial and formal. Closest open-source analog to the Trajan/Copperplate family used in Civ VII era titles. Used for `display` and `heading` roles.

**Inter** — Variable weight (100–900), Latin subset. Designed for screen legibility at small sizes. Includes tabular numeral support natively. Used for `body`, `label`, and `numeric` roles.

### `index.html` additions

Insert before any other stylesheet `<link>` tags, inside `<head>`:

```html
<!-- Google Fonts: Cinzel (display/heading) + Inter (body/label/numeric) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&family=Inter:wght@100..900&display=swap"
  rel="stylesheet"
>
```

**Why variable fonts via `wght@400..900` and `wght@100..900`:** a single variable-font request covers all required weights per family. Two network requests total, not six.

**`display=swap` is mandatory.** Ensures text renders immediately in the fallback font (no FOIT). The FOUT (Flash of Unstyled Text) on first load is acceptable — setup screen gives fonts time to load before gameplay begins. On cached loads (the common game-session case) there is no flash.

**CDN vs self-hosted:** Use Google Fonts CDN. Inter is one of the most widely cached fonts on the web. Switch to self-hosted only if offline deployment is required — the CSS variable definitions remain unchanged either way.

### Fallback stacks

Declared in `typography-tokens.css`:

```css
--type-display-family:  "Cinzel", "Trajan Pro", "Copperplate Gothic", "Georgia", "Times New Roman", serif;
--type-heading-family:  "Cinzel", "Trajan Pro", "Georgia", serif;
--type-body-family:     "Inter", system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
--type-label-family:    "Inter", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
--type-numeric-family:  "Inter", "SF Pro Text", system-ui, -apple-system, Arial, sans-serif;
```

### `index.css` font declaration change

```css
/* REMOVE: */
font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;

/* REPLACE WITH: */
font-family: var(--type-body-family);
font-size:   var(--type-body-size);
font-weight: var(--type-body-weight);
line-height: var(--type-body-leading);
```

## Migration plan — every file that changes

### New files to create

| File | Contents |
|---|---|
| `packages/web/src/styles/palette-tokens.css` | Primitive palette (olive/amber/cream/bronze, 10 stops each) + semantic color variables |
| `packages/web/src/styles/spacing-tokens.css` | `--space-xs` through `--space-2xl` + alias declarations for `--panel-padding-*` and `--hud-padding-*` |
| `packages/web/src/styles/typography-tokens.css` | Five role token sets + viewport-responsive `@media` cascades |
| `packages/web/src/styles/layer-tokens.css` | Z-index decade scale (S-01; Phase 1.1 parallel) |
| `packages/web/src/styles/opacity-tokens.css` | Opacity semantic vocabulary (S-04; Phase 1.1 parallel) |
| `packages/web/src/styles/motion-tokens.css` | Motion duration + easing curves + `prefers-reduced-motion` block (S-07; Phase 1.1 parallel) |

### Existing files to modify

| File | Change | Reason |
|---|---|---|
| `packages/web/index.html` | Add `preconnect` + Google Fonts `<link>` tag inside `<head>` | Load Cinzel + Inter |
| `packages/web/src/index.css` | (1) Replace `font-family` on `html, body, #root` with `var(--type-body-family)`. (2) Revalue `--color-bg`, `--color-surface`, `--color-surface-hover`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-hover`, `--color-gold`, and all resource colors. (3) Add `.numeric` class with `font-variant-numeric: tabular-nums`. | Warm palette + font wiring |
| `packages/web/src/styles/panel-tokens.css` | (1) Revalue `--panel-bg`, `--panel-border`, `--panel-title-color`, `--panel-text-color`, `--panel-muted-color`, `--panel-accent-gold`, `--panel-backdrop`. (2) Add z-index aliases: `--panel-z-info: var(--z-panel-info)`, `--panel-z-chrome: var(--z-chrome-bar)`, `--panel-z-overlay: var(--z-panel-overlay)`, `--panel-z-modal: var(--z-modal)`. (3) `--panel-padding-lg` shifts 16px to 20px via spacing alias. | Warm palette + unified z-scale |
| `packages/web/src/styles/hud-tokens.css` | (1) Revalue `--hud-bg`, `--hud-border`, `--hud-text-color`, `--hud-text-muted`. (2) Add z-index aliases: `--hud-z-minimap: var(--z-minimap)`, `--hud-z-floating-control: var(--z-panel-float-control)`, `--hud-z-fixed-corner: var(--z-hud-fixed-corner)`, `--hud-z-toast: var(--z-hud-toast)`, `--hud-z-tooltip: var(--z-hud-tooltip)`. | Warm palette + unified z-scale |
| `packages/web/src/App.tsx` (or root entry) | Add `import` statements for new CSS files in the order listed above | Make tokens available app-wide |

### Raw hex literals replaced in this phase (token files only)

**`packages/web/src/index.css` — 14 values revalued:**

| Variable | Old hex | New hex |
|---|---|---|
| `--color-bg` | `#0d1117` | `#1a1510` |
| `--color-surface` | `#161b22` | `#251e14` |
| `--color-surface-hover` | `#21262d` | `#2e261a` |
| `--color-border` | `#30363d` | `#4a3e28` |
| `--color-text` | `#f0f6fc` | `#f2e8d0` |
| `--color-text-muted` | `#8b949e` | `#a89070` |
| `--color-accent` | `#58a6ff` | `#d4943a` |
| `--color-accent-hover` | `#79c0ff` | `#e8aa50` |
| `--color-gold` | `#ffd700` | `#fbbf24` |
| `--color-food` | `#7cfc00` | `#6aaa3a` |
| `--color-production` | `#ff6b6b` | `#c06040` |
| `--color-science` | `#4dabf7` | `#4a80c8` |
| `--color-culture` | `#cc5de8` | `#9060c0` |
| `--color-faith` | `#a0aec0` | `#c0a870` |

**`packages/web/src/styles/panel-tokens.css` — values replaced:**

| Variable | Old value | New value |
|---|---|---|
| `--panel-bg` | `rgba(22, 27, 34, 0.96)` | `rgba(37, 30, 20, 0.96)` |
| `--panel-border` | `rgba(48, 54, 61, 0.85)` | `rgba(74, 62, 40, 0.85)` |
| `--panel-title-color` | `#f0f6fc` | `#f8f0d8` (= `--color-text-heading`) |
| `--panel-text-color` | `#f0f6fc` | `#f2e8d0` (= `--color-text`) |
| `--panel-muted-color` | `#8b949e` | `#a89070` (= `--color-text-muted`) |
| `--panel-accent-gold` | `#ffd700` | `#fbbf24` (= `--color-gold`) |
| `--panel-backdrop` | `rgba(0, 0, 0, 0.65)` | `rgba(0, 0, 0, 0.45)` (per S-04) |
| `--panel-turn-badge-text` | `#0d1117` | `#1a1510` (= new `--color-bg`) |
| `--panel-turn-badge-border` | `#1a1f29` | `#1a1510` |

**`packages/web/src/styles/hud-tokens.css` — values replaced:**

| Variable | Old value | New value |
|---|---|---|
| `--hud-bg` | `rgba(15, 23, 42, 0.94)` | `rgba(20, 16, 10, 0.94)` |
| `--hud-border` | `rgba(148, 163, 184, 0.25)` | `rgba(168, 144, 112, 0.25)` |
| `--hud-text-color` | `#f0f6fc` | `#f2e8d0` (= `--color-text`) |
| `--hud-text-muted` | `#94a3b8` | `#a89070` (= `--color-text-muted`) |

## Acceptance criteria

1. **No raw hex in six token files.** After migration: `palette-tokens.css`, `spacing-tokens.css`, `typography-tokens.css`, `panel-tokens.css`, `hud-tokens.css`, and `index.css` contain only variable definitions. Pre-commit grep for `#[0-9a-fA-F]{3,6}` in component `.tsx` files produces zero new hits. Raw hex is acceptable inside `styles/*.css` only where defining primitive palette values.

2. **Cinzel and Inter load without FOUT flash > 100ms.** Chrome DevTools Performance trace: CLS near 0 for first 2 seconds after font swap. Or direct visual check in `npm run dev:web`.

3. **`npm run build` succeeds** — no TypeScript errors, no CSS import errors, no missing variable references.

4. **All chrome surfaces render with warm-earth palette.** Visual check: warm olive/bronze backgrounds on PanelShell, TooltipShell, TopBar, BottomBar. Cold GitHub-dark-mode slate (`#0d1117`, `#161b22`) no longer visible.

5. **Cinzel renders in panel title bars.** Open any panel (press H). DevTools Computed Styles: `font-family` on panel title resolves to `"Cinzel"`.

6. **Inter renders in resource chip numbers with tabular-nums.** DevTools: `font-family` on resource chip number resolves to `"Inter"`. `font-variant-numeric` computes to `tabular-nums`.

7. **Playwright visual-regression snapshots update deliberately.** Baseline taken before merge. Every diff shows warm-brown palette vs cold-slate. No layout shifts, no missing elements. Reviewed manually.

8. **`--space-*` tokens resolve correctly.** DevTools: `var(--panel-padding-lg)` = `20px`; `var(--panel-padding-sm)` = `8px`; `var(--space-2xl)` = `48px`.

9. **Typography composite token resolves.** DevTools: `var(--type-body)` = `400 14px/1.45 "Inter", system-ui, ...`. `var(--type-heading)` = `600 18px/1.25 "Cinzel", ...`.

## Open questions

3 open questions flagged for parent-agent decision:

1. **Warm-accent color: amber vs bronze for `--color-accent`.** Proposed `#d4943a` (warm bronze-orange) replaces current blue `#58a6ff`. Amber (`#fbbf24`) reads "gold = precious" while bronze (`#d4943a`) reads "bronze = ancient material". Recommendation: bronze for interactive accent since `--color-gold` (`#fbbf24`) is already the resource-icon color — two near-identical golden tones in adjacent roles would blur together. Flag for a quick review once rendered; resolve before Phase 4.

2. **`--panel-padding-lg` bump: 16px to 20px.** The S-03 spec locks this at 20px but the current codebase value is 16px. The 4px increase is visible — every panel using this token gains outer padding. Spot-check CityPanel and TechTreePanel density at standard viewport after migration. If too airy for the strategy-game density goal, update S-03 to confirm 16px or 18px. Decision needed before Phase 4 panel chrome pass.

3. **Game-data color palette warm-compatibility.** Diplomatic status colors (`--panel-status-war: #dc2626`, `--panel-status-friendly: #60a5fa`) are cold-palette. Two options: (a) warm-shift all game-data semantic colors (war = terracotta, friendly = warm teal); (b) keep them as saturated vivid signals against the warm background. Both are defensible. Decision needed before Phase 4 begins.

## Cross-refs

- `systems/S-01-layer-and-zindex.md` — z-index tokens cross-referenced; `layer-tokens.css` is a parallel Phase 1.1 deliverable
- `systems/S-03-sizing-table.md` — spacing scale source of truth; `spacing-tokens.css` materializes those values
- `systems/S-04-transparency-semantics.md` — opacity tokens cross-referenced; `opacity-tokens.css` is Phase 1.1 parallel
- `systems/S-07-motion-and-animation.md` — motion tokens cross-referenced; `motion-tokens.css` is Phase 1.1 parallel
- `00-philosophy.md` — P3 (chrome has texture, warm neutral base), P10 (density), P11 (system-first), P12 (viewport-aware)
- `08-master-plan.md` — Phase 1 is the design-token expansion step; Phase 1.5 picks up viewport-class-conditional sizing; Phase 4 applies these tokens to panel chrome in the Civ-VII treatment pass
- `.claude/rules/panels.md` — "token-only chrome" rule; raw hex in chrome is a BLOCK
- `.claude/rules/ui-overlays.md` — same rule for HUD elements
- `.claude/rules/tech-conventions.md` — "never hardcode colors"

**Sibling docs that should cross-reference this spec:**
- `systems/S-01-layer-and-zindex.md` — add note that `layer-tokens.css` is created as part of Phase 1
- `systems/S-03-sizing-table.md` — add note that `spacing-tokens.css` materializes its spacing table
- `systems/S-04-transparency-semantics.md` — add note that `palette-tokens.css` provides the color-mix base colors
