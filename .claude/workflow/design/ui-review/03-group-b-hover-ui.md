---
title: Group B — Hover / cursor UI review
surfaces: TileTooltip, UnitInfoTooltip, CombatPreview, validation feedback, notification toasts, idle-unit toast, placement hints
purpose: The UI that floats over the map during active play. Highest-frequency surface after TopBar
created: 2026-04-17
---

# Group B — Hover / cursor UI

## B.1 — Tile hover tooltip

**Screenshots:** 16, 17 (a tooltip is visible floating over the map)

### Current description

A small dark-slate pill floating near the cursor. Shows:
- `Grassland` name, possibly `+ Forest` if wooded
- A small number (tile yield?) next to emoji

A second chip/caption at the bottom-left of the canvas shows `(-1, 8) Grassland` — **redundant** with the floating tooltip. Two surfaces showing the same info at the same time.

The bottom-left chip in shot 17 reads `(-1, 8) Grassland + Forest  2  Move: 1 +1` — slightly more info than the floating tooltip. But still cramped.

### Interaction

Hover a hex → tooltip appears near cursor and simultaneously the bottom-left caption updates. They're two views of one truth.

### Look

- Small. Very small. Tight padding.
- Emoji + tiny text.
- No material feel — just a floating dark pill.

### Feel

Debug overlay. Not a game tooltip that sells the world.

### Issues

| # | Severity | Issue |
|---|---|---|
| B.1.1 | **P0** | Two surfaces showing the same data (floating tooltip + bottom caption). Pick one canonical location. The bottom caption appears to have MORE data — maybe kill the floating tooltip and keep the caption, or vice versa. |
| B.1.2 | **P0** | No yield breakdown. A tile tooltip in a Civ-style game should show per-yield numbers prominently: `🌾 2  🔨 1  💰 0`. Current tooltip only shows terrain name + one number. |
| B.1.3 | **P0** | No Alt-held detailed tier. Per `ui-overlays.md` rules, there should be a compact tier (always) and a detailed tier (Alt-held). I can't confirm the latter is wired; shots don't show it. If the detailed tier doesn't render yield-by-source breakdown, adjacency preview, etc., that needs to be wired. |
| B.1.4 | **P1** | Tooltip position follows cursor and occasionally occludes the hex being queried. `ui-overlays.md` specifies "no overlay covers its anchor" — verify with more states and fix. |
| B.1.5 | **P1** | Unit/city on the hex don't appear in the tooltip. If I hover a hex with a Settler on Grassland+Forest, I should see terrain stats AND unit card AND (if adjacent to my territory) the settle-quality hint. Currently only terrain. |
| B.1.6 | **P1** | No resource icons. If a hex has Wheat or Horses, that icon should be in the tooltip. Can't confirm without finding a resource-hex. |
| B.1.7 | **P2** | Icon/text kerning is tight enough that the `+` in `+ Forest` looks stuck to Grassland. Micro-typography. |

### Redesign proposal

Single canonical tooltip with two tiers, cursor-anchored, compact-tier default, detailed-tier on Alt-hold:

```
Compact tier (always, ~140×60):
┌────────────────────────┐
│ Grassland + Forest     │  title
│ 🌾 2  🔨 1  💰 0      │  base yields, tabular
│ Move cost: 1          │  one line
└────────────────────────┘

Detailed tier (Alt held, ~280×240):
┌──────────────────────────────────────┐
│ Grassland + Forest   (−3, 6)        │  title + coord
│                                      │
│ YIELDS                              │
│   🌾 2  Grassland base              │
│   🔨 1  Forest feature              │
│   💰 0                              │
│                                      │
│ MOVEMENT                            │
│   Foot: 1                           │
│   Wheeled: 2 (forest penalty)       │
│                                      │
│ UNITS HERE (1 / 2) — Tab to cycle  │
│   🏠 Settler — 100/100 HP, 3/3 move │
│                                      │
│ VISIBILITY                          │
│   Visible to: Rome, Egypt           │
└──────────────────────────────────────┘
```

