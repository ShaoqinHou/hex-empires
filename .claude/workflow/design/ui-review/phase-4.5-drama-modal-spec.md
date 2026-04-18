---
schema: design-spec/v1
phase: 4.5 (DramaModal shell)
author: opus (designer)
created: 2026-04-18
---

# Phase 4.5 — DramaModal shell spec

## Scope sentence

Introduce a new shared shell component `<DramaModal>` — distinct from `<PanelShell>` — that wraps the four ceremonial panels (`AgeTransitionPanel`, `CrisisPanel`, `VictoryPanel`, `TurnSummaryPanel`) in a hero-forward, narrative-shaped chrome. Phase 4.5 ships the shell + migration. Portrait art, crisis-choice content design, and motion implementation remain deferred.

---

## 1. Purpose — when to use `DramaModal` vs `PanelShell(modal)`

`PanelShell` was deliberately built generic: one title bar, one close affordance, one body slot. That works well for administrative modals (turn-summary-as-dashboard, victory-as-scoreboard) but underserves the *ceremony* modals — the moments when the game wants the player to stop, look, and feel the weight of a decision.

The distinction is functional, not decorative:

| Property | `PanelShell(modal)` | `DramaModal` |
|---|---|---|
| Dominant visual mass | Title bar + body text | Hero image / portrait / flavor illustration |
| Typography posture | Chrome title (Cinzel 18–22px) | Display title (Cinzel 32–48px) + optional subtitle |
| Body shape | One scrollable column | Two regions: narrative prose + choice stack |
| Choice presentation | Inline buttons in body (inconsistent today) | First-class `choices` slot with primary/secondary styling |
| Entrance | Instant | Brief fade-up (120–240 ms), single primitive — no staging |
| Backdrop | Phase 4 warm radial vignette (`--panel-backdrop-modal`) | Same, intensified (darker center → deeper vignette) |
| Dismissibility | `dismissible` prop, optional X | No X — dismissed only by resolving the ceremony |
| Close callback | `onClose` | `onResolve` — close IS the resolution |
| Width | `narrow`/`wide`/`full` | `dramatic` (fixed at ~720–960px) |

**Crisp rule.** If the modal has a choice the player MUST resolve, AND the moment is narratively weighted (era shift, empire-shaking crisis, win/lose, turn transition in the "pause to consider" sense), use `DramaModal`. Otherwise use `PanelShell(modal)`.

The four panels all qualify. Future candidates: first-contact modal, wonder-built fanfare, eureka/inspiration strikes. Non-candidates: settings, audio, help, any administrative modal — those stay on `PanelShell`.

---

## 2. API

```tsx
import type { ReactNode } from "react";
import type { PanelId } from "./panelRegistry";

export type DramaChoice = {
  readonly id: string;
  readonly label: string;                              // button label
  readonly hint?: string;                              // small secondary line
  readonly tone?: "primary" | "secondary" | "danger"; // default "secondary"
  readonly disabled?: boolean;
  readonly onSelect: () => void;
};

export interface DramaModalProps {
  readonly id: PanelId;                                // registered, priority: modal
  readonly title: string;                              // Cinzel display
  readonly subtitle?: string;                          // e.g. "Antiquity → Exploration"
  readonly hero?: ReactNode;                           // portrait/glyph/illustration slot
  readonly body?: ReactNode;                           // narrative prose / sub-layout
  readonly choices?: ReadonlyArray<DramaChoice>;       // primary CTA row
  readonly onResolve: () => void;                      // called when ceremony is resolved
  readonly tone?: "triumph" | "crisis" | "passage" | "summary";
  readonly reveal?: "instant" | "fade";                // default "fade"
}
```

Notes:

- `id` is still a `PanelId`; `DramaModal` participates in `PanelManager` the same way `PanelShell(modal)` does. Registry entries keep `priority: "modal"`. The shell is swapped; the management protocol is unchanged.
- `onResolve` is a rename of `onClose` at the type level. Ceremony modals do not have an "oh nevermind" exit. Every dismissal is a resolution. The rename forces callers to name the semantics.
- `tone` drives token selection (accent color, vignette strength). Four tones cover the current panels: `triumph` (Victory), `crisis` (Crisis), `passage` (AgeTransition), `summary` (TurnSummary). No "neutral" — if neutral is needed, it belongs on `PanelShell`.
- Multi-stage reveal is **out of scope for the shell**. Callers orchestrate stages internally via their own state + re-render; the shell only provides the fade-up entrance. Keeping stage orchestration out prevents the shell-that-tries-to-be-a-state-machine anti-pattern.

---

## 3. Visual spec

### Frame and material

- **Outer container.** Matches `PanelShell(modal)` border-radius (`var(--panel-radius)`, 8px) and bevel primitives. The difference is *scale* and *opacity floor*, not a new border language.
- **Corner + edge.** Re-uses `--panel-bevel-inset` (bronze 1px) but adds a **second, wider** bevel: `inset 0 0 0 3px rgba(0,0,0,0.35)` beneath the bronze — shadowed "inset frame" feel like a painting set back in its mount. One new token: `--drama-frame-shadow`.
- **Backdrop.** Same gradient family as Phase 4 (`--panel-backdrop-modal`), intensified via sibling token `--drama-backdrop`: `radial-gradient(ellipse at center, rgba(10,8,5,0.55) 0%, rgba(5,4,2,0.85) 100%)`. Center darker (hero lifts), edges near-black.
- **Body surface.** Same `--panel-bg` base. No parchment texture (skeptic §4 failure mode #4 — we lack raster budget).

### Layout — standard viewport (< 1920px)

Stacked single column, width 720px (clamped to `min(720px, 92vw)`):

```
+------------------------------------+
| [ hero slot — 240px tall ]         |  <- --drama-hero-height
|  (portrait / era glyph / image)    |
+------------------------------------+
| TITLE (Cinzel 36px)                |
| subtitle (Cinzel 16px muted)       |
|                                    |
| body — narrative prose,            |
| left-aligned, max-width 62ch       |
|                                    |
| [ CHOICE 1 — primary    ]          |
| [ choice 2 — secondary  ]          |
| [ choice 3 — secondary  ]          |
+------------------------------------+
```

### Layout — wide / ultra viewport (≥ 1920px)

2-column, width 960px (clamped), hero left / narrative right:

```
+---------------+-------------------+
|               | TITLE             |
|    HERO       | subtitle          |
|   (320px)     |                   |
|               | body prose        |
|               | (max 48ch)        |
|               |                   |
|               | [ CHOICE 1 ]      |
|               | [ choice 2 ]      |
+---------------+-------------------+
```

Viewport class from `useViewportClass()`. Shell internally switches.

### Typography

- **Title**: `var(--type-display)` — Cinzel 600, 36px standard / 44px wide / 48px ultra, 1.15 line-height, tracking +0.02em.
- **Subtitle**: Cinzel 500, 16px, `color: var(--panel-muted-color)`, 4px gap under title.
- **Body prose**: inherits `var(--type-body)`. No override — Cinzel at body sizes is the anti-pattern the skeptic flagged.
- **Choice labels**: `var(--type-label-strong)`.

### Hero slot

- Height bounded by `--drama-hero-height` (default 240px standard, 320px wide, 360px ultra).
- In Phase 4.5 the slot renders whatever the panel passes: era glyph, crisis emoji, win banner. Shell provides framed region with subtle inner-vignette (new token `--drama-hero-vignette`).
- Phase 5 drops real portraits into the same slot without shell changes.

### Choice stack

- Primary button: `background: var(--panel-accent-gold)`, `color: #1a1510`, padding 12px 20px, radius 6px, Cinzel 500 16px.
- Secondary: transparent bg, 1px bronze border (`var(--panel-border)`), `color: var(--panel-text-color)`.
- Danger: red border (`var(--color-danger)`).
- Choice gap: `var(--drama-choice-gap)` — new token, default 10px.
- Hint line: below label inside button, 12px `var(--panel-muted-color)`.

---

## 4. Token additions — 5 new tokens

All in `panel-tokens.css`.

```css
/* Phase 4.5 — DramaModal tokens */

/* 1. Hero slot height per viewport class. */
--drama-hero-height: 240px;

/* 2. Inner vignette on hero slot. */
--drama-hero-vignette:
  radial-gradient(ellipse at center,
    transparent 40%,
    rgba(0, 0, 0, 0.35) 100%);

/* 3. Frame shadow — deeper inset frame for ceremony modals. */
--drama-frame-shadow:
  inset 0 0 0 3px rgba(0, 0, 0, 0.35),
  var(--panel-bevel-inset),
  var(--panel-shadow);

/* 4. Intensified backdrop — darker center, near-black edges. */
--drama-backdrop:
  radial-gradient(ellipse at center,
    rgba(10, 8, 5, 0.55) 0%,
    rgba(5, 4, 2, 0.85) 100%);

/* 5. Choice stack gap. */
--drama-choice-gap: 10px;
```

Plus `@media` overrides for `--drama-hero-height` (320px at ≥1920px, 360px at ≥2560px) mirroring `layout-tokens.css` viewport classes.

Zero raw hex outside rgba literals that repeat `palette-tokens.css` primitives.

---

## 5. Layout behavior — viewport-class hook

The shell calls `useViewportClass()` once at render and derives:

- Container width: 720px at `standard`, 960px at `wide`/`ultra`.
- Layout: stacked (standard) vs 2-column (wide/ultra).
- Hero height: picked up from `--drama-hero-height` via CSS media queries — shell does not read the number in JS.

No layout JS beyond the stacked-vs-2-col branch.

---

## 6. Motion posture

`PanelShell` opens instantly; correct for administrative modals. `DramaModal` is permitted one motion primitive:

- **Fade-up** on mount: opacity 0 → 1, transform `translate(-50%, calc(-50% + 12px)) → translate(-50%, -50%)`, duration 240ms, easing `cubic-bezier(0.2, 0.8, 0.2, 1)`. Single stage — no orchestration.
- Backdrop fades in over the same 240ms.
- No exit animation in 4.5.
- Respects `prefers-reduced-motion`: when set, `reveal` defaults to `instant`.

Timing tokens reference existing Phase 1 motion scale (`--motion-medium: 240ms`, `--ease-out-quint`). No new motion tokens.

**Implementation deferred.** 4.5 ships with `reveal="instant"` wired; Phase 6/7 enables `"fade"` default after the S-07 motion-token audit. API slot is committed now so Phase 5 art lands into the final motion shape.

---

## 7. Migration plan — the four panels

### 7.1 `AgeTransitionPanel`

- Swap `PanelShell(priority="modal", width="full", dismissible={false})` → `DramaModal(tone="passage")`.
- `title`: `"A New Age Dawns"`.
- `subtitle`: `` `${currentAge} → ${nextAge}` ``, capitalized.
- `hero`: current ⚡ glyph block, enlarged to fill hero slot.
- `body`: existing progress block + legacy-bonuses block (unchanged content).
- `choices`: **empty** — civ-selection grid remains body content (3-to-9-wide grid, not a button stack). Civ-card `onClick` is the resolution, calling `onResolve` after dispatch.
- Preserved: `dismissible=false` semantics. `DramaModal` has no X, no backdrop click, no ESC. `PanelManager` reads `data-dismissible` unchanged.

### 7.2 `CrisisPanel`

- Swap `PanelShell(priority="modal", dismissible={false})` → `DramaModal(tone="crisis")`.
- `title`: `activeCrisis.name`.
- `subtitle`: `` `Turn ${activeCrisis.turn}` ``.
- `hero`: crisis-appropriate placeholder glyph (⚠️ / 🌾 / ⚔️ per crisis id). Replaced by real illustrations in Phase 5.4.
- `body`: flavor description text.
- `choices`: `activeCrisis.choices.map(c => ({ id, label: c.text, tone: "secondary", onSelect: () => handleChoice(c.id) }))`. Natural fit — this panel was ALWAYS a choice stack.
- Hand-rolled button map (lines 42–63, raw-hex risk) disappears.

### 7.3 `VictoryPanel`

- Swap `PanelShell(priority="modal")` → `DramaModal(tone="triumph")`.
- `title`: `"Victory!"` (loss variant out of 4.5 scope).
- `subtitle`: `` `${winType} victory • Turn ${state.turn}` ``.
- `hero`: winning civ banner (color fill + civ glyph emoji; real portrait in Phase 5.6).
- `body`: existing per-player victory-progress list.
- `choices`: primary "New Game" (reload), secondary "Continue Playing" (onResolve).
- Hand-rolled button row (lines 59–75) replaced by shell choice stack.

### 7.4 `TurnSummaryPanel`

- Swap `PanelShell(priority="modal")` → `DramaModal(tone="summary")`.
- `title`: `` `Turn ${state.turn}` ``.
- `subtitle`: `` `${state.age.currentAge} Age` ``, capitalized.
- `hero`: compact era glyph or status tile — see Open Question #1.
- `body`: existing resource-change summary + city list. Unchanged.
- `choices`: one primary `Continue` (onResolve).
- Master plan §5.5 dockable conversion is Phase 5, not 4.5.

---

## 8. Out of scope for 4.5

- Portrait / illustration art (Phase 5 via 1.6 pipeline).
- Crisis-choice design depth (§5.4).
- Motion implementation (Phase 6/7).
- Multi-stage reveal sequencing.
- Dockable TurnSummary (§5.5).
- Loss variant of VictoryPanel.
- Audio cue hooks (Phase 7).
- Per-age chrome tinting (Phase 5 per skeptic §1).

---

## 9. Implementer brief — 6 sub-steps

Each sub-step = 1 commit, independently verifiable.

### Step 1 — shell + tokens + tests (1.5 days)

- Add 5 tokens to `panel-tokens.css` with `@media` overrides for hero height.
- Create `packages/web/src/ui/panels/DramaModal.tsx` implementing API in §2. Compose `PanelManager` participation via `role="dialog"`, `data-panel-id`, `data-dismissible="false"`, same `data-testid` scheme as `PanelShell` (`panel-shell-${id}`).
- Create `packages/web/src/ui/panels/drama-modal.css` scoped stylesheet for layout + fade-up transition. Respect `prefers-reduced-motion`.
- Tests in `__tests__/DramaModal.test.tsx`: renders title/subtitle/hero/body/choices; choice click fires `onSelect` and does NOT auto-call `onResolve`; viewport-class switch yields 2-column at wide (mock `useViewportClass`).
- `npm run build` + `npm test` pass.

### Step 2 — migrate `AgeTransitionPanel` (0.5 day)

Swap shell, ⚡ → hero, from/to → subtitle, civ grid in body, `choices=[]`. Confirm `dismissible=false` preserved. `/verify` modal opens on age-ready, civ click dispatches `TRANSITION_AGE` + closes.

### Step 3 — migrate `CrisisPanel` (0.5 day)

Swap shell, description → body, map `activeCrisis.choices` → `DramaChoice[]`, delete hand-rolled button block. `/verify` all five crisis ids render and resolve correctly.

### Step 4 — migrate `VictoryPanel` (0.5 day)

Swap shell, civ banner in hero, progress list in body, two choices. `/verify` modal appears on win, both buttons behave.

### Step 5 — migrate `TurnSummaryPanel` (0.5 day)

Swap shell, summary content in body, one primary Continue. Confirm no regressions in warning display or city-row rendering.

### Step 6 — E2E sweep + cleanup (0.5 day)

- Full `npm test` + Playwright suite.
- Visual-regression baselines updated for the four panels (reviewer confirms diffs intended).
- Grep for dangling `PanelShell` refs in the four migrated panels.
- Update `08-master-plan.md` to mark Phase 4.5 / §5.1 complete.

**Total: ~4 days.**

---

## 10. Acceptance criteria

1. `DramaModal` component exists, tested, consumed by exactly the four ceremony panels.
2. All four panels render with Cinzel display titles, hero slot, narrative body, and (where applicable) primary/secondary choice stack.
3. `AgeTransitionPanel` and `CrisisPanel` preserve `dismissible=false` — no X, no backdrop-close, no ESC resolution.
4. `VictoryPanel` and `TurnSummaryPanel` resolve on `Continue` / `New Game`.
5. Viewport-class switch verified: stacked at `standard`, 2-column at `wide`/`ultra`.
6. Zero raw hex introduced (`chrome-raw-hex-regression` clean).
7. Zero panel body LOGIC changes — chrome-slot reshape only. Civ grid, crisis description, resource summary, per-player progress lists all render identical content.
8. `npm test` + `npm run build` + full Playwright suite pass. E2E selectors `[data-testid="panel-shell-${id}"]` remain functional; `panel-close-${id}` is omitted on `DramaModal` (no X) — any spec asserting the close button on the four ceremony panels is updated.

---

## 11. Open questions

1. **TurnSummary hero slot — keep, shrink, or omit?** A 240px hero for a per-turn income table may feel like wasted real estate. Options: (a) default height + era glyph, (b) reduce to 120px via `heroHeight` prop override, (c) omit entirely. **Recommendation: (b) 120px.** Needs user confirmation before Step 5.
2. **Victory hero for the 4.5 placeholder.** Civ color fill + civ glyph emoji is simplest. Alternative: wreath-and-laurel emoji on gold gradient. **Recommendation: placeholder in** — a colored block beats a blank frame for visual assessment.
3. **`DramaChoice.hint` rendering — below label or tooltip?** Below-label shows consequence preview inline, great for play but crowds at 3+ choices. Tooltip cleaner but hides load-bearing info. **Recommendation: below-label** for 4.5; revisit at §5.4.
4. **Multi-stage reveal for AgeTransition.** Master plan §5.3 calls out 3-card civ-choice reveal. 4.5 shell doesn't orchestrate this. **Recommendation: ship without staging in 4.5**; staging returns in Phase 5 once portrait art is present (staging without art is meaningless).
5. **`onResolve` vs preserving `onClose` name.** Semantically `onResolve` is cleaner; practically forces a rename at every call site in `App.tsx`. **Recommendation: rename** — TS catches misses.

---

## Cross-refs

- `.claude/workflow/design/ui-review/08-master-plan.md` §5.1 — source of this phase; §5.3–5.6 consume `DramaModal`.
- `.claude/workflow/design/ui-review/phase-4-chrome-pragmatist.md` — tokens reused (`--panel-bevel-inset`, `--panel-backdrop-modal`).
- `.claude/workflow/design/ui-review/phase-4-chrome-skeptic.md` §4 — failure modes avoided.
- `.claude/workflow/design/ui-review/06-group-e-moments.md` — original moments-of-drama audit.
- `.claude/workflow/design/ui-review/systems/S-07-motion-and-animation.md` — motion tokens for `reveal: "fade"`.
- `.claude/workflow/design/ui-review/systems/S-01-layer-and-zindex.md` — `DramaModal` inherits `--panel-z-modal`; no z-order change.
- `.claude/workflow/design/ui-review/systems/S-06-occlusion-and-dismissal.md` — ESC chain respects `data-dismissible="false"`.
- `.claude/rules/panels.md` — `DramaModal` participates in `PanelManager` identically to `PanelShell(modal)`.
- `packages/web/src/ui/panels/PanelShell.tsx` — sibling shell; unchanged.
- `packages/web/src/ui/panels/AgeTransitionPanel.tsx`, `CrisisPanel.tsx`, `VictoryPanel.tsx`, `TurnSummaryPanel.tsx` — migration targets.
- `packages/web/src/hooks/useViewportClass.ts` — consumed for stacked-vs-2-col.
- `packages/web/src/styles/panel-tokens.css` — 5 tokens land here.

**Sibling docs that should reference this one when it lands:**
- `systems/S-07-motion-and-animation.md` — record `DramaModal` as the shell using `reveal: "fade"`.
- Future `phase-5-setup-screen-spec.md` — precedent for hero-slot layout.
- Future `phase-5-crisis-content-spec.md` — consumes `DramaChoice.hint`.
