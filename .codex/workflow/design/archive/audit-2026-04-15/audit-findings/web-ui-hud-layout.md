# Audit: web/src/ui/hud + ui/components + ui/layout + styles

Auditor: claude-sonnet-4-6
Date: 2026-04-15
Scope: `packages/web/src/ui/hud/`, `packages/web/src/ui/components/`, `packages/web/src/ui/layout/`, `packages/web/src/styles/`
Standards applied: S-HUD-SHELL-REQUIRED, S-HUD-MANAGER, S-HUD-TOKENS-ONLY, S-HUD-REGISTRY, S-HUD-ESC-SINGLE, S-HUD-NO-MAGIC-POSITIONING, S-HUD-NO-OCCLUDE, S-HUD-STACK-CYCLE, S-GAME-FEEL-INVARIANTS, S-NEVER-HARDCODE-COLORS, S-LAYOUT-NO-LOCAL-PANEL-STATE

---

## Summary

The HUD layer was substantially refactored before this audit. The core infrastructure (`HUDManager`, `TooltipShell`, `hudRegistry`, `hud-tokens.css`) is correctly implemented and the major overlays (`TooltipOverlay`, `UrbanPlacementHintBadge`, `Notifications`, `ValidationFeedback`, `EnemyActivitySummary`, `TurnTransition`, `CombatHoverPreview`) have all been migrated to `TooltipShell`. The architecture is sound. Findings are mostly B/C severity.

**Finding counts:** 1 × A, 8 × B, 4 × C

---

## A-grade findings (critical — blocks migration intent)

### A-1 · S-NEVER-HARDCODE-COLORS · `TopBar.tsx` — `PanelButton` color prop plumbed with raw hex

**File:** `packages/web/src/ui/layout/TopBar.tsx` lines 90–93, 199
**Standard:** S-NEVER-HARDCODE-COLORS, S-NO-RAW-HEX-CHROME

`PanelButton` takes a `color: string` prop and constructs the button's gradient background from it inline:

```tsx
<PanelButton label="Tech"   color="#4dabf7" panelId="tech"     … />
<PanelButton label="Civics" color="#cc5de8" panelId="civics"   … />
<PanelButton label="Diplo"  color="#ba68c8" panelId="diplomacy"… />
<PanelButton label="Ages"   color="#ffd54f" dark panelId="age" … />
```

And inside `PanelButton`:
```tsx
style={{
  background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
  color: dark ? '#0d1117' : '#fff',
  border: `1px solid ${color}80`,
}}
```

These four button colors are the TopBar's per-panel accent palette. They belong in `panel-tokens.css` as `--panel-btn-tech`, `--panel-btn-civics`, etc., and `#0d1117` / `#fff` are generic dark/light chrome literals that should be named tokens. All four hex literals reach the DOM via inline `style` and are not behind a `var()` wrapper.

Additional raw hex on the same file:
- Line 61: `color: '#0d1117'` (Turn-N badge foreground)
- Lines 137–139: End Turn button `background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'`, `color: '#fff'`

**Fix:** Add `--panel-btn-tech: #4dabf7`, `--panel-btn-civics: #cc5de8`, `--panel-btn-diplomacy: #ba68c8`, `--panel-btn-age: #ffd54f` and `--panel-btn-text-dark: #0d1117` to `panel-tokens.css`. Replace the raw hex prop with `var(--panel-btn-*)`. Move End Turn green to a `--panel-btn-end-turn-start / --panel-btn-end-turn-end` gradient token pair (or reuse `--panel-accent-success-bright`).

---

## B-grade findings (high — actionable, should fix before next release)

### B-1 · S-HUD-MANAGER · `CombatHoverPreview`, `TurnTransition`, `ValidationFeedback` — not registered with HUDManager

**Files:**
- `packages/web/src/ui/components/CombatHoverPreview.tsx`
- `packages/web/src/ui/components/TurnTransition.tsx`
- `packages/web/src/ui/components/ValidationFeedback.tsx`

All three are listed in `hud-elements.md` and have `hudRegistry` entries, but none call `useHUDManager().register(...)`. By contrast, `Notifications`, `EnemyActivitySummary`, `TooltipOverlay`, and `UrbanPlacementHintBadge` all correctly register.

`CombatHoverPreview` is `sticky: true` in `hud-elements.md`, meaning ESC should dismiss it via `HUDManager`. Without registration, ESC falls through to the canvas deselect handler instead, breaking the documented ESC precedence chain (S-HUD-ESC-SINGLE rule item 2).

