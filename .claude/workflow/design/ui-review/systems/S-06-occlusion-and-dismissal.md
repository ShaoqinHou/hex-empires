---
title: S-06 — Occlusion and dismissal rules
system: Overlap policy, ESC precedence, click-through, auto-dismiss, notification stacking
purpose: Systematize when UI surfaces hide, suppress, stack, or replace one another — so no surface decides overlap locally.
anchors_to: [H-8, H-12, H-14-rule-3, P5, P11]
created: 2026-04-17
---

# S-06 — Occlusion and dismissal rules

## Purpose

Overlap is not a panel problem or a tooltip problem. It is a **system** problem.

Screenshot 19 of the holistic audit shows the canonical failure: CityPanel, tile tooltip, and a city-founded toast all fire at the same anchor in the same second, each oblivious to the others. H-8 flagged the symptom; H-14 rule-3 flagged the cost (the 16×16 dismiss targets that compound into ~600 precision clicks across a 200-turn campaign); H-12 flagged the inconsistency (ESC closes one thing sometimes, the wrong thing other times, nothing at all a third time). Per P11, fixing this once at the system layer is the only move that scales — "CityPanel should know about the tile tooltip" is the wrong shape of fix, because tomorrow it is the diplomacy panel knowing about placement hints, and by year-end every surface has an O(n²) opinion about every other surface.

This doc defines the contract so any new overlay lands in the matrix without changing existing ones. It is also the doc that says **what dismisses what**, closing the H-12 gap where the ESC key currently does different things depending on which surface was most recently touched.

## Scope

**In scope.** All transient and persistent UI surfaces layered over the map:

- Panels (modal, overlay, info) per `panels.md`
- Tooltips and tooltip-shaped overlays (tile, unit, combat preview, placement, validation) per `ui-overlays.md`
- Notification toasts (ephemeral event toasts, persistent warning toasts)
- Placement hints and adjacency previews (engine-driven overlays active during a placement action)
- Drama modals (age transition, crisis, victory, turn summary) as a modal-priority subclass

**Out of scope.** Map-anchored diegetic overlays that live in the canvas (unit HP rings, tile yield floats, selection highlight) — those are governed by S-05 (stacking) and S-01 (layer system). Also out of scope: focus management inside a single panel (S-08) and the hover/press/active state contracts for individual controls (S-09). This doc is about **surface-to-surface interaction**, not intra-surface state.

## The occlusion matrix

When surface A is visible and surface B is about to arise, exactly one of five outcomes applies. No custom per-pair behavior — look up the cell and follow it.

**Outcomes glossary.**

- **HIDE-A** — A becomes invisible while B is present, but keeps its state; when B dismisses, A reappears.
- **DISMISS-A** — A is torn down. Its state is gone; reopening requires the player to act again.
- **SUPPRESS-B** — B never mounts. The event that would have triggered it is either queued (for toasts) or ignored (for tooltips).
- **STACK** — B mounts above A. Both coexist. ESC precedence (below) resolves which one dismisses first.
- **REPLACE** — B takes A's slot. For panels this is the single-slot PanelManager rule.

Rows: **A is currently visible.** Columns: **B is about to arise.**

| A ↓ / B → | Tooltip | Validation | Ephem. toast | Persist. toast | Placement hint | Overlay panel | Info panel | Modal |
|---|---|---|---|---|---|---|---|---|
| Tooltip | REPLACE (cursor moved) | STACK (val. on top, tooltip stays) | STACK | STACK | DISMISS-A (entity-anchored) | DISMISS-A | STACK | DISMISS-A |
| Validation | SUPPRESS-B (val. in progress) | REPLACE (latest wins) | STACK | STACK | STACK | STACK | STACK | DISMISS-A |
| Ephem. toast | STACK | STACK | STACK (queue, cap 5) | STACK | STACK | STACK | STACK | HIDE-A |
| Persist. toast | STACK | STACK | STACK | STACK | STACK | STACK | STACK | HIDE-A |
| Placement hint | STACK (validation preview) | STACK | STACK | STACK | REPLACE (new placement target) | SUPPRESS-B (placement active) | STACK | DISMISS-A |
| Overlay panel | SUPPRESS-B (same anchor) / STACK (different anchor) | STACK | STACK | STACK | DISMISS-A (placement needs map) | REPLACE (single-slot) | STACK | HIDE-A |
| Info panel | STACK | STACK | STACK | STACK | STACK | STACK | STACK | HIDE-A |
| Modal | SUPPRESS-B | SUPPRESS-B | SUPPRESS-B (queue) | SUPPRESS-B (queue) | SUPPRESS-B | SUPPRESS-B | SUPPRESS-B | STACK (modal-over-modal, rare) |

