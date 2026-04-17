---
title: S-04 - Transparency and opacity semantics
purpose: Every alpha value in the UI means something. Opacity is a controlled vocabulary, not a free parameter. A system of tokens enforces meaning and kills the slightly-faded-to-look-nice drift.
created: 2026-04-17
locked_decisions:
  - "Aesthetic: modern Civ VII (olive/amber/cream/bronze)"
  - "Desktop-only (no touch)"
  - "Viewport classes: standard / wide / ultra"
dependencies:
  - S-01 (layering and z-index) - opacity is not a substitute for z-order
  - S-09 (state transitions) - hover/press/disabled states change opacity via tokens, not hand-tuned alphas
  - Phase 1.1 token expansion (master-plan)
---

# S-04 - Transparency and opacity semantics

## Purpose

Look at the current codebase and count: 107 `rgba(...)` literals across 20 files. Another 21 inline `opacity: 0.X` values. Each of those decisions was made by someone who thought "this should be a bit faded" — but no two of them used the same value, and no two of them meant the same thing. `opacity: 0.4` in `CityPanel` means "this control is unavailable because specialists are capped". `opacity: 0.4` in `DiplomacyPanel` means "this action is disabled because the target is at war". `opacity: 0.55` in `AchievementsPanel` means "this achievement is not yet earned". `opacity: 0.5` in `TechTreePanel` means "this prereq is not the currently-selected tech". `opacity: 0.6` in `TurnTransition` means "this is a secondary line of copy for dramatic pacing".

None of those meanings are wrong. They are all the same *visual pattern* (faded-to-imply-secondary) but with a different *semantic reason*. And because each call-site picked its own value, a player scanning the UI learns nothing. A faded thing might be "unavailable", "not selected", "not yet unlocked", "secondary copy", "background texture", "disabled", or "decorative", and they have to infer which from context. Compare that to a system where 0.30 always means "locked / unavailable" and 0.55 always means "visible-but-secondary": once the player internalizes it, every faded thing in the game reads the same way.

Transparency also sits at the intersection of several other broken-ness vectors flagged elsewhere in the review:

- **H-2 (chrome uniformity)** — every surface uses the same `rgba(22, 27, 34, 0.96)` background, which is fine as a panel default but gets copy-pasted into HUD, modals, toasts. If opacity tokens had semantic names, a tooltip could not silently inherit a panel alpha.
- **H-8 (overlay conflicts)** — simultaneous overlays stack alpha on alpha on alpha, producing a murky composite. Disciplined alpha stops the compound-transparency problem.
- **Trap registry: var-hex-alpha-interpolation** — `rgba(var(--color-gold), 0.2)` does not work in CSS. `color-mix()` does. Tokens for "20% of gold" either exist as pre-baked `rgba()` OR require `color-mix()` with a base variable. Either pattern works; an undisciplined mix does not.
- **F-0d84dfd4 / F-24a4b0e7** — the two Reviewer warnings open on `AchievementsPanel` are both "raw rgba alpha literal". They cannot be fixed without a token to point at. This system defines those tokens.

This doc defines a **controlled vocabulary of opacity tokens** that every surface draws from. Every alpha value means something the player can learn. Free-parameter opacity is banned.

## Scope

This system covers every alpha channel application in `packages/web/`:

- Chrome surfaces (panel bg, tooltip bg, modal backdrop, toast bg)
- Indicator states (disabled button, locked achievement, researched tech, fog-of-war tile)
- Map-layer overlays (placement hint glow, yield-overlay icons, validation-feedback wash, combat-preview tint)
- State transitions (hover-fade-in, ESC-dismiss fade-out, turn-transition dim)
- Tint accents (card backgrounds hinting at category, earned-achievement wash, adjacency-preview glow)
- Typography (muted text — but with strict rules; see "When alpha MAY NOT be used")
- Borders and outlines (subtle emphasis lines vs strong attention lines)

It does NOT cover:

- Canvas renderer alpha (hex-tile color blending is rendering code, not chrome; `HexRenderer.ts` runs at 60fps and needs raw numeric alpha for perf. It gets its own mini-vocab — see `Map-layer transparency`).
- Full-screen animated transitions (TurnTransition intro/outro uses keyframe `opacity: 0 → 1`; that is animation, not a semantic alpha).
- Image asset opacity (sprite transparency in PNGs, baked into assets).