`ValidationFeedback` auto-dismisses, so the ESC gap is less critical, but the lifecycle tracking the manager promises (`isActive(id)`, coordinated `dismissAll()`) is unavailable.

`TurnTransition` is sticky in `hud-elements.md` — same concern as `CombatHoverPreview`.

**Fix:** Add `useHUDManager().register('combatPreview', { sticky: true })` / `register('turnTransition', { sticky: true })` / `register('validationFeedback', { sticky: false })` effect in each component, mirroring the pattern in `EnemyActivitySummary.tsx` lines 63–70.

---

### B-2 · S-NEVER-HARDCODE-COLORS · `Minimap.tsx` — `TERRAIN_PALETTE`, `playerColors`, canvas strokes

**File:** `packages/web/src/ui/components/Minimap.tsx` lines 11–19, 59, 93, 102, 135

`TERRAIN_PALETTE` is a `Record<string, string>` of seven raw hex terrain colors hard-coded in the component:

```ts
const TERRAIN_PALETTE: Record<string, string> = {
  grassland: '#5da84e', plains: '#d4b85a', desert: '#e8d5a3',
  tundra: '#b0c4ce',    snow: '#eaf4f4',   coast: '#5ba0d0',
  ocean: '#1e4d7a',
};
const TERRAIN_FALLBACK = '#454a52';
```

`playerColors` (line 93) is a six-element raw-hex array for per-player city/unit dots. Canvas fill values `'#000'` (line 59) and stroke values `'#fff'` / `'#ffffff'` (lines 102, 135) also hard-code.

**Note:** Canvas 2D API cannot read CSS custom properties directly — `ctx.fillStyle = 'var(--hud-terrain-grassland)'` does not resolve. The correct fix is to read computed styles via `getComputedStyle(document.documentElement).getPropertyValue('--hud-terrain-grassland')` or to define a matching JS-side constant object whose values reference a token comment for the designer. The palette should move to `hud-tokens.css` with a comment cross-referencing the minimap JS constants so designers have a single edit point.

**Fix:** Define `--hud-minimap-terrain-grassland: #5da84e` etc. in `hud-tokens.css`, update comments in `Minimap.tsx` to say "must match `--hud-minimap-terrain-*` tokens", and read them with `getComputedStyle` at canvas draw time.

---

### B-3 · S-NEVER-HARDCODE-COLORS · `UnitCard.tsx` — `CATEGORY_COLORS` lookup table

**File:** `packages/web/src/ui/components/UnitCard.tsx` lines 21–27, 31, 118

```ts
const CATEGORY_COLORS: Record<string, string> = {
  melee: '#e53935', ranged: '#42a5f5', cavalry: '#ff9800',
  siege: '#78909c', naval: '#26c6da',  civilian: '#66bb6a', religious: '#ab47bc',
};
const catColor = CATEGORY_COLORS[unit.category] ?? '#999';
```

The "raw hex in a lookup table" pattern is explicitly called out in the standards as an anti-pattern. These semantic slot names match `panel-tokens.css`'s existing category-specific patterns but the unit category colors are not yet tokenised.

**Fix:** Add `--panel-unit-melee: #e53935` etc. to `panel-tokens.css` and replace the `CATEGORY_COLORS` map with a CSS-custom-property approach (e.g., `getComputedStyle(document.documentElement).getPropertyValue(...)` read once at mount, or a `data-category` attribute + CSS rule).

---

### B-4 · S-NEVER-HARDCODE-COLORS · `BottomBar.tsx` — `InfoPill`/`ActionButton` inline `rgba` chrome + raw `#ffd54f`, `#0d1117`

**File:** `packages/web/src/ui/layout/BottomBar.tsx` lines 164, 190, 202, 213, 229, 339, 356, 374, 381, 398, 468

`InfoPill` accepts raw `rgba(...)` strings for `color` and `border` props (lines 164, 190, etc.), and callers pass magic rgba constants inline at every use site. `ActionButton` (line 468) has `color: textColor ?? '#0d1117'`. Line 213 has `color: '#ffd54f'` for the promotion badge.

These are not one-off, hard-to-extract values — they are systematic per-entity-type chrome accents (unit blue, enemy red, research blue, civic purple) that belong in `panel-tokens.css`.

**Fix:** Introduce `--panel-bb-unit-bg`, `--panel-bb-enemy-bg`, `--panel-bb-research-bg`, `--panel-bb-civic-bg`, etc. tokens and wire `InfoPill` to accept a token name or use CSS custom properties directly.

---

### B-5 · S-NEVER-HARDCODE-COLORS · `BuildingCard.tsx` — raw `#fbbf24` for selection highlight

