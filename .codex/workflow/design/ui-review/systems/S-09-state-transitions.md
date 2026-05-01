---
title: S-09 — Interactive-element state transitions
purpose: A canonical state machine that every interactive element in hex-empires adheres to, so buttons, cards, tabs, toggles, hex tiles and unit portraits all feel like parts of one game rather than 40 one-off widgets
created: 2026-04-17
related:
  - S-04 transparency and opacity semantics (disabled opacity)
  - S-07 motion and animation contracts (timing and curves)
  - S-08 focus and keyboard navigation (focus-visible style)
  - S-10 multi-surface interaction (conflicts between panels and HUD during loading and error states)
phase: Phase 1 (state tokens) and Phase 2 (apply to TopBar and BottomBar) — see 08-master-plan.md
---

# S-09 — Interactive-element state transitions

Every interactive element in the UI has **multiple states**, and today those states are inconsistent per element. A TopBar action button inverts its colors on hover. A TechTree card scales slightly. The End-Turn button does nothing visible on hover at all. A Settler Found-City button in the BottomBar does not show its `pressed` frame. The player cannot tell what is clickable at a glance, and the game feels static (H-4 in the holistic audit).

This document is the canonical state machine. It specifies every state an interactive element can be in, what triggers a transition between them, and — crucially — the exact visual change per state, tokenized so that re-theming the game does not require editing 40 components.

## Purpose

Aligns with P5 (respond to every interaction) and P10 (density is a feature). When every element acknowledges every input within 200ms, the UI reads as a physical thing you can press instead of a form you fill out. Density depends on it. A dense UI where nothing responds to hover is impenetrable. A dense UI where everything glows under the cursor is readable. Tokens make the system uniform; uniformity makes the system learnable.

## Scope

Covers every interactive surface the player can click, hover, focus, or drag:

- **Buttons** — primary (End Turn, Build, Confirm), secondary (Cancel, Close, tab menu), tertiary (icon-only like minimap controls)
- **Cards** — leader cards, tech cards, civic cards, pantheon cards, building cards, crisis-response cards
- **Tabs** — Group D panel tab rows (Tech and Civics subgroups, Diplomacy sub-tabs, Government policies)
- **Menu items** — BottomBar panel-access row after A.2 migration, context menu rows
- **Dropdown triggers** — audio settings selector, civ filter in SetupScreen
- **Toggles** — audio mute, yield overlay, grid overlay, music on/off
- **Sliders** — master volume, music volume, SFX volume
- **Hex tiles on map** — click-to-select for unit movement, building placement, city inspection
- **Unit portraits** — unit-selected BottomBar entry, dossier thumbnail

Out of scope: text inputs (save-game name) use browser defaults wrapped in tokenized chrome — their state machine is handled by the shell, not this doc. Passive elements (headings, breadcrumbs, resource chips in read-only mode) have no states.

## Canonical state set

Every interactive element is in exactly one of these states at any moment. Missing states are a bug.

| State | Definition | Who triggers it |
|---|---|---|
| `default` | Resting. No cursor near, no focus, no activity. | Initial; return state. |
| `hover` | Mouse is over the element; desktop only (decision 6: no touch). | Pointer enter. |
| `focus-visible` | Keyboard has focused the element; outline shows. See S-08 for exact style. | Tab or arrow-key navigation; `:focus-visible` pseudo-class. |
| `pressed` | Active mouse-down OR space-down while focused. | Mouse button depressed, not yet released. |
| `selected` | This element is the currently-chosen member of a set (tab, leader, active policy, selected unit). | Prior click completed; state persists until another peer is chosen. |
| `disabled` | Currently unavailable — greyed per S-04. | Engine predicate (canAffordBuild returns false; action requires tech not yet researched). |
| `loading` | Async action in progress; prevent double-submit. | Click completes, async work began. |
| `success-flash` | Brief success-confirmation pulse after an action completes. | Engine confirms the action succeeded. |
| `error-flash` | Brief error pulse after an attempted action fails validation. | Engine or UI rejects the action. |

