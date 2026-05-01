---
title: Group A — Always-visible chrome review
surfaces: TopBar, BottomBar, EndTurn button, TurnCounter, era banner, Yields toggle, minimap
purpose: These are on-screen 100% of every turn. Biggest leverage per pixel in the whole product
created: 2026-04-17
---

# Group A — Always-visible chrome

Per our principles, this group is **80% of player attention**. Every weakness here multiplies across every turn.

## A.1 — TopBar

**Screenshots:** 02, 14, 17

### Current description (in words)

A ~50px-tall dark-slate bar pinned to the top of the viewport. Left→right it contains:

1. A small rounded pill reading `Turn 2` (white text on the standard slate background, purple inset border)
2. The word `ANTIQUITY` in muted white capitals, no chrome
3. Five resource chips in a row: `💰 98`, `🔬 0`, `🎭 0`, `⛪ 0`, `🤝 0`. Emoji + number, tight spacing.
4. Five action buttons in a row, each ~48-60px wide, colored: `Tech` (blue), `Civics` (pink), `Diplo` (purple), `Ages` (yellow), `⋯` (grey)
5. A prominent green pill-shaped button reading `End Turn → (4 unmoved)` at far right

### Interaction

- Clicking any action button opens the corresponding panel (overlay-priority, right-anchored)
- Clicking End Turn advances the turn
- Resource numbers update in-place each turn with a tiny red-ish delta chip that appears near them briefly (shot 17 shows `-2` next to gold after founding a city)
- No hover state visible on resource chips (can't confirm tooltip behavior without hover)

### Look

- Flat. Dark. Same slate aesthetic as everything else.
- Button colors are arbitrary (Tech=blue doesn't match Science=blue convention elsewhere — or does it? TechTree icon is a science flask 🔬)
- Typography is uniform ~12-13px
- No edge treatment — bar meets canvas with a 1px border
- End Turn stands out only because it's green; shape and size are pill-similar to everything else

### Feel

Website / admin. Not game. The bar looks like a SaaS app header with a Slack-style "unread" count on the End Turn button.

### Issues (ranked)

| # | Severity | Issue |
|---|---|---|
| A.1.1 | **P0** | No visual hierarchy — Turn/Age/Resources/Actions/EndTurn all present at the same visual weight. A player's eye has nothing to latch onto. |
| A.1.2 | **P0** | Turn counter and age name orphaned in the top-left, reading as breadcrumb rather than anchor. `Turn 2 / ANTIQUITY` should ONE visual unit that declares "you are here in history". |
| A.1.3 | **P0** | Action-button palette is inconsistent with resource semantics. Tech should use Science's color, Civics should use Culture's. As-is the player learns arbitrary button-colors that mean nothing. |
| A.1.4 | **P1** | `Ages` and `⋯` both appear to open the Age Transition panel. Dead button OR ambiguous trigger. Screenshots 06 + 07 show identical panel. |
| A.1.5 | **P1** | Resource chips show 0 for 4 of 5 slots at game start (early game). Zeros are clutter. Some chips should not appear until the resource is nonzero OR first earned. (Civ VII solves this by hiding faith/influence until religion/diplomacy unlocks.) |
| A.1.6 | **P1** | End Turn reads as "submit" button. In a turn-based strategy game this button IS the game's heartbeat; it needs a signature look: a keyboard hint (⏎), a shape that isn't a pill, and a pulse when idle units remain. |
| A.1.7 | **P2** | `(4 unmoved)` parenthetical inside the button label is awkward. Should be a badge (small red circle with "4") attached to the button corner. |
| A.1.8 | **P2** | No in-world date (year / BC-AD). Only turn count. See H-13. |
| A.1.9 | **P2** | Button labels are truncated abbreviations (Diplo for Diplomacy). On a 1440px wide bar there's room for full words — the shortened labels read as "we ran out of space" (we didn't). |

### Redesign proposal

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ TURN 2 · 3200 BC       ⚔ ROME · AUGUSTUS       💰 98  📜 0  🎓 0  ⛪ 0  🌐 0       [ END TURN ]  │
│ ANTIQUITY                                                                         ⏎   4 idle   │
└─────────────────────────────────────────────────────────────────────────────────┘

                                                                                      ↓ when clicked ↓
     BOTTOM TAB BAR becomes the panel-access bar, not TopBar
     (see A.2 below)
```

Proposed changes:

- **Left third: player anchor.** Turn number + in-world date as TWO lines; below it an era banner "ANTIQUITY" rendered as a material plaque with texture (small, ~200px wide). Third optional line: civ name + leader with unit icon.
- **Middle third: resource ledger.** 5 resource icons in a row with large tabular numbers. Each updates with a counting animation (from old value to new, 400ms ease). Hovering shows a tooltip with "+/- breakdown by source". Zeroes dimmed to 30% opacity. Color of each chip is THE canonical color for that resource and all references to that resource elsewhere use the same color.
- **Right: End Turn as signature element.** Large block (60-80% of TopBar height), chunky shape (shield or chevron silhouette, not pill), primary call-out color, keyboard-hint glyph (⏎) baked in, and a red badge on the corner when units are idle. On hover/focus: subtle glow + scale. Keyboard-pressed: visible depress animation.
- **Move Tech/Civics/Diplo/Ages/... OUT of TopBar** and into BottomBar (see A.2) where they belong — they're menu access, not core game state. TopBar becomes purely status + end-turn. Cleaner, dramatically less cluttered.
- **Strip the dead `⋯` button** once Ages becomes a single button.

### Effort estimate

- TopBar redesign: 1-2 days (one developer)
- Resource chip animation + tooltips: 1 day
- End Turn signature button: 1 day (including idle-units pulse)
- In-world date/year calculation from turn: 0.5 days (engine-side helper + use)

---

## A.2 — BottomBar

**Screenshot:** 02, 14, 17

### Current description

A ~40px-tall strip pinned to the bottom. Left→right:

1. `🏙 0 cities` chip
2. `⚔ 2 mil · 2 civ` chip
3. `🔬 No research` chip
4. `🎭 No civic` chip
5. Centered at the very bottom: `WASD: pan | Scroll: zoom | Enter: end turn | Space: next unit | T: tech | Esc: deselect`

When a unit is selected (shot 14), the BottomBar transforms: left side shows the unit card (`Settler ❤️ 100/100 🚀 3/3`) and a primary action button (`🏰 Found City [B]`). The keyboard-hints line persists.

### Look

- Same dark-slate, flat. Rounded corners on chips.
- Keyboard-hint line in tiny muted text at absolute bottom edge. Reads as a user-manual tearsheet.
- Unit-mode shows a minimal action bar with 1-2 buttons — NOT a full unit dossier.

### Feel

Status bar from an IDE. Not a strategy-game action bar.

### Issues

| # | Severity | Issue |
|---|---|---|
| A.2.1 | **P1** | Keyboard hints pinned to the bottom edge of the viewport are invisible during play — eyes are on the map, not the edge. These should appear contextually: hover a unit → show unit-action shortcuts, hover a panel button → show its shortcut. Ambient hints = ignored hints. |
| A.2.2 | **P1** | Stat chips (cities/mil/research/civic) overlap conceptually with TopBar resource chips. Either move all stats to TopBar, or move all resources to BottomBar. Currently split between the two with no clear rationale. |
| A.2.3 | **P1** | Unit-mode action bar is sparse. Clicking a Settler shows only `Found City [B]`. A Settler has more contextual info that matters: adjacent settle quality (yield preview), turns to found, civ-wide settler limit. All hidden. |
| A.2.4 | **P2** | Stat labels are full words ("cities", "mil", "civ") while TopBar uses emoji + number. Pick one convention. |

### Redesign proposal

The BottomBar should become **two distinct modes**:

**Mode 1 — no unit selected:**
- Left: stat chips (cities / mil / civ), unchanged but tighter
- Center: the PANEL ACCESS BAR (moved here from TopBar): Tech, Civics, Diplomacy, Religion, Government, Commanders, Trade, Governors, Achievements, Help. Icons primary, labels on hover. Keyboard shortcut glyph on each button.
- Right: Minimap (see A.6)

**Mode 2 — unit selected:**
- Left: full unit card (portrait + name + hp bar + movement + xp + promotions earned), tappable to expand
- Center: contextual action palette — `Move`, `Attack`, `Fortify`, `Found City`, `Build Improvement`, etc., with both icons and keyboard hints, only showing valid actions
- Right: minimap with unit's position pulsed

Keyboard-hint overlay should be a HOLD-key-to-reveal layer (hold SHIFT or ? and all hotkeys float next to their UI elements), not a permanent marquee.

### Effort estimate

- Two-mode BottomBar: 2-3 days
- Contextual unit-action palette with valid-action filtering: 2 days
- Keyboard-reveal overlay: 1 day

---

## A.3 — End Turn button (covered in A.1.6 above)

Called out separately because of the frequency — probably the 1,000+-click-per-game button. Keep it as the anchor redesign item even though it's discussed in A.1.

---

## A.4 — Turn counter + era banner (covered in A.1.1–A.1.2)

Same.

---

## A.5 — Yields toggle button

**Screenshot:** 02, 15

### Current description

A small chip labeled `👁 Yields` floating at roughly the left-center of the viewport, outside the TopBar and BottomBar. Screenshot 15 (after clicking it) shows... the viewport appears similar; the toggle may not be producing a visible change, or the change is subtle.

### Issues

| # | Severity | Issue |
|---|---|---|
| A.5.1 | **P0** | Button is **orphaned in space** — floating in the middle-left with no UI neighborhood. Why is it here and not in a control cluster? |
| A.5.2 | **P1** | Toggling yields should produce a dramatic visual change (tile yields overlay on every hex). In shot 15 I can't tell if it's on or off. Either the effect is too subtle OR the map is too small to show it (H-1 strikes again). |
| A.5.3 | **P2** | `👁` icon (eye) for "Yields" is semantic-mismatch. A yield-overlay toggle should use the resource icons, or a grid/overlay icon. |

### Redesign proposal

- Move to a map-controls cluster alongside: zoom buttons, minimap toggle, grid toggle, fog-of-war toggle, yield overlay
- Dock bottom-right corner of the map (NOT inside BottomBar)
- Icon: stacked resource chips or a grid overlay symbol
- When active: button is lit/gold-outlined AND the map visibly changes (yields rendered on each hex)

---

## A.6 — Minimap

**Screenshot:** 02, 14, 17

### Current description

A rectangular rendering of the entire world in the upper-left area of the central viewport. Appears to double as the main camera. The visible-frame indicator (white rectangle showing camera extent) is inside it.

### Issues

This is entangled with H-1 (canvas doesn't fill viewport). The "minimap" currently appears to BE the game view. That's unusable. The fix is the H-1 fix:

1. Canvas fills the viewport (minus TopBar/BottomBar/active-panel space)
2. Separately, a small minimap chip docks bottom-right (~200×140), shows the whole world, has a draggable camera-frame indicator
3. Click-drag on minimap moves the camera; click-teleport snaps

### Redesign proposal

Standard strategy-game minimap pattern: bottom-right corner, ~200×140, translucent frame, toggleable visibility (M key), with: current camera extent outlined, click to teleport, drag to pan, optional zoom level readout, optional "cycle to my cities" ring of dots.

---

---

## Interaction economics (Group A)

| Surface | Clicks/turn | Precision | Repetition pain | Keyboard |
|---|---|---|---|---|
| End Turn button | 1 | medium | — | ✓ Enter |
| TopBar action buttons (Tech/Civics/Diplo) | 0-3 | medium | low | partial (T, Y; others hidden) |
| Resource chips (hover) | 0-10 hovers | low | — | — |
| Yields toggle | 0-2 | medium | low | ✓ Y |
| Minimap click | 0-20 (if used for navigation) | **high** — small target | medium | — |

### Verdict
- **End Turn is good interaction-wise** (1 click/turn, Enter key) — only the VISUAL reads wrong
- **Ages button is DEAD** (screenshots 06 + 07) — zero clicks/turn of useful interaction, occupies space
- **Minimap interaction unclear** — can you click-teleport? drag-pan? If not, it's a decoration not a tool
- **Top action buttons need consistent shortcuts** — surface the hotkey glyph on every button badge, not just on hover

### Quick-win interaction fixes (before full redesign)
1. Add keyboard-hint badges (`⏎`, `T`, `Y`, `R`, `G`, `K`, `X`, `A`) visibly on every TopBar/BottomBar button. 2 hours.
2. Remove or repurpose `⋯` button (duplicates Ages). 30 minutes.
3. Hide zero-value resources in TopBar until first nonzero. 2 hours.
4. Add pulse to End Turn when idle units exist. 1 hour.

These 4 fixes cost less than a day and materially improve game feel while the deeper redesign is planned.

---

## Group A summary

**Principles violated most:** P1 (map is the game) — TopBar steals attention; P4 (hierarchy by importance) — everything same weight; P5 (respond to interactions) — no juice; P3 (chrome has texture) — flat slate.

**Highest-leverage item:** TopBar redesign. It's the most-looked-at UI in the game; rebuilding it right cascades benefits (resource colors become canonical, era banner becomes the anchor, End Turn becomes signature).

**Combined effort (if pursued together):** ~2 weeks of one developer to fully redo Group A with design-token updates and minimap-canvas split. This is the single highest-ROI UI investment in the entire game.
