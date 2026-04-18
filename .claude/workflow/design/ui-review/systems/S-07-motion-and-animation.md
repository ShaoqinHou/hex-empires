---
title: S-07 — Motion & animation contracts
purpose: Define every timing, curve, and choreography rule for UI motion so the game breathes instead of snapping. Motion is information, not decoration.
created: 2026-04-17
principles: [P5, P9]
holistic-audits: [H-4, H-5]
phase: 1.1 (token expansion) + 7 (juice pass)
---

# S-07 — Motion & animation contracts

## Purpose

Motion is information. P5 ("respond to every interaction") and H-4 ("everything static, no motion") capture the same failure: today's hex-empires UI updates state without ever acknowledging that state changed. Panels pop. Numbers snap. Notifications materialise. Nothing slides, glows, pulses, or settles. The result reads as a form submission — correctly applied, diligently validated, soul-less.

A game loop without motion is a spreadsheet with dice. Motion does three jobs that nothing else can:

1. **Acknowledge the player.** A 120ms ease on a button press says "I heard you" before the player's brain finishes asking "did it work?"
2. **Direct attention.** A count-up on the gold number after a trade completes is the UI pointing at the consequence of the decision the player just made. A snap provides no such pointer.
3. **Establish weight.** A modal that fades in over 240ms with a backdrop darkening simultaneously feels significant. The same modal appearing instantly feels like a bug.

S-07 is the contract that every animated thing in the UI obeys. Its goal is not to add more motion; it is to make the motion that exists legible — the player learns, turn by turn, that "the gold number always counts up over 400ms", so they glance at it, read the delta, and know. Without consistency, motion becomes noise. With consistency, motion becomes a second channel of information alongside the visuals.

## Scope

### In-scope

Every UI motion in `packages/web/src/` — panels, HUD, canvas-adjacent overlays, buttons, numbers, state transitions, cursor feedback, ceremonial moments:

- Panel open / close / tab-switch
- Tooltip and toast enter / exit
- Button hover / press / release
- Validation-feedback shake + scale
- Resource-number change (count-up or snap-down)
- Tech / civic / age / city / turn / combat event animations
- Unit move animation along a path
- Ceremonial modal sequences (AgeTransition, Victory)
- Micro-interactions: focus ring entrance, selection ring pulse, notification dismiss
- `prefers-reduced-motion` collapse behaviour

### Out-of-scope

- **Canvas-level battle animations beyond feedback** — unit death anims, projectile arcs, terrain parallax. Those are a game-design concern owned by `canvas/AnimationManager.ts`; S-07 references them only where they intersect UI (e.g. screen-shake on combat hit).
- **Sound-cue design** — S-07 specifies *when* sound plays in relation to motion, not *which* chord. That belongs in S-11 (sound contracts, not yet drafted) + the audio registry.
- **Camera pan / zoom kinetics** — the camera is gameplay, not UI. Its own timing lives in `canvas/Camera.ts`.
- **Art transitions** (e.g. era-appropriate visual themes crossfading). Once leader portraits and era backgrounds exist, crossfade timing will be added; until then it is placeholder.

## Current state

The codebase has scattered motion but no system.

- `TurnTransition.tsx` uses `--hud-turn-transition-animation-duration: 500ms` — the only named motion token today.
- `hud-tokens.css` defines `--hud-animation-duration: 140ms` for "all HUD fades / slides" but most HUD elements don't consume it.
- Panels open with React's mount-no-transition behaviour — instantly.
- Notifications.tsx fades with an inline duration string.
- `canvas/AnimationManager.ts` handles unit-move interpolation independently, without shared tokens.
- Buttons have Tailwind `hover:` colour changes with the default 150ms transition, inconsistent with any explicit rule.
- No `prefers-reduced-motion` media query is honoured anywhere.

The net: motion exists in ~10 places, each with its own numbers, and the aggregate reads as "sometimes animated, sometimes not" — which is worse than "always static". S-07 pulls this together.

## The system

### Duration scale

Five tokens, one rule each. Durations are in `ms`; CSS custom properties live in a new `packages/web/src/styles/motion-tokens.css` imported by the root app.