`focus-visible` and `hover` can stack (see Stacked states below). `selected` can stack with `hover` and `focus-visible`. The three flash states (`success-flash`, `error-flash`, the momentary release from `pressed`) are **transient** — they auto-expire back to whichever persistent state applies next.

## Per-element state specs

Exact visual changes per state. These become the contract for any component that claims to be a button or card.

### Primary button (End Turn, Build, Confirm modal CTA)

| State | Visual |
|---|---|
| `default` | Gold gradient (`--state-primary-bg` = linear-gradient amber-300 to amber-500), dark-ink text (`--state-primary-text`), 1px darker border, drop-shadow (`--state-primary-shadow`). Tabular-num label and keyboard-hint glyph (Enter symbol). |
| `hover` | Brightness +2%, 1.02 scale, glow (`--state-primary-glow`). Motion 80ms ease-out. |
| `focus-visible` | 2px amber outline offset 2px (`--focus-ring-primary` — see S-08). Does NOT swap colors. Can coexist with hover. |
| `pressed` | 0.98 scale, 5% darker, inset shadow (`--state-primary-inset`). Motion: instant (0ms — pressed is immediate feedback). |
| `selected` | Gold outline 2px (rare for primary — used if a choice button toggles an ongoing mode). |
| `disabled` | 30% opacity (S-04 `--opacity-disabled`), `cursor: not-allowed`, no hover or pressed responses. Text remains legible (opacity applied to the whole element, not layered). |
| `loading` | Label replaced by centered gold spinner (`--spinner-primary` — S-07 motion-slow rotation); button stays at default bg; click disabled. |
| `success-flash` | 220ms gold pulse (scale 1.0, 1.04, 1.0; glow bloom). Chime plays. Then back to `default` or `disabled`. |
| `error-flash` | 220ms red outline pulse (`--state-error-ring`, 1px, 3px, 1px), 140ms horizontal shake +/-3px (S-07 shake curve). Bzzt plays. Then back to `default` (or `disabled` if the error was no-longer-available). |

### Secondary button (Close, Cancel, tab-menu item, BottomBar panel button)

| State | Visual |
|---|---|
| `default` | Transparent bg, 1px `--panel-border`, panel-text-color label. |
| `hover` | `--state-secondary-hover-bg` (semi-translucent warm tint, color-mix gold 12% with transparent). Border brightens to `--panel-accent-gold`. 80ms. No scale — secondary is quieter than primary. |
| `focus-visible` | Same 2px offset outline, amber. |
| `pressed` | Background slightly darker, 1px inset border. No scale. |
| `selected` | For tab-style secondary: solid gold underline 2px below the label, label text swaps to amber-300. |
| `disabled` | 30% opacity, `not-allowed`. |
| `loading` | Small inline spinner replaces an adjacent glyph, label text stays. |
| `success-flash` | Gold tint bg pulse (no scale — secondary restrained). |
| `error-flash` | Red outline pulse and no shake (shake reserved for primary attempts). |

### Tab (Group D tree panels — Diplomacy tabs, Government subsections, TechTree era bands)

| State | Visual |
|---|---|
| `default` | Muted label (`--panel-muted-color`), transparent bg. |
| `hover` | Label text brightens to `--panel-text-color`. Underline appears at 30% opacity. 80ms. |
| `focus-visible` | 2px amber outline around the tab label box. |
| `pressed` | Underline jumps to 100% opacity immediately; label shifts down 1px (subtle physical press). |
| `selected` | Solid amber underline 2px, label in `--panel-accent-gold-bright`, tab bg slightly lifted (`--state-tab-selected-bg`). Persists. |
| `disabled` | 30% opacity; tab appears but cannot be activated (e.g. a tab for a tech tree era the player has not reached). |
| `loading` | Underline becomes an indeterminate progress bar (S-07 shimmer). |
| `success-flash` | N/A — tabs do not flash on success; the content-area flashes instead. |
| `error-flash` | N/A — same reason. |

### Card (leader-select, tech card, pantheon card, building-to-build card)

