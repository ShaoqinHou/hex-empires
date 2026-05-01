---
title: Group C — Tactical control panels review
surfaces: CityPanel, CommanderPanel, GovernorPanel, ImprovementPanel, TradeRoutesPanel
purpose: The "I want to do a thing to a specific entity" panels. Mid-frequency, high-agency
created: 2026-04-17
---

# Group C — Tactical control panels

These open when the player wants to **act on a specific entity** (a city, a commander, a trade route). They're where most game decisions happen.

## C.1 — CityPanel

**Screenshot:** 19

### Current description

Right-anchored overlay panel, ~400-500px wide, opens when clicking a city hex. Shows (top-down):

1. **Header**: `City 2 — Capital City (Pop 1)` + close `×`
2. **HAPPINESS** section: `+15` (green)
3. **YIELDS** section: `9 (+7)` with row of small numbers: `6  0  0  0  0` (presumably food/production/gold/science/culture/faith/influence)
4. **GROWTH**: `0/30 (+7/turn)` and `5 turns to grow`
5. **PRODUCTION**: `Nothing — choose below`
6. **BUILDINGS (1)**: `✓ Palace` (already built)
7. **BUILD**: subsections for UNITS (Warrior/Slinger/Scout/Settler/Builder) and BUILDINGS (Monument) with turns-to-build estimates

### Look

Standard slate card. Section headings in small uppercase. All-text buttons for units/buildings with icon + name + cost + stat summary + turn estimate. Tight padding.

### Feel

Strategy-game-ish but dense and undifferentiated. Sections equal-weight. No sense of where the player's eye should go first.

### Issues

| # | Severity | Issue |
|---|---|---|
| C.1.1 | **P0** | **Production is the main action**, rendered third from the bottom. It should be hero-of-the-panel: if nothing is being built, a bright "choose what to build" call-out that dwarfs everything else. If something IS building, a progress bar showing turns remaining. |
| C.1.2 | **P0** | **Yield numbers are bare digits** (`6 0 0 0 0`). No icons in that row — you have to count positions to know which is which. Each number should have its canonical resource icon above or beside it. |
| C.1.3 | **P0** | Happiness is shown as `+15` with NO context. +15 of what? Per-turn? Current stockpile? Positive/negative? One number no scale. |
| C.1.4 | **P1** | 5 unit build options + 1 building option render as equal-weight buttons. A pop-1 city can't build everything efficiently. **Recommended production** (given yields, current research, strategic need) should be highlighted first, others collapsed. |
| C.1.5 | **P1** | Turn-estimates are tiny text (`~5t`, `~9t`) hard to scan. Bigger number + context like "5 turns until next Warrior". |
| C.1.6 | **P1** | No **city tile ring** preview. A city works ~6 tiles; those tiles should visualize in the panel (mini hex-ring showing yields from each worked tile). Civ VI does this beautifully. |
| C.1.7 | **P1** | `City 2` as name — clearly a fallback. Letting players name their cities (or auto-naming from a civ pool: Roma, Ostia, Mediolanum for Rome) is a low-effort high-feel win. |
| C.1.8 | **P1** | Buildings section lists ONE built building. For a city with 10 buildings built, this becomes a wall of text. Needs grouping (culture/military/science/etc.) and possibly collapse. |
| C.1.9 | **P2** | "Capital City (Pop 1)" — redundant. The crown icon in the header and a small "1" pop indicator would communicate this more cleanly. |

### Redesign proposal

Hero-based layout — PRODUCTION is the stage, everything else reference:

```
┌──────────────────────────────────────────────────┐
│ 👑  ROMA                               [×]       │
│     Capital · Pop 1 · Grassland site              │
├──────────────────────────────────────────────────┤
│                                                  │
│    ▓▓▓▓▓░░░░░░░░░░  5 turns to Warrior          │
│    [ Change production ]                         │
│                                                  │
├──────────────────────────────────────────────────┤
│  🌾  🔨  💰  🔬  🎭  ⛪                         │
│   6   1   0   0   0   0     per turn             │
│                                                  │
│  Happiness  +15  · no penalties                  │
│  Growth     +7 food, 5 turns to Pop 2            │
├──────────────────────────────────────────────────┤
│  [City hex-ring mini-preview with tile yields]   │
├──────────────────────────────────────────────────┤
│  BUILDINGS  1 of 3 antiquity slots               │
│  🏛 Palace · 🏛 (empty) · 🏛 (empty)            │
└──────────────────────────────────────────────────┘
```

- Production hero with progress bar (replaces both PRODUCTION and BUILD sections as separate things; BUILD becomes the modal/expand when clicking "Change production")
- Resource icons + numbers as a compact horizontal ledger (once, visibly)
- Tile ring preview shows WHY the yields are what they are
- Buildings slots as visual tokens, not text list

### Interaction economics

| Action | Current | Proposed |
|---|---|---|
| Open city | 1 click on city hex | same |
| Change what's building | ~2-3 clicks (scroll to BUILD, find item, click) | 1 click on `[Change production]` → grid modal → 1 click to pick (2 clicks total) |
| Check happiness reason | no way currently | hover on `+15` → tooltip breakdown |
| See what tiles the city works | **no way currently** | hex-ring visible in panel |
| Close panel | × click OR ESC | same |

**Pain point:** changing production from the current layout requires hunting through a long list. Pinning "recommended" and "previously built" at top cuts hunting.

### Effort estimate: 3-5 days

---

## C.2 — CommanderPanel

**Screenshot:** 11

### Current description

Panel showing:
- Header: `Commanders` + `×`
- Text: `0 in play`
- `No commanders in play yet.`
- `Train a Captain (Antiquity), General/Admiral (Exploration), or Marshal+ (Modern).`