**File:** `packages/web/src/ui/components/BuildingCard.tsx` lines 41, 44

```tsx
backgroundColor: isSelected ? '#fbbf24' : 'transparent',
border: isSelected ? '2px solid #fbbf24' : '1px solid var(--panel-border)',
```

`#fbbf24` is `--panel-accent-gold-soft`, which is already defined in `panel-tokens.css`. This is a straight substitution.

**Fix:** Replace `'#fbbf24'` with `'var(--panel-accent-gold-soft)'`.

---

### B-6 · S-HUD-NO-MAGIC-POSITIONING · `TopBar.tsx` — save toast `absolute top-14 right-4`, overflow menu `absolute right-0 top-9`

**File:** `packages/web/src/ui/layout/TopBar.tsx` lines 105, 161–163

Save toast:
```tsx
<div
  className="absolute top-14 right-4 px-4 py-2"
  style={{ zIndex: 'var(--panel-z-overlay)' as unknown as number, … }}
>
```

Overflow menu:
```tsx
<div className="absolute right-0 top-9 rounded-lg shadow-xl py-1 min-w-36"
  style={{ zIndex: 'var(--panel-z-overlay)' as unknown as number, … }}>
```

Both use Tailwind magic-number position utilities (`top-14`, `right-4`, `top-9`, `right-0`). The save toast is a transient overlay that belongs in the toast queue (`Notifications`). The overflow menu is layout, not a tooltip/panel, but its pixel offset should still use spacing tokens rather than magic Tailwind steps.

The save toast's `zIndex: 'var(--panel-z-overlay)'` cast trick (`as unknown as number`) is also present; it works but is fragile — if the token changes type context this cast silently passes a string.

**Fix (save toast):** Route save-complete through `Notifications.tsx`'s push API (tracked as `TODO(HUD cycle f)` in `Notifications.tsx` line 112). For now, at minimum replace `absolute top-14 right-4` with a token-driven offset. **Fix (menu):** Use a named spacing token (`--panel-z-overlay`, `--panel-dropdown-offset`) rather than Tailwind hard-coded step.

---

### B-7 · S-HUD-NO-MAGIC-POSITIONING · `Minimap.tsx` — `absolute bottom-16 left-2` container

**File:** `packages/web/src/ui/components/Minimap.tsx` line 162

```tsx
<div
  data-hud-id="minimap"
  className="absolute bottom-16 left-2 rounded-lg overflow-hidden cursor-pointer"
  style={{ border: '…', backgroundColor: '…', zIndex: 'var(--hud-z-minimap)' … }}
>
```

`bottom-16` is a Tailwind magic number (4rem) that hard-codes the minimap's vertical offset from the bottom of the game surface. When `BottomBar` height changes, this offset must be manually updated. `left-2` is a magic 8px.

**Fix:** Define `--hud-minimap-offset-bottom` and `--hud-minimap-offset-left` in `hud-tokens.css` and reference them via inline `style.bottom` / `style.left` rather than Tailwind utilities.

---

### B-8 · S-HUD-TOKENS-ONLY · `TooltipShell.tsx` — `--hud-z-floating` token used but not defined in `hud-tokens.css`

**File:** `packages/web/src/ui/hud/TooltipShell.tsx` line 185
**Related:** `packages/web/src/styles/hud-tokens.css`

```ts
const SHELL_Z_INDEX = 'var(--hud-z-floating, var(--panel-z-overlay, 110))';
```

`--hud-z-floating` is referenced with a fallback chain, but it is not defined in `hud-tokens.css`. The token `--hud-z-floating-control: 110` is defined (line 157), but `--hud-z-floating` itself is absent. The shell therefore silently falls back to `--panel-z-overlay` (110). This will produce the correct visual result at runtime, but the intention (floating tooltips at a distinct z-tier) cannot be configured independently of panel overlays without adding the missing token.

**Fix:** Add `--hud-z-floating: 130;` to `hud-tokens.css` between `--hud-z-fixed-corner: 120` and `--hud-z-toast: 140` to fill the z-index progression documented in the existing comments.

---

## C-grade findings (low — should track, fix in a later cleanup cycle)

### C-1 · S-NEVER-HARDCODE-COLORS · `TooltipOverlay.tsx` — resource dot raw hex in CSS fallback position

**File:** `packages/web/src/ui/hud/TooltipOverlay.tsx` lines 484–487

```tsx
style={{
  backgroundColor:
    resource.type === 'luxury'   ? 'var(--color-resource-luxury, #ffd54f)'
    : resource.type === 'strategic' ? 'var(--color-resource-strategic, #9e9e9e)'
    : 'var(--color-resource-bonus, #66bb6a)',
}}
```