| State | Visual |
|---|---|
| `default` | Panel-muted-bg, 1px `--panel-border`, slight inset highlight on top edge. |
| `hover` | Border becomes `--panel-accent-gold-soft`, scale 1.01, shadow-lift (2 to 6px blur). 120ms. Corner accent chip brightens. |
| `focus-visible` | 2px amber outline offset 2px. Shadow-lift matches hover. |
| `pressed` | Scale 0.99, inset shadow, border `--panel-accent-gold-bright`. Instant. |
| `selected` | Gold border 2px (`--panel-accent-gold`), amber top-edge accent 4px, bg swap to `--state-card-selected-bg`. Persistent. Other peer cards dim to 70% opacity (S-04). |
| `disabled` | 30% opacity. `not-allowed`. A small reason-badge at top-right (e.g. Requires Writing, Insufficient Gold). |
| `loading` | Spinner overlay inside the card (center, 50% bg scrim). |
| `success-flash` | 220ms gold-glow bloom around the card border, then settles into `selected`. |
| `error-flash` | 220ms red-border pulse and 140ms shake. |

### Toggle switch (Audio mute, Yields overlay, Grid overlay)

| State | Visual |
|---|---|
| `default` (off) | Track: `--state-toggle-off-bg` (slate-700 at 60%). Thumb: slate-300, on left. |
| `default` (on) | Track: `--state-toggle-on-bg` (amber-500 at 60%). Thumb: amber-100, on right. |
| `hover` | Track brightness +5%, thumb border glows subtly. 80ms. |
| `focus-visible` | 2px amber outline around the track. |
| `pressed` | Thumb compresses horizontally 10% while flipping sides. Instant start, 160ms to other side. |
| `selected` | N/A — the toggle on-position is its selected; no distinct state. |
| `disabled` | 30% opacity; cursor `not-allowed`; cannot flip. |
| `loading` | Track shows shimmer. Thumb locked in current position. |
| `success-flash` | Track flashes +bright for 120ms after flip completes. Small click sound. |
| `error-flash` | N/A — toggles do not error (a disabled toggle is the only failure mode). |

### Slider (volume sliders)

| State | Visual |
|---|---|
| `default` | Track bg `--state-slider-track-bg`, fill `--panel-accent-gold-soft` up to current value, thumb circle `--panel-accent-gold-bright`. Current-value label above thumb (tabular-num). |
| `hover` | Thumb scale 1.15, glow. Track fill saturation +10%. 80ms. Cursor becomes `grab`. |
| `focus-visible` | 2px amber outline around the thumb. Arrow keys adjust by +/-1%, Page keys by +/-10%. |
| `pressed` (dragging) | Thumb scale 1.25, cursor becomes `grabbing`. Per-tick click sound at every 5% crossed (sliders emit audio ticks during drag — S-07 slider-tick). Track fill updates in real time. |
| `selected` | N/A — no selected state for sliders. |
| `disabled` | 30% opacity; cursor `not-allowed`. |
| `loading` | N/A — sliders are synchronous. |
| `success-flash` | 120ms thumb glow-bloom on settle (release). |
| `error-flash` | N/A. |

### Hex tile on map (click-to-select)

Hex tiles are a canvas-rendered interactive element; states are drawn with hex outlines, fills, and entity highlights.

| State | Visual |
|---|---|
| `default` | No outline, no overlay beyond the tile art. |
| `hover` | 1.5px amber outline inscribed inside the hex edge, 60% opacity. A subtle inner-glow. 80ms. |
| `focus-visible` | N/A for canvas — focus remains with the keyboard-navigation entity (selected unit, not the tile). |
| `pressed` | 110ms bright white-to-gold flash on the tile footprint, no outline persists beyond the flash. |
| `selected` | 2px gold outline (`--state-hex-selected`), tile art saturation +5%. Persists until another tile is selected or ESC clears. |
| `disabled` | For movement targets out of range: tile is dimmed (S-04 `--opacity-map-disabled`, 50%) and cursor shows `not-allowed`. For building placement on invalid tiles: red outline overlay and red wash. |
| `loading` | N/A — tile actions are synchronous to engine tick. |
| `success-flash` | A gold expanding ring (S-07 pulse, 240ms, 1 to 2 hex radii) when the tile is the target of a successful action (city founded, improvement built). |
| `error-flash` | Red shake of the outline (3 frames at 60fps, +/-2px), and a validation-toast HUD surfaces (`.codex/rules/ui-overlays.md`). |

