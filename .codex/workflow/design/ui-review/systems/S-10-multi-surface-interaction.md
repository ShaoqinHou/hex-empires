---
title: S-10 — Multi-surface interaction system
purpose: Rules for when two or more UI surfaces (panels, modals, HUDs) are simultaneously live — who wins focus, who dims, who queues, who cascades on close
created: 2026-04-17
relates_to: [S-01 layering, S-02 position anchoring, S-06 occlusion and dismissal, S-08 focus and keyboard, panels.md, ui-overlays.md]
---

# S-10 — Multi-surface interaction

## Purpose

The `PanelManager` today enforces a **single-slot** model: opening panel B implicitly closes panel A, and no two panels ever coexist. That rule is correct for the standard 1367–1919 viewport — at ~440px a second panel would cover half the map and kill the "the map is the game" principle (P1 in `00-philosophy.md`). But three shifts expose its limits:

1. **Wide and ultra viewports** (per P12 responsive; locked decisions #7 and #8) have 800–1500 extra horizontal pixels. At these sizes the *single-slot rule is a regression* — the space exists to show EventLog plus CityPanel plus maybe DiplomacyPanel at once, and refusing to use it makes the game feel deliberately impoverished.
2. **Modals chain.** An Age Transition can fire while a Crisis is already up; a Victory can fire while Turn Summary is pending. Without explicit queueing rules, two modals racing for z-index 210 produce the exact bug the panel audit (M31) documented: the "wrong" overlay dismisses, or both render on top of each other.
3. **Panels and HUDs interleave.** A tile tooltip renders under a panel when the panel is opened while hovering a tile; two overlay systems with independent dismissal rules collide (H-8 in `01-holistic-audit.md`: three overlapping overlays all shouting for attention).

S-10 is the rulebook that answers "what happens when more than one surface is live." It sits on top of S-01 (z-index), S-02 (anchoring), S-06 (dismiss chain), and S-08 (focus). Where those docs answer "where" and "how", S-10 answers "who wins."

## Scope

Covers every pair of simultaneously-active UI surfaces:

- panel + panel (two overlays, overlay + info, overlay + modal, modal + modal)
- panel + HUD (tooltip, toast, placement hint, validation bubble, turn transition, minimap)
- HUD + HUD (tooltip + toast, validation + tooltip, minimap + hint badge)
- canvas-anchored interactions with any overlay above them (placement hint with a ghost unit under the cursor while CityPanel is open on the right; drag-selection box while a notification is fading)

Out of scope: within-panel tabs (governed by each panel body), within-canvas selection states (S-09 state transitions), the *visual design* of how conflicts look (handled by S-04 transparency and S-07 motion). S-10 answers the dispatch/arbitration question: **when X fires while Y is live, what happens to each of them.**


## Panel + panel rules by viewport class

The viewport-class contract (from P12 and locked decision #7) is the primary axis. Panel coexistence rules change per class; the `PanelManager` API extends to support multi-slot mode without breaking single-slot callers.

### Standard (1367–1919)

**Single-slot, unchanged.** Opening panel B closes panel A. This is the current `PanelManager` behavior. No regression, no new code path.

- openPanel("city") while activePanel is "tech" → tech closes, city opens
- togglePanel("tech") while activePanel is "tech" → tech closes, nothing else opens
- ESC while any overlay is open → that overlay closes

**Rationale:** at 1367–1919 width, a second overlay panel covers most of the remaining map. The "fix" for "I want to see the log while reading a city" at this class is: open log briefly, open city after, accept the flip-flop. Adding multi-slot here costs more in occlusion than it buys in convenience.

### Wide (1920–2559)

**Two overlay panels may coexist** if (a) neither is modal, (b) neither is `info` (info is treated separately — see below), and (c) they do not conflict (see conflict taxonomy). When a second overlay opens:

- The second panel docks to the **LEFT** of the first. The first stays right-anchored at its usual docked position (480–520px wide per S-03). The second slots inward at the same width, with a small gutter.
- Canvas re-computes fill width: viewport.width minus topBar minus bottomBar minus (panel1.width + gutter + panel2.width). The canvas minimum is still enforced (~640px); if the math would violate it, the SECOND panel does not open in multi-slot mode and instead replaces the first (degraded to single-slot). This is a fallback, not a normal case — at 1920+ the math almost always holds.
- `activePanel` is still a single id (the "focused" panel, the one that receives ESC and keyboard-shortcut-toggle semantics). `activePanels: ReadonlyArray<PanelId>` is the new field for tracking co-visible panels. Legacy callers read `activePanel` and get the most-recently-opened overlay.

**Rationale:** 1920 is where Civ VI, Old World, and Total War start showing permanent advisor sidebars. Strategy-game players at this resolution expect more information, not the same information with more padding.

### Ultra (2560+)

**Same model as wide, with info-panel promotion.** An `info`-priority panel (EventLog is the only one today) can stay **permanently docked** alongside whatever `overlay`-priority panel is active. At ultra:

- EventLog is default-open on the right edge (320–380px per S-03).
- An overlay panel (CityPanel, TechTree, Diplomacy, etc.) docks to the LEFT of EventLog.
- A SECOND overlay panel docks further LEFT still, matching wide-viewport multi-slot.
- Three surfaces can be visible: Log (info, always) + Overlay-A (most-recent focus) + Overlay-B (co-visible, older focus).

This is the "more info visible, not same-info-bigger" rule (locked decision #8) in practice. The extra horizontal space buys parallel-information density, not whitespace.


## Panel-conflict taxonomy — which pairs CANNOT coexist

Multi-slot is not "any two panels." A conflict blocks co-existence even at wide and ultra; the second panel REPLACES the first in that case.

| Conflict class | Example | Rule |
|---|---|---|
| **Same id** | Two `CityPanel`s (for two different cities) | Reject. Only one `CityPanel` instance; opening a second re-targets the first to the new city. |
| **Same subject** | `AgeTransition` + `Crisis` (both modal-priority drama moments) | Queue. Higher priority renders; lower waits. See modal-chain section. |
| **Mutually-exclusive content** | None today; reserved for future "same data source" cases (e.g., if we ever split TechTree into two views, both cannot co-display) | Reject second; replace first. |
| **Modal vs any** | `AgeTransition` fires while `CityPanel` is open | Modal takes over; CityPanel is suppressed (not closed — see save/restore). No panel interactions while modal is live. |
| **Overlay vs compatible overlay** | `TechTree` + `CityPanel`; `CivicsTree` + `DiplomacyPanel` | Allow (wide/ultra). These show independent data and do not cross-reference live state in a way that creates confusion. |
| **Overlay vs incompatible overlay** | `TechTree` + `CivicsTree` (both are trees, both would want full width, both map to the same "choose a path" mental task) | Replace. Opening civics closes tech even at ultra — the mental model collision outweighs the space benefit. |

The compatibility matrix is a small explicit table in `panelRegistry.ts`:

```typescript
readonly conflictsWith: ReadonlyArray<PanelId>;   // optional, defaults to []
```

If `A.conflictsWith` includes `B` OR `B.conflictsWith` includes `A`, the pair is incompatible and the rule above applies. Symmetric by construction; validated at registry-load time.

Initial compatibility rules:
- `tech` conflicts with `civics` (both trees, cognitive-load collision)
- `age`, `crisis`, `turnSummary`, `victory`, `victoryProgress` all modal → conflict with each other (queued via modal chain)
- Everything else → compatible at wide/ultra

## Panel + HUD interactions

HUDs and panels live in different z-strata (S-01: HUD above panels in most cases, but inverted for modal panels). They almost never conflict on position, but they do conflict on **attention** and on **input ownership**.

### Tooltip vs panel

A hover tooltip (tile tooltip, unit tooltip, city-preview tooltip, combat preview) is **suppressed** when its anchor is the panel subject. Specifically:

- If activePanel is "city" and the hovered tile is the city center tile → the city-center tile tooltip does NOT render. (The panel already shows that data in higher fidelity; two copies is noise per H-8.)
- If activePanel is "city" and the hovered tile is a DIFFERENT city tile → tooltip renders (different subject, information is useful).
- If activePanel is "tech" and the hovered tile is anything → tooltip renders (tech tree does not care about tiles).

The check is wired through `HUDManager.isActive()` plus a new `HUDManager.isAnchorSubjectOfPanel(anchorKey)` query that asks `PanelManager` whether the active panel subject matches. Cross-ref S-05 (entity stacking) and S-06 (dismiss chain).

### Toast / notification vs panel

Toasts are **independent** of panels. A toast fades in bottom-left (S-02 region), a panel docks top-right or centers. They never fight for screen real estate; both stay visible.

Exception: when a notification relates to the panel currently open (e.g., "Research complete: Pottery" toast while TechTreePanel is open), the panel may **highlight** the relevant entity (Pottery node pulses in the tree) rather than the toast demanding attention. But the toast still renders; only the weight of it shifts.

### Placement hint + panel

Placement hints (ghost unit while founding a city, district-placement adjacency preview) **take precedence** over panel chrome for focus. If a panel is open while a placement interaction is in progress:

- The panel does NOT close. It remains mounted and visible on its dock side.
- The panel z-index drops by one tier below the placement hint screen overlay (see S-01).
- If the panel would materially occlude the placement target (for example, narrow-ish viewport where the city-founding reticle is behind the dock), the panel temporarily **shrinks** to `narrow` width (320px) while the placement is active; it restores when confirmed or cancelled.
- The panel remains interactive; ESC in this combined state cancels the PLACEMENT first (higher priority), then the panel on a second ESC.

This preserves "the map is the game" (P1): when the player is aiming at the map, chrome retreats.

### Validation feedback vs panel

Validation bubbles ("Not enough gold", "Requires researching X") render over whichever surface *triggered* the validation — typically the panel itself. These are always transient (auto-dismiss after ~1.5s per S-07). They never require dismissal interaction and never affect panel state.


## Modal + modal — the chain

Engine-driven modals (age transition, crisis, turn summary, victory) can fire out of order. The rule: **highest priority wins; others queue; no two modals render simultaneously**.

### Priority table

| Tier | Modals | Interrupts | Behavior when fired |
|---|---|---|---|
| **CRITICAL** | Victory, Defeat | Everything below | Immediately displaces whatever modal is visible; victim re-queues. Never queues behind anything. |
| **GAME-CHANGING** | Age Transition | Important + Helpful | Queues behind Critical; displaces Important + Helpful (victim re-queues). |
| **IMPORTANT** | Crisis | Helpful only | Queues behind Critical + Game-changing; displaces Helpful (victim re-queues). |
| **HELPFUL** | Turn Summary | None | Always queues last. |

Re-queue means the displaced modal state is preserved (scroll position, selected choice if any) and the modal re-fires after the higher-tier one is dismissed.

### Dispatch sequence

`PanelManager` gains a `modalQueue: ReadonlyArray<PanelId>` field. `openPanel(id)` for a `modal`-priority panel:

1. Look up tier in a priority map.
2. If current `activePanel` is a modal of strictly higher tier → push new modal to END of queue, do not open.
3. If current `activePanel` is a modal of equal or lower tier → push the CURRENT modal to the front of the queue (re-queue), set `activePanel` to the new id.
4. If current `activePanel` is any overlay → push overlay to a `suspendedOverlays` list (save/restore), set `activePanel` to new modal id.
5. On dismiss of any modal → pop queue head if non-empty, else restore from `suspendedOverlays`.

Only one modal visible at any instant. The queue is invisible to the player except via a small indicator ("2 events pending") in the BottomBar when `modalQueue.length > 0`, which the player can hover to see labels ("Crisis: Plague · Turn Summary"). No stacked dialog boxes; stacked modals are the bug we are preventing.

### Rationale

Stacking modals produces decision fatigue and stress. The Civ VII convention is to show ONE dramatic moment at a time; the rest wait. This matches. The player knows a crisis came mid-age-transition because the post-age-transition reveal is itself a crisis modal, and the game "feels" sequential rather than chaotic.

## Info-panel + overlay-panel combo (wide/ultra)

The info-priority panel (EventLog) is the clearest case of "wants to be permanent at wide+." Its rules:

- **Standard**: info acts like overlay — opens when toggled, takes the right dock, closes single-slot style when another overlay opens. (Acceptable compromise at this class.)
- **Wide**: info can stay docked alongside an overlay. Canvas narrows to accommodate both; overlay docks LEFT of info.
- **Ultra**: info is **default-open**. The player starts the session with Log visible on the right edge, ~380px wide. Opening CityPanel docks it to the LEFT of Log. Opening DiplomacyPanel docks it further LEFT still.

Interaction example (the killer use case): at wide/ultra, EventLog docked right plus CityPanel open in the middle. Player clicks "Rome founded by Augustus" entry in the log. Behavior:

1. Camera pans to the Rome hex (S-07 motion: 400ms ease).
2. The CityPanel subject **changes** to Rome (panel stays open, body re-renders with new city data).
3. Log stays docked, unchanged, entry stays in place.

The player cursor has not moved; the chrome has not flickered; the player has jumped to a city via a click in the log without losing orientation. That is the ultra experience.

At standard, the same log click closes the log (single-slot) and opens CityPanel for Rome. Functionally equivalent; visually a flip rather than an in-place update. That is the standard trade-off.

## Priority and focus rules when multiple surfaces are active

Focus is always unambiguous. Cross-reference S-08.

- **Modal always has keyboard focus.** Period. While a modal is visible, Tab cycles within it; arrow keys, Enter, ESC all target it. Canvas and other panels are visually dimmed (via S-04 backdrop opacity) and receive no input.
- **Among co-visible overlays (wide/ultra): LAST-opened has focus.** This is `activePanel` in the single-id sense. Tab cycles within the focused panel; ESC closes the focused panel (leaving others docked); a keyboard shortcut for any panel toggles that panel (possibly focusing it).
- **Clicking into an unfocused co-visible panel transfers focus** to it — promotes it to `activePanel` without closing the formerly-focused one. Small visual cue: the focused panel has a slightly higher-contrast border (S-09 state), the unfocused ones are a tier muted.
- **HUDs never have keyboard focus.** Hover tooltips, toasts, placement hints, validation — all tabindex is -1. Keyboard drives panels and canvas only. (Exception: the stacked-entity cycle responds to Tab, but Tab in this context is "advance the cycle within the hover anchor," not "move keyboard focus." The cycle indicator lives in HUDManager, not the browser tab order.)
- **Canvas claims focus when no panel is open.** Keyboard hotkeys (H, T, Y, R, G, K, X, A, ESC, arrow keys, space, enter) all apply. Opening any panel routes those to the panel context.


## Interaction patterns across surfaces

A short catalog of common cross-surface interactions and their contract.

### 1. Click a city-mention in EventLog

- Camera pans to city (S-07 motion).
- If CityPanel is already open (wide/ultra multi-slot OR standard same-panel): its subject updates, no open/close.
- If CityPanel is closed and viewport is wide/ultra: opens alongside log.
- If CityPanel is closed and viewport is standard: opens in single-slot; log closes as a consequence (acceptable, log reopens on next toggle).

### 2. Click a unit-mention in a notification

- Camera pans to unit. Unit becomes selected.
- BottomBar enters unit-dossier mode. (BottomBar modes are not panels per S-02; no panel conflict.)
- No panel opens; this is an always-visible chrome change.

### 3. Drag or drag-select from one panel to another

- Not a supported pattern. Cross-panel drag adds complexity with almost zero use case in our design (no tech-card-to-city drops, no unit-icon-to-hex drags from panels). If ever needed, it routes through a drag context at the `PanelManager` level — not implemented now.

### 4. Right-click a city in the CityPanel city list

- Context menu opens (HUD-priority overlay, `fixed-corner`), NOT a panel. CityPanel stays focused; context menu keyboard focus is transient (dismisses on any key or click).

### 5. Age transition fires mid-Turn Summary

- Age Transition is GAME-CHANGING; Turn Summary is HELPFUL. Turn Summary re-queues; Age Transition modal takes over. On dismissal of Age Transition, Turn Summary re-fires with its prior scroll position preserved.

### 6. ESC with Victory modal on top of Crisis modal on top of a CityPanel

- Only Victory is visible (single modal at a time). ESC dismisses Victory. The Crisis modal was previously queued; it now fires. CityPanel was in `suspendedOverlays`; it stays suspended until the Crisis also dismisses, then restores.

## Close-cascade rules

What happens when surface X closes:

- **Modal closes** → check `modalQueue` first (pop head, render it), else restore from `suspendedOverlays` (re-open the overlay panel that was active before the modal). Camera state is preserved across the suspension.
- **Overlay panel closes (single-slot)** → `activePanel` becomes null. Canvas reclaims focus. No cascade.
- **Overlay panel closes (multi-slot wide/ultra)** → that panel leaves the dock list; focus moves to the next-most-recent panel in `activePanels`. The newly-focused panel gets a brief highlight (S-09 focus state, ~200ms). Other panels stay.
- **Info panel closes (wide/ultra)** → restored to toggled-closed state; overlay panels in the same dock column re-flow to reclaim the space.
- **HUD closes** → no cascade. HUDs are leaf dismissals.

ESC behavior is symmetric with close-button behavior: whatever surface ESC would close, the close-button click on that surface does the same thing with the same cascade.

## Save / restore

When a modal interrupts an overlay panel, the overlay local state is preserved:

- Scroll position of inner lists
- Currently-selected sub-item (e.g., TechTreePanel hovered-tech detail footer)
- Tab selection (e.g., DiplomacyPanel current leader subtab)

`PanelManager` does not own this state — the panels do. The contract is: **panels must not remount on re-activation**. React achieves this by keeping the panel mounted (visibility hidden) during suspension, or by hoisting its state to a longer-lived scope. Panels SHOULD NOT teardown local state during `onClose` when triggered by modal suspension.

A small reason parameter of type "user" | "modalSuspend" | "conflict" is passed through `onClose` so panels can choose whether to clear ephemeral state. Most will no-op on `modalSuspend`.


## Worked examples

### Example 1 — Standard viewport, CityPanel, plague Crisis fires

1. Player has CityPanel open for Rome, scrolled halfway down the buildings list.
2. Engine fires state.crisis.active = "plague" → a `useEffect` in App.tsx calls openPanel("crisis").
3. `PanelManager` sees current activePanel is "city" (overlay). Pushes "city" to `suspendedOverlays`. Sets activePanel = "crisis" (modal). CityPanel unmounts OR hides (depending on React tree design).
4. Player reads the Crisis modal, clicks "Acknowledge".
5. `closePanel()` fires. `PanelManager` pops `suspendedOverlays`: "city". Sets activePanel = "city".
6. CityPanel re-mounts (or re-shows) at its prior scroll position. Engine state is newer (plague has affected Rome growth), but local UI state (scroll, hovered building) is unchanged.

### Example 2 — Wide viewport, EventLog docked, opens CityPanel, clicks different city in log

1. Viewport width 2048. Log is docked right (320px). Canvas fills the rest.
2. Player opens CityPanel for Rome via clicking Rome on the map. CityPanel docks LEFT of Log (480px); canvas re-flows to fill the remaining ~1248px.
3. Player clicks "Carthage founded by Dido" in the Log.
4. Camera pans to Carthage (S-07). CityPanel subject changes from Rome to Carthage; panel re-renders internally, no mount/unmount.
5. Log stays docked, Rome entry stays in place in the log.

### Example 3 — Ultra viewport, three surfaces visible, focus shifts

1. Viewport width 3440. Log docked right (380px), DiplomacyPanel docked middle (520px), CityPanel docked left (520px). activePanel is "city" (most-recently opened), activePanels is ["city", "diplomacy"], info-log always-on.
2. Player clicks into DiplomacyPanel on leader Cleopatra.
3. Focus transfers: activePanel is "diplomacy". CityPanel loses its focused border; DiplomacyPanel gains it. Keyboard Tab now cycles within DiplomacyPanel.
4. Player presses ESC → activePanel "diplomacy" closes. activePanels becomes ["city"]. Focus moves back to CityPanel.

### Example 4 — Age transition fires while Turn Summary is pending

1. End-of-turn engine processing posts TurnSummary; App.tsx opens it.
2. Same end-of-turn processing also posts AgeTransition (crossed into Exploration).
3. Second openPanel("age") call: `age` is GAME-CHANGING, current modal `turnSummary` is HELPFUL. Re-queue current (turnSummary to modalQueue head). Set activePanel to "age".
4. Player experiences: the age transition is the first thing they see.
5. On dismiss of AgeTransition, `modalQueue` pops: TurnSummary re-opens with its previously-rendered state.

### Example 5 — Victory on top of Crisis on top of overlay

1. activePanel is "city", Crisis fires → "city" suspended, activePanel becomes "crisis".
2. Before Crisis is dismissed, Victory fires (engine detects 100% civilization score or whatever). Victory is CRITICAL.
3. Crisis is IMPORTANT; re-queue (modalQueue becomes ["crisis"]). activePanel becomes "victory".
4. Player hits ESC. Victory dismisses. `modalQueue` pops → Crisis re-opens.
5. Player reads and dismisses Crisis. `suspendedOverlays` pops → CityPanel restores.

All three dramatic moments experienced in priority order; no two visible at once; no state loss.


## Interaction with other systems

- **S-01 (layering / z-index)**: S-10 uses the z-tiers S-01 defines (canvas < info < overlay < modal < HUD-toast). S-10 decides what OCCUPIES each tier at any moment; S-01 decides the stack order.
- **S-02 (position anchoring)**: multi-slot at wide/ultra uses S-02 dock-left / dock-right / dock-center zones. This doc defines the order of occupancy; S-02 defines the geometry.
- **S-03 (sizing per viewport)**: multi-slot widths (480 / 520 / 380 at wide) are defined in S-03. S-10 references them; changes in S-03 propagate here.
- **S-04 (transparency)**: suspended and unfocused panels drop opacity per S-04. Backdrop for modals per S-04.
- **S-06 (occlusion and dismissal)**: the ESC cascade and modal-chain priority are implementations of S-06 dismissal-order rules.
- **S-07 (motion)**: panel-subject changes (log click → city change) use S-07 cross-fade timing; camera pans on mention-click use S-07 ease curves.
- **S-08 (focus and keyboard)**: focus transfer between co-visible panels, Tab-within-panel semantics, and modal-steals-focus rule all derive from S-08 focus-ownership model.
- **S-09 (state transitions)**: the focused, unfocused, and suspended visual states of panels are S-09 tokens.

## Implementation phase

Lands across two phases:

**Phase 1.5 — layout architecture** (from `08-master-plan.md` §1.5): the `useViewportClass()` hook, the dock rule table per class, and the breakpoint tokens are prerequisites. The **single-to-multi-slot extension of PanelManager** goes here:

- Add `activePanels: ReadonlyArray<PanelId>` alongside `activePanel`.
- Add `conflictsWith` to `panelRegistry`.
- Add `modalQueue` and `suspendedOverlays`.
- Implement the dock-LEFT behavior in PanelShell layout for wide/ultra.
- Playwright specs at all three viewport classes validating co-visibility and conflict rules.

Effort: ~3 days on top of the viewport-class work already scheduled for Phase 1.5.

**Phase 5 — drama moments** (per master plan §5, modal redesign work): the **modal-chain priority table and re-queue mechanics** land here. This is the cycle that redesigns AgeTransition, Crisis, TurnSummary, and Victory — the right time to implement the ordering because the modals get touched anyway.

Effort: ~2 days within the Phase 5 modal-redesign budget.

Phases 0–1 ship unchanged — no pre-requisites broken, standard viewport users see no behavioral change until Phase 1.5 lands.

## Open questions

1. **Modal queueing vs interrupting** — the current proposal interrupts (higher tier displaces lower, victim re-queues). Alternative: higher tier queues (everything fires in order of arrival). Interrupting is the Civ VII convention and matches "the critical thing demands attention now"; queueing is cleaner and less jarring. **Recommendation: interrupt for CRITICAL only; queue for all else.** Needs user decision.
2. **User-configurable multi-slot?** Some players at 4K may prefer single-slot (less cognitive load); some at 1920 may want multi-slot despite the occlusion cost. **Recommendation: default per viewport class, setting to override in AudioSettingsPanel plus a future KeyboardSettings panel. Phase 6 or later; Phase 1.5 ships the defaults only.**
3. **What happens if a co-visible overlay fires a modal that conflicts with the other co-visible overlay subject?** Example: CityPanel for Rome plus DiplomacyPanel for Cleopatra both open; the Crisis modal references Cleopatra and needs her portrait. **Recommendation: modal does not care, renders as-is; on dismiss both overlays restore. Only a problem if the modal choices affect Cleopatra state and the open DiplomacyPanel would be stale — but that is a React re-render concern, not a panel-coordination concern.**
4. **How does a panel "re-target" vs open new?** Clicking Rome in the log when CityPanel is open for Carthage should re-target, not close-and-reopen. But clicking Rome on the map currently calls openPanel("city", subject=Rome) — does `PanelManager` need to know about subjects, or do panels handle this internally? **Recommendation: panels handle it internally via a `useCitySelection()` hook or similar; `PanelManager` stays subject-agnostic. Same-id open = re-target.**
5. **Does the stack-cycle indicator (for multi-entity hex hover) live inside the tooltip or is it a separate HUD?** Cross-ref S-05. **Recommendation: inside `TooltipShell` per `ui-overlays.md`.** Not an S-10 concern in practice.

These are the decisions that need review before Phase 1.5 implementation starts. Everything else in this doc is a direct derivative of the locked decisions plus the panel/HUD rules already in the codebase.
