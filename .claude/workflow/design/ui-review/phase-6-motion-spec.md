---
title: Phase 6 — Motion spec
phase: 6 (Juice pass — motion only; sound is Phase 7)
created: 2026-04-18
supersedes: partial implementation notes scattered across Phase 4, Phase 4.5, and S-07
depends-on:
  - packages/web/src/styles/motion-tokens.css (tokens already shipped)
  - .claude/workflow/design/ui-review/systems/S-07-motion-and-animation.md (system contract)
  - .claude/workflow/design/ui-review/phase-4.5-drama-modal-spec.md §6 (reveal="fade" already designed, not wired)
  - packages/web/src/ui/panels/PanelShell.tsx (currently instant)
  - packages/web/src/ui/moments/DramaModal.tsx (currently reveal="instant")
  - packages/web/src/canvas/AnimationManager.ts, AnimationRenderer.ts
---

# Phase 6 — Motion spec

## Purpose

S-07 is the full motion contract; it defines tokens, curves, and per-element rules. Phase 6 is the **implementation phase** for motion across the whole game — the point where the codebase starts visibly breathing. Every phase before this has added structure (chrome, drama frames, notifications); this one is the phase where panels slide, numbers tick up, units interpolate with intent, and the screen remembers how to shake when an age ends.

Motion tokens already exist in `packages/web/src/styles/motion-tokens.css`. What is missing is the wiring: `PanelShell` is instant, `DramaModal` ships with `reveal="instant"` despite Phase 4.5 speccing `reveal="fade"`, `TopBar` yield numbers snap, `AnimationManager` interpolates unit moves without a defined curve, and nothing shakes. Phase 6 lands these eight deliverables, in the order below, one commit per sub-step.

The rule of this phase: **no new tokens unless an existing one genuinely does not fit.** S-07 left two specific additions for this phase; everything else reuses the existing five durations and five easings.

## 1. Motion palette (per-element taxonomy)

Every animated element in Phase 6, one row each. Durations and easings reference existing `motion-tokens.css` unless marked `[NEW]`. If any row appears to conflict with S-07, S-07 wins and this doc is the bug.