That's it. Entire panel is 4 lines of text when no commanders exist.

### Feel

Stub. Placeholder. Tells me nothing about the feature's design.

### Issues

| # | Severity | Issue |
|---|---|---|
| C.2.1 | **P0** | Empty-state is a WALL of nothing. This is a teaching moment — show WHAT commanders do (buffs to units?) with art, a path to get one (which tech/civic unlocks Captain?), the first milestone. |
| C.2.2 | **P1** | Once commanders DO exist, no preview of how they'd render. Can't evaluate. |
| C.2.3 | **P1** | Training "Captain / General / Admiral / Marshal" implies an era-tiered system but no era-band layout to hint at progression. |

### Redesign proposal

Empty-state:
```
┌──────────────────────────────────────────────┐
│ ⚔  COMMANDERS                          [×]  │
├──────────────────────────────────────────────┤
│                                              │
│   [illustration of antiquity commander]     │
│                                              │
│   You have no commanders in play.           │
│                                              │
│   Commanders lead armies and grant           │
│   passive bonuses to nearby units.           │
│                                              │
│   FIRST UNLOCK — Captain                    │
│   Research: Military Tradition              │
│   (progress: 0/25 civic points)             │
│                                              │
│   [ Plan research path ]  (opens Civics)    │
└──────────────────────────────────────────────┘
```

Active state: commanders listed with art + stats + current assignment + level + promotion tree access.

### Interaction economics

Opens ~5-10×/campaign. Low frequency. Visual polish matters more than click efficiency.

### Effort estimate: 2-3 days for empty-state redesign + active-state spec

---

## C.3 — GovernorPanel

(not directly screenshotted but inferred from registry and panels.md pattern)

### Expected

Panel listing recruited governors with assignment UI. Governors apply bonuses to assigned cities.

### Likely issues (inferred)

Similar to Commanders: probably an empty-state stub, probably lists governors as flat cards without era/role/tier differentiation.

### Redesign priorities (general)

- **Drag-drop assignment** to city cards (diegetic — drag to the map city, not a dropdown)
- **Art per governor** — a portrait bank of 6-8 styles
- **Tier bands** if governors promote through ranks

### Effort estimate: 3-4 days (pending actual-state screenshot)

---

## C.4 — ImprovementPanel

Already read this file's code during the plant test. The panel shows:
- Location coords
- If tile has existing improvement: warning
- Else: list of available improvements as cards with yields, cost, defense/movement modifiers
- Per card: big "Build" button

### Issues

| # | Severity | Issue |
|---|---|---|
| C.4.1 | **P1** | Every card has a build button — **why?** Clicking the CARD should build (card is already the target). An inline "Build" button makes the card not-clickable, which is wasted affordance. |
| C.4.2 | **P1** | Yield preview is text: `🌾 +1  🔨 +1`. Should also render on the HEX being previewed (diegetic — show the numbers on the hex that would change). |
| C.4.3 | **P2** | "charge" label is technical — player may not know what a Builder's charge count is. Should say "uses 1 of 3 builder turns" or similar. |

### Redesign proposal

- Make cards fully clickable (whole card is button, no inner button)
- Hover a card → the corresponding hex pulses with the yield change rendered as floating badges
- Show "best improvement for this tile" with a star

### Interaction economics

| Action | Current | Proposed |
|---|---|---|
| Build improvement | click improvement button | click card (anywhere on it) |
| Check yield impact | read text in card | see preview on actual hex |
| Cancel | ESC | same |

### Effort estimate: 1-2 days

---

## C.5 — TradeRoutesPanel

**Screenshot:** 12

### Current description

Panel shows:
- Header: `🤝 Trade Routes` + `×`
- Empty-state illustration (large handshake emoji centered)
- Text: `No active trade routes.`
- `Train a Merchant unit and move it adjacent to a foreign city to establish a route.`

### Feel

Empty-state but with a passable visual (the big handshake). Better than Commanders' empty-state.

### Issues

| # | Severity | Issue |
|---|---|---|
| C.5.1 | **P1** | Empty-state instruction is linear text. Could be a 3-step diagram: `[Train Merchant] → [Move adjacent] → [Route established]`. |
| C.5.2 | **P1** | Once routes exist, probably a flat list. A map-based visualization (small world map with route lines) would be Civ-VI-tier polish. |
| C.5.3 | **P2** | Large handshake emoji has no texture/material — should be illustration, not OS emoji. |

### Redesign proposal

Active-state spec:
- Top: world-map thumbnail with active routes as curved lines, color-coded by partner civ
- Middle: list of routes as rich cards: `Rome → Athens · +3💰 +1🔬 per turn · 12 turns remaining · [cancel]`
- Bottom: "Available merchants" slot showing undeployed merchant units, with click-to-select

### Interaction economics

Opens ~3-5×/game. Low frequency. Polish matters more than clicks.

### Effort estimate: 2-3 days for map viz + card redesign

---

## Group C summary

**Principles violated most:** P4 (hierarchy by importance) — CityPanel treats production same as buildings-list; P7 (sound cues) — no audio on build-completion or route-established; P8 (panels are stages) — these panels read as data sheets, not decisions.

**Highest-impact item:** CityPanel hero-layout redesign. You open it constantly; every improvement multiplies.

**Empty-state consistency:** Commanders and Trade Routes both have empty states. One has an illustration, the other doesn't. Standardize a "first unlock" empty-state pattern used across all panels that can be empty (Commanders, Governors, Trade Routes, Religion-before-pantheon, Government-before-research).

**Combined effort:** ~2.5 weeks for all 5 panels.
