---
title: S-08 Focus and keyboard navigation system
purpose: Specify the complete shortcut map, focus-ring visuals, tab order, input modes, and ARIA contract so hex-empires is fully playable and fast without touching the mouse
created: 2026-04-17
---

# S-08 Focus and keyboard navigation

## Purpose

Strategy games live and die by keyboard. A Civ veteran plays with their left hand on WASD or the shortcut-row and their right hand barely leaving the mouse, or, at the extreme, not touching the mouse at all for entire turns. Hex-empires already has a scatter of keyboard shortcuts (H, T, Y, R, G, K, X and a handful of unit actions inside `GameCanvas`), but there is no unifying **system**: no canonical focus-ring visual, no tab-order policy per panel, no input-mode separation between "map is active" and "a panel is active", no ARIA contract, and no single discoverability surface for hotkeys.

P6 of the philosophy doc (keyboard-first, mouse-assisted) demands that every path through the game be keyboard-reachable. H-12 of the holistic audit flagged ESC handling as inconsistent. H-14 rule-2 demanded that repeated actions have hotkey AND mouse, not just one. The A.2.4 quick-win proposed a HOLD-SHIFT keyboard-hint overlay. This doc consolidates all of that into a coherent system that:

1. Catalogs every single shortcut (panel, unit, map, navigation, modal, queue) and resolves existing conflicts.
2. Defines ONE canonical focus-ring style (amber glow, `:focus-visible` only) so the keyboard cursor is always legible but mouse clicks never produce a ring.
3. Specifies a deterministic tab order and default-focus rule per panel so Tab and Shift+Tab always land somewhere predictable.
4. Separates **Map mode**, **Panel mode**, and **Text-input mode** as first-class concepts so keyboard input routes to the right consumer automatically.
5. Lands a minimum-viable ARIA and screen-reader contract (aria-labels, live regions, focus trap for modals).

Keyboard-first also serves accessibility: users who cannot use a mouse (motor impairments, trackpad failure, RSI) must have full access. The focus ring is the single most important accessibility primitive; an inconsistent or invisible focus indicator makes the game unplayable for those users.

## Scope

**In scope:**

- Global shortcut map (panel access, end turn, unit actions, camera, selection, modal confirm and cancel, queue modifier).
- Shortcut conflict audit and proposed resolution (A-for-achievements vs A-for-attack, etc.).
- Focus-ring token(s) and the `:focus-visible` application rule.
- Tab-order policy inside every panel; default-focus-on-open rule.
- Focus-capture and focus-restoration rules across panel open and close.
- Three input modes (Map, Panel, Text) and the transition rules between them.
- HOLD-SHIFT keyboard-hint overlay (quick-win from A.2.4).
- Persistent keyboard-hint corner-glyphs on buttons.
- ARIA minimums: aria-labels on icon-only buttons, modal focus trap, live regions for notifications.
- Gamepad note (optional, future).

**Out of scope:**

- Full WCAG 2.1 audit (future pass per `00-philosophy.md`).
- Remapping UI (let the player customize keys). System assumes the shortcut map is fixed; a remapping layer can be added later without rearchitecting.
- Screen-reader optimization beyond the minimum (deep a11y is a separate effort).
- Mobile touch mode (desktop-only per locked decision 6).

## Current state

What exists today, grepped from `packages/web/src/`:

- `PanelManagerProvider` owns ESC in capture phase with a text-input-field bail-out and a `data-dismissible="false"` opt-out for non-dismissible modals (age, crisis). Good.
- `App.tsx:93 to 107` iterates `PANEL_REGISTRY` and toggles panels for any matching `keyboardShortcut`. Clean, no hardcoded letters. Currently wired: H, T, Y, R, G, K, X, A.
- `GameCanvas.tsx:655 to 814` owns a second keydown listener that handles: Escape (unit deselect), Enter (END_TURN), T (toggle tech, **duplicate with App.tsx**), Y (toggle yields), F (fortify), B (found city), U (upgrade), Space (cycle next unit), C (jump to capital), N (cycle to next city), J (cycle to next idle unit). Also WASD and arrows for camera pan and + and - (implicit via scroll) for zoom.
- No canonical focus-ring style. No tab-order specification per panel. No default-focus-on-open logic. No HOLD-key hint overlay. No corner-glyph hotkey badges on buttons. Icon-only buttons (close glyph, action palette emoji) are inconsistently aria-labeled.

