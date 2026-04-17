---
title: Group D — Strategic dashboard panels review
surfaces: TechTree, CivicsTree, Government, Religion, Diplomacy, VictoryProgress
purpose: Big-picture decisions. Low frequency per turn, high weight per decision
created: 2026-04-17
---

# Group D — Strategic dashboard panels

The player opens these when thinking about the next 10-20 turns. Less frequent than Group A/B, but each visit should feel like consulting a serious plan document.

## D.1 — TechTreePanel

**Screenshot:** 03

### Current description

Right-anchored panel titled `Antiquity Age Technology Tree`. Shows a grid of tech cards (Pottery highlighted with a white border — currently selected or researched?; Writing, Irrigation, Currency visible at equal size). Dashed lines connect prerequisites. Scrollable on right.

Each card has:
- Tech name (bold)
- Science cost (`25`)
- First unlock item (`Granary`, `Library`, etc.)

### Look

Grid layout with moderate padding. Dashed lines show prerequisites (good!). Cards are uniform — same size, same background, same border. No era banner differentiation (though this IS the Antiquity tree — one era at a time).

### Feel

Closer to game than a lot of others — the prerequisite lines hint at tree-ness. But cards too uniform, no progress sense, no sense of WHAT to pick next.

### Issues

| # | Severity | Issue |
|---|---|---|
| D.1.1 | **P0** | No indication of CURRENT research. Player should see: "Researching Pottery, 25/25 science, 2 turns to complete" at the top of the panel. |
| D.1.2 | **P0** | No indication of what each tech UNLOCKS comprehensively. Showing `Granary` alone suggests one unlock per tech — but most techs unlock multiple units/buildings/improvements. Hover-detail with full unlocks list. |
| D.1.3 | **P0** | No "recommended" visual cue. A player glancing at the tree should see "if you're going for science, pick X; if military, pick Y" via subtle glyphs or tints. |
| D.1.4 | **P1** | Tree layout is scrolling grid. Real tech trees have deeper visual structure: branches, prerequisites flowing left-to-right, earlier techs clearly "before" later ones. Current layout is close-to-flat. |
| D.1.5 | **P1** | No art per tech. Pottery should have a pottery illustration, Writing a scroll, Currency a coin. Currently all same blank card. |
| D.1.6 | **P1** | Cost is shown as bare number `25`. Science icon + number would match TopBar convention and reduce cognitive load. |
| D.1.7 | **P1** | Scroll bar on the right suggests content extends off-screen. A TECH TREE should fit its whole era in the viewport; scrolling a tree is a website-reading behavior. Consider zoom-to-fit or smaller cards. |
| D.1.8 | **P2** | Selected tech (Pottery with white border) — is that research-in-progress or cursor-hovered? Needs distinct states. |

### Redesign proposal

```
┌────────────────────────────────────────────────────────────────────┐
│ 🔬 ANTIQUITY TECH TREE                                         [×] │
├────────────────────────────────────────────────────────────────────┤
│ CURRENTLY RESEARCHING                                              │
│   [Pottery illustration]  Pottery                                  │
│   ▓▓▓▓▓▓░░░░  25/50 science · 5 turns to complete                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│     [Pottery]──▶[Granary]                                         │
│        │                                                           │
│        ▼                                                           │
│     [Writing]──▶[Library]──▶[Philosophy]                          │
│        │         │                                                 │
│        ▼         ▼                                                 │
│     [Currency]─▶[Mathematics]                                      │
│                                                                    │
│   (zoomed to fit whole Antiquity era in viewport)                 │
├────────────────────────────────────────────────────────────────────┤
│ Hovered: Writing                                                   │
│   Cost: 🔬 50 (10 turns at current rate)                          │
│   Unlocks: Library, Diplomat, Scribe                              │
│   Leads to: Philosophy, Mathematics                               │
│   [Queue this tech] (Shift+click to queue)                        │
└────────────────────────────────────────────────────────────────────┘
```

- Top hero: current research with big art + progress bar
- Middle: actual tree layout (hierarchical, not grid), zoom-to-fit
- Bottom: hovered-tech detail as persistent footer
- Each tech card has its own art
- Queueing (shift-click) for planning multiple techs ahead (Civ VI pattern)