| # | Element | Trigger | Motion | Duration | Easing | Notes |
|---|---|---|---|---|---|---|
| 1 | PanelShell — overlay open | activePanel becomes this id | translateX(16px → 0) + opacity 0 → 1 | --motion-medium (240ms) | --ease-out | Enter-from-right for right-anchored overlay panels |
| 2 | PanelShell — overlay close | activePanel becomes null | translateX(0 → 16px) + opacity 1 → 0 | --motion-fast (160ms) | --ease-in | Exits must be faster than entrances |
| 3 | PanelShell — info (EventLog) open/close | same | opacity only (no translate) | --motion-fast / --motion-instant | --ease-out / --ease-in | Info tier is quieter than overlay |
| 4 | PanelShell — modal priority open | activePanel becomes this id | backdrop dim + body scale(0.96 → 1.0) + fade | backdrop --motion-fast, body --motion-medium, 80ms offset | --ease-out | Backdrop leads, body follows |
| 5 | PanelShell — modal close | dismissal | body scale/fade-out + backdrop fade-out | --motion-fast | --ease-in | Body leaves before backdrop (inverse of entrance) |
| 6 | PanelShell — tab/content swap | internal route change | crossfade body only | --motion-fast | --ease-in-out | Container stays put |
| 7 | DramaModal fade-up | mount with reveal="fade" | backdrop dim + frame translateY(12px → 0) + opacity 0 → 1 | backdrop 200ms, frame 360ms, 80ms offset | --ease-out | Matches Phase 4.5 spec §6 verbatim |
| 8 | DramaModal exit | unmount | backdrop fade-out + frame translateY(0 → 8px) + fade | 200ms | --ease-in | Shorter than entrance |
| 9 | Unit move (Canvas) | MOVE_UNIT action, per hex | linear interp position, endpoint ease bloom | Slow unit: 400ms/hex, Normal: 240ms/hex, Fast: 160ms/hex | linear mid-path, --ease-out on first/last hex | Multi-hex paths chain without re-easing |
| 10 | Combat — attacker lunge (Canvas) | ATTACK action on attacker sprite | 8px shove toward target then return | 200ms round-trip (80ms out, 120ms back) | out: --ease-out, back: --ease-in | Total = --motion-fast envelope |
| 11 | Combat — defender hit flash (Canvas) | damage applied | red tint pulse on sprite | --motion-fast (160ms) | --ease-out | Concurrent with attacker return stroke |
| 12 | Combat — damage number float (Canvas) | damage applied | translateY(0 → -24px) + fade-out | --motion-slow (400ms) | --ease-out | Anchored to defender screen position; overlapping allowed (no queue) |
| 13 | Resource tick — TopBar yield increase | GameState yield delta > 0 | count-up from old → new | --motion-slow (400ms) | --ease-out | Tabular-nums mandatory |
| 14 | Resource tick — TopBar yield decrease | GameState yield delta < 0 | **snap** (no animation) | 0ms | — | Asymmetry is deliberate; losses snap |
| 15 | Resource tick — zero-crossing into negative | post-delta value < 0, was ≥ 0 | count-up + red colour pulse | --motion-slow | --ease-back | Only case where a loss gets motion |
| 16 | Age transition screen shake | TRANSITION_AGE action resolves | ±4px camera-container shake, 2 oscillations | 200ms total | sine | Disabled under prefers-reduced-motion; see §3 |
| 17 | Toast — enter | Notifications.tsx push | translateY(24px → 0) + fade-in | --motion-medium (240ms) | --ease-out | From bottom-right stack origin |
| 18 | Toast — auto-fade | display timer expires (4000ms) | opacity → 0 | --motion-fast (160ms) | --ease-in | |
| 19 | Toast — dismiss on click | user interaction | scale(1 → 0.88) + fade-out | --motion-fast | --ease-in | |
| 20 | Toast — stack reshuffle | a toast above this one dismisses | translateY of remaining toasts | --motion-fast | --ease-in-out | All reshuffling toasts animate concurrently |
| 21 | Button hover enter | :hover matches | glow / bg colour fade-in | --motion-instant (80ms) | --ease-out | CSS-only; no JS |
| 22 | Button hover leave | :hover no longer matches | glow fade-out | --motion-instant | --ease-in | |
| 23 | Button press | :active | translateY(1px) + shadow reduce | --motion-instant | --ease-out | |
| 24 | Button release | :active ends | return to rest | --motion-fast (160ms) | --ease-out | Release is longer than press for weight |
| 25 | TooltipShell — floating appear | anchor hover | opacity fade-in | --motion-instant (80ms) | --ease-out | pointer-events: none |
| 26 | TooltipShell — fixed-corner appear | detailed tier / sticky | fade-in + 8px slide from anchor quadrant | --motion-fast (160ms) | --ease-out | |
| 27 | TooltipShell — Alt tier switch | altHeld state flips | body crossfade in place | --motion-fast | --ease-in-out | Anchor does not move |

Anything not in this table and not in S-07 stays static in Phase 6. Specifically **out of scope for this phase**: particle effects, victory confetti, procedural sound modulation, tech-complete badge overshoot (deferred — ties into Phase 7 ceremony work), city-founded pulse ring (deferred — needs a Canvas-side ring primitive not yet in AnimationRenderer).

## 2. Timing token usage + proposed new tokens

**Reuse map** (the 27 elements above mapped onto existing tokens):

- `--motion-instant` (80ms) → rows 21, 22, 23, 25 — tooltip flicker + button hover/press
- `--motion-fast` (160ms) → rows 2, 3, 5, 6, 10, 11, 18, 19, 20, 24, 26, 27
- `--motion-medium` (240ms) → rows 1, 4 (body), 17 — the "significant arrival" band
- `--motion-slow` (400ms) → rows 12, 13, 15 — count-ups and floating damage numbers
- `--motion-ceremony` (1200ms) → not used in Phase 6; age transition ceremony sequencing is Phase 7 scope

**Proposed new tokens (≤3 per designer brief):**

1. **`--motion-shake` (200ms)** — total duration of a 2-oscillation shake (validation feedback in S-07; age transition screen shake in Phase 6). Distinct from `--motion-fast` because a shake is not a fade; semantic clarity at call sites (`animation-duration: var(--motion-shake)`) beats a comment explaining "160ms because it is a shake, not because it is fast". **Recommend adopting.**

