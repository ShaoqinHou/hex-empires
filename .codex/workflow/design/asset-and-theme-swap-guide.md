---
title: Asset + theme swap guide
purpose: Single authoritative reference for swapping every kind of art, sound, color, font, and chrome token in hex-empires.
created: 2026-04-18
status: canonical — this doc + the files it references are the full swap surface
---

# Asset + theme swap guide

**Promise:** every piece of visual or audio content in hex-empires can be swapped by editing **one of eleven files** (nine CSS token files + the asset registry + its loader). Nothing has to be hunted down across components.

If you ever find yourself needing to edit a `.tsx` file to change a color, font, border, image URL, or sound URL — the system is broken and the change should move to tokens/registry first.

---

## Two systems, two layers each

### System 1 — CSS token layer (colors, fonts, spacing, chrome, motion)

Three layers, strict direction of reference:

```
primitive tokens        (raw hex, raw pixel values)
       ↓
semantic tokens         (named by meaning — --color-accent, --panel-bg)
       ↓
component consumption   (var(--panel-bg) in PanelShell.tsx)
```

Components only read semantic tokens. Primitives are never referenced outside the palette file. Add a new token before writing a new literal anywhere.

### System 2 — Asset registry (images, audio)

Two layers:

```
registry.ts             (logical name → URL + metadata)
       ↓
loader.ts               (typed getters: getLeaderPortrait(id), getBackground(key), ...)
       ↓
component consumption   (<img src={getLeaderPortrait(leaderId)} />)
```

Components never hardcode `/assets/...` paths. They call typed getters. Missing keys return a fallback silently plus a dev-only console warning.

---

## File-by-file swap cheat sheet

| Want to change… | Edit | Ripple |
|---|---|---|
| Entire color palette (warm → cold, etc.) | `packages/web/src/styles/palette-tokens.css` — primitives + semantic aliases | All panels, HUD, bars, tooltips shift together |
| One semantic color (`--color-accent`) | `palette-tokens.css` § SEMANTIC COLOR TOKENS | Every surface using `var(--color-accent)` flips |
| Panel chrome — title rule, bronze bevel, modal vignette | `packages/web/src/styles/panel-tokens.css` | All 19 panels inherit via `PanelShell` |
| TopBar / BottomBar chrome | `panel-tokens.css` — `--chrome-bar-*` block | Both bars harmonized |
| HUD overlays — tooltip, toast, validation feedback | `packages/web/src/styles/hud-tokens.css` | Every `TooltipShell`-wrapped overlay |
| Typography — fonts, sizes, weights | `packages/web/src/styles/typography-tokens.css` | Heading vs body vs numeric all controlled here |
| Spacing scale | `packages/web/src/styles/spacing-tokens.css` | 4-point grid; all padding/gap consumers |
| Motion timings + easings | `packages/web/src/styles/motion-tokens.css` | Every transition/animation using tokens |
| Layer stacking (z-index) | `packages/web/src/styles/layer-tokens.css` | Panels, overlays, tooltips, modals |
| Opacity scale (hovered/disabled/ghost) | `packages/web/src/styles/opacity-tokens.css` | Any semantic opacity consumer |
| Viewport-class breakpoints / layout rules | `packages/web/src/styles/layout-tokens.css` | Responsive sizing across standard/wide/ultra |
| Leader portraits | `packages/web/src/assets/registry.ts` § LEADER_PORTRAITS | All `getLeaderPortrait()` call sites |
| Civ glyphs / icons / backgrounds / music / SFX | `registry.ts` respective block | Every call site through `loader.ts` |
| Fallback art / audio | `registry.ts` — each category's `fallback` field | Shown whenever a specific key is missing |

Eleven files total. That is the entire swap surface.

---

## Recipe 1 — swap the full color theme (warm earth → cold steel example)

**What you're changing:** the whole palette mood without touching any component.

1. Open `packages/web/src/styles/palette-tokens.css`.
2. The file has two sections: `PRIMITIVE PALETTE` (four families × 10 stops each) and `SEMANTIC COLOR TOKENS` (aliases into primitives).
3. For a theme swap, you have two choices:
   - **Low effort** — replace the primitive values only (keep names). Every semantic that reads `var(--amber-400)` etc. gets the new value automatically.
   - **Clean** — keep the old primitives, add a new family (e.g. `--steel-*`), and re-point semantic tokens:
     ```css
     --color-accent: var(--steel-400);
     --color-bg: #0f1824;
     ```
     This preserves history and lets you toggle themes later.
4. Run the game (`npm run dev:web`) — all panels, HUD, bars, tooltips shift together. No component edits.
5. Check contrast for key semantic pairs: `--color-text` on `--color-bg` ≥ 4.5:1; `--color-accent` on `--color-bg` ≥ 3:1.

**What you do NOT do:** edit any `.tsx` file. If you find yourself wanting to, there's a raw-hex leak somewhere — grep `#[0-9a-fA-F]{3,6}` under `packages/web/src/` and tokenize it first.

---

## Recipe 2 — tweak one chrome element (e.g. re-add the corner ornament we dropped in Phase 4)

**What you're changing:** PanelShell chrome. Everything else stays.

1. Open `packages/web/src/styles/panel-tokens.css`.
2. Add a new token:
   ```css
   --panel-corner-ornament: url("data:image/svg+xml;utf8,<svg ...>...</svg>");
   ```