### Interaction economics

| Action | Current | Proposed |
|---|---|---|
| Pick next research | click card | single click remains |
| See what's unlocked | not shown | always visible footer |
| Queue multiple techs | — | shift-click (new feature) |
| Check progress | visible at top | same |

### Effort estimate: 4-6 days

---

## D.2 — CivicsTreePanel

**Screenshot:** 04

### Current description

Nearly identical to TechTree: `Antiquity Age Civic Tree` with Code of Laws highlighted (current?), Craftsmanship, Early Empire, State (W...?) visible with prereq arrows. Costs in culture (`25`, `40`, `60`, `80`). Unlocks shown (`Monument`, `+1 production from improved tiles`, `+1 settlement cap`).

### Feel

Functionally a clone of TechTree with different resource color.

### Issues

Same as D.1 (TechTree). Same redesign applies. **Both trees should share the same component** — `<TreePanel>` with props for era, resource type (science vs culture), nodes, etc.

### Issue-specific to civics

| # | Severity | Issue |
|---|---|---|
| D.2.1 | **P1** | Civic unlocks are shown as sentences (`+1 production from improved tiles`). Techs show item names (`Granary`). Inconsistent. Standardize: both show unlocks as icons + names + short tooltip for flavor. |
| D.2.2 | **P1** | Civics often unlock POLICIES (per `governmentSystem`) — that relationship isn't visible here. Needs a "civics → policies" bridge indicator. |

### Effort estimate: shared with D.1 (implement both at once), maybe +1 day for civics-specific bridges

---

## D.3 — GovernmentPanel

**Screenshot:** 10

### Current description

Panel showing:
- Header: `Government` + `×`
- `CURRENT GOVERNMENT`: `No government adopted yet. Research a gating civic (Code of Laws, Mysticism, etc.) to adopt your first government.`
- `POLICY SLOTS`: `Adopt a government to unlock policy slots.`
- `AVAILABLE POLICIES`: `Research more civics to unlock policies.`

All text, no structure, no preview of what governments exist.

### Feel

Instructional stub. Teaches me I can't do anything yet but doesn't show me what I'll eventually be able to do.

### Issues

| # | Severity | Issue |
|---|---|---|
| D.3.1 | **P0** | Empty state is TOO empty. Should show: ghost/silhouette previews of governments I'll eventually unlock ("Oligarchy — requires Code of Laws", "Republic — requires X civic"). Teaches the system visually. |
| D.3.2 | **P0** | Policy slot visualization is absent. Even before adoption, show 3-5 ghost slots labeled "Military / Economy / Diplomacy / Culture" so player learns the slot structure. |
| D.3.3 | **P1** | Instructions are passive voice ("Research more civics to unlock"). Active voice + action: `[Open Civics Tree]` button takes you there. |
| D.3.4 | **P1** | No flavor text about what government MEANS in-world. A government in Civ isn't just a bonus; it's a civilizational choice. |

### Redesign proposal (empty state)

```
┌──────────────────────────────────────────────────────┐
│ 🏛  GOVERNMENT                                   [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  You are governed by:                                │
│    [tribal silhouette]   CHIEFDOM                    │
│    "Ancestral tradition and clan elders."           │
│                                                      │
│  NEXT UNLOCKS                                        │
│    🔒 Oligarchy  (Code of Laws, 1/4 civics)        │
│    🔒 Classical Republic  (Early Empire, 0/4)        │
│    🔒 Autocracy  (Military Tradition, 0/4)           │
│                                                      │
│  POLICY SLOTS                                        │
│    ☐ Military   ☐ Economy   ☐ Diplomacy   ☐ Wild  │
│    (unlock with first government)                    │
│                                                      │
│  [ → Open Civics Tree ]                             │
└──────────────────────────────────────────────────────┘
```

- Even the "empty" state has structure (Chiefdom as default tribal state)
- Upcoming governments listed with progress
- Policy slots ghosted to teach the system
- Action button to the relevant adjacent panel

### Active state (once government adopted)

- Current government: big card with art, bonuses, flavor
- 4 policy slot cards, each clickable to swap policies
- History: "You changed from Oligarchy → Republic on turn 42"

### Interaction economics