### Unit portrait (BottomBar unit-selected mode, dossier thumbnail)

| State | Visual |
|---|---|
| `default` | Circular or octagonal frame in `--panel-border`. Unit art inside. |
| `hover` | Frame brightens to `--panel-accent-gold-soft`, subtle scale 1.03. Hp bar becomes tabular-num readable. 80ms. |
| `focus-visible` | 2px amber outline around the frame. |
| `pressed` | Scale 0.97, frame flash bright. |
| `selected` | Gold frame 2px, amber halo (radial glow), current-unit indicator (small triangle or glyph). Persistent until another unit is selected. |
| `disabled` | 30% opacity (dead or fortified-locked unit shown in dossier). |
| `loading` | Spinner overlay on the portrait (rare — used during replay scrub). |
| `success-flash` | Gold bloom (120ms) after a successful action (moved, attacked, promoted). |
| `error-flash` | Red frame pulse and shake (e.g. not enough movement). |

## Transition rules

What triggers each state change, and how long the motion takes. All timings cross-reference S-07 (motion-fast = 80ms, motion-base = 160ms, motion-slow = 240ms).

| From | To | Trigger | Duration | Curve |
|---|---|---|---|---|
| `default` | `hover` | Pointer enter | 80ms | ease-out |
| `hover` | `default` | Pointer leave | 120ms | ease-out (slightly slower than enter to avoid flicker during quick pans) |
| `default` or `hover` | `focus-visible` | Tab key | 80ms | ease-out |
| `hover` | `pressed` | Mouse-down | **instant** (0ms — pressed is the one state that must NEVER animate; delay here reads as lag) |
| `focus-visible` | `pressed` | Space-down or Enter-down | instant |
| `pressed` | `default` | Mouse-up without click-commit (dragged off) | 160ms | ease-out |
| `pressed` | `selected` | Mouse-up on same element (click commits) | 160ms ease-out (release) then immediate `selected` style |
| `pressed` | `loading` | Click commits an async action | 80ms fade of label to spinner | ease-in-out |
| `loading` | `default` or `selected` | Async completes successfully | 160ms fade of spinner back to label, then 220ms `success-flash` overlay | ease-out |
| `loading` | `default` or `error-flash` | Async fails | immediate `error-flash` (220ms) then back to `default` or `disabled` | see S-07 shake |
| any | `disabled` | Engine predicate flips | 240ms fade to disabled opacity | ease-in-out |
| `disabled` | `default` | Engine predicate flips back | 240ms fade | ease-in-out |
| `default` | `selected` | Programmatic selection (e.g. engine restores saved state) | 160ms | ease-out |

## Stacked states

Multiple states can apply simultaneously. The render stacks their visual changes additively, with conflicts resolving in favor of the higher-priority state.

| Combination | Rendered as |
|---|---|
| `hover` + `selected` | Element stays selected (gold outline, selected-bg) AND hover brightness +2%. Both apply. |
| `hover` + `disabled` | Cursor shows `not-allowed`, the element does NOT depress or glow. `disabled` wins; hover merely shows the tooltip with a reason (Insufficient gold — 48 of 120). |
| `focus-visible` + `hover` | Both apply: outline and hover glow. The outline is drawn above the glow. |
| `focus-visible` + `selected` | Both apply: outline and selected state. Outline drawn above the selected underline or border. |
| `loading` + `hover` | Hover is suppressed. Pointer events on the element are `none` during loading to prevent double-submit tooltips. |
| `pressed` + `selected` | Pressed wins visually (element depresses) but releases back to `selected`. |
| `error-flash` + `selected` | Error flash overlays briefly; selected state remains the persistent anchor. |