| Token | Value | Rule of use |
|---|---|---|
| `--motion-instant` | 80ms | Tiny, must-feel-physical responses: button hover-glow appearance, press depress, icon flip, focus-ring fade-in, tooltip fade-out (exit is faster than entrance). |
| `--motion-fast` | 160ms | Transient arrivals / departures: tooltip fade-in, toast fade-out, notification dismiss, panel tab content swap, HUD element enter. |
| `--motion-medium` | 240ms | Significant UI shifts: panel slide-in + fade-in, modal scale-in, dropdown open, fixed-corner tooltip appearance, backdrop darken. |
| `--motion-slow` | 400ms | Consequences the player should *read*: resource number count-up, tech-complete flash, selection-ring pulse, turn transition interstitial. |
| `--motion-ceremony` | 1200ms | Earned interruptions (P9): age transition sequence, victory fanfare, defeat somber fade. One of these runs on 3-8 events per game; never chain them. |
| `--motion-shake` | 200ms | 2-oscillation shake total duration. Validation-feedback pill (§Validation feedback); age-transition screen shake (Phase 6.6). Semantic alias — a shake is not a fade; using `--motion-fast` at call sites would require a comment explaining why. Added Phase 6.1. |
| `--motion-modal-stagger` | 80ms | Backdrop-to-body offset on modal opens. Backdrop dims first; modal body begins scale-in after this delay. Used by PanelShell `priority="modal"` and DramaModal. Added Phase 6.1. |

**Never invent a duration between tokens.** If a motion needs to feel different, change its easing or its distance, not its duration. Consistency over local optimisation.

### Easing scale

Five curves, each with an intent.

| Token | Value | When to use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Standard **entrance**. Fast arrival, soft landing. Panels sliding in, tooltips appearing, toasts rising. The default for anything coming toward the player. |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Standard **exit**. Linger, then accelerate away. Panels closing, toasts auto-fading, notifications dismissing. |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | **State shift** with no implied direction: tab-to-tab content swap, section collapse, the modal scale-in+out halves of a ceremonial sequence. |
| `--ease-back` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | **Triumphant** overshoot — slight 10-15% bounce past target before settling. Tech-complete badge, city-founded pulse, victory entrance. Used sparingly so it stays special. |
| `--ease-spring` | (defined in code, not CSS) | **Drag / release** interactions. Requires JS (no CSS equivalent). Used for the unit-drag affordance if added; otherwise reserved. |

No other curves. `cubic-bezier(...)` literals in component code are a block — they drift. If the design legitimately needs a sixth curve, it goes in this table first.

### Motion contract per element type

The concrete rules. Each row is a promise: given this element performs this action, these numbers apply. Implementers reference the row, not the surrounding prose.

#### Panels

| Action | Motion | Tokens |
|---|---|---|
| Overlay panel open | Slide-in from right (16px) + fade-in | `transform` + `opacity`, `--motion-medium` `--ease-out` |
| Overlay panel close | Slide-out to right + fade-out | `--motion-fast` `--ease-in` (exits are faster than entrances) |
| Info panel open | Fade-in only (no slide) | `--motion-fast` `--ease-out` |
| Info panel close | Fade-out | `--motion-instant` `--ease-in` |
| Modal backdrop | Darken from 0 → target alpha | `--motion-fast` `--ease-out` |
| Modal body | Scale-in 0.92 → 1.0 + fade-in | `--motion-medium` `--ease-out`, 80ms offset from backdrop |
| Tab-to-tab within a panel | Content crossfade | `--motion-fast` `--ease-in-out` |

Rationale: exits must be faster than entrances (the player has already moved on). The 80ms backdrop-to-modal offset (S-10) gives the eye time to register the dim before the modal lands.

#### Tooltips

| Action | Motion | Tokens |
|---|---|---|
| Floating tooltip appear | Fade-in (no scale) | `--motion-instant` `--ease-out` |
| Floating tooltip disappear | Fade-out | `--motion-instant` `--ease-in` |
| Fixed-corner tooltip (detailed tier) appear | Fade-in + slight slide (8px from anchor direction) | `--motion-fast` `--ease-out` |
| Fixed-corner tooltip disappear | Fade-out | `--motion-instant` `--ease-in` |
| Alt-held tier switch (compact → detailed) | Body crossfade in place; anchor stays put | `--motion-fast` `--ease-in-out` |

Floating tooltips flicker at 4-second hover cadence; their motion must be under sensory threshold. 80ms fades read as "there", not "animating-in".

#### Toasts / Notifications

| Action | Motion | Tokens |
|---|---|---|
| Toast enter (from bottom-right stack) | Slide-up 24px + fade-in | `--motion-medium` `--ease-out` |
| Toast auto-fade | Opacity → 0 | `--motion-fast` `--ease-in` after 4000ms display |
| Toast dismiss on click / any-key | Scale-down to 0.88 + fade-out | `--motion-fast` `--ease-in` |
| Stack reshuffle (older toasts pushed up) | Translate-y of older toasts | `--motion-fast` `--ease-in-out` |