Opens ~3-5×/campaign. Low frequency. Polish matters.

### Effort estimate: 3-4 days

---

## D.4 — ReligionPanel

**Screenshot:** 09

### Current description

Similar dense-instruction empty state:
- Header: `Religion` + `×`
- `+ 0 Faith` (current faith, apparently)
- `PANTHEON: No pantheon adopted yet. Cost: 25 faith. Adopt the first available pantheon when you have enough.`
- `RELIGION: No religion founded yet. Cost: 200 faith. Found a religion — own a pantheon first.`
- `0 Faith` (again?)

### Feel

Confusing. Faith `0` shown at top AND at bottom — redundant. The structure teaches the religion system (pantheon then religion) but without visuals.

### Issues

| # | Severity | Issue |
|---|---|---|
| D.4.1 | **P0** | Faith count shown twice (top header AND bottom). Pick one location. |
| D.4.2 | **P0** | No pantheon preview. What pantheons exist? A grid of locked pantheons with their effects (e.g., "God of the Sea: +1 faith from coast tiles") would teach the feature. |
| D.4.3 | **P0** | Progression is linear (Pantheon → Religion) but UI doesn't show this as a gated path. A horizontal "Pantheon → Religion → Missionary → Great Prophet" roadmap visual. |
| D.4.4 | **P1** | "Adopt the first available pantheon when you have enough" is passive instruction. Show a faith progress bar: `0/25 faith · 30 turns at current rate`. |

### Redesign proposal

Pantheon selection grid (Civ VI pattern):
```
CHOOSE YOUR PANTHEON (0/25 faith — ~30 turns remaining)

┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ God of    │ │ God of    │ │ God of    │ │ Earth     │
│ the Sea   │ │ War       │ │ the Open  │ │ Goddess   │
│           │ │           │ │ Sky       │ │           │
│ +1 faith  │ │ +1 combat │ │ +1 faith  │ │ +1 faith  │
│ from      │ │ str vs    │ │ from      │ │ from       │
│ coast     │ │ barbarian │ │ pastures  │ │ woods     │
│           │ │           │ │           │ │           │
│ [locked]  │ │ [locked]  │ │ [locked]  │ │ [locked]  │
└───────────┘ └───────────┘ └───────────┘ └───────────┘
```

Once pantheon adopted: card becomes "your pantheon", next gated step (Religion founding) appears.

### Interaction economics

Opens ~5-10×/campaign. Low-moderate frequency. Visual richness matters.

### Effort estimate: 3-4 days

---

## D.5 — DiplomacyPanel

**Screenshot:** 05

### Current description

Panel showing:
- Header: `Diplomacy` + `×`
- Single entry: `AI Empire` · `Greece · Pericles` · `Neutral` (far right)
- `RELATIONSHIP` bar: horizontal line with `0` at the end, presumably a gauge from hostile to friendly
- Row of action badges: `Surprise War` (orange/red), `Propose Peace` (??), `Friendship` (yellow), `Denounce` (orange)

The second action's label appears cut off in the screenshot.

### Look

Flat list of opponents. Action badges are colored pills — the color coding looks semi-thematic (war = red, peace = green) but inconsistent.

### Feel

Civ 4-era diplomacy (text-based opponent list). Modern Civ games have full portraits and conversations.

### Issues

| # | Severity | Issue |
|---|---|---|
| D.5.1 | **P0** | Leader has no portrait. "Greece · Pericles" is text; should be Pericles's portrait large on the left of the card with posture/mood. |
| D.5.2 | **P0** | Relationship gauge shows a bare `0`. What's the range? −100 to +100? Should have a scale with labels (Hated — Unfriendly — Neutral — Friendly — Allied). |
| D.5.3 | **P0** | Action buttons mixed together: `Surprise War`, `Propose Peace`, `Friendship`, `Denounce` — warlike AND peaceful grouped. Should be sectioned: ESTABLISH (friendship, trade), CONFRONT (denounce, surprise war), FORMALIZE (alliance, peace treaty). |
| D.5.4 | **P1** | No relationship HISTORY. How did we get to Neutral from whatever we started at? "Turn 3: met · Turn 8: Pericles liked your settling of Rome · Turn 12: Pericles disliked your military buildup". |
| D.5.5 | **P1** | No trade/deal dialog. Diplomacy should include "I'll give you 10 gold for Horses" style deal-making, which doesn't appear here. |