## Interaction-pattern rules

Rules that apply across all element types, above and beyond their per-element specs.

### Click-once equals confirm (no double-click on primary actions)

Single click on a primary button commits the action. The press-then-release cycle IS the confirmation. The game does not require a second Are-you-sure click for anything except **irreversible** actions (end-game resign, delete save). Even those should prefer an explicit confirmation modal over a double-click pattern — double-click is a skill barrier, not a confirmation.

Double-click is **reserved for the map**: double-click on a tile zooms in (dig-down into that tile context panel). Single-click selects; double-click inspects. This is the only surface where double-click has meaning.

### Drag-start changes the cursor and dims peers

When a slider enters `pressed` (drag), the cursor changes to `grabbing`. When a unit is being drag-moved on the map (if we add that gesture; right now we use click-destination), peer units dim to 60% opacity to reduce visual noise around the cursor.

Peer-dimming is already spec-ed in S-04 for the selected-card-dims-peers case; this extends the same pattern to drag gestures.

### Hover-delay before tooltip appears

Tooltips do NOT appear instantly on hover. They require 400ms of pointer stillness at the target before the HUD tooltip mounts. This prevents the screen filling with tooltips when the player sweeps the cursor across the map.

Exceptions:
- Tile-hover tooltip on the map: appears immediately (hover IS the primary read mechanism for tiles; delay would cripple info access)
- Keyboard-focus tooltips: appear immediately when focus lands (no pointer motion to throttle)
- Validation toasts: appear immediately (they are error feedback, not discovery aids)

The 400ms figure comes from UX research on mouse-pause thresholds; adjust only if playtesting reveals it too long.

## Loading state — async action details

Async actions (End Turn during AI processing, save and load, network-dependent features we do not yet have) must show:

1. **Spinner replaces label** — the button shows a gold spinner centered, label hidden. This is the single unambiguous signal we are working on your request.
2. **Button disabled** — pointer-events none during loading. Prevents double-submit. Secondary affordances (ESC to cancel) are allowed if the action supports cancellation.
3. **Time-to-complete estimate when known** — if the engine knows this AI turn typically takes 800ms, show a small determinate progress bar below or behind the spinner. If unknown, spinner alone.
4. **Minimum visible duration 200ms** — even if the action completes in 50ms, the spinner shows for at least 200ms before transitioning back. Instant-return on a loading state reads as nothing-happened; 200ms reads as OK-done.
5. **Parallel loaded actions forbidden** — only one primary action is in `loading` at a time. Secondary or background async work (autosave) uses non-blocking chrome (a small progress indicator in the TopBar status area, not a spinner on a button).

## Error vs success feedback

Both are transient state changes — neither persists beyond ~220ms. What makes them feel different is the combination of visual shape and audio cue:

- **Success flash**: gold pulse (expand and contract), 220ms, positive chime. Optionally, an emanating ring from the action anchor. Used when a state change **completes**: building started, tech selected, turn ended successfully, city founded. Reference S-07 pulse curve.
- **Error flash**: red outline pulse plus horizontal shake +/-3px plus bzzt sound, 220ms total. Used when a state change **fails**: insufficient resources, invalid target, unmet prerequisite. Also triggers a **validation toast** in the HUD (`.codex/rules/ui-overlays.md`) with the specific reason. Reference S-07 shake curve.

The distinction is structural: success pulses *outward* (growing, positive), error pulses *inward* (shake, contracting) — even without conscious reading, the motion shapes communicate valence.

Every state change that **completes** gets a success flash. Every state change that **fails** gets an error flash plus validation toast. Pure UI navigation (opening a panel, tab switching) uses neither — that is motion territory, not state-transition-feedback territory.

## Examples — concrete state journeys

Five canonical traversals, to anchor the abstractions above in real gameplay moments.

### 1. End Turn during AI processing