The stack reshuffle is load-bearing: without it the upward-push feels glitchy. All existing toasts animate to new position simultaneously; the new toast slides in over the same duration.

#### Validation feedback

| Action | Motion | Tokens |
|---|---|---|
| Entrance | Scale-in 0.92 → 1.0 + fade-in + 2-frame left-right shake (±4px) | `--motion-instant` scale/fade, shake completes in 80ms |
| Settle | Hold at final position | 200ms hold before auto-dismiss |
| Exit | Fade-out | `--motion-instant` `--ease-in` |

The shake is 2 oscillations, not a wiggle. Amplitude is deliberately small — enough to feel a "nope", not enough to be distracting.

#### Buttons

| Action | Motion | Tokens |
|---|---|---|
| Hover enter | Glow / colour shift fade-in | `--motion-instant` `--ease-out` |
| Hover leave | Glow fade-out | `--motion-instant` `--ease-in` |
| Press | `transform: translateY(1px)` + shadow reduce | `--motion-instant` `--ease-out` |
| Release | Return to rest | `--motion-fast` `--ease-out` (longer than press so the "click" feels weightier) |
| Focus ring enter | Opacity + outline-width ramp | `--motion-instant` `--ease-out` |

The press-depress is the minimum juice every button owes. A button without this reads as a web link.

#### Resource numbers

| Action | Motion | Tokens |
|---|---|---|
| Value increased | Count-up from old → new over `--motion-slow`, `--ease-out` | Tabular-nums mandatory |
| Value decreased (spending) | **Snap**: digits change instantly | No motion — animating a loss feels unfulfilling |
| Value crossed zero into negative | Pulse red + count-up | `--motion-slow` `--ease-back` + colour transition |

The asymmetry (count-up gains, snap losses) is deliberate. Civ-style games reward; rewarding motion reinforces the verb. Spending is a cost; the UI shouldn't savour it.

#### Tech / civic complete

Sequence:
1. Tech card flash (`--motion-fast`, colour pulse from base → gold → base)
2. Badge overlay (check mark or laurel) scales in `--motion-slow` `--ease-back`
3. Sound chord plays at t=0
4. 500ms later, notification toast slides in (see B.3)

#### Age transition (ceremonial)

The longest sequence in the game. 1200ms total, broken into phases:

| t (ms) | Event | Motion |
|---|---|---|
| 0 | Player clicks "Begin new age" / auto-trigger | — |
| 0–200 | Backdrop dim (black @ 0 → 0.75) | `--motion-fast` `--ease-out` |
| 200–500 | Era title fade-in + slight scale (0.95 → 1.0) | 300ms `--ease-out` |
| 500–800 | Legacy-bonus banner slides in from left | 300ms `--ease-out` |
| 800–1200 | Civ-choice cards fade in staggered (80ms between each) | 400ms for the group |

Sound: ambient era-shift chord at t=0, resolution chord at t=800.

#### City founded

| t (ms) | Event | Motion |
|---|---|---|
| 0 | Found City action resolves | — |
| 0 | Sound chord + hex pulse start | Gold outline ring scales 1.0 → 1.4 + fades, `--motion-slow` |
| 0 | Mini "+City" badge spawns above hex | Fade-in + translate-up 16px, `--motion-medium` `--ease-back` |
| 600 | Toast notification enters | See B.3 enter contract |

#### Combat hit

| Action | Motion | Tokens |
|---|---|---|
| Attacking unit lunges | 8px shove toward target + return | `--motion-fast` round-trip `--ease-out`→`--ease-in` |
| Defender hit | Red tint flash on sprite | `--motion-fast` colour pulse |
| Screen shake (optional, default on, configurable in audio/settings) | Low-amplitude (±3px) shake | 160ms, 2 oscillations |
| Damage number | Floats up 24px + fades | `--motion-slow` `--ease-out` |

Screen shake is opt-in-on-for-the-player but must be a settings toggle (accessibility). See Open questions.

#### Unit move

Linear interpolation along the path. Per-hex duration depends on the unit's move speed, tokenised:

| Unit speed | Per-hex duration |
|---|---|
| Slow (Settler) | `--motion-slow` (400ms) |
| Normal (Warrior) | `--motion-medium` (240ms) |
| Fast (Cavalry, Scout) | `--motion-fast` (160ms) |