3. Edit `packages/web/src/ui/panels/panel-shell.css` (the scoped file introduced in Phase 4.1) to consume it — e.g. add a `::before` on the panel container positioned at top-left, `background-image: var(--panel-corner-ornament)`.
4. Run the game — all 19 panels inherit.

**Reminder:** the reason we dropped the corner ornament in Phase 4 was clipping at narrow viewport (320px width). If you re-add, test at `standard`/`wide`/`ultra` first. See `.codex/workflow/design/ui-review/phase-4-chrome-skeptic.md` §4 for the failure modes to avoid.

---

## Recipe 3 — swap a font (e.g. Cinzel → IM Fell for headings)

1. Open `packages/web/index.html` — adjust the Google Fonts `<link>` import to load the new font.
2. Open `packages/web/src/styles/typography-tokens.css` — update `--font-display` (or whichever semantic role the font serves).
3. Done. Every heading across panels, modals, HUD re-renders with the new face.

**Do NOT** edit `font-family` in component styles. If a component has a hardcoded family, move it to tokens first.

---

## Recipe 4 — swap a real asset (e.g. drop in final Augustus portrait)

1. Put the new file at `packages/web/public/assets/images/leaders/augustus.webp`.
2. Open `packages/web/src/assets/registry.ts` § `LEADER_PORTRAITS`.
3. Edit that entry:
   ```ts
   ['augustus', {
     path: '/assets/images/leaders/augustus.webp',
     source: 'final',                               // was 'placeholder'
     attribution: 'Commissioned — Artist Name 2026',
     dimensions: [768, 1024],
   }],
   ```
4. No component changes. `<img src={getLeaderPortrait('augustus')} />` sites update.

**The `source` field matters.** `'placeholder' | 'commissioned' | 'final' | 'cc0' | 'ai-generated'` drives the per-asset status dashboard and the bulk-validation script. Keep it current as content progresses.

---

## Recipe 5 — add a brand-new asset category (e.g. faction banners)

1. Define the category in `registry.ts`:
   ```ts
   export const FACTION_BANNERS: AssetCategoryRef = {
     entries: new Map([
       ['rome', { path: '/assets/images/banners/rome.svg', source: 'placeholder' }],
       // ...
     ]),
     fallback: { path: '/assets/images/banners/_fallback-banner.svg', source: 'placeholder' },
   };
   ```
2. Add to the `ALL_ASSET_CATEGORIES` map at the bottom so the validator sees it.
3. Add a typed getter in `loader.ts`:
   ```ts
   export function getFactionBanner(civId: CivilizationId): string {
     return resolveAsset(FACTION_BANNERS, civId).path;
   }
   ```
4. Consume from any component: `<img src={getFactionBanner(civ.id)} />`.

---

## Component-level rules (enforce with your eyes + the `chrome-raw-hex-regression` trap)

1. **No raw hex in `.tsx` files.** Not in `style={{ color: '#xxx' }}`, not in Tailwind utilities (`bg-slate-900`), not in lookup maps (`STATUS_COLORS = { war: '#dc2626' }`). Tokenize first.
2. **No hardcoded `/assets/...` paths in `.tsx`.** Always go through `loader.ts` getters.
3. **No `font-family` literals outside `typography-tokens.css`.** Always a `var(--font-*)`.
4. **No hardcoded px spacing for padding/gap.** Use `var(--space-*)` or `var(--panel-padding-*)`.
5. **Raw rgba is OK inside token files** — primitives ARE where colors live. Outside token files it's forbidden.

The reviewer's `chrome-raw-hex-regression` trap catches violations at commit time. The hook also greps for raw hex in panel/HUD chrome.

---

## Why this matters — the "swap" promise

At any later point in the project's life you should be able to:

- Commission a new color palette from a designer and apply it in 1 PR touching 1 file.
- Swap placeholder leader portraits for commissioned art without touching components.
- Experiment with a Cold War theme vs the current Classical feel by toggling which palette file is imported.
- License a Kenney CC0 icon pack and drop it in by pointing registry paths at the new files.
- Change motion feel (snappy → stately) by editing 5 timing tokens.

If any of these stops being true, the system has drifted and needs a rule-doc refresh.

---

## Cross-refs

- `packages/web/src/styles/palette-tokens.css` — primitive + semantic colors
- `packages/web/src/styles/panel-tokens.css` — panel + chrome-bar chrome
- `packages/web/src/styles/hud-tokens.css` — HUD overlays
- `packages/web/src/styles/typography-tokens.css` — fonts + scale
- `packages/web/src/styles/spacing-tokens.css` — 4-pt grid
- `packages/web/src/styles/motion-tokens.css` — timings + easings
- `packages/web/src/styles/layer-tokens.css` — z-index stacking
- `packages/web/src/styles/opacity-tokens.css` — opacity scale
- `packages/web/src/styles/layout-tokens.css` — responsive breakpoints
- `packages/web/src/assets/registry.ts` — logical-name → path map
- `packages/web/src/assets/loader.ts` — typed getters + fallback logic
- `.codex/rules/panels.md` — `PanelShell` tokens-only chrome rule
- `.codex/rules/ui-overlays.md` — HUD tokens-only chrome rule
- `.codex/workflow/design/ui-review/phase-1-design-tokens-spec.md` — palette rationale
- `.codex/workflow/design/ui-review/phase-4-chrome-pragmatist.md` + `phase-4-chrome-skeptic.md` — Phase 4 chrome direction (what shipped, what didn't, why)
- `.codex/workflow/design/ui-review/09-asset-pipeline.md` — the asset pipeline's origin spec