1. `default` — gold button, label End-Turn [Enter], no activity.
2. Player presses Enter — `pressed` — 0.98 scale, 5% darker. Instant.
3. Release — `loading` — spinner replaces label, 200ms minimum. Button disabled.
4. While AI processes: button stays in `loading` (spinner rotating at S-07 motion-slow). Other primary buttons on the surface also enter `disabled` (they cannot be clicked during turn-end).
5. AI completes — `success-flash` for 220ms — gold bloom, chime. Label returns.
6. Button back to `default`, ready for next turn.

### 2. Research a tech — card journey

1. Player opens TechTreePanel — cards render in `default`.
2. Pointer moves over Pottery card — `hover` — border goes gold-soft, scale 1.01, shadow-lift. 120ms.
3. Player clicks — `pressed` — scale 0.99, inset shadow. Instant.
4. Release — `selected` — gold 2px border, amber top-edge, bg swap. Peer cards dim to 70%.
5. A success-flash briefly overlays (gold bloom, 220ms) confirming the selection.
6. The card persists in `selected`. If the player hovers it again, `hover + selected` applies (selected bg plus hover brightness).

### 3. Build improvement — failure path

1. Player selects a Builder unit, opens build menu.
2. Farm card shows `default`.
3. Pointer moves over — `hover` brightens border.
4. Player clicks — `pressed`.
5. Engine validates: insufficient production remaining — rejection.
6. `error-flash` — 220ms red outline pulse plus 140ms shake. Bzzt plays.
7. Validation toast appears (`ValidationFeedback` in HUD): Needs 30 Production — city has 12 remaining.
8. Card returns to `default` state. Engine continues to render it as `disabled` if the builder is now out of charges, OR back to `default` if it is merely not affordable this turn.

### 4. Volume slider drag

1. `default` — thumb at current value, label Master 72%.
2. Pointer enters the thumb — `hover` — thumb scales 1.15, cursor changes to `grab`.
3. Mouse-down — `pressed` — thumb scales 1.25, cursor `grabbing`.
4. Drag right — track fill updates in real time. Every 5% crossed emits a tick sound (S-07 slider-tick, 16ms). Label updates to Master 78%.
5. Release — `success-flash` on the thumb (120ms bloom).
6. Back to `default` (or `hover` if the cursor is still over the thumb).

### 5. Hex tile click-to-move

1. `default` — tile art, no outline.
2. Player hovers with a unit selected — `hover` — amber outline appears inscribed in the tile edge, inner-glow.
3. If the tile is a valid move target: cursor stays default. If invalid (out of range, blocked): `disabled` — tile dims, cursor `not-allowed`.
4. Click on valid tile — `pressed` — 110ms flash, gold-white.
5. Engine processes move — tile becomes `selected` for the unit new position (gold outline), old tile fades out (S-07 motion-base ease-out, tile stays at 50% 1 frame then returns to `default`).
6. `success-flash` — gold expanding ring (240ms) from the destination tile as the unit sprite animates in.

## Interaction with other systems

- **S-04 (opacity)** — the `disabled` state visual is defined as opacity using `var(--opacity-disabled)`. That token lives in S-04; this doc consumes it. Also consumes `--opacity-map-disabled` for dimmed out-of-range tiles and `--opacity-peer-dim` for the card-peer-dim case.
- **S-07 (motion)** — every timing in this doc references a motion token: `motion-fast` (80ms), `motion-base` (160ms), `motion-slow` (240ms), plus curve tokens `curve-ease-out`, `curve-ease-in-out`, `shake` and `pulse`. If S-07 changes its base durations, every state transition re-times automatically.
- **S-08 (focus and keyboard nav)** — the `focus-visible` state outline width, color, offset, and offset rules are defined in S-08. This doc consumes them via `--focus-ring-primary` and `--focus-ring-subtle` tokens. Tab order and which elements are focusable lives in S-08.
- **S-10 (multi-surface coordination)** — when multiple panels can be in `loading` simultaneously (turn-end plus autosave), S-10 defines precedence so only ONE primary-loading indicator shows at a time. This doc assumes that coordination layer exists and defers to it.
- **PanelShell (`.codex/rules/panels.md`)** — the shell close-button already has its own `default`, `hover`, `focus-visible`, `pressed` states; those adopt the secondary-button specs from this doc. No per-shell reinvention.
- **TooltipShell (`.codex/rules/ui-overlays.md`)** — overlays themselves have no states (they are either mounted or not), but their interactive children (close buttons, cycle-arrows) adopt this doc secondary-button specs.