2. **`--motion-modal-stagger` (80ms)** — the backdrop-to-body offset on modal opens (rows 4, 7). Currently `--motion-instant` is used for this by coincidence; naming the stagger as its own token means future designers adjusting modal choreography change one value, not a magic 80ms repeated across PanelShell + DramaModal + any future modal. **Recommend adopting.**

3. **`--motion-canvas-unit-hex-normal` (240ms)** — per-hex duration for a normal-speed unit. Would also imply `-slow` (400ms) and `-fast` (160ms) siblings. **Recommend NOT adopting** — these are `--motion-slow` / `--motion-medium` / `--motion-fast` in disguise, and giving them Canvas-specific names inflates token count without changing any value. AnimationManager should reuse the existing three directly and document the mapping in a code comment.

Net proposal: **+2 tokens** (`--motion-shake`, `--motion-modal-stagger`). Both land in sub-step 1 of the implementer brief.

## 3. prefers-reduced-motion policy

S-07 "Reduced-motion accessibility" specifies the baseline: halve durations, disable translate/scale, remove shakes. Phase 6 per-element policy:

| # | Element | Reduced-motion behaviour |
|---|---|---|
| 1-3 | PanelShell overlay/info open/close | Drop translateX. Fade-only. Duration auto-halves via motion-tokens.css override. |
| 4-5 | PanelShell modal | Drop scale on body. Fade-only. Backdrop still dims. 80ms stagger preserved (below vestibular threshold). |
| 6 | Tab swap | Unchanged — already a crossfade. |
| 7-8 | DramaModal fade-up | Drop translateY on frame. Fade-only. Matches Phase 4.5 §6 explicit reduced-motion fallback. |
| 9 | Unit move | **Keep interpolation.** Movement is information — a unit teleporting from A to D is a UX failure. Halve per-hex duration via token. |
| 10 | Attacker lunge | Disable entirely. Defender flash (row 11) still plays — the hit is still acknowledged. |
| 11 | Defender red tint | Keep. Colour-only, no translate. |
| 12 | Damage number | Keep but halve duration. Still floats up; vestibular-safe amplitude. |
| 13 | Resource count-up | Keep. Halved duration. Count-up IS the information; snapping would hide the turn result. |
| 14-15 | Resource decrease / zero-cross | Unchanged for 14 (no motion). For 15 keep colour pulse, drop overshoot easing — use --ease-out instead of --ease-back. |
| 16 | Age transition screen shake | **Disabled entirely.** Replaced with a 200ms backdrop flash (white → transparent, peak alpha 0.15) to preserve the "something happened" beat without vestibular trigger. |
| 17-20 | Toast enter/fade/dismiss/reshuffle | Drop translateY on enter and reshuffle. Fade-only. scale on dismiss dropped — fade-only. |
| 21-24 | Button hover/press | Unchanged — all already at --motion-instant, and the 1px translateY on press is under vestibular threshold. |
| 25-27 | Tooltips | Unchanged — fades and small slides at 80-160ms. |

The reduced-motion branch is enforced in two places:

1. **Token-level** — motion-tokens.css already halves durations.
2. **Per-element CSS/JS** — components using translate, scale, or shake must check `@media (prefers-reduced-motion: reduce)` in their own styles and emit the fallback. Cannot be done at the token layer alone.

## 4. Canvas motion — AnimationManager + AnimationRenderer consumption

Canvas motion does NOT use CSS tokens directly (it is requestAnimationFrame-driven). Instead, tokens define numeric constants that AnimationManager reads. Pattern:

```ts
// packages/web/src/canvas/motionConstants.ts  (new file)
import { readCssTimeToken } from "@web/styles/readTokens";

export const MOTION = {
  unitMoveSlow: readCssTimeToken("--motion-slow"),     // 400
  unitMoveNormal: readCssTimeToken("--motion-medium"), // 240
  unitMoveFast: readCssTimeToken("--motion-fast"),     // 160
  combatLungeOut: 80,    // half of --motion-fast
  combatLungeBack: 120,  // other half, slightly longer for weight
  damageNumber: readCssTimeToken("--motion-slow"),
  ageShake: readCssTimeToken("--motion-shake"),
} as const;
```

`readCssTimeToken` reads the computed style of `:root` at app mount and parses the `ms` suffix. Cached; re-read on `prefers-reduced-motion` change (matchMedia listener) so reduced-motion updates propagate to Canvas without a page reload.