The primary token references (`--color-resource-luxury` etc.) are correct form, but the fallback values are raw hex. Since `--color-resource-*` tokens do not appear to be defined anywhere in the checked CSS files, the browser will always resolve to the raw hex fallback, making the var() wrappers no-ops. This is a styling-correctness issue (the tokens aren't wired up) compounded by a hardcode-colors violation.

**Fix:** Define `--color-resource-luxury`, `--color-resource-strategic`, and `--color-resource-bonus` in `index.css` (alongside the other `--color-*` game tokens). The raw hex fallbacks in the component can then be removed.

---

### C-2 · S-NEVER-HARDCODE-COLORS · `UrbanPlacementHintBadge.tsx` — `#fbbf24` fallback in inline style

**File:** `packages/web/src/ui/hud/UrbanPlacementHintBadge.tsx` line 148

```tsx
color: 'var(--hud-text-emphasis, var(--panel-accent-gold, #fbbf24))',
```

Triple-fallback is defensive and technically correct: `--hud-text-emphasis` is defined (`#fbbf24` in `hud-tokens.css`), so the inner fallbacks are never reached. However the raw hex literal at the leaf position means any lint rule checking for `#[0-9a-fA-F]` will flag this file even though it's unreachable. The last fallback could be removed entirely since both outer tokens are defined.

**Fix:** Simplify to `'var(--hud-text-emphasis, var(--panel-accent-gold))'` — if both are undefined in a test environment the computed property is empty, which is preferable to silently applying a literal.

---

### C-3 · S-LAYOUT-NO-LOCAL-PANEL-STATE · `TopBar.tsx` — `showMoreMenu` is local `useState<boolean>` for UI visibility

**File:** `packages/web/src/ui/layout/TopBar.tsx` line 12

```tsx
const [showMoreMenu, setShowMoreMenu] = useState(false);
```

This is a dropdown overflow menu, not a panel — so `PanelManager` does not own it. However it is local UI visibility state in a layout component. ESC does not dismiss it (the `HUDManager` and `PanelManager` ESC handlers have no awareness of this menu). If a player opens the menu, then presses ESC expecting to close it, ESC instead clears the canvas selection.

The standard `S-LAYOUT-NO-LOCAL-PANEL-STATE` targets panel visibility specifically, so this is a grey area. Raised as C because the menu is not currently in the `PanelId` union and the pattern creates a fourth ESC target that no manager owns.

**Fix options:** (a) Make the overflow menu a proper `PanelId` panel (`priority: 'info'`), or (b) add a `useEffect` ESC listener specifically for this menu that runs before `HUDManager`'s capture-phase handler. Option (a) is architecturally cleaner.

---

### C-4 · S-HUD-REGISTRATION · `hudRegistry.ts` — `yieldsToggle` entry exists but component does not call `register()`

**File:** `packages/web/src/ui/components/YieldsToggle.tsx`; cross-ref `packages/web/src/ui/hud/hudRegistry.ts` line 31

`hudRegistry` lists `'yieldsToggle'` with `priority: 'floating'`. `YieldsToggle.tsx` does set `data-hud-id="yieldsToggle"` for E2E selectors (correct), but does not call `HUDManager.register('yieldsToggle', ...)`. This is intentional by the component's own comment ("it is not a tooltip … does not wrap `TooltipShell`"), but the standard `S-HUD-REGISTRATION` says every element in `hudRegistry` should register. As a persistent always-mounted control, `isActive('yieldsToggle')` will always return `false`, which may confuse future code that checks `isActive` to decide overlay suppression.

**Fix:** Either (a) call `register('yieldsToggle', { sticky: true })` once on mount and `unregister` on unmount, or (b) amend the rule doc / `hud-elements.md` to explicitly carve out "persistent always-on controls" as not requiring manager registration, and remove the `yieldsToggle` entry from the registry.

---

## Token audit — `hud-tokens.css` + `panel-tokens.css`

### Defined but potentially unused

- `panel-tokens.css` line 53: `--hud-z-minimap: 90` — defined here (not in `hud-tokens.css`) to allow early Minimap migration. Used by `Minimap.tsx`. No issue.
- `hud-tokens.css` line 157: `--hud-z-floating-control: 110` — used by `YieldsToggle.tsx`. Correct.
- `hud-tokens.css` `--hud-padding-sm`, `--hud-padding-md` — used across overlay bodies. Correct.

### Referenced but not defined

- `--hud-z-floating` — see **B-8** above.
- `--color-resource-luxury`, `--color-resource-strategic`, `--color-resource-bonus` — see **C-1** above.
- `--hud-z-fixed-corner` is defined (120) and used correctly by `ValidationFeedback.tsx` (line 117). No issue.

### Naming divergence

`--hud-z-tooltip` (150, the top HUD tier) is used in `TurnTransition.tsx` line 84 for the backdrop z-index. The backdrop sits _below_ the `TooltipShell` body (also in `TurnTransition`), which uses `--hud-z-fixed-corner` (120). A backdrop at 150 is above the overlay at 120, which may cause the backdrop to obscure the body. This appears to be an inverted assignment.

**Fix:** The backdrop should use `--hud-z-fixed-corner` (120) and the announcement shell should use `--hud-z-tooltip` (150), or a dedicated `--hud-z-turn-transition-backdrop` / `--hud-z-turn-transition-body` token pair should be introduced. Currently, because `TooltipShell` sets `position: fixed` with `left` / `top` from placement math, and the backdrop is also `position: fixed; inset: 0`, the rendering order depends on DOM order (shell follows backdrop in JSX, so shell paints on top). The incorrect z-index values do not currently produce a visual bug but are semantically wrong and will become a bug if the order ever changes.

This is a **B-grade** finding under S-HUD-TOKENS-ONLY (wrong token for the semantic intent), but is listed here under the token section for discoverability. Tracking as **B-9** if the synthesis agent wants to elevate it.

---

## Compliant — no findings

The following components passed all checked standards:

- `HUDManager.tsx` — ESC ownership, capture phase, Tab-cycle, yield-to-panel logic: all correct.
- `hudRegistry.ts` — all ten ids present, entries complete.
- `TooltipShell.tsx` — `user-select: none`, `onContextMenu` suppression, data attributes, `aria-hidden` on compact, `tabIndex={-1}` for fixed-corner interactive shells, pointer-events discipline: all correct.
- `TooltipOverlay.tsx` — `HUDManager.register('tileTooltip', ...)`, `cycleIndex` consumption, compact/detailed tiers, M37-B civilian+military split, Tab-cycle pill: all correct. Tokens used throughout body.
- `UrbanPlacementHintBadge.tsx` — `HUDManager.register('urbanPlacementHint', ...)`, `TooltipShell` wrapping, all body styles use `var(--hud-*)` tokens: correct.
- `Notifications.tsx` — `HUDManager.register('notification', ...)`, `TooltipShell`, all accent colors through `getNotificationColor()` which returns token strings: correct.
- `ValidationFeedback.tsx` — `TooltipShell`, `CATEGORY_ACCENT_VARS` returns `var(--hud-validation-icon-*)` strings: correct. Note: does not register with HUDManager (see **B-1**).
- `EnemyActivitySummary.tsx` — `HUDManager.register('enemyActivitySummary', { sticky: true })`, `dismiss()` on hide, `TooltipShell`, all body styles token-driven: correct.
- `TurnTransition.tsx` — backdrop token-driven (bar z-index inversion noted above as B-9), animation duration via `--hud-turn-transition-animation-duration`: correct pattern.
- `CombatHoverPreview.tsx` — `TooltipShell position="fixed-corner"`, `sticky`, all body accents via `var(--hud-*)` tokens: correct except missing HUDManager registration (see **B-1**).
- `YieldsToggle.tsx` — `var(--hud-z-floating-control)`, `var(--hud-floating-control-offset-bottom)`, `user-select: none`, `onContextMenu` suppression, no `TooltipShell` (correct — not tooltip-shaped), `data-hud-id` attribute: correct. Minor gap at C-4.
- `Tooltip.tsx` (`TooltipContent`) — pure body-layout helper, no positioning logic, no keyboard listeners: clean. Correctly documents that the old `Tooltip` wrapper was retired.
- `TopBar.tsx` — panel buttons use `data-panel-trigger` attribute and call `togglePanel()` via `usePanelManager()`. No local `useState` for panel visibility. Menu items correctly call `openFromMenu()` → `togglePanel()`. The `showMoreMenu` state is for the overflow dropdown, not a panel (see **C-3**).
- `BottomBar.tsx` — no local panel visibility state, no panel-opening code (correct — it's a read-only info bar). No per-overlay ESC handler.
- `panel-tokens.css` — all defined tokens appear to be used. The `--tech-state-*` aliases correctly re-export accent slots. No dead tokens found.
- `hud-tokens.css` — all defined tokens appear to be used by at least one consumer. One missing token noted (B-8).