The bottom-left caption should be retired; it's a redundant second source of truth. Alternatively, keep ONLY the bottom caption and drop the floating tooltip — some players prefer a fixed position, and the bottom caption doesn't occlude.

### Effort estimate

- Unify to single tooltip: 1 day
- Wire the detailed-tier: 2 days
- Stacked-unit cycle (Tab): 1 day if not already present
- Resource icon display: 1 day

---

## B.2 — Unit action bar (selected-unit in BottomBar)

**Screenshot:** 14

### Current description

When a unit is selected, the BottomBar's left zone shows:
- Unit name: `Settler`
- HP: `❤️ 100/100`
- Movement: `🚀 3/3`
- Primary action button: `🏰 Found City [B]`

The hex under the Settler is highlighted on the map; no selection ring visible around the unit sprite that I can see.

### Feel

Functional minimum. No dossier feel, no sense of the unit being a character.

### Issues

| # | Severity | Issue |
|---|---|---|
| B.2.1 | **P0** | Only ONE action visible (`Found City`). Where are Fortify, Sleep, Delete, Skip Turn, Move-to? A Settler has ~5 actions a player wants at hand. Must be a "more" menu or shown grid. |
| B.2.2 | **P0** | Unit has no portrait / art. Emoji `🏠` is a pictogram; the unit card should have a proper unit illustration. |
| B.2.3 | **P1** | No XP / promotions / combat-history summary. Civs-game veterans care about veteran units; they need a visible indicator. |
| B.2.4 | **P1** | No adjacency info for Settler-specific actions. A Settler card should show "Settle quality: 7/10 (Grassland + Forest, river access, resource nearby)" near the Found City button. |
| B.2.5 | **P2** | Keyboard hint `[B]` is inside the button label. Should be a badge on the corner, not label text. |

### Redesign proposal

Expand the unit zone of BottomBar into a proper dossier when in unit-select mode:

```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 SETTLER · Roman Legion                                    │
│   100/100 ❤️   3/3 🚀   0 XP   No promotions                │
│                                                              │
│ ACTIONS:                                                     │
│   [B] 🏰 Found City     [F] 💤 Sleep      [D] 🗑  Disband   │
│   settle quality: ★★★★☆ here                                │
│                                                              │
│ HOLD SHIFT to queue moves · TAB to next unit                │
└─────────────────────────────────────────────────────────────┘
```

- 2-3 inline actions visible, `...` for the rest
- Settle-quality hint rendered inline with the button
- Keyboard shortcuts as corner badges, not in label

### Effort estimate

- Dossier layout: 2-3 days
- Per-unit action catalog (which actions available based on unit type): 2 days — may already exist in engine
- Settle quality hint: 1 day (engine has placement-validator already)

---

## B.3 — Notification toasts

**Screenshot:** 17

### Current description

A small rounded chip appears in the right-bottom area when something happens (city founded in this case):

```
┌────────────────────────────┐
│ ○ Notification             │
│   City 2 founded at (-3,6) │
│   [Dismiss notification]   │
└────────────────────────────┘
```

Note the word "Notification" is the TITLE of the toast — as if the UI is saying "Hey, this is a notification!" That's the most generic title imaginable. A game should announce the EVENT, not the UI category.

### Issues