Nothing is catastrophically broken, but every piece of the system is ad-hoc, and the T-in-two-places duplication and A-ambiguity are the kinds of issues that will keep multiplying unless centralized.

## The system

### Shortcut map complete, categorized

Two-tier shortcut namespace: **global** (always active unless in text-input mode) and **unit-local** (only active when a unit is selected and the panel layer is empty). Separating namespaces is how we resolve the A-ambiguity below.

#### Global Panel access (single key, case-insensitive; comes from `PANEL_REGISTRY.keyboardShortcut`)

| Key | Panel | Priority | Notes |
|---|---|---|---|
| H | Help | overlay | Already wired. Also shown on first load. |
| T | Tech Tree | overlay | Already wired; **remove duplicate in GameCanvas**, global belongs in App.tsx. |
| Y | Civics Tree | overlay | Y is already in registry. Y for yield-lens is a **conflict**, resolve below (bare Y = Civics; Shift+Y = yield-lens). |
| R | Religion | overlay | Already wired. |
| G | Government | overlay | Already wired. Grid-toggle proposal re-uses G, **conflict**, resolve below. |
| K | Commanders | overlay | Already wired. |
| X | Trade Routes | overlay | Already wired. |
| D | Diplomacy | overlay | Currently unbound. Add; does NOT conflict with WASD-D-pan because Map mode vs Panel mode routes the event to different consumers (see Input Modes). |
| V | Victory Progress | overlay | Currently unbound. Add. |
| L | Event Log | info | Currently unbound. Add. |
| C | City panel (for last-selected city; jump-to-capital if none) | overlay | Currently wired as "jump to capital" in GameCanvas; EXTEND to also open CityPanel for the capital. Single key, single result. |
| O | Governors | overlay | Currently unbound. O is free. |
| P | Audio (preferences) | overlay | Currently unbound. Using P avoids the A-conflict. |
| ? | Help (alias for H) | overlay | Friendly discoverability, the universal help key. |

The `AchievementsPanel` currently uses A; see conflict audit below, we move it to a modifier combo.

#### Global Turn flow

| Key | Action | Notes |
|---|---|---|
| Enter | End Turn | Primary. Has a secondary confirm behavior when idle units exist (see Examples). |
| Space | Next idle unit | Cycle to next unit that still needs orders. Skips fortified units. |
| Tab | (context-dependent) In Map mode: cycle stacked entities under cursor hex. In Panel mode: advance focus. |
| Shift+Tab | Reverse of Tab. |

#### Global Camera and map

| Key | Action | Notes |
|---|---|---|
| W or ArrowUp | Pan up | |
| A or ArrowLeft | Pan left | |
| S or ArrowDown | Pan down | |
| D or ArrowRight | Pan right | Does NOT conflict with Diplomacy-D; Map mode vs Panel mode routes differently. |
| + or = | Zoom in | (= is the shift-free keycap for +) |
| - | Zoom out | |
| 0 | Zoom to 100% | |
| Shift+M | Toggle minimap | Shift-prefix so it does not shadow any unit command. |
| Shift+Y | Toggle yield-lens overlay | Resolves T and Y conflict, Y alone opens Civics panel; Shift+Y is yield-lens. |
| Shift+G | Toggle hex-grid overlay | Resolves G conflict, G alone opens Government; Shift+G is grid-lens. |

#### Global Selection