The rule is: if opacity is a **visual decision** made in TypeScript/CSS about an element's presence/absence/emphasis, it goes through this system. If opacity is a transient animation frame, it is owned by S-09 (state transitions).

## The rule

**Every alpha value in `packages/web/src/` resolves through a token whose name declares meaning.** Raw decimal alphas (`opacity: 0.55`) in component code are a BLOCK. Raw `rgba(R, G, B, A)` literals in component code are a BLOCK. If the alpha you need does not have a token, add the token first, then use it.

The rule has three practical consequences:

1. **Reading an alpha tells you WHY the surface is faded.** `opacity: var(--opacity-disabled)` reads as "this is disabled". `opacity: var(--opacity-inactive)` reads as "this is visible but secondary". The reader of the code never wonders "was 0.55 because disabled or because de-emphasized?"
2. **A theme change becomes one-file.** Want fog-of-war slightly heavier? Change `--opacity-fog-seen`. Every tile layer that uses it updates.
3. **The system polices itself.** A grep for `opacity: 0\.` or `rgba\([^)]+, 0\.` in component files immediately surfaces violations. This goes into `check-edited-file.sh` in Phase 1.

### Why not just use Tailwind /10, /20, /30 utilities?

Tailwind `/XX` is a numeric-percentage shorthand that carries no semantic meaning. `bg-amber-500/30` and `bg-red-500/30` both say "30% alpha" but one means "warning wash" and the other means "danger wash". We want the token system to enforce the semantic tier — "warning-wash" or "danger-wash" — so the numeric value is invisible to the call-site. Tailwind numeric-alpha utilities are banned in component code for the same reason raw `rgba` is. They are acceptable inside the CSS file where tokens are *defined* if that is the cleanest way to bake a given value — but never in a `.tsx`.

## Token set

All tokens live in `packages/web/src/styles/opacity-tokens.css`, a new sheet imported once at app root (same pattern as `panel-tokens.css` / `hud-tokens.css`). Values are tuned against the existing dark-slate background plus modern Civ VII warm-earth palette. Every row in the table is an exact numeric value; implementers copy it exactly.

### State-indicator tokens (for interactive elements)

| Token | Value | When used |
|---|---|---|
| `--opacity-disabled` | `0.30` | An element is unavailable and the disablement is NOT due to locked content. Buttons the player *could* use but cannot right now (not enough gold, unit already moved, tech not met). Communicates "later, not here". |
| `--opacity-locked` | `0.40` | An element is unavailable because the content itself is locked. Future civs in AgeTransitionPanel, future government options, locked pantheons, locked policies. Paired with grayscale filter (see Ghost/silhouette). Communicates "not yet in the game for you". |
| `--opacity-inactive` | `0.55` | An element is visible and interactable but not the focus — secondary menu items, earned achievements the player has already viewed, already-built buildings in a list, prereq techs that are not the currently-selected path. Communicates "here for reference, not the star". |
| `--opacity-muted` | `0.70` | Supplementary copy — subtitles, empty-state hints, keyboard-hint badges, "turns to grow" secondary line. Still reads comfortably; clearly not the primary line. |
| `--opacity-hovered` | `1.00` | Full. Default for any active/hovered/selected/primary element. Included in the token set as a sibling so `opacity: var(--opacity-hovered)` is symmetric with the others in transition code. |

### Backdrop and scrim tokens

| Token | Value | When used |
|---|---|---|
| `--opacity-modal-backdrop` | `0.45` | The single darken-below-modal wash. Applied to the backdrop element that sits between canvas and a modal-priority panel. Tuned so the canvas is clearly de-focused but still identifiable (player still knows the map is there). Replaces today's `rgba(0, 0, 0, 0.65)` which is too heavy and reads as "app is loading". |
| `--opacity-hud-scrim` | `0.35` | Applied behind `fixed-corner` hover cards (combat preview, multi-entity tooltip) that partially occlude tiles. Slight wash under the card that separates it from the busy map without hiding the map entirely. |
| `--opacity-turn-transition-backdrop` | `0.15` | The extremely subtle full-screen wash during the brief Turn N→N+1 interstitial. Current raw value is `rgba(0, 0, 0, 0.15)`; already correct magnitude, just gets a token name. |
| `--opacity-fog-seen` | `0.55` | Tiles the player has seen but does not currently have visibility of (classic "memory" fog). Applied to the rendered tile color in the canvas. |
| `--opacity-fog-unseen` | `0.00` | Tiles never explored. Rendered as the fog asset itself, not as a transparency of the map — but the token exists to be explicit that "unseen" is a different state from "seen but faded". |