## Implementation phase

Two-phase rollout, aligned with `08-master-plan.md`:

### Phase 1.1 — State tokens (design-system layer)

Adds a new `state-tokens.css` sibling to `panel-tokens.css` (or an appended block inside `panel-tokens.css`), containing:

```
--state-primary-bg: linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%);
--state-primary-text: #0d1117;
--state-primary-shadow: 0 2px 6px rgba(0,0,0,0.35);
--state-primary-glow: 0 0 12px rgba(245,158,11,0.45);
--state-primary-inset: inset 0 2px 4px rgba(0,0,0,0.25);

--state-secondary-hover-bg: color-mix(in srgb, var(--panel-accent-gold) 12%, transparent);
--state-tab-selected-bg: color-mix(in srgb, var(--panel-accent-gold) 8%, transparent);
--state-card-selected-bg: color-mix(in srgb, var(--panel-accent-gold) 6%, transparent);
--state-toggle-off-bg: rgba(51,65,85,0.6);
--state-toggle-on-bg: rgba(245,158,11,0.6);
--state-slider-track-bg: rgba(51,65,85,0.8);
--state-hex-selected: #ffd700;
--state-error-ring: rgba(239,68,68,0.6);
--state-error-shake-amplitude: 3px;
--state-spinner-primary: #fcd34d;
```

Paired with `packages/web/src/ui/components/Button.tsx`, `Card.tsx`, `Toggle.tsx`, `Slider.tsx`, `Tab.tsx` primitives that implement the state machine internally via CSS variables plus React state. Each primitive is ~60 to 120 LOC.

### Phase 2.2 — TopBar and BottomBar migration

Re-implement the TopBar action buttons (currently inconsistent — A.1.3 violation) and End-Turn button (A.1.6) on top of the Phase 1.1 `Button` primitive. Every button in the TopBar and BottomBar becomes a Button component with variant of primary or secondary, with state automatically wired. This single migration retires ~12 different button implementations.

### Phase 3 — Fan-out

After TopBar proves the primitives, propagate to panel bodies. The `/add-panel` skill template updates to use Button, Card, Toggle from day one. Existing panels migrate one at a time; state tests go from per-panel to per-primitive (test the primitive once, inherit correctness).

## Open questions

1. **Success-flash sound policy**: every successful interaction emits a chime, or only meaningful ones (turn ends, tech selected)? If every click, the soundscape becomes noise. Proposed: only state changes that affect engine state get a confirm-chime; pure UI navigation (opening a panel, switching a tab) is silent. Needs user confirmation.
2. **Error flash persistence when multiple actions rapid-fire fail**: if player spams a disabled button, should each click produce an error flash, or only the first within a 500ms window? Proposed: debounce error flashes to one per 500ms per element, but always produce the validation-toast in the HUD so the message is surfaced.
3. **Hex-tile selected-plus-hover combinations on the canvas**: the canvas is not token-aware in the same way HTML is. The renderer must consume the same color values. Are we OK duplicating (`--state-hex-selected` also defined as a JS constant imported by the renderer) or do we want a JS-side tokens module that re-exports the CSS values? Proposed: JS `tokens.ts` re-export, single source being the CSS, values read via getComputedStyle on the document root at app init. Cross-ref S-04 similar question.
4. **Loading minimum-duration of 200ms vs instant-feel**: playtesting might reveal 200ms is too long for snappy actions (tech-select where the engine commits in under 10ms). Allow per-action override (`minLoadingMs: 0`)? Proposed: yes, with the default staying 200ms.
5. **Double-click reserved for the map**: does this conflict with any existing keyboard-macro or chorded input we have not specced? Should be safe since we have not added any, but worth confirming when S-08 lands.