Path rendering eases in on the first hex and eases out on the last; intermediate hexes are linear. Total: `n` hexes × per-hex duration, with a 40ms easing bloom on the endpoints so the unit doesn't brake suddenly.

### Restraint rules — when NOT to animate

Motion is a scarce resource. Overused, it reads as distracting. These are hard "don't" rules.

1. **Tabular numerics: never animate digit position.** A resource number that shifts horizontally as its width changes (e.g. `99` → `100`) looks like a bug. Tabular-nums + count-up fixes both problems — the digits stay aligned while the value animates. `font-variant-numeric: tabular-nums` is mandatory on every number that can change.
2. **Typography: never animate letter position.** No letters-sliding-in, no staggered-character reveals outside the AgeTransition title (one earned exception). Text appears, or it doesn't.
3. **Resource LOSS: never animate a decrease.** Covered above. Snap down.
4. **Critical warnings: no entrance delay.** A "your capital is under attack!" toast must not stagger or crossfade with other toasts; it appears at `--motion-instant` and pulses until acknowledged. S-10 handles the stack priority.
5. **Canvas-anchored floating text (damage numbers, yield previews): capped at `--motion-slow`.** If a player triggers 10 of these rapidly, they must not queue — they overlap and each completes on its own timeline. Queueing would create a 4-second tail of animations after a combat resolves.
6. **Scroll position: never animate.** If a panel body's scroll changes programmatically (e.g. "scroll to selected tech"), it jumps. Smooth-scroll on UI panels makes strategy play feel laggy.
7. **Layout resize: animate only the position of children, never the container width.** When the panel open pushes the canvas, the canvas re-renders at new width immediately; the panel is the one sliding. Animating both directions looks like jello.

### Reduced-motion accessibility

`@media (prefers-reduced-motion: reduce)` collapses S-07's motion to information-preserving minima. Rules:

1. **All motion durations halved**, clamped to ≥ `--motion-instant` (80ms). A 1200ms ceremony becomes 600ms; a 240ms panel open becomes 120ms; an 80ms tooltip fade stays 80ms.
2. **Translate / scale / rotate → opacity only.** Panels fade in in place. Modal body appears at final scale with fade. Toasts fade in without the slide-up.
3. **Shakes disabled entirely.** Validation feedback fades in with a red border pulse instead. Screen-shake on combat disabled.
4. **Count-up durations halved.** Gold counter ticks up over 200ms instead of 400ms.
5. **Ceremonial sequences compress.** AgeTransition collapses to: backdrop fade, title appear, cards appear — 400ms total, no stagger.
6. **Easing curves simplify.** `--ease-back` overshoots are replaced with `--ease-out`. No bounces, no springs.

The CSS for reduced-motion lives in `motion-tokens.css` as a `@media (prefers-reduced-motion: reduce)` block that redefines the tokens; every consumer gets the collapsed behaviour automatically.

### Orchestration

When multiple things animate together, they stagger; they don't fire simultaneously. Humans perceive synchronised motion as a single event and miss detail; staggered motion is legible.

**Default stagger: 80ms between elements in a group** (equal to `--motion-instant`, not coincidence — the stagger interval is "one unit of UI time").

Canonical sequences:

- **Modal open:** backdrop `--motion-fast` → +80ms modal scale-in `--motion-medium` → +120ms content fade-in `--motion-fast`. Total perceived duration: 360ms.
- **Panel open + notification dismissal:** if opening a panel auto-dismisses a related notification, panel slides in first; notification fades out over the last 160ms of the panel's arrival. Sequential, not simultaneous.
- **Turn-end resolution:** gold counter counts up (400ms) → science counter counts up starting at t=120ms → culture at t=240ms → production at t=360ms. Each resource has its own 400ms arc. Visually, numbers ripple. Music: a single rising chord covers t=0–800ms.
- **Age transition:** sequenced as specified above; each phase hands off to the next without overlap.
- **Tech tree: unlocking multiple techs at once** (rare — catchup mechanic): each tech's badge animates with a 60ms stagger between them. If 5 techs unlock, the full sequence is 240ms + one tech's 400ms animation.

Never overlap same-token motions on the same element. If a panel is still opening (`--motion-medium` in-flight) and the user clicks close, the open cancels and the close starts from the current interpolated state — no restart, no snap.

### Sound-cue pairing

Motion + sound = event. S-07 specifies when sound fires relative to motion; S-11 (forthcoming) specifies which sounds.

Rules:

1. **Sound fires at motion start, not end.** A tech-complete chord plays when the badge starts scaling in, not when it settles. Sound leading motion by 20-60ms feels "caused by" the sound; sound trailing feels disconnected.
2. **Short motion, single sound.** Button press: one click. Don't layer "click + pop + whoosh" on an 80ms motion.
3. **Ceremony: layered soundtrack.** AgeTransition has the era chord at t=0 (covers backdrop + title), the legacy-bonus chord at t=500 (covers banner slide), the resolution chord at t=800 (covers card reveal). Three cues, each timed to a phase.
4. **Validation feedback: short "nope" sound** — single note, dissonant, 80ms, fires at shake start.
5. **Resource count-up: no sound per tick.** A subtle chord at the start of the combined resource ripple; not 4 separate chimes.
6. **Reduced-motion override: sounds still play.** Accessibility is not "silent game"; it is "no vestibular triggers". Audio continues.

## Examples

### 1. End-Turn pressed

`t=0`: Button depress motion (`--motion-instant`, `translateY(1px)`). Click sound.
`t=80`: Button release begins (`--motion-fast`, return). Idle-units check passes → turn resolves.
`t=0-800`: Resource counters ripple per Orchestration.
`t=200`: Any toast notifications for the turn queue in (rising chord + slide-up, staggered 80ms).
`t=800`: Turn-number badge pulses once (`--motion-slow` `--ease-back`). "Turn N+1" text updates with a 1-frame flash.

If unit moves occurred (AI turn), they interpolate along paths in parallel with the counter ripple. If a combat happened, its sequence (lunge + shake + damage number) sits on its own timeline, triggered in order.

### 2. City founded

`t=0`: Found-City action dispatched. Sound: foundational chord.
`t=0-400`: Hex pulse ring expands and fades (`--motion-slow`).
`t=0-240`: Mini "+City" badge rises above hex and fades in (`--motion-medium` `--ease-back`).
`t=600`: Toast enters from bottom-right with event-specific icon + title "City Founded · Roma" (`--motion-medium` `--ease-out`, slide-up + fade).
`t=4600`: Toast auto-fades (`--motion-fast` `--ease-in`).

Settler sprite disappears at t=0 in sync with the pulse — single event, single motion.

### 3. Tech completed

`t=0`: Engine resolves tech completion. Sound: research chord.
`t=0-160`: Tech card (if TechTree panel open) colour-pulses base → gold → base.
`t=0-400`: Badge (checkmark or laurel) scales in over the card (`--motion-slow` `--ease-back`).
`t=500`: Toast enters "Pottery Researched" with research category icon and colour.
`t=800`: If this unlocks a new unit / building, a secondary tooltip-style hint appears over the relevant UI surface (tech tree node, production menu) with a `--motion-fast` fade-in.

### 4. Validation error — "not enough gold"

`t=0`: Player clicks a locked purchase / action. Sound: "nope" note.
`t=0-80`: Feedback pill scales in + 2-oscillation shake + red border accent.
`t=80-280`: Hold (read time).
`t=280-360`: Fade out (`--motion-instant` `--ease-in`).
`t=0`: Any reachable affordance (gold counter, buy button) gets a 1-frame red flash to indicate *which* field the error is about.

Total duration on-screen: 360ms. Under `prefers-reduced-motion`: no shake, red-border fade-in only, 200ms total.

### 5. Age transition (full ceremony)

Exactly as specified in the per-element table. Key reinforcement:

- Player has agency to skip after the title appears (`Space` or click) — but cards must have materialised first (minimum 800ms). Skipping jumps the sequence to the card-reveal end state.
- Music ducks the ambient score 200ms before the ceremony starts; restores 400ms after it ends.
- Map underneath is frozen (camera does not move, units don't animate) for the duration of the ceremony.

## Interaction with other systems

- **S-01 (z-index):** during motion, elements do not change z-tier. A panel sliding in stays at `--panel-z-overlay` throughout; it doesn't briefly rise to modal. Exception: when a modal is opening, the backdrop's z-tier is set at t=0 (not mid-animation) so the dim is predictable.
- **S-02 (anchoring):** motion never re-anchors. A tooltip that slides in from the cursor doesn't shift to a fixed corner mid-motion. If the anchor changes (cursor moved away), the tooltip's exit plays; the next tooltip's entrance starts fresh.
- **S-03 (sizing):** element dimensions at motion start and end are both valid end-states of S-03's responsive rules. Motion interpolates between them; sizing doesn't change during motion.
- **S-04 (transparency):** the opacity value at motion end is the S-04 target; S-07 defines the duration, S-04 defines the destination. A panel fades in over `--motion-medium` to S-04's specified `0.96` alpha, not to 1.0.
- **S-05 (stacking):** when cycling through stacked entities in a tooltip, the content crossfades with `--motion-fast` `--ease-in-out`. The container stays put; only the body changes.
- **S-06 (dismissal):** dismiss timing lives here. Auto-dismiss delays (4000ms for toasts, 200ms for validation, 1.5s for transient hints) are specified in S-07 and referenced from S-06. S-06 owns the "when does a thing go away" logic; S-07 owns "what does going-away look like".
- **S-08 (focus):** focus-ring appearance is `--motion-instant` — fast enough to feel like a response, short enough not to strobe when tab-cycling.
- **S-09 (state transitions):** S-07 provides the durations for hover / press / active / disabled / loading transitions; S-09 defines the visual end-states. Loading spinners and skeleton loaders are also S-07's concern (rotation: 2000ms linear infinite; skeleton shimmer: 1600ms linear infinite).
- **S-10 (multi-surface):** orchestration rules above (staggers, sequences) are S-10's source of truth for timing. S-10 decides *which* elements fire together; S-07 decides *when* within that group.
- **S-11 (sound contracts, future):** pairing rules above are S-07's side of the contract. S-11 will specify the chords, files, and mixer buses.

## Implementation phase

**Phase 1.1 — Token expansion (Week 1-2 of the master plan).** Land `motion-tokens.css` with all five duration tokens, five easing tokens, and the `prefers-reduced-motion` override block. Document in `rules/motion.md` (new; sibling to `panels.md` / `ui-overlays.md`). Retrofit existing motion call-sites (`--hud-animation-duration`, inline durations in Notifications.tsx, TurnTransition.tsx) to the new tokens — the values map cleanly. No surface-level behaviour changes in 1.1; this is plumbing.

**Phase 7 — Juice pass (Week 11+).** Add the specific motion behaviours: panel slide-in, count-up on resource numbers, tech-complete flash, city-founded pulse, age-transition ceremony, combat screen-shake, unit-move bloom. Each lands as a self-contained PR using the tokens defined in 1.1. The Orchestration rules are enforced by inspection, not by a framework — orchestrators are small enough functions that "backdrop starts at 0, modal starts at 80" reads clearly in the code.

Intermediate phases (2-6) that add new surfaces must consume tokens and follow the rules on arrival. A panel written in Phase 2 without motion is a regression; a panel written with motion that invents its own 220ms duration is also a regression.

## Open questions

1. **Screen-shake: default on or off?** Recommendation: default on for new players (it's the canonical strategy-game feedback), with a settings toggle in AudioSettings (renamed "Audio & Motion"). Alternate view: default off because a small percentage of players are vestibular-sensitive; opt-in matches `prefers-reduced-motion`. Decision point for the user.
2. **`prefers-reduced-motion` respected by default, or a separate in-game toggle overlaying it?** Web conventions say "honour the OS setting and expose an in-app override". Lean honour-plus-override — a player on macOS with Reduce Motion on but who wants the full ceremony can toggle it on per-game. Decision point.
3. **Resource count-up: gold-only or all resources?** Counting up science / culture / happiness every turn might be overwhelming (4-5 simultaneous ripples). Option A: all resources count up (ripple choreography). Option B: only gold (the one that feels most economic) counts; others snap. Recommendation: all of them with stagger per Orchestration; the ripple is exactly what reads as "turn resolved". Decision point.
4. **Damage numbers: floating capped at how many simultaneous?** If a ranged unit kills 3 enemies in one attack resolution, 3 floating numbers overlap. Cap at 3 visible simultaneously with the rest queued on a 100ms interval? Or show all, overlapping? Recommendation: all, overlapping — the overlap reads as "heavy combat" and the clean version feels sterile.
5. **Unit-move animation: interruptible?** If the player clicks to select another unit mid-move, does the current move finish or snap to the end? Recommendation: finish (~200-400ms is short enough that the snap is the jarring behaviour). Needs engineering confirmation that the state consistency holds.
6. **Ceremony skipping: preserved sound or cut?** If the player presses Space to skip the AgeTransition at t=400ms (during title-reveal), do the remaining chord cues play compressed, or is music cut to the next loop? Recommendation: crossfade music but skip visual motion — the visual ceremony is interruptible; the audio score is atmospheric.

These are real choices. All five get resolved at the time of Phase 7 implementation; pre-committing here would pretend at certainty we don't yet have.