| # | Severity | Issue |
|---|---|---|
| B.3.1 | **P0** | Title is the word "Notification". Should be the event: `🏛️ City Founded`, or the city name, or the era milestone. "Notification" tells me nothing. |
| B.3.2 | **P0** | No auto-dismiss visible; requires `[Dismiss notification]` click. For transient "city founded" events this should fade after 3-5s. |
| B.3.3 | **P1** | Dismiss button is a fully-rendered text button. Should be a tiny `×` in the corner, not a full-width label that competes with the message. |
| B.3.4 | **P1** | Coords `(-3, 6)` appear in message. Players don't think in hex coordinates; they think in geography ("near the forest", "on my northern border"). Either drop the coord or show it small and muted. |
| B.3.5 | **P1** | No sound. A city founding is a mini-triumph; it needs a chord. |
| B.3.6 | **P1** | No art. A city-founded toast could show a tiny building silhouette, a celebration pop. |
| B.3.7 | **P2** | Toast stacks unclear. If 3 things happen in one turn, do 3 toasts pile up? Queue? Replace? |

### Redesign proposal

Category-aware toasts with event-specific chrome:

```
🏛️  City Founded                       ×
    Roma is now your capital.
    (adjacent to Forest, River · good strategic site)
    [Manage city]
    
    ─── fades in 5s ───
```

Categories (each with its own icon + color accent):
- **Foundational** (gold): city founded, wonder built, age transition, tech/civic researched
- **Military** (red): attack, defense, city captured, unit killed
- **Diplomatic** (white/ivory): treaty offered, relationship changed, war declared
- **Resource** (green): resource depleted, trade route completed
- **Warning** (amber): unhappiness high, gold negative, idle units, religion spreading

Each category has its own chord sound. Toasts stack bottom-up; new one pushes old ones up; oldest auto-fades.

### Effort estimate

- Toast redesign with category system: 3 days
- Sound chord set: 0.5 days (audio file lookups)
- Auto-dismiss: 0.5 days
- Click-to-open-relevant-panel: 1 day

---

## B.4 — Validation feedback

Not directly captured in screenshots but referenced in `ui-overlays.md` and `hud-elements.md`. It's the "can't do that" toast that appears when a move is invalid.

### Current expected behavior

A brief pill appears near cursor saying something like "Not enough gold" or "Target out of range". Was refactored to derive visibility from `HUDManager.isActive()` per backlog WF-ENF-2.

### Issues (inferred from code)

| # | Severity | Issue |
|---|---|---|
| B.4.1 | **P1** | Needs a validation-specific look: red-accent edge, shake animation on appearance, distinct sound. A generic slate toast reads as "info" not "rejected". |
| B.4.2 | **P1** | Should auto-dismiss in ~1.5s (validation errors are momentary). |
| B.4.3 | **P1** | Could include a "why" as the second line: "Not enough gold · You have 45, need 75". |

### Redesign proposal

Validation toast style:
- Position: center-bottom, cursor-adjacent (close but not occluding)
- Color: red-accent left border, amber for warnings, warm for hints
- Motion: scale-in with tiny left-right shake (8px, 80ms)
- Sound: short "nope" sound (single note, minor)
- Auto-dismiss: 1.5s with fade

### Effort estimate

- Validation-specific shell: 1 day (leveraging existing `TooltipShell` with a variant)
- Shake animation: 0.5 days
- Sound hook: 0.5 days

---

## B.5 — Idle-unit toast / end-turn block

**Screenshots:** (implied by TopBar showing "(4 unmoved)")

### Current state

End Turn button says `(4 unmoved)` when units are idle. Clicking it will presumably still end the turn or require a second click. The IdleUnitsToast exists per hudRegistry but I didn't capture it directly.

### Issues