Three rules in this matrix deserve commentary because they resolve the H-8 triple-stack:

1. **Overlay panel at row meets tooltip at column → SUPPRESS-B when same anchor; STACK when different.** "Same anchor" means the panel was opened for an entity that lives at the tooltip's hex. Opening CityPanel for a city at (−3, 6) suppresses the floating tile tooltip at (−3, 6); it does NOT suppress a tooltip at (2, 4) that the player is also hovering (rare but possible when the mouse wandered).
2. **Modal at row → every column is SUPPRESS-B or HIDE-A.** Modals are the player's undivided attention. They do not coexist with hover tooltips or new toasts. Toasts that fire during a modal get queued and replay when the modal dismisses.
3. **Placement hint at row meets overlay panel → DISMISS-A.** Opening a panel while placing something cancels the placement. Placement mode needs the whole map visible; a panel covering the right column defeats the purpose.

Implementation note: the matrix is not 63 separate if-statements. It compiles to a small state machine keyed off `(currentSet, incomingSurface, anchor?)`. Phase 1.5 lands the state machine inside a new `OverlayCoordinator` module that wraps the existing `HUDManager.register` call and runs the lookup before the registration actually commits.

## Auto-dismiss rules per category

Per H-14 rule-3, the fix for the 600-precision-clicks problem is **category-driven auto-dismiss**, not a larger × target. The categories:

### Ephemeral toasts (4–5s auto + press-any-key clears)

City founded, tech completed, civic adopted, wonder started, trade route completed, relic found. These are **positive, informational, non-actionable**. Player notices → player moves on.

- **Timeout.** 4.5s after mount (measured from finishing the enter animation). Hover over the toast **pauses the timer** — if the player wants to read the flavor text longer, they can.
- **Keyboard.** Any key dismisses the topmost ephemeral toast. Not "every key dismisses every toast" — that would be destructive. One press, one toast, topmost-first. `Shift+Esc` dismisses the entire ephemeral stack.
- **Mouse.** Click on the toast body opens the relevant panel if the toast has one (e.g., "Roma founded" → CityPanel for Roma). Click on the corner × dismisses only that toast. Target size: 24×24 (per H-14 rule-3).
- **Replacement.** If a 6th ephemeral toast arrives with 5 already stacked, the oldest one fast-fades (150ms) regardless of its remaining timer.

### Validation feedback (1.5s auto)

"Not enough gold", "Out of range", "Requires researching Iron Working", "Target is not a valid settlement site". Corrective micro-feedback.

- **Timeout.** 1.5s. Explicitly not configurable — this is the known sweet spot from card games and other strategy titles. Shorter and players miss it; longer and it piles up.
- **Keyboard.** No dismiss. Any key while a validation overlay is visible is ignored (absorbed, not passed through). This prevents the player's frustrated click-click-click from generating validation spam.
- **Motion.** Shake-in (80ms, 8px side-to-side) to signal "rejected". Specified by S-07 (motion contracts).
- **Replacement.** Latest validation always replaces previous. A player spamming an invalid action gets one visible message, not a stack — otherwise the screen fills with identical "Not enough gold" lines.

### Persistent toasts (until resolved or user clears)

Unhappiness high, idle units, gold deficit, civ at war with you, religion spreading into your borders, plague outbreak. These describe **ongoing conditions** that require the player to act.

- **Timeout.** None. They live until the underlying engine state resolves the condition OR the player explicitly dismisses.
- **Keyboard.** `Shift+Esc` clears the persistent stack (emergency "shut up" for the player who knows they are losing). Individual keyboard dismiss: no.
- **Mouse.** Click opens the relevant panel/surface. Click on × marks it "snoozed for this turn" — it reappears next turn if still unresolved. Shift-click on × dismisses permanently for the campaign (for players who genuinely want to play through unhappiness).
- **Visual.** Distinct chrome from ephemeral — a persistent-amber left border, no fade, stays at the top of the stack. Per S-04 (transparency), opacity 0.96 vs 0.88 for ephemeral.

### Tooltips

Two families, different rules.