### Panel tint tokens (category hints on panel bodies)

| Token | Value | When used |
|---|---|---|
| `--opacity-panel-tint` | `0.08` | Subtle panel-body background wash that hints at category — the "earned achievement card" blue wash, the "selected civic" gold wash. The baseline for a category-tinted surface that stays readable against `--panel-bg`. |
| `--opacity-panel-tint-strong` | `0.15` | Stronger category hint — used for HOVERED card state, SELECTED civic/tech in a tree, ACTIVE turn's production card. Still reads as "wash, not background". |
| `--opacity-panel-tint-glow` | `0.30` | For the glow behind a wonder card, a completed age's banner gradient, the age-transition "ready to advance" pulse. Closest to opaque while still feeling like a wash. |

### Indicator stroke/outline tokens

| Token | Value | When used |
|---|---|---|
| `--opacity-indicator-subtle` | `0.20` | Border or outline only — hex-placement "valid" glow, subtle inset border on a card, tech-prereq connector line. Clear emphasis but not a filled surface. |
| `--opacity-indicator` | `0.40` | Stronger outline — selected card border, active panel button ring, commander assignment connector. The "you are looking at this" ring. |
| `--opacity-indicator-strong` | `0.70` | Filled emphasis — placement hint on target hex (the hex pulses at 0.7 of the placement color), "best placement" star background, urban-placement-hint wash. Clear and unmissable. |

### Special tokens

| Token | Value | When used |
|---|---|---|
| `--opacity-ghost` | `0.40` | Locked-but-visible silhouette — future civs in the AgeTransition picker, future government forms in the Government panel, pantheons the player has not unlocked. Combined with `filter: grayscale(0.6)` by convention. Teaches progression; see Ghost/silhouette convention below. |
| `--opacity-critical` | `1.00` | Explicit "must be fully opaque" — critical warnings (unhappiness high, gold going negative, being attacked), death/ruin ribbons, victory fanfare text. Not a real alpha; it is a semantic marker that the implementer MUST NOT fade the element. |

### Tokens we are NOT introducing

- No `--opacity-0.05`, `--opacity-0.10`, `--opacity-0.15` numeric tiers. Semantic-only.
- No per-color alpha tokens (`--opacity-red-subtle`, etc.). Use `color-mix(in srgb, <color-token> N%, transparent)` where the N% comes from the opacity token. Example: `color-mix(in srgb, var(--panel-accent-danger) 20%, transparent)` — but that is inside the CSS file defining a composite token, not in component code.
- No `--opacity-panel-bg` (etc.) to rebuild panel-tokens.css. `panel-tokens.css` already bakes its alphas into `rgba()`; we are not re-decomposing. That sheet is the one place pre-baked `rgba` is acceptable, because those tokens already *are* the semantic names.

## Ghost / silhouette convention

The most important specific pattern this system enables.

When the player opens AgeTransitionPanel in Antiquity, they see a list of civs they can transition *to*. But the panel only shows the current age's civs. This wastes an opportunity: showing the Exploration civs AND the Modern civs as ghosted silhouettes teaches the player the progression tree without them having to read docs. They see "oh, if I pick Byzantines in Exploration, I will unlock this path in Modern". Same for governments (unlockable in Exploration and Modern), pantheons (unlocked via Mysticism), commanders (unlocked per-era), and legacy bonuses.

The convention:

- **Opacity:** `var(--opacity-ghost)` = 0.40
- **Filter:** `grayscale(0.6)` — desaturates color so the ghost reads as "the color-world before this content activates"
- **Interactivity:** `pointer-events: none` — ghosts are not clickable
- **Tooltip:** On hover (if hoverable via a wrapper), shows "Unlocked in Exploration — research Feudalism" or equivalent unlock description
- **Typography:** ghost content uses `--opacity-muted` (0.70) for its label text, so it reads "faded but legible" rather than "hidden"

Example:

```tsx
// AgeTransitionPanel — rendering a future civ ghost
<div
  style={{
    opacity: 'var(--opacity-ghost)',
    filter: 'grayscale(0.6)',
    pointerEvents: 'none',
  }}
>
  <CivCard civ={byzantines} />
  <div style={{ opacity: 'var(--opacity-muted)' }}>
    Unlocks in Exploration
  </div>
</div>
```

Applies to:
- Future civs in AgeTransitionPanel (before current age ends)
- Future governments in GovernmentPanel
- Future pantheons in ReligionPanel
- Future commander tiers in CommanderPanel
- Future policies/civics in CivicTreePanel
- Future legacy bonus slots in the profile summary

The ghost pattern teaches the feature visually. Without it, the player only ever sees what is currently available and has no sense of what is coming.

## Modal backdrop system

**There is exactly one modal backdrop in the game.**

The `--opacity-modal-backdrop` (0.45) token is applied to a single `<ModalBackdrop>` element mounted by `PanelManagerProvider` when `activePanel.priority === 'modal'`. No panel renders its own backdrop. No modal renders its own wash. One backdrop, one token, one source of truth.

### When two modals stack

The design decision: we explicitly DO NOT support two simultaneous modal panels. PanelManager's single-slot model (see `panels.md`) forces the first modal to close before the second opens. So "two modals at once" is not a real state.

However, HUD elements can still appear above a modal (see S-01 for the z-stack). If a `fixed-corner` tooltip is visible while a modal opens, the tooltip's `--opacity-hud-scrim` (0.35) does NOT compound with the modal's `--opacity-modal-backdrop` (0.45). HUD scrims are suppressed while a modal is active. `HUDManager` reads `PanelManager.activePanel.priority === 'modal'` and stops rendering scrims for the duration.

### What the backdrop does visually