| # | Severity | Issue |
|---|---|---|
| B.5.1 | **P0** | Idle-units should be fixable without ending the turn. A "Cycle Idle" button next to End Turn OR a pulse that draws you to each idle unit in turn. Current "(4 unmoved)" is information, not action. |
| B.5.2 | **P1** | A pulse on the map (the idle unit's hex gently glowing) would solve the same problem diegetically. |

### Redesign proposal

On End Turn click with idle units:
1. Soft warning ping
2. Camera auto-pans to first idle unit
3. Toast appears above unit: "4 idle units — TAB to next · END TURN again to proceed anyway"
4. Second press of End Turn proceeds

Plus a persistent subtle pulse on idle-unit hexes.

### Effort estimate

- Idle-unit cycle flow: 2 days
- Pulse animation on idle-unit hex: 1 day

---

## B.6 — Placement hints (building / improvement / wonder)

Per `hud-elements.md` there's a placement-hints HUD. Didn't capture directly (no builder unit active).

### Expected from code

When a Builder unit is selected and an Improvement is chosen, hexes that accept that improvement highlight. When placing a district, adjacent hexes preview the adjacency-bonus yield.

### Issues (inferred)

| # | Severity | Issue |
|---|---|---|
| B.6.1 | **P1** | Adjacency previews should render on hexes as floating yield badges (e.g., "+2🔨" floating above a hex) — Civ VI pattern. If not already, implement. |
| B.6.2 | **P1** | Best-placement star (the single optimal hex) should have a distinctive marker separate from "valid" hexes. |
| B.6.3 | **P2** | Invalid hexes should be visually muted, not just not-highlighted. Dimming 50% draws eye to valid options. |

### Redesign proposal

Placement-mode visual grammar:
- **Valid**: hex lit with a soft gold outline, yield preview floating above
- **Best**: valid + a star glyph + slightly brighter outline
- **Invalid**: hex dimmed 40%
- **Cursor**: hex crisply outlined with the tooltip showing placement preview

### Effort estimate

- Placement grammar: 3 days (including best-placement calculation if not done)

---

---

## Interaction economics (Group B)

| Surface | Clicks/turn | Precision | Repetition pain | Keyboard |
|---|---|---|---|---|
| Tile hover tooltip | 0 (hover only) | — | — | Alt for detailed tier |
| Unit action button (e.g. `Found City [B]`) | 0-5 | medium target | low | ✓ per-action letter |
| Notification dismiss `×` | **1-5 × precision click** | **high** — 16px target | **PAIN (4/5)** | ✗ none |
| Validation feedback | 0-3 | — (passive) | low if auto-dismiss | — |
| Idle-units indicator | reads only | — | — (but see below) | Space for next |

### The notification-dismiss pain — concrete math

Assume 3 notifications per turn × 200 turns = 600 precision clicks on a 16×16 target.

That's 10 minutes of nothing-but-dismissing across a single campaign, concentrated on a tiny target that requires careful aim while the rest of the UI sits unused.

**Fixes (ranked by impact):**

1. **(P0) Auto-dismiss ephemeral notifications after 4-5 seconds.** Kills 80% of dismiss clicks for free.
2. **(P0) Global "press any key" dismisses the topmost toast.** Kills another 15%.
3. **(P1) Enlarge the `×` target to 24×24 and put it in the corner with good padding.** Easier when dismissal IS needed.
4. **(P1) Category-aware auto-dismiss rules:** warnings (low gold, idle units) persist; positive events (city founded, tech done) auto-fade; critical events (being attacked) persist with distinct style.

### Quick-win interaction fixes

- Auto-dismiss + press-any-key: 3 hours total (one `useEffect` on the topmost toast + a setTimeout)
- Dismiss-target enlargement: 30 minutes
- Remove redundant bottom-caption tile info OR remove the floating tooltip: 15 minutes (pick one)

These alone remove the single worst interaction tax in the game.

---

## Group B summary

**Principles violated most:** P2 (diegetic first) — the tile tooltip is currently a panel-like pill, not an in-world callout; P5 (respond to interactions) — no shake/sound/motion on valid vs invalid; P3 (chrome has texture) — flat slate everywhere.

**Biggest win:** unify tooltip + caption into ONE canonical cursor-anchored tooltip with compact/detailed tiers, and make category-aware toasts with auto-dismiss.

**Combined effort:** ~2 weeks for full Group B redesign including placement grammar. But the notification-auto-dismiss fix is **same-day work with outsized quality-of-life impact**.