**AnimationManager changes:**

- `startUnitMove(unitId, path)` — unchanged API. Internally picks per-hex duration from `MOTION.unitMove{Slow|Normal|Fast}` based on unit category. Chains hexes without re-easing (linear mid-path).
- `startCombatLunge(attackerId, targetHex)` — new method. Schedules shove + return. Emits a `combatLungeComplete` event at t=200ms.
- `startDamageNumber(hex, amount)` — new method. Allocates a floating-number render entry with birth timestamp; AnimationRenderer lays it out.
- `startAgeShake()` — new method. Applies a 200ms sinusoidal transform to the camera-container root. Reads `prefers-reduced-motion` at call time; if reduced, calls `startBackdropFlash()` instead.

**AnimationRenderer changes:**

- New render pass: floating numbers, drawn after units and before HUD overlays. Each entry has a `birthMs` and `value`; alpha = `1 - t/duration`, y-offset = `-24 * (t/duration)`. When `t >= duration`, the entry is garbage-collected.
- New render pass: combat lunge offsets. Before drawing a unit sprite at its base position, check if `AnimationManager.getCombatOffset(unitId)` returns a non-zero vector; apply it.
- Red tint: the existing sprite draw gains a `tintAlpha` parameter sourced from AnimationManager combat-flash entries.

No new "animation framework" on the Canvas side — AnimationManager tick loop (already RAF-driven) grows three new entry types. The entire Canvas motion surface is ~150 lines added to AnimationManager + ~80 lines in AnimationRenderer.

## 5. React motion — approach + rationale

**Recommendation: CSS transitions + one small custom hook for count-up.** Do NOT adopt Framer Motion.

Rationale:

1. **Bundle cost.** Framer Motion is ~70 KB gzipped. The entire Phase 6 React motion surface done in CSS + one hook is under 2 KB.
2. **Tokens are already CSS-native.** motion-tokens.css is a CSS token system. Framer would add a parallel JS motion system (`transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}`) that duplicates tokens as numeric literals. Drift is a certainty.
3. **Interrupt semantics.** CSS transitions natively handle "element is opening, user clicks close, interruption starts exit from current interpolated state" via `transition` on both directions of `opacity` / `transform`. Matches S-07 Orchestration rule 4.
4. **One exception — count-up.** Numeric count-up (rows 13, 15) needs per-frame JS since CSS cannot interpolate integer text content. A single `useCountUp(value, { duration, easing })` hook using requestAnimationFrame and easeOutCubic (approximating --ease-out). ~40 lines. Returns the currently-displayed number.

**Custom hooks to add:**

- `useCountUp(target: number, options)` — for TopBar yields. Lives at `packages/web/src/ui/hooks/useCountUp.ts`.
- `useReducedMotion()` — reads `prefers-reduced-motion` via matchMedia, returns a boolean, re-renders on change. Used by DramaModal, Toast, and AnimationManager React adapter. Lives at `packages/web/src/ui/hooks/useReducedMotion.ts`. ~20 lines.

**CSS-only motion** is preferred for everything else. PanelShell adds `transition: transform var(--motion-medium) var(--ease-out), opacity var(--motion-medium) var(--ease-out)` and swaps a `[data-open]` attribute. DramaModal does the same with its own tokens. Toasts get a keyframe animation on mount.

## 6. Implementer brief — 6 commit-sized sub-steps

Order is dependency-driven: tokens → easy wins → harder wins. Each sub-step is independently commitable and independently testable.

### Sub-step 1 — Add --motion-shake and --motion-modal-stagger tokens

- Edit `packages/web/src/styles/motion-tokens.css`: add `--motion-shake: 200ms` and `--motion-modal-stagger: 80ms` to `:root`.
- Halve them in the `@media (prefers-reduced-motion: reduce)` block (`--motion-shake: 100ms`; `--motion-modal-stagger: 80ms` stays — already at floor).
- Update S-07 "Duration scale" table to list the two additions (tracking change, not behaviour).
- Test: motion-tokens.css snapshot test (if one exists — otherwise a lightweight CSS parse test).
- Commit: `feat(ui): phase 6.1 — add --motion-shake + --motion-modal-stagger tokens`