- Fades canvas + TopBar + BottomBar to roughly 55% visible (1 − 0.45 = 0.55 of their natural opacity, via a black wash at 0.45 opacity)
- Does NOT block pointer events on the canvas / TopBar chrome (the backdrop has `pointer-events: none`; PanelShell's modal container handles click-outside-to-close)
- Does NOT add its own blur (blur is expensive on large canvases; we rely on the alpha wash alone)

### What the backdrop token is NOT

- Not `rgba(0, 0, 0, 0.45)` raw — it is a token, applied as `background: black; opacity: var(--opacity-modal-backdrop)`
- Not themeable to a warm sepia (tempting for "modern Civ VII" aesthetic but visually worse — a neutral black wash reads as "focus the modal", a sepia wash reads as "nostalgic photo filter")

## Map-layer transparency

The canvas renderer (`HexRenderer.ts`, `AnimationRenderer.ts`) is engine-adjacent rendering code running at 60fps and for perf reasons needs raw numeric alphas, not CSS tokens. But it still has a vocabulary. Map-layer alphas live as TypeScript constants in `packages/web/src/canvas/renderConstants.ts` (new file), named semantically and mirrored from the opacity-tokens.css values:

```typescript
export const MAP_ALPHA = {
  fogSeen: 0.55,             // --opacity-fog-seen
  placementHintValid: 0.70,  // --opacity-indicator-strong on valid hex
  placementHintBest: 0.85,   // 0.70 + slight boost for "best" hex
  placementHintInvalid: 0.30, // muted-via-dim on invalid hex
  yieldOverlayIcon: 0.85,    // yield icons float at slight transparency
  yieldOverlayBackdrop: 0.20, // faint tile wash when yields overlay is ON
  adjacencyGlowPositive: 0.40, // +X yield adjacency hint over a neighbor
  adjacencyGlowNegative: 0.40,
  selectionRing: 1.00,       // ring itself at full; handles fade-in via animation
  combatPreviewTint: 0.25,   // attacker/defender tiles during combat-preview mode
} as const;
```

Rules for the map layer:

1. **Never more than two alpha layers compound over a tile.** If fog (0.55) already applies, placement hint cannot add on top — hint replaces fog for that tile. If selection ring applies, yield overlay stays but adjacency glow is suppressed for that hex.
2. **Hex terrain color is always opaque.** We never render a terrain tile at <1.0 alpha. The "grayed out" feeling for fog-of-war comes from blending the tile with 55% alpha of a fog color, not from reducing the terrain alpha.
3. **Animations (shake, pulse, fade-in) go through `AnimationRenderer.ts`** and use keyframe alphas not in this vocabulary; those are covered by S-09.

## When alpha MAY NOT be used

Alpha is a tool with a clear job. It does NOT do certain jobs, and using it for them is a BLOCK.

### Panel and tooltip chrome — must be fully opaque where opaque-ness is the point

`panel-tokens.css` defines `--panel-bg: rgba(22, 27, 34, 0.96)`. That 0.96 is not a semantic alpha; it is a "let a hint of the map bleed through so the chrome feels like a document over the world". Fine. But:

- A panel BODY `<div>` inside the shell does NOT apply additional alpha to that bg. You get 0.96 once, not 0.96 × 0.8 = 0.77.
- A tooltip inside a panel BODY does NOT fade further against the panel bg. Overlays do not compound.
- A disabled button inside a panel uses `--opacity-disabled` (0.30) on ITSELF, but the panel behind it is still at 0.96. No multiplicative compounding.

### Typography — always solid

Body text, button labels, resource numbers, headings, tooltips all render at full opacity. "Muted" text uses a muted COLOR (`var(--panel-muted-color)` = `#8b949e`), not a muted alpha. The reason: faded text on a dark background fails every legibility check, and anti-aliasing breaks when text is at <1.0 opacity.

Exceptions:
- `--opacity-muted` (0.70) is allowed on secondary TEXT when the primary text sits immediately adjacent and color contrast is insufficient. Rare.
- Ghost text (0.70 on ghost content) is allowed because ghost is a purpose-built "faded" state.

A specific BLOCK: do not set `opacity: 0.7` on a `<span>` of body text because you want it "a bit lighter". Change the color token instead.

### Critical warnings — always fully opaque

A "Not enough gold" validation toast MUST render at `--opacity-critical` (1.00). A "being attacked" HUD banner MUST render at 1.00. A "unhappiness high" alert MUST render at 1.00. Fading these is a BLOCK regardless of context.

Reasoning: attention-critical content cannot be on a continuum. It either matters enough to interrupt (show solid) or it does not (do not show). Faded-critical is a contradiction.

### Selection rings, cursor anchors, outlines — always fully opaque

A tile the player clicked is selected. The selection ring is a 1.00-alpha outline. It may *fade in* over 180ms (animation), but once settled it is fully opaque. Same for unit selection highlight, city selection ring, drag-select lasso.

### Borders that frame readable content — always fully opaque

A card border that the player needs to distinguish from an adjacent card is fully opaque. Faded borders read as "this card is half-there" and the player mis-parses the layout.

Exceptions:
- `--opacity-indicator-subtle` (0.20) is allowed on decorative/ambient borders — section dividers, inset panel lines, low-emphasis connectors.
- The difference: if the border DEFINES a clickable/hoverable region, it is solid. If the border is ambient visual rhythm, it is subtle.

## Examples

### Resolving F-0d84dfd4 + F-24a4b0e7 (AchievementsPanel)

Current bad:

```tsx
<div
  className="p-3 rounded"
  style={{
    backgroundColor: earned
      ? 'rgba(88, 166, 255, 0.08)'
      : 'rgba(139, 148, 158, 0.04)',
    border: earned
      ? '1px solid var(--panel-border)'
      : '1px solid var(--panel-border)',
    opacity: earned ? 1 : 0.55,
  }}
>
```

Correct:

```tsx
<div
  className="p-3 rounded"
  style={{
    backgroundColor: earned
      ? 'color-mix(in srgb, var(--panel-accent-info-soft) calc(var(--opacity-panel-tint) * 100%), transparent)'
      : 'transparent',
    border: '1px solid var(--panel-border)',
    opacity: earned
      ? 'var(--opacity-hovered)'
      : 'var(--opacity-inactive)',
  }}
>
```

Or, preferring pre-baked composite tokens for readability, we add to `panel-tokens.css`:

```css
--panel-card-earned-bg: color-mix(in srgb, var(--panel-accent-info-soft) 8%, transparent);
```

and use `backgroundColor: 'var(--panel-card-earned-bg)'`. Both patterns are acceptable; pick one per panel for consistency.

Semantically, the call-site now reads:
- Earned cards get a subtle info-tint wash (a hint of friendly-blue over the neutral panel bg) at `--opacity-panel-tint` (8%)
- Not-earned cards get `--opacity-inactive` (0.55) — visible for reference, not the focus
- Both use the same border (solid, opaque); the border does not need alpha at all

### Resolving CityPanel's disabled-button pattern

Current pattern is fine semantically but not tokenized:

```tsx
opacity: playerGold >= 100 ? 1 : 0.5,
```

Correct:

```tsx
opacity: playerGold >= 100 ? 'var(--opacity-hovered)' : 'var(--opacity-disabled)',
```

Note: we use `--opacity-disabled` (0.30) not the current 0.5, because the current 0.5 is too close to "inactive" and muddies the distinction. Disabled = "cannot do this right now for a reason" should feel meaningfully different from "secondary".

### AgeTransitionPanel — future civs as ghosts

Current: future civs are not rendered at all. New design:

```tsx
{allCivs.map((civ) => {
  const isCurrentAge = civ.age === currentAge;
  const isFutureAge = civ.age > currentAge;
  const isPastAge = civ.age < currentAge;

  if (isPastAge) return null; // past civs truly hidden

  return (
    <CivCard
      key={civ.id}
      civ={civ}
      style={isFutureAge ? {
        opacity: 'var(--opacity-ghost)',
        filter: 'grayscale(0.6)',
        pointerEvents: 'none',
      } : {
        opacity: 'var(--opacity-hovered)',
      }}
    />
  );
})}
```

### ImprovementPanel — placement-hint card backgrounds

Current scattered rgba:

```tsx
backgroundColor: 'rgba(88, 166, 255, 0.1)',
border: '1px solid rgba(88, 166, 255, 0.3)',
boxShadow: '0 2px 4px rgba(88, 166, 255, 0.2)',
```

Correct (panel-tokens.css adds):

```css
--panel-card-active-bg: color-mix(in srgb, var(--panel-accent-info-bright) 10%, transparent);
--panel-card-active-border: color-mix(in srgb, var(--panel-accent-info-bright) 30%, transparent);
--panel-card-active-shadow: 0 2px 4px color-mix(in srgb, var(--panel-accent-info-bright) 20%, transparent);
```

Call-site:

```tsx
backgroundColor: 'var(--panel-card-active-bg)',
border: '1px solid var(--panel-card-active-border)',
boxShadow: 'var(--panel-card-active-shadow)',
```

The semantic-naming pass (bg-active, border-active, shadow-active) is a Phase 1.1 deliverable.

## Interaction with other systems

### S-01 (layering and z-index)

Opacity is NOT a substitute for z-order. A panel at higher z-index stays fully opaque; it does not need to be "more opaque" than a lower-z panel. A tooltip on top of a panel has its own `--opacity-hud-scrim` (0.35) behind it if it occludes tiles, but it does not inherit any alpha from the panel below.

Critical invariant: **higher z-index does not mean more opaque**. A modal at z-210 is not "more alpha" than a panel at z-110. Both chrome surfaces render at their own token'd alpha; the z-index decides stacking order only.

### S-09 (state transitions)

When a button transitions disabled → enabled, the opacity animates from `var(--opacity-disabled)` (0.30) to `var(--opacity-hovered)` (1.00) over the transition duration (see S-09 for timing). The endpoints are tokens. The interpolation itself is an animation not a semantic alpha.

Critical rule: **state transitions animate BETWEEN token values; they do not introduce new alpha stops.** A button does not animate through 0.55 on its way from 0.30 → 1.00; if it did, it would visually pass through "inactive" en route to "enabled", which reads as a bug. CSS's `transition: opacity 180ms ease-out` does the right thing automatically — do not add keyframes.

### S-07 (motion and animation contracts)

Entrance/exit animations (fade-in on panel open, fade-out on dismiss) use opacity as an animation channel (0 → 1 or 1 → 0). Those are animations, not semantic alphas, and the endpoints are the token values (`--opacity-hovered` / 0). No overlap with this system's vocabulary.

### S-06 (occlusion and dismissal)

When a modal opens and the backdrop appears, the backdrop opacity ramp is 0 → `--opacity-modal-backdrop` (0.45) over 180ms. Same pattern as other entrance animations. The *destination* is the token.

### Canvas / engine

Engine code has no opacity concept — pure state. Alpha is strictly chrome / rendering. The canvas-renderer constants (`MAP_ALPHA.*`) are numeric but must mirror the opacity-tokens values. A single source-of-truth `.md` or `.json` both layers consume would be ideal; short of that, the canvas file's JSDoc cross-references the CSS token names.

## Implementation phase

Lands in **Phase 1.1 (Token system expansion)** of the master plan, alongside typography scale, spacing scale, motion tokens. Work breakdown:

1. **`packages/web/src/styles/opacity-tokens.css`** — new sheet with the 16 tokens above; imported at app root next to the other token sheets. About 1 day to write + verify.
2. **Hook into `check-edited-file.sh`** — grep for `opacity:\s*0\.` and `rgba\([^)]+,\s*0\.` in `packages/web/src/**/*.{ts,tsx}`, excluding `styles/*.css` and `canvas/renderConstants.ts`. BLOCK on match. WARN on match in `styles/*.css` (those CSS files ARE where the bakes happen, but let's catch regressions). About 0.5 day.
3. **Reviewer rule addition** — CLAUDE.md trap registry gains row: `opacity-raw-alpha | Use a token from opacity-tokens.css; do not inline 0.XX or rgba(..., 0.XX) in components`. Reviewer greps as in #2.
4. **Migration pass** — sweep the 21 inline `opacity: 0.XX` sites and the 107 rgba literal sites, replacing with tokens. Most replacements are mechanical. The CityPanel disabled-action sites migrate to `--opacity-disabled`; the AchievementsPanel cards migrate to `--opacity-inactive` + the composite bg tokens; the Notifications / TopBar / tooltip sites migrate to the relevant `--opacity-*-tint` / `--opacity-hud-scrim` tokens. About 2-3 days sweeping.
5. **Playwright visual-diff** — screenshot each panel before + after migration, ensure no visible regression. About 1 day.

Total: about 1 week, scheduled parallel with S-03 (sizing tokens) and typography/spacing tokens in Phase 1.1.

### Relationship to Phase 0 quick-wins

None of this is Phase 0. Phase 0 is "the 2-3 day interaction-economics ship". Opacity tokenization is Phase 1.1 foundational work that downstream panel refactors depend on.

### Enforcement cadence

After Phase 1.1 lands:

- **Pre-commit hook**: the grep in #2 runs on edited files.
- **Reviewer checklist**: the trap-registry row means reviewers explicitly scan for opacity/rgba violations on any UI PR.
- **New-surface rule**: every new `*Panel.tsx` / `*HUD.tsx` / `*Overlay.tsx` starts from a template that references the tokens; adding a panel without touching `opacity-tokens.css` should be the norm.

## Open questions

1. **Do we want `--opacity-panel-tint` at 0.08 or 0.10?** The current earned-achievement card uses 0.08 (from the literal `rgba(88, 166, 255, 0.08)`). A value of 0.10 reads slightly stronger and may suit the "modern Civ VII warm earth" aesthetic better since warm colors tend to wash more subtly than cool. Needs a quick visual A/B against the olive/amber palette once it lands.
2. **Fog-of-war: do we match the 0.55 value to `--opacity-inactive`, or does fog want its own token?** Argument for shared: cognitive economy, one fewer number. Argument for separate: fog might need tuning per-map-biome (snow reads differently through fog than desert). Default to shared; split if playtest reveals the need.
3. **Do we support a `prefers-contrast: more` media override that nudges every token toward 1.0?** Accessibility concern; out of scope for this review per 00-philosophy.md but worth flagging for the future accessibility pass.
4. **Should `--opacity-muted` (0.70) stand or should muted text be solely a color affair?** Currently Notifications.tsx uses 0.7 for timestamps; if we force color-only, those timestamps need their own `--panel-text-timestamp-color` token and the opacity token disappears. Cleaner but more typography-palette expansion. Default: keep `--opacity-muted` as a narrow escape valve; prefer color-based muting where color contrast suffices.
5. **How do we handle existing `panel-tokens.css` rgba values in the migration?** The existing `--panel-bg: rgba(22, 27, 34, 0.96)` and siblings are pre-baked opacity-into-color. Options: (a) leave them, since they are tokens-already and the linter excludes `styles/*.css`; (b) decompose into `--panel-bg-color: #161b22` + `--panel-bg-alpha: 0.96` + a composite. (a) is simpler; (b) is more composable. Default to (a) — do not chase total symmetry.