| Key or gesture | Action |
|---|---|
| Left-click hex | Select unit on hex (or city; or tile if empty). |
| Shift+left-click | Add to selection group (future multi-select; scaffold now). |
| Ctrl+left-click | Queue move or queue action (explicit queue modifier, matches Civ VII queue gesture). |
| Right-click hex | Contextual command on current selection (move-to, attack, move-to-queue-end). |
| Tab | Cycle stacked entities under current hover hex. |
| Shift+Tab | Reverse cycle. |
| Esc | Deselect unit, close overlay, close panel (chain; see S-06). |

#### Unit-local (active only when a unit is selected, Panel mode is off)

| Key | Action | Notes |
|---|---|---|
| B | Build a city (Settler) | Already wired. |
| F | Fortify | Already wired. |
| Shift+S | Sleep | Distinct from Fortify: Sleep means stay here indefinitely and do not wake on Space; Fortify means defensive stance and wakes on enemy approach. Shift-prefixed because bare S is pan-down. |
| Delete | Disband | Confirm via a small in-world prompt. |
| Shift+W | Wait (skip this unit's turn without ending turn; cycle returns to it later) | Shift-prefixed because bare W is pan-up. |
| M | Move mode (enter path-planning) | M is free when a unit is selected; no-op otherwise. Minimap is Shift+M. |
| A | Attack mode | A-bare when a unit is selected = Attack; Achievements panel moves to Shift+A (see audit). |
| U | Upgrade unit | Already wired. |
| Shift+Click hex | Queue a move to this hex (plan a multi-turn path). Also Ctrl+Click as an alias. | |
| E | Build improvement (Builder) | Currently routes through a panel; add an E hotkey to enter placement mode directly. |
| 1 to 9 | Execute Nth action in the current unit's palette | Complements the named hotkeys; mirrors Civ VI's numbered action bar for muscle memory. |

#### Modal mode (a modal panel is active)

| Key | Action |
|---|---|
| Enter | Confirm the default (primary) choice. |
| Esc | Cancel or Close, unless the panel is non-dismissible. |
| Tab or Shift+Tab | Cycle choices. |
| 1 to 9 | Jump to the Nth choice when there is a numbered list (AgeTransitionPanel, CrisisPanel). |

#### Text-input mode (focus is inside an input, textarea, or select)

Global shortcuts are all disabled. Only:

| Key | Action |
|---|---|
| Esc | Blur the input, return to Panel or Map mode. |
| Enter | Submit the input (or move to next field in a form). |

The existing `PanelManagerProvider.handleKey` and `App.tsx` both already check for `INPUT`, `TEXTAREA`, or `SELECT` and bail. Keep that pattern; formalize it as "text-input mode".

### Shortcut conflict audit

The old scatter has real conflicts. Each is resolved by prefixing the lower-frequency meaning with Shift:

1. **A**: Achievements panel vs Attack unit action. Resolution: A-bare is always Attack when a unit is selected (and a no-op otherwise); Shift+A opens Achievements. Remove A from `PANEL_REGISTRY.keyboardShortcut` for `achievements`; add it as a modifier shortcut (see panelRegistry extension).
2. **Y**: Civics panel vs yield-lens. Bare Y opens Civics; Shift+Y toggles yield-lens. Update `GameCanvas.tsx` Y handler accordingly.
3. **G**: Government panel vs grid-lens. Same pattern: bare G opens Government; Shift+G toggles grid-lens.
4. **S and W**: pan-down and pan-up vs Sleep and Wait unit actions. Pan keeps the bare keys; unit actions are Shift+S and Shift+W. Rationale: pan is continuous (held every frame); Sleep and Wait fire once and benefit from the modifier because they are rarely used. This also matches Civ VI.
5. **M**: move-plan vs minimap. Bare M is move-plan when a unit is selected (no-op otherwise); Shift+M toggles minimap.
6. **T**: literal duplicate between App.tsx and GameCanvas. DELETE the GameCanvas copy; App.tsx is the single owner of panel shortcuts.

After the resolutions land:

- Bare single keys fall into two disjoint pools: Panel-opening (letters that do not conflict with unit actions) and Unit-action (letters that naturally pair with the action word, B for Build, F for Fortify, A for Attack, U for Upgrade).
- Shift-plus-key is the escape hatch for overlays and low-frequency actions.
- Ctrl-plus-click is the queue modifier.
- No key has two meanings within the same input mode.

### panelRegistry extension

Add one optional field:

```typescript
interface PanelRegistryEntry {
  readonly id: PanelId;
  readonly title: string;
  readonly icon?: string;
  readonly keyboardShortcut?: string;     // bare key
  readonly modifierShortcut?: { readonly shift?: boolean; readonly key: string };  // e.g. Shift+A
  readonly priority: PanelPriority;
}
```

The `App.tsx` dispatcher then checks either the bare or the modifier form. Existing panels keep their bare shortcut; Achievements moves to `{ shift: true, key: 'A' }`.

### Focus-ring style, single canonical

One ring, applied everywhere, via `:focus-visible` only (never `:focus`, which also fires on mouse click):

```css
:focus-visible {
  outline: 2px solid var(--focus-ring-outline);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--focus-ring-glow);
  border-radius: inherit; /* matches the element's own radius */
  transition: outline 80ms ease, box-shadow 80ms ease;
}
```

Tokens (land in `panel-tokens.css`, Phase 1.1):

```css
:root {
  --focus-ring-outline: var(--color-amber-400, #d4a24c);   /* warm amber, Civ VII palette */
  --focus-ring-glow:    color-mix(in srgb, var(--focus-ring-outline) 35%, transparent);
}
```

Why this spec:
- **2px solid outline** is the hard boundary, readable on any background.
- **2px offset** keeps the ring just outside the element's hover and press chrome, so neither collides with the other.
- **4px amber glow** (box-shadow) softens the edge and ties into the Civ VII warm palette without screaming like a default browser blue.
- **`:focus-visible`, not `:focus`**: mouse clicks never produce a ring (a game-feel rule; rings on every click feels like the UI broke). Only keyboard navigation and programmatic `.focus()` calls trigger it.
- **transition is short** (80ms) so rings appear fast; match the motion token (S-07 fast-curve).
- **Never raw hex inline**, tokens only, per `panels.md`.

One exception: the current-input-placement hex on the canvas has its own hex-shaped outline drawn by `HexRenderer` (amber overlay), because browser `outline:` does not wrap a canvas-drawn shape. That is a canvas primitive, not DOM focus; treat it as a separate concern (it already matches the amber palette, so visually coherent).

### Focus-capture and restoration

When a panel opens:

1. `PanelShell` sets `tabIndex={-1}` on its root so the root is programmatically focusable but not in the Tab order.
2. On mount, `PanelShell` focuses the **primary action button** if one is declared via `defaultFocusRef`, otherwise the **first focusable descendant** (button, input, or link), otherwise the shell root itself.
3. `PanelShell` stashes `document.activeElement` (the element that was focused before the panel opened) in a ref.
4. While the panel is open, Tab and Shift+Tab cycle within the shell (focus trap, see ARIA below for modal panels only; overlay and info panels do NOT trap focus, so Tab can escape to TopBar and BottomBar).
5. On close, `PanelShell` calls `.focus()` on the stashed element if it still exists in the DOM; otherwise focus falls to `document.body`, which routes keyboard to Map mode.

Modal panels (age, crisis, victory, turnSummary, victoryProgress) additionally **trap focus**: the shell adds two sentinel elements (tabindex-0, zero-size) at the very start and end; focusing them wraps to the other end. Overlay and info panels do not trap, the player may Tab out to the TopBar and back.

### Tab order per panel

Three levels of specificity, from looser to stricter:

1. **Default (no override)**: DOM order. Most panels are simple enough that DOM order is fine, primary action near top, secondary below, close glyph last. DOM order matches reading order matches Tab order.
2. **Override via `tabIndex` sequence**: only when a panel has a NON-linear structure (tabs, grid of items) where DOM order would zigzag awkwardly. Use `tabIndex={1,2,3,...}` sparingly; prefer restructuring DOM.
3. **Custom keyboard handler**: tree-shaped panels (TechTree, CivicsTree) use arrow keys to move within the tree and Enter to select; Tab jumps from the tree into the side-panel area in one hop. See below for the tree-specific contract.

Panel-by-panel:

- **HelpPanel**: linear sections; DOM order; first focus on the "Got it" dismiss or the first section's toggle.
- **CityPanel**: linear sections (yields, buildings, production queue); DOM order; first focus on the "Change production" action button.
- **TechTreePanel**: grid of tech cards; arrow keys move (up, down, left, right through the tech graph); Enter selects; Tab exits tree to info side panel; first focus on recommended tech.
- **CivicTreePanel**: same contract as TechTree.
- **DiplomacyPanel**: left column of civ portraits (vertical list), right column of actions. Arrow keys inside each column; Tab moves between columns; first focus on the first civ in list.
- **EventLogPanel**: scrollable list; arrow keys scroll; Tab is no-op (nothing else focusable); first focus on list container.
- **AgeTransitionPanel**: numbered list of civ choices; Arrow or 1 to n selects; Enter confirms; first focus on first choice.
- **TurnSummaryPanel**: scrollable summary; Tab is no-op; first focus on "Next" button.
- **GovernorPanel, ReligionPanel, GovernmentPanel, CommanderPanel, TradeRoutesPanel**: DOM order; first focus on primary action.
- **VictoryPanel and VictoryProgressPanel**: single CTA; first focus on CTA.
- **CrisisPanel**: numbered list of responses; 1 to n and Arrow, then Enter.
- **ImprovementPanel**: grid of improvements; Arrow + Enter; first focus on "recommended" improvement.
- **AudioSettingsPanel**: form of sliders and toggles; DOM order; first focus on first slider.
- **AchievementsPanel**: scrollable list; Tab is no-op; first focus on list container.
- **SetupScreen**: form (civ and leader picker, map size, difficulty); DOM order; first focus on civ select.

### Input modes, three, auto-routed

| Mode | Entered when | Keyboard dispatches to |
|---|---|---|
| **Map** | No panel active AND `document.activeElement === document.body` (or the canvas). | `GameCanvas` keydown listener (unit actions, camera, selection-cycle). `PanelManager` listens only for panel-opening shortcuts plus Space, Enter, Esc. |
| **Panel** | A panel is active AND focus is inside its DOM subtree. | The panel's own handlers plus `PanelShell` built-ins (Tab cycle, Esc close). Global panel-open shortcuts are suppressed so, e.g., typing "R" inside a future city-rename field does NOT open the Religion panel. |
| **Text-input** | Focus is on an `INPUT`, `TEXTAREA`, or `SELECT`. | The browser. Only Esc (blur) and Enter (submit) are intercepted by outer handlers. |

The transition is **automatic, focus-driven**: the handlers inspect `document.activeElement.tagName` on each keydown and route accordingly. There is no explicit `mode` state to manage; that is the whole point, modes are derived, not owned.

One refinement: when a panel closes and focus returns to `document.body`, we re-enter Map mode. When a panel opens and receives focus, we enter Panel mode. When the player clicks into a text field, Text-input mode takes over. All invisibly.

### HOLD-key hint overlay (quick-win from A.2.4)

Holding **Shift** for greater than or equal to 350ms (debounced, so a Shift+A tap does NOT fire it) renders a keyboard-hint overlay. Each interactive element in view (panel buttons, TopBar buttons, BottomBar actions, unit-palette actions, TopBar resource chips if they have a shortcut) gets a small floating glyph showing its hotkey. The overlay:

- Is a `HUDManager` element (`hudRegistry` entry: `keyboardHintsOverlay`), sticky until Shift is released.
- Positions glyphs via `TooltipShell` with `position="floating"`, anchored to each element's bounding rect.
- Uses warm amber on panel-bg, tokens only.
- Is keyboard-reachable on its own (Shift+? also toggles it as a sticky overlay for mouse users).
- Fades in over 80ms (match S-07 fast); out over 120ms.

The overlay is a **discovery tool**, not a permanent layer, it dims the rest of the UI slightly so the hotkeys are the thing you read. Release Shift, back to normal in one breath.

### Persistent hint badges on buttons

Separate from the overlay: every button that has a hotkey gets a small corner-glyph in its own chrome, unobtrusive (3 to 4px from the corner, muted opacity, uses `--focus-ring-outline` at 60%). Toggleable in AudioSettingsPanel (checkbox: "Show keyboard hints on buttons"). Default ON for new players; veterans turn it off.

This is what `[B]` inside the Found City label is trying to do today, except:
- Badge is a corner-glyph, not in the text label. (B.2.5 in Group B audit.)
- Styled from tokens, not a raw character squashed into the label string.
- Consistent across every button in the game.

### Screen-reader and ARIA minimum

The MVP accessibility contract, wired into the shared components:

- **PanelShell**: `role="dialog"`, `aria-modal={priority === 'modal'}`, `aria-label={title}`, `aria-describedby` for descriptive text inside if present. Close button: `aria-label` of the form "Close " plus title. Already spec'd in `panels.md`; confirm it is wired everywhere.
- **Icon-only buttons** (emoji with no visible text): `aria-label` MANDATORY. A lint rule can assert button children include either text OR an `aria-label` attribute.
- **Live regions**: notification toasts go into `<div aria-live="polite">`. Validation feedback (B.4) goes into `<div aria-live="assertive">` because "not enough gold" is urgent and must interrupt. The `HUDManager` layer already knows which is which (from the HUD registry `category` field); expose `aria-live` per category.
- **Focus trap**: modal panels trap focus inside their shell (see "Focus-capture" above). Overlay and info panels do NOT trap, Tab escapes.
- **Modal open announcement**: when a modal opens, its title goes into a screen-reader-only `<h1>` at the shell root so assistive tech announces it.
- **Skip link**: a visually hidden `<a href="#main-canvas">Skip to map</a>` at the very top of the body, surfaced on `:focus-visible`. Screen-reader users can jump past TopBar.

This is the minimum. A full WCAG audit is separate, and this MVP keeps us out of "unplayable for keyboard-only users" territory.

### Gamepad consideration (optional, future)

Hex-empires is desktop-only per locked decision 6. A gamepad note for when or if that ever changes:

- **D-pad**: arrow keys (panning, selection cycle, menu navigation).
- **Left stick**: analog pan.
- **Right stick**: zoom.
- **A, B, X, Y face buttons**: context actions (A = confirm, B = cancel, X = secondary, Y = tertiary). Map to Enter, Esc, Space, Tab respectively.
- **LB and RB shoulders**: cycle (unit next and prev).
- **LT and RT triggers**: zoom in and out.
- **Start**: open pause-and-options (which would need designing; Esc-to-menu is not a behavior today).
- **Select or View**: toggle minimap overlay.

If it ever lands, the shortcut map above translates cleanly. No re-architecting needed; the gamepad becomes another input device that enters Map mode or Panel mode based on whether a panel is active.

## Examples, a full turn, keyboard-only

The minimum coverage test: a player plays one complete turn without the mouse.

1. Turn starts. Map mode. Focus on `document.body`. AI finished its turn and a `TurnSummaryPanel` opened automatically.
2. **Enter**: confirms default ("Next"); panel closes. Focus returns to `document.body`. Map mode re-enters.
3. **Space**: cycles to next unit that needs orders. Camera centers. Unit becomes the current selection. Unit-local shortcuts are active.
4. **B**: a Settler was selected; founds a city. City-founded toast appears in a polite live region. Unit consumed. Space will now pick the next one.
5. **Space**: next unit is a Warrior with 3-of-3 movement. Alt-held to open a detailed tooltip on the cursor hex (detailed-tier tooltip, separate concern from this doc).
6. **M** to enter move-plan, arrow keys pick a target hex, **Enter** to confirm. (For keyboard-only coverage this path must exist; today it is partially wired.)
7. Shift-held for 350ms. Keyboard-hint overlay fades in. Every on-screen interactive element shows its glyph. Player sees that T opens Tech, Y opens Civics.
8. **Shift released**. Overlay fades.
9. **T**: Tech panel opens. Panel mode. Focus on recommended tech.
10. **Arrow keys**: navigate the tech graph. **Enter**: research selected. Panel closes. Focus restored to TopBar Tech button. Map mode.
11. **Enter**: end turn. AI starts, TurnSummaryPanel will open again. Loop.

None of the above requires the mouse. Some of it is not yet wired, that is the gap, and this doc names it.

### Alternative: a crisis interrupts the turn

1. Mid-turn, a crisis appears. `CrisisPanel` opens (modal, non-dismissible). Focus trapped. First choice has default focus.
2. **Tab or Arrow-down**: advance to next choice.
3. **1** (or **Enter**): select choice 1. Dispatch `RESOLVE_CRISIS`. Panel closes. Focus restored. Back to Map mode.
4. Turn continues.

Esc is a no-op inside CrisisPanel (`data-dismissible="false"`, already implemented). Enter with no focused choice is also a no-op; the shell requires an explicit selection.

### End-turn confirm with idle units

1. Player presses **Enter** with 3 idle units. Instead of ending turn immediately, a soft audio ping plus a focus jump to the first idle unit plus a toast in the polite live region: "3 idle units, press Enter again to end turn anyway, or Tab to cycle them."
2. Player presses **Tab**: camera recenters on the next idle unit. Unit is selected.
3. Player presses **F**: Fortify. Idle count drops to 2.
4. Player presses **Enter** again. Soft reminder still fires for 2 units.
5. Player presses **Enter** a third time within 1.5s: commits. Turn ends.

This double-Enter pattern is common in Civ VI and Civ VII; it preserves the single-key flow while protecting against accidental end-of-turn with unaddressed units.

## Interaction with other systems

- **S-06 (occlusion and dismissal chain)**: Esc's chain (deselect, close HUD overlay, close panel) is enumerated there; this doc only notes that the key press itself is the entry point and the capture-phase order (Panel first, then HUD, then canvas) is the mechanism. S-06 owns the handler ordering; S-08 owns the event source.
- **S-07 (motion contracts)**: the focus-ring 80ms transition, the hint-overlay 80ms fade, and the panel open and close motion all resolve to the same fast-curve token set. S-08 specifies the durations; S-07 owns the curves.
- **S-09 (state transitions: hover, press, active, disabled, loading)**: focus-visible is ONE of the five states. This doc specifies the focus visual; S-09 stacks it with hover and press (focus-and-hovered is NOT double-ringed; the ring takes precedence and the hover effect is subordinated via `border-color` rather than a second outline).
- **S-10 (multi-surface coordination)**: when two surfaces could own focus (e.g. a modal opens over an overlay, or a tooltip is pinned while a panel is open), S-10 resolves which one wins. S-08 specifies what focus means; S-10 specifies who holds it when.
- **S-02 (anchor rules)**: the hint-overlay glyphs anchor to the element's bounding-rect via the same rules S-02 uses for tooltips.
- **panelRegistry**: extended with `modifierShortcut`. Adds no runtime cost (modern browsers inline the property lookup).

## Implementation phase

Lands in two pieces across the master plan:

### Phase 1.1 Design-system tokens (part of Phase 1)
- `--focus-ring-outline`, `--focus-ring-glow` tokens in `panel-tokens.css`.
- `:focus-visible` CSS rule landed on the `:root` (global).
- Token reference documentation in the cheatsheet.

Effort: about 0.5 day.

### Phase 1.5 Layout architecture (the keyboard spine lives here)
- Consolidated keydown dispatcher split into three consumer namespaces (global panels, map unit-commands, modal confirm and cancel).
- `panelRegistry` extended with `modifierShortcut`; `App.tsx` dispatcher updated to handle Shift+A for Achievements.
- Conflict resolutions landed (T dedupe; Shift+Y, Shift+G, Shift+M, Shift+S, Shift+W for overlays-and-low-freq-unit-actions; C extended to open CityPanel).
- `PanelShell` gains `defaultFocusRef` prop plus focus-restoration ref.
- Modal focus-trap sentinels wired into `PanelShell` when `priority === 'modal'`.
- Aria-labels audited on all icon-only buttons; live regions on toast and validation.
- HOLD-SHIFT hint-overlay implemented as an `HUDManager` element.
- Corner-glyph hint badges rendered on buttons with a `keyboardShortcut`.

Effort: about 3 days within Phase 1.5; the bulk is the dispatcher refactor and focus-restoration. Tests: Playwright specs at the three locked viewport classes (standard, wide, ultra) for tab-order plus focus-ring visibility; unit tests for modal focus-trap; a regression guard that Shift+Y does NOT also open Civics (the conflict resolution).

### Phase 0 quick-wins (before Phase 1)
- Add aria-labels to icon-only buttons (30 min).
- Add a minimal hover-to-reveal hint on buttons that have `data-keyboard-hint` (2 hours). Not the full Shift-hold overlay, just a hover hint while we wait for the full implementation.

## Open questions

1. **Tab order, prescribed per panel or DOM-order default?** This doc picks "default DOM order, override only when needed, tree panels use arrows". Decision needed: is this the right balance, or do we want a more rigid `tabIndex` sequence everywhere? Recommendation: default DOM wins; overrides documented in each panel. Cheaper maintenance.
2. **Is Shift-hold the right hint trigger?** Alternatives: a chord like `?`, a checkbox in settings, always-on (with opacity low). Recommendation: Shift-hold for power-users, always-on corner glyphs for discoverability, both toggleable in settings.
3. **How aggressive is the focus trap in modal panels?** Current `panels.md` mentions trap but does not specify Tab-wrap sentinels. This doc adds them; confirm we want that (it IS the a11y-standard pattern).
4. **Does the HOLD-SHIFT overlay dim the rest of the UI or just overlay glyphs?** Dimming helps focus; might feel heavy. Soft recommendation: 20% global dim via a full-screen semi-transparent layer behind the glyphs, released with Shift. Revisit in playtest.
5. **Queue modifier, Ctrl or Shift?** Civ VI uses Shift-click for queue moves, but we have also been proposing Shift as the hint-overlay trigger. If both Shift-hold and Shift-click are in play simultaneously the 350ms debounce matters. Recommendation: Ctrl+click for queue (easier to distinguish from the hold-hint gesture), Shift-hold for hints.
6. **Auto-focus first unit at turn-start?** Civ VII does; hex-empires currently does not. This would tighten the keyboard-only loop: Enter ends turn, new turn begins, focus jumps to first unit that needs orders, Space cycles from there. Recommend YES.
7. **Gamepad, opt-in experiment or firmly off-scope?** Locked decision 6 says desktop-only, but "desktop" does not exclude gamepad. Recommend OFF for now, with the note above as a reservation.