### Sub-step 2 — Wire PanelShell open/close motion (+ drive-by sweep: Notifications.tsx, buttons, TooltipShell)

- Edit `packages/web/src/ui/panels/PanelShell.tsx`: add `data-open` attribute tied to mount; add `transition` CSS per priority (overlay slide, info fade, modal scale+backdrop).
- Add `@media (prefers-reduced-motion: reduce)` block in the PanelShell style layer dropping `transform`.
- For modal priority: backdrop gets `animation-delay: 0`, body gets `animation-delay: var(--motion-modal-stagger)`.
- **Drive-by sweep** (same commit): swap legacy `--hud-animation-duration` references in Notifications.tsx and TooltipShell.tsx to the canonical `--motion-instant` / `--motion-fast` / `--motion-medium`. Add `transition: background-color var(--motion-instant) var(--ease-out), transform var(--motion-instant) var(--ease-out)` to the shared button class so rows 21-24 are live.
- Test: Playwright spec asserting an `opacity: 0 → 1` transition exists on panel `[data-panel-id]` within 300ms of state change.
- Commit: `feat(ui): phase 6.2 — PanelShell open/close transitions + motion-token sweep`

### Sub-step 3 — DramaModal reveal="fade" + wire callers

- Edit `packages/web/src/ui/moments/DramaModal.tsx`: implement `reveal="fade"` per Phase 4.5 §6 (backdrop dim + frame translate-up-and-fade). `reveal="instant"` remains supported for tests.
- Add `useReducedMotion()` hook at `packages/web/src/ui/hooks/useReducedMotion.ts`. DramaModal reads it and drops the translateY when reduced-motion is on.
- Flip the two existing callers (AgeTransitionPanel, VictoryPanel) from `reveal="instant"` to `reveal="fade"`.
- Test: assertion that `reveal="fade"` mounts with initial `opacity: 0` and settles at `opacity: 1` within `--motion-medium + --motion-modal-stagger`.
- Commit: `feat(ui): phase 6.3 — DramaModal reveal=fade, wire callers`

### Sub-step 4 — TopBar resource count-up

- Add `useCountUp` hook at `packages/web/src/ui/hooks/useCountUp.ts`.
- Edit TopBar yield display components to use `useCountUp(value, { duration: 400, easing: "ease-out" })`. Tabular-nums CSS is mandatory on the `<span>` rendering the number.
- Asymmetry: `useCountUp` takes `direction: "up-only" | "both"`. TopBar uses `"up-only"`; on decrease the display snaps. Zero-cross (row 15) passes `direction: "both"` plus a colour class toggled when value < 0.
- Test: L2 integration test — dispatch an action that changes yields, assert the DOM text transitions through intermediate values (count-up) on increase and snaps on decrease.
- Commit: `feat(ui): phase 6.4 — TopBar yield count-up on increase, snap on decrease`

### Sub-step 5 — Canvas unit move endpoint ease + combat lunge + damage numbers

- Add `packages/web/src/canvas/motionConstants.ts` with token-reading helpers.
- Extend AnimationManager: per-hex duration from unit category; add `startCombatLunge`, `startDamageNumber`. Honour prefers-reduced-motion (combat lunge disabled, damage number halved).
- Extend AnimationRenderer: draw combat offset on unit sprites; new render pass for floating damage numbers.
- Existing unit-move code already interpolates — add endpoint easing bloom (first/last hex are --ease-out, middle hexes linear).
- Test: existing AnimationManager tests + new tests for lunge duration (200ms ± 16ms tolerance for RAF jitter) and damage number lifetime.
- Commit: `feat(canvas): phase 6.5 — unit move endpoint easing + combat lunge + damage numbers`

### Sub-step 6 — Age transition screen shake (with reduced-motion flash fallback)

- Add `startAgeShake()` method to AnimationManager. Applies a ±4px sinusoidal transform to the canvas container root over 200ms. Reduced-motion fallback: `startBackdropFlash()` — 200ms white overlay fade (0 → 0.15 alpha → 0).
- Wire TRANSITION_AGE action completion to trigger the shake. Trigger point = the moment the new age is locked in (after player picks civ + confirms), NOT when the DramaModal opens — the shake is the ceremony landing, not its entry.
- Test: Playwright spec forces TRANSITION_AGE, asserts the canvas container has a `transform: translate(...)` transition during the 200ms window. Under prefers-reduced-motion, assert the backdrop flash element appears instead.
- Commit: `feat(canvas): phase 6.6 — age transition screen shake + reduced-motion flash fallback`