- **Cursor-anchored tooltips** (tile hover, hex yield preview). Dismiss on cursor-leave of the anchor hex + a 50ms grace period (debounces the case where the cursor crosses a hex vertex and briefly exits all hexes). Never dismiss on a timer.
- **Entity-anchored tooltips** (unit dossier floating over a unit, city nameplate). Dismiss on: panel-open (matrix row "Overlay panel" / column "Tooltip" = SUPPRESS-B implies DISMISS-A when already open), entity no longer exists, explicit ESC. Never on cursor movement alone — the player may have moved the cursor to the tooltip to read it.

### Placement hints

Active during a placement action (placing a district, founding a city, queuing a move with shift-click).

- Dismiss on: action complete (successful placement), ESC, right-click on map (cancel placement), opening any panel, starting a different action (selecting a different unit).
- No timer. Placement can take the player as long as they need.

### Panels (overlay)

Right-anchored overlay panels (CityPanel, TechTreePanel, DiplomacyPanel, most of the dashboards).

- Dismiss on: ESC (when topmost and dismissible), explicit close button, opening a different panel (PanelManager single-slot = REPLACE), backdrop click IS NOT a dismissal for overlay panels — see "Click-outside rules" below.
- Never on timer. Never on cursor movement outside the panel. Never on canvas click unless the canvas click is on an entity that has its own panel (e.g., clicking a DIFFERENT city while CityPanel is open REPLACES to the new city's panel).

### Panels (info)

EventLog, NotificationHistory, potentially others. Lower-priority informational sidebars.

- Persist across panel opens. Opening a CityPanel while EventLog is open → both are visible (matrix row "Overlay panel" / column "Info panel" = STACK).
- Toggleable via their TopBar trigger.
- Dismiss only via their own toggle or explicit close button. ESC does NOT close info panels unless no other surface is present (ESC precedence handles this).

### Modals

Age transition, crisis, victory, forced turn-summary.

- Dismiss only on: explicit choice made, explicit "Close" / "Skip" button, ESC **when the modal has opted in via `dismissible=true`**. Most modals are `dismissible=false` (age transition, victory) — the player chose to play the game and the game chose to interrupt.
- No timer. No backdrop click. No key except the explicit confirm / skip shortcut.
- Modals queue: if the engine fires two modal-eligible events in the same turn (crisis + victory threshold crossed), the second modal queues and displays after the first dismisses.

## ESC precedence chain

The ESC key is the most-overloaded key in the game. H-12 is real. The existing implementation in `PanelManager` and `HUDManager` handles the common cases but does not handle modal-above-panel or the reset-cycle rule cleanly. S-06 locks in the full ordering:

1. **Dismiss modal** if any modal is mounted and `dismissible=true`. Stop propagation. Return.
2. **Else: dismiss the topmost sticky tooltip** if any sticky overlay is registered in `HUDManager`. Stop propagation. Return. (The "topmost" rule is already implemented — most-recently-registered wins.)
3. **Else: reset any active stack-cycle** if any anchor has a non-zero cycle index. Stop propagation. Return. This undoes Tab-cycling so the player sees the first entity again.
4. **Else: close the active overlay panel** (not info panel). Stop propagation. Return. The existing `PanelManager` ESC handler already does this; it simply needs to run only if steps 1–3 did not.
5. **Else: close the active info panel** if any is visible. (New step — currently info panels are not closeable by ESC.)
6. **Else: deselect canvas selection.** Fall through to the canvas handler. Do not stop propagation.

Implementation lands in Phase 1.5 as a single `OverlayCoordinator.handleEscape()` invoked by **one** `window.keydown` listener registered in capture phase. The current two-listener setup (PanelManager + HUDManager) has a subtle bug: both run in capture phase, but the DOM guarantees capture-phase listeners run in registration order — and registration order depends on provider mount order, which depends on which provider is higher in the tree. This is fragile. The coordinator folds the two into one:

```typescript
// OverlayCoordinator.tsx (Phase 1.5 new code)
useEffect(() => {
  const onEscape = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (isTypingInField()) return;

    if (dismissTopmostModal())          { e.stopPropagation(); return; }
    if (dismissTopmostStickyTooltip())  { e.stopPropagation(); return; }
    if (resetActiveCycle())             { e.stopPropagation(); return; }
    if (closeActiveOverlayPanel())      { e.stopPropagation(); return; }
    if (closeActiveInfoPanel())         { e.stopPropagation(); return; }
    // else: let the canvas handle it.
  };
  window.addEventListener('keydown', onEscape, { capture: true });
  return () => window.removeEventListener('keydown', onEscape, { capture: true });
}, []);
```

`PanelManager` and `HUDManager` lose their local ESC handlers as part of this refactor. They keep their state and API surface — only the keyboard wiring moves.

## Click-outside rules

Each surface has one click-outside rule.

| Surface | Click-outside behavior |
|---|---|
| Modal | Backdrop click **dismisses if `dismissible=true`, ignored otherwise**. The backdrop is a full-viewport scrim that catches the click; the modal itself is centered above it. |
| Overlay panel | Click-outside **does nothing**. Panels close via ESC, close button, or being replaced by another panel. |
| Info panel | Click-outside **does nothing**. Info panels live in a fixed slot; clicking out of them is just clicking the map. |
| Tooltip (cursor-anchored) | Tooltips are `pointer-events: none` — every click lands on whatever is behind them. |
| Tooltip (sticky / fixed-corner) | Clicks on the tooltip body are consumed; clicks outside the tooltip **dismiss it** (sticky tooltips earn explicit dismissal). |
| Placement hint | Clicks outside the canvas **cancel placement**. Clicks on the map **attempt placement**. The canvas is the "inside" for this surface. |
| Ephemeral toast | Clicks on the toast body open the related panel; clicks on × dismiss. Clicks outside the toast pass through to whatever is behind. |
| Persistent toast | Same as ephemeral for click semantics; differs on auto-dismiss. |
| Validation feedback | No clicks possible — `pointer-events: none`. |

The decision that was tentative in the spec — "overlay panel click-outside?" — is **locked to no dismissal**. The audit already flagged that click-outside on overlay panels creates a race with the TopBar trigger that opened them (click TopBar → panel opens → the same click, if it bubbled, would close the panel). The race is unfixable without coupling panels to their triggers. Modal-only click-outside keeps the semantics clean: if you want dismissal via pointer, use the close button.

## Click-through layers

Closely related to the above but a different axis — **which layer swallows a click vs passes it through to the canvas below**. This matters for placement mode (where the player is AIMING at the map) and for the tile-hover tooltip (where the player is already looking at the map).

Reference: S-01 defines the z-order. S-06 layers the click-through semantics on top.

| Layer | Click behavior |
|---|---|
| Canvas | **Always receives** clicks that land on it. This is the baseline. |
| Placement hints | **Pass through** to the canvas. The player is aiming at hexes; hints must not intercept. Implemented via `pointer-events: none` on the hint layer. |
| Cursor-anchored tooltips | **Pass through** to the canvas. Same reason. |
| Sticky / fixed-corner tooltips | **Swallow** clicks on the tooltip body (so their interactive elements work); clicks elsewhere pass through normally. |
| Ephemeral + persistent toasts | **Swallow only the toast rectangle**. Clicks on the toast body or × are consumed; clicks outside the toast pass through. The toast is a small visual region, not a fullscreen shield. |
| Validation feedback | **Pass through**. `pointer-events: none` — validation is a message, not a control. |
| Overlay panels | **Swallow** all clicks within the panel rectangle. The panel is a focused region; the canvas should not receive clicks here. Clicks outside the panel pass through to the canvas. |
| Info panels | Same as overlay — swallow inside, pass outside. |
| Modal + backdrop | **Backdrop swallows and is clickable**. Clicks on the modal body itself are consumed by the modal. No clicks reach the canvas while a modal is visible. |

One implication worth calling out: **ephemeral toasts must not occlude the BottomBar End Turn button.** At the locked viewport classes (standard / wide / ultra) the toast stack grows upward from the lower-right, inside a reserved 320×400 region that does not overlap BottomBar. This is S-02's job to place; S-06 just enforces the pointer-events discipline that makes the reserved region actually work.

## Focus-stealing rules

Keyboard focus is a scarce resource. P6 (keyboard-first) says the player should be able to drive the game from the keyboard. Surfaces that steal focus at the wrong moment break this.

- **Modal** — steals focus on mount. Its first actionable button receives focus. Cannot be escaped without resolving or ESC-if-dismissible.
- **Overlay panel** — **does not steal focus by default**. The player's tab order (TopBar → BottomBar → panel) is the expected path. A panel may request focus via an `autoFocus` prop on its first input, but most panels should not. This is a change from the current behavior where opening some panels sometimes moves focus; the change is explicit.
- **Info panel** — never steals focus.
- **Tooltip (any flavor)** — never steals focus. Sticky tooltips use `tabindex="-1"` on the container.
- **Toast (ephemeral or persistent)** — never steals focus. Toasts are announced via `aria-live="polite"` for screen readers; the visual focus stays where the player left it.
- **Placement hint** — never steals focus (it is an overlay, not a control).
- **Validation feedback** — never steals focus (it is pointer-events-none).

The rule of thumb: only **the modal** earns focus-steal, because the modal is the only surface that semantically interrupts.

## Notification stacking

The third-most-common H-8 case is three toasts firing in one turn (rush attack + city grew + tech completed). The rules:

- **Queue direction.** Bottom-up. New toasts enter at the bottom of the stack, older toasts slide up. The newest is always nearest the BottomBar — the player's eye is already there for End Turn.
- **Cap.** 5 visible at once. A 6th fast-fades the oldest (150ms) and inserts at the bottom.
- **Per-category ordering.** Persistent toasts always sit **above** ephemeral ones in the stack, regardless of arrival order. Within a category, strict arrival order.
- **Per-turn coalescence.** Multiple instances of the same event within a single turn (e.g., two "Barbarian spotted!" in the same turn) collapse into a single toast with a count badge: "Barbarian spotted × 2".
- **Cross-turn persistence.** Persistent toasts survive turn ends. Ephemeral toasts fade at turn end regardless of their timer — a new turn is a clean slate.
- **Modal flush.** When a modal dismisses, queued toasts that arrived during the modal animate in one by one (80ms stagger). This is better than a simultaneous pop, which would look chaotic.

The toast container lives in `packages/web/src/ui/hud/ToastStack.tsx` (new in Phase 1.5). It reads from an engine-side notifications queue but implements the ordering and fading in React.

## Examples

### Example 1 — the H-8 screenshot-19 triple-stack

Scenario: player clicks a hex that has their just-founded city. Three events fire:

- Tile tooltip wants to appear at (−3, 6) (cursor hover).
- CityPanel wants to open for Roma (click on own-city).
- "City Founded" ephemeral toast is in the stack from the last turn's click.

Resolution via the matrix:

1. CityPanel opens. Matrix row "Overlay panel" / column "Tooltip" = SUPPRESS-B (same anchor). The tile tooltip never renders.
2. "City Founded" toast stays. Matrix row "Ephem. toast" / column "Overlay panel" = STACK. The toast sits below and to the right of the panel.
3. **Extra enhancement.** The toast's click target becomes "Manage →" when the relevant panel is open. Clicking the toast while CityPanel is already visible auto-dismisses the toast (player already sees the city). Clicking when CityPanel is NOT visible opens it.
4. The toast auto-dismisses after 5s regardless.

Net: one surface shown, one persistent, zero conflict, zero clicks demanded.

### Example 2 — ESC cascade

Scenario: modal age transition is visible, the player has Tab-cycled to the second unit of a stack at (1, 2) (cycleIndex = 1), and a sticky combat-preview tooltip is pinned.

The player presses ESC. Step through the chain:

1. Step 1 (modal): age-transition is `dismissible=false`. ESC is absorbed; nothing happens. That is the correct behavior for a ceremonial moment.

Now the player confirms the age transition and the modal dismisses. They press ESC again:

1. Step 1 (modal): none visible. Continue.
2. Step 2 (sticky tooltip): combat preview is sticky. Dismiss it. Stop.

They press ESC a third time:

1. Step 1: none. Step 2: none. Step 3: reset cycle. Their Tab-cycled position returns to entity 0. Stop.

Fourth ESC:

1. Step 1: none. Step 2: none. Step 3: cycle is already 0. Step 4: no overlay panel open. Step 5: no info panel open. Step 6: canvas deselect runs.

Four ESC presses, four distinct behaviors, predictable order.

### Example 3 — placement interruption

Scenario: player selects Settler, enters "Found City" placement mode. Placement hints highlight valid hexes. Player clicks the TopBar "Tech" button.

Resolution: matrix row "Placement hint" / column "Overlay panel" = DISMISS-A. Placement is cancelled. The Settler stays selected. TechTreePanel opens. Player reads, ESCs out, re-clicks "Found City" to re-enter placement mode.

This is **intentional**. The alternative — preserving placement mode while panel is open — creates a confused state where the player forgets they were mid-action. Dismiss-on-panel-open trades one extra click for unambiguous state.

## Interaction with other systems

- **S-01 (Layers & z-index)** — S-06 is the policy on top of S-01's ordering. S-01 says modals sit above panels; S-06 says that when a modal arrives, panels HIDE (not DISMISS). Together they fully describe vertical stacking.
- **S-02 (Position anchoring)** — The "same anchor" test in the occlusion matrix uses S-02's anchor-key vocabulary. When S-02 redefines what counts as an anchor, S-06 adopts the new definition without further change.
- **S-04 (Transparency & opacity)** — S-06's HIDE outcome is implemented via opacity transitions (fade to 0). S-04 supplies the curves and timings. HIDE ≠ `display: none`; the element stays in the tree so state is preserved when the modal dismisses.
- **S-05 (Map entity stacking)** — Tab-cycle at the ESC chain step 3 belongs to S-05's stack-cycle model. S-06 consumes the cycle-index value exposed by `HUDManager` but does not itself define how stacks are assembled.
- **S-07 (Motion)** — Auto-dismiss fades, shake-in on validation, backdrop-fade on modal dismiss all come from S-07's motion palette.
- **S-08 (Focus & keyboard navigation)** — S-06 says "modal steals focus"; S-08 specifies the order within the modal (Tab cycles through Yes / No / Details / Close, wrapping).
- **S-10 (Multi-surface interaction)** — S-10 handles the rare case of **panel + info panel + modal** open simultaneously at wide+ viewports. S-06 provides the three-way dismissal rules; S-10 handles the layout.

## Implementation phase

Per `08-master-plan.md`, S-06 lands in **Phase 1.5 (Layout architecture)**. Two work units:

**1.5a — Overlay coordinator module.** New `packages/web/src/ui/hud/OverlayCoordinator.tsx` mounted as the outermost provider (above PanelManagerProvider and HUDManagerProvider). Owns:

- The unified ESC handler (replaces the two current handlers).
- The occlusion matrix lookup, invoked before any surface's `register` call is committed.
- A small pub-sub for "modal is mounting" / "placement is active" so overlays can cooperatively suppress/dismiss.

**1.5b — Toast stack + per-category timers.** New `packages/web/src/ui/hud/ToastStack.tsx` consuming the engine-side notifications queue with the per-category timeout rules above. Replaces the current ad-hoc notification rendering. Playwright spec covers: ephemeral auto-dismiss at ~4.5s, persistent stays across turns, press-any-key dismisses topmost, `Shift+Esc` clears the stack, modal flush behavior.

Acceptance criteria for Phase 1.5 completion against S-06:

- ESC always produces exactly one observable action, determined by the six-step chain.
- The H-8 screenshot-19 reproduction case shows CityPanel only, tooltip suppressed, toast persists with "Manage →" action.
- Validation feedback auto-dismisses within 1.6s (1.5s + 100ms fade).
- A test firing 10 ephemeral toasts in one turn shows 5 visible, oldest auto-fading.
- Modal-during-placement cancels placement cleanly (no ghost hints left over).
- A Playwright spec at each of standard/wide/ultra confirms the toast region never overlaps BottomBar.

## Open questions

1. **Persistent toast "snooze for this turn" semantics.** Should the snooze persist across save/load? Leaning yes — it is a player preference. User to confirm before 1.5b.
2. **Modal over modal.** The matrix says STACK for modal/modal at the bottom-right corner — in theory queue the second. Is there a real case for both visible simultaneously? If the age-transition modal is blocked from dismissing and a crisis fires mid-transition, what happens? Probably: queue the crisis modal and show it after age-transition resolves. Confirm no engine path produces a genuine "both simultaneously" need.
3. **Shift+Esc scope.** Shift-Esc clears the ephemeral stack per the persistent-toast section. Should it also reset the Tab cycle-index and dismiss all sticky tooltips? Or is that overreach? Current lean: Shift-Esc clears ephemeral toasts only, and a separate `Ctrl+Shift+Esc` does the full panic-close (every surface, canvas selection cleared). Defer to user on the key.
4. **Info panel auto-dismiss on modal.** When a modal arises, info panels HIDE per the matrix. Should the player's info-panel-open preference be remembered so the info panel reappears after modal dismiss? Leaning yes — info panels are sidebar UI, the player chose to have them open, interrupting for a modal should not erase that choice. Confirm.
5. **Validation feedback during panel-open.** Matrix row "Validation" / column "Overlay panel" is STACK, but validation is usually about a map action — it rarely fires while a panel is focused. Does it look right stacked above the panel, or should it appear over the canvas at the last cursor position? Probably the latter; tentative "STACK over canvas at last-known anchor, not over the panel". Clarify in S-02.