### Redesign proposal

```
┌──────────────────────────────────────────────────────────┐
│ 🕊  DIPLOMACY                                        [×] │
├──────────────────────────────────────────────────────────┤
│ KNOWN LEADERS (1)                                        │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [Pericles]   GREECE · PERICLES                       │ │
│ │ portrait                                              │ │
│ │  (280×380)  Relationship: NEUTRAL                    │ │
│ │             ──────────●─────────                     │ │
│ │             Hostile          Allied                  │ │
│ │                                                      │ │
│ │             Recent:                                  │ │
│ │             + Trade route from Rome                  │ │
│ │             – Settled too close to Athens            │ │
│ │                                                      │ │
│ │             [ Speak ]   [ Denounce ]   [ Declare War ]│ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Clicking "Speak" opens a sub-dialog with trade offers, treaty proposals, etc.

### Interaction economics

Opens ~10-20×/game. Moderate frequency. Portraits cost art budget but ROI is high (diplomacy is the MOST game-feel-sensitive system in Civ-style games).

### Effort estimate: 1-1.5 weeks (portraits + dialog tree)

---

## D.6 — VictoryProgressPanel

Not directly captured but priority is modal. Assuming shows progress across victory conditions (domination, science, culture, etc.).

### Likely issues (inferred)

| # | Severity | Issue |
|---|---|---|
| D.6.1 | **P0** | Should visualize each victory path as a progress ladder with player's current rank among civs. Civ VI does this well. |
| D.6.2 | **P1** | Own progress vs opponents' progress should be comparable — are you winning or losing? |

### Redesign

Multi-column layout, one column per victory type, showing:
- Milestones achieved / remaining
- Current lead civilization
- Your position in the ranking
- Estimate of turns to victory/loss if trends continue

### Effort estimate: 3-4 days

---

## D.7 — AgeTransition (as dashboard)

**Screenshot:** 06

### Current description

Modal-class panel. Shows:
- Header: `Age Transition`
- Lightning icon + `Antiquity → Exploration` flow
- `Age Progress`: `1 / 50 required` with thin progress bar
- `💡 Each technology researched grants +5 age progress`
- `🔒 Research More to Unlock Exploration Civilizations` heading
- List of 6 locked Exploration civs with their unique abilities + legacy bonuses visible but greyed

### Feel

This one is ACTUALLY closer to a game — the flow header (`Antiquity → Exploration` with an icon), the list of future civilizations as cards. Has narrative energy.

### Issues (dashboard mode, not modal transition itself)

| # | Severity | Issue |
|---|---|---|
| D.7.1 | **P1** | Locked civ cards are greyed but still feel flat. Each should have a silhouette illustration of the civ's leader. |
| D.7.2 | **P1** | Progress `1/50` is abstract. Show: "You need to research ~10 more techs. At your current rate that's ~30 turns." |
| D.7.3 | **P2** | Could preview the Legacy Bonus chain: which bonuses FROM antiquity will carry to exploration? A "your legacy so far" section. |

### Effort estimate: 2 days of polish (structurally OK)

---

## Group D summary

**Principles violated most:** P8 (panels are stages) — trees are grids, not dramatic choice theaters; P9 (modals earn interruption) — Diplomacy, Religion, Government all text-heavy; P3 (chrome has texture) — flat everywhere.

**Highest-leverage item:** Shared tree component for Tech + Civics (they should literally use the same `<TreePanel>` with data). Fixes two panels at once.

**Interaction economics:** All Group D panels are **low-frequency** (opened handful of times per game). Visual polish + art budget matters more than click optimization. That flips the prioritization vs Group A/B.

**Combined effort:** ~4 weeks if all redesigned (including diplomacy portraits which are art-heavy). Can be staged:
- Phase 1 (1 week): Tech + Civics shared tree component, empty-state redesigns for Gov / Religion
- Phase 2 (1 week): Government policy slot UI + Religion pantheon grid
- Phase 3 (2 weeks): Diplomacy with portraits
- Phase 4: AgeTransition polish + VictoryProgress deep dive