**Notes on rows handled inside sub-step 2:** toasts (rows 17-20) are partially wired via `animation-duration: var(--hud-animation-duration)` in Notifications.tsx today; the drive-by sweep in sub-step 2 rehomes those onto `--motion-medium` / `--motion-fast` so they obey the same vocabulary. Buttons (rows 21-24) get their shared transition class in the same sweep. Tooltips (rows 25-27) swap to `--motion-instant` / `--motion-fast` in the same sweep. This keeps the sub-step count at 6 without leaving motion-token drift behind.

## 7. Out of scope (deferred to Phase 7)

- Tech-complete badge overshoot animation (--ease-back scale-in on the laurel/check)
- City-founded hex pulse ring (needs a new Canvas primitive: expanding-ring drawable)
- Age transition full ceremonial choreography (backdrop → title → legacy banner → civ cards, staggered). Phase 6 delivers only the landing shake.
- Victory / defeat cinematic sequences
- Unit-death animations (fade-out + puff)
- Projectile arcs for ranged combat
- Procedural sound modulation — all sound is Phase 7
- Skeleton loaders / loading spinners (no load states exist in the game today; defer until a system needs them)
- Particle effects (smoke from cities, flames from combat, etc.) — Phase 7 or later
- In-game "Motion intensity" settings slider (Full / Reduced / None) — Phase 7 alongside audio settings

## 8. Open questions (user decision before Sub-step 5 at latest, ideally before Sub-step 2 commits PanelShell timings)

1. **Unit-move interruptibility.** If the player clicks a new unit while a unit is mid-move, does the current move (a) complete then the selection fires, (b) snap to end and selection fires immediately, or (c) new selection is ignored until move completes? **Recommend (a).** Per-hex duration ≤400ms so the wait is imperceptible; snapping mid-hex looks broken. S-07 Open question #5 recommended the same.

2. **Combat lunge + damage number sequencing with multi-attack.** A ranged unit attacking 3 targets in one resolution: do the 3 lunges play sequentially (attacker visually strikes 3 times, 200ms each = 600ms) or concurrently (one "volley" animation)? **Recommend concurrent** — the attacker makes one visible lunge toward the centroid; all 3 defenders flash and float damage numbers simultaneously. Reads as "volley", not "triple stab".

3. **TopBar count-up granularity.** Per S-07 Orchestration the intended effect is a ripple — gold counts t=0–400, science t=120–520, culture t=240–640, production t=360–760. Total perceived turn-resolve: 760ms. **Or** all four counters tick concurrently for a 400ms total. **Recommend ripple** for its readability, but concurrent is faster and may suit players who end-turn rapidly. **User pick.**

4. **Age transition shake amplitude on high-DPI.** ±4px at DPR 1.0 is right; at DPR 2.0 it is physically 2px and may be imperceptible. Scale by DPR or keep in CSS pixels? **Recommend CSS pixels (no DPR scaling).** The shake is cosmetic; imperceptibility on retina is better than over-shake on standard displays.

5. **Motion intensity — snappy vs stately.** The current token scale (80/160/240/400/1200ms) leans toward "stately". Speed-runners might prefer a snappier scale (halve the medium band: 120ms panel, 200ms modal body). **Recommend keeping current values.** They were chosen deliberately in S-07 after tasting reference games; speed-runners can enable prefers-reduced-motion. Flagging for explicit user confirmation before Sub-step 2 commits PanelShell timings.

6. **Toast stack dismiss priority on interruption.** When a critical-priority toast arrives while a non-critical toast is mid-enter, does (a) the critical toast jump the queue visually (the in-flight toast cancels + exits, critical enters), (b) they coexist (critical appears above the still-entering one), or (c) critical waits its turn? S-07 hints at (a) via "critical warnings: no entrance delay". **Recommend (a).** Confirmation needed before Sub-step 2 since toast choreography is in the drive-by sweep.

---

**End of Phase 6 spec.** On user sign-off for the six open questions (especially #1, #3, and #5 which affect implementation), Sub-step 1 is ready to start immediately — no dependencies on other phases, no blocking design work.
