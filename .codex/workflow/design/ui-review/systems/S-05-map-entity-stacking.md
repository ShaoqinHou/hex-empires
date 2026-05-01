---
title: S-05 — Map entity stacking
purpose: Specify how the canvas and tooltip layer present multi-entity hexes (unit + unit + city + district + improvement + resource + state indicators) without devolving into noise, and how the player selects, cycles, and acts on each entity. Flagged by the user as the hardest case in the review.
created: 2026-04-18
locked-decisions: Modern Civ VII aesthetic; desktop-only; standard/wide/ultra viewports; system-first design
cross-refs: S-01 layer/z, S-02 positioning, S-06 occlusion/dismissal, S-10 multi-surface interaction
engine-api: packages/engine/src/state/TileContents.ts (getTileContents, getSelectionCycle, hasStackedEntities)
rules: packages/engine/src/systems/movementSystem.ts — Civ VII stacking rule (1 military + 1 civilian per tile)
---

# S-05 — Map entity stacking

## Purpose

A single hex can legally hold: one terrain (base + feature + resource) + one improvement + one building + one district + one city + one wonder + up to two friendly units (1 military + 1 civilian/religious) + N visible enemy units + N visual state overlays (selection, fortified, sleeping, low-hp, plague, about-to-starve, can-move-here, can-attack-here, idle-pulse). On a forested grassland with a river, inside a city's territory, hosting a Settler who is about to found and a Warrior guarding, with a Farm improvement underneath, visible to an enemy, with the hex currently "selected" and an adjacent combat preview active — **that's eleven layers the UI has to resolve into a readable hex-sized footprint plus a tooltip that doesn't hide what it describes.**

The user explicitly flagged this case: *"what if we got a scout and a troop on same time, what if that tile got building as well, how to display them"*. This is the canonical problem, not an edge case. It happens every time a civilian moves through friendly territory, every time a city contains units, and every time the player inspects a contested border tile. If the system is wrong, the game becomes unplayable at exactly the moments that matter — the pivot turns.

The review `01-holistic-audit.md` caught this under H-1 (viewport empty) + H-8 (tooltips competing) and `03-group-b-hover-ui.md` B.1.5 (unit/city don't appear in tooltip). The engine has already done the hard part: `TileContents` + `getSelectionCycle` + `hasStackedEntities` in `packages/engine/src/state/TileContents.ts` is the single source of truth for "what's on this tile". The UI's job is to present it.

Principles violated most by the status-quo:
- **P1** (map is the game) — if stacked units render illegibly, the map lies
- **P2** (diegetic first) — unit+city stacks push the player into panels to understand what they're looking at
- **P4** (hierarchy by importance) — everything-at-same-z means nothing communicates precedence
- **P8** (stages not spreadsheets) — current tooltip reads as a debug dump

## Scope

**In scope:**
- The on-map (canvas) rendering of multi-entity hexes: primary sprite, secondary indicators, stack badges, selection ring, state overlays.
- The hover tooltip when stacked entities are present: compact + detailed tier, cycle indicator, TAB-to-cycle affordance.
- The click/selection-cycle rule: which entity becomes `selectedId` on first click, second click, ESC.
- The right-click / context-menu enumerate-entities pattern.
- Panel-opening rules when clicking a hex with co-located city + unit.
- Extreme-case visual treatments worked end-to-end for 7 concrete scenarios.

**Out of scope (owned by other systems docs):**
- z-index values per layer (S-01)
- Tooltip anchor math and viewport clamping (S-02)
- Opacity values of state overlays (S-04)
- Tooltip dismiss behavior when a panel opens (S-06 + S-10)
- State-transition animations (hover → press → select — S-09)
- Keyboard routing of TAB vs Shift-TAB (S-08)

**Out of scope (game-design):**
- Changing the stacking rules themselves. Civ VII rule (1 military + 1 civilian/religious) is fixed; this doc presents what exists.
- Inventing new entity types. The taxonomy below enumerates what the engine already produces.

## Taxonomy of hex content

Exhaustive list of what `TileContents` + related state can put on a single hex. Read `packages/engine/src/types/GameState.ts` (`HexTile`, `UnitState`, `CityState`, `DistrictSlot`) for the structural truth.

| Layer | Multiplicity | Engine source | UI concern |
|---|---|---|---|
| **Base terrain** | exactly 1 | `tile.terrain` (TerrainId) | Full hex fill; always visible |
| **Feature** (forest, marsh, woods, rainforest…) | 0-1 | `tile.feature` (FeatureId \| null) | Hex-level texture overlay on terrain |
| **River edges** | 0-6 | `tile.river: number[]` (edge indices 0-5) | Blue stroke on affected hex edges |
| **Resource** (Wheat, Horses, Iron…) | 0-1 | `tile.resource` (ResourceId \| null) | Small icon offset from hex center |
| **Improvement** (Farm, Mine, Camp…) | 0-1 | `tile.improvement` (ImprovementId \| null) | Medium-size sprite at hex footprint |
| **Building** (placed via city) | 0-1 | `tile.building` (BuildingId \| null) | Building silhouette; sometimes obscures terrain |
| **District** | 0-1 | `state.districts` by coord match | District-type color ring + adjacency hint |
| **City** (home hex) | 0-1 | `state.cities` by coord match | City silhouette + pop badge + name banner |
| **Wonder** (constructed, placed per WONDER_PLACEMENT_RULES) | 0-1 | encoded as building w/ wonder flag | Distinctive wonder icon/art |
| **Own military unit** | 0-1 | `TileContents.ownUnits` filtered by category | Primary unit sprite |
| **Own civilian/religious unit** | 0-1 | `TileContents.ownUnits` filtered by category | Secondary unit sprite |
| **Enemy units (visible)** | 0-N | `TileContents.enemyUnits` | Red-tinted sprite(s) with stack badge |
| **Fog of war** | 0-1 | `!viewer.visibility.has(hexKey)` | Dark overlay over entire hex + hides enemies |
| **Selection ring** | 0-1 | derived from UI's `selectedId` | Gold outline around one entity |
| **Fortified marker** | 0-1 per unit | `unit.fortified: boolean` | Corner badge on unit sprite |
| **Sleeping/skip marker** | 0-1 per unit | derived from `unit.movementLeft === 0` + no action queued | Zzz corner badge |
| **Low-HP marker** | 0-1 per unit | derived from `unit.health < 50` | Red pulse + HP bar |
| **Promotions/XP indicator** | 0-1 per unit | `unit.promotions.length > 0` | Small star badge |
| **Move-here preview** | 0-1 | UI-derived from `selectedUnit` pathing | Ghost footprint, gold glow |
| **Attack-here preview** | 0-1 | UI-derived from `selectedUnit` target range | Red crosshair |
| **Idle-unit pulse** | 0-1 | derived from unit can act, hasn't | Gentle breathing outline (H-14 Rule 6) |
| **About-to-starve / plague / unhappiness** | 0-1 per city | city `food <= 0` or active crisis | Warning glyph on city icon |
| **Adjacency preview** | 0-1 | UI-derived during district placement mode | Floating yield badge above neighbor hex |

Eleven-to-twenty layers live under one hex footprint on the pathological case. The system below resolves them without occluding the map.

## Stacking limits (the game rules)

From `packages/engine/src/systems/movementSystem.ts:121` and the classifier `getStackClass`:

> Civ VII rule: **one military + one civilian/religious unit per tile**. Classes (`UnitCategory`): `melee`, `ranged`, `siege`, `cavalry`, `naval` → `military`; `civilian`, `religious` → `civilian`.

Concrete consequences for the UI:

- **Max own-units on one hex = 2** (one military + one civilian). A Scout (military) + a Warrior (military) CANNOT co-exist; the engine rejects the move. So the "Scout + Warrior on same tile" phrasing from the user prompt is, strictly, an illegal state — but the user's real concern is **Warrior + Settler + city + district + farm**, which IS legal. The taxonomy handles that.
- **Max enemy-units on one hex**: unbounded in principle but practically also 2 (same rule applies per player). Fog of war may leave stale counts.
- **Max cities per hex = 1** (a city at its home hex occupies that hex's building/district slot inherently).
- **Max districts per hex = 1** (can co-exist with terrain/feature/resource/river but NOT with another district).
- **Max improvements per hex = 1** (farm, mine, camp, etc.; mutually exclusive).
- **Max buildings per hex = 1** (city-placed buildings via `PLACE_BUILDING` or auto-placement on production complete).
- **Max wonders per hex = 1** (wonders are buildings with special constraints — same slot).
- **Building + district + improvement** — the engine treats these as three distinct slots (`tile.building`, `state.districts`, `tile.improvement`) so theoretically a tile could have all three. Practically a city-center hex has the city + building slot (Palace); a district hex has the district; a countryside tile has at most an improvement. UI treats all three as "structure", picks one sprite, badges the rest.

So the **pathological legal case for UI** is:
> Grassland + Forest + River (two edges) + Wheat + Farm + Temple (building) + Holy Site (district) + own Warrior + own Settler + 1 enemy Scout (visible) + city at this hex + selection ring + fortified marker on Warrior + low-HP marker on Scout + attack-here preview.

Twenty+ things on one hex. This doc's job is to make that readable.

## On-map rendering: the layered-hex model

The canvas renders each hex as a **stack of z-ordered layers within the hex footprint**. Within the hex, higher-z paints over lower-z; between adjacent hexes, no overlap is allowed (that's the fundamental spatial grammar — hexes own their footprint).

### Z-layer assignment within a hex (top of stack last)

| Order | Layer | Notes |
|---|---|---|
| 0 | Terrain fill | Color tile base; lowest — always visible when nothing else above |
| 1 | Feature overlay | Forest mask, marsh texture; partial transparency so terrain reads through |
| 2 | River edges | Stroke 2px along affected hex edges |
| 3 | Resource icon | Small (<= 20% of hex footprint) at fixed corner (top-right, by convention) |
| 4 | Improvement sprite | Medium (~ 40% of hex) centered; obscures terrain where it paints |
| 5 | District/building sprite | Equivalent footprint to improvement, OR silhouette if distinct |
| 6 | City sprite (if this is city's home hex) | Largest structure; ~60% of hex; includes banner + pop-chip |
| 7 | Wonder (if any) | Replaces district/building visual at city hex; own distinctive art |
| 8 | Primary unit sprite | ~50% of hex, CENTER, heavy weight. "Primary" defined below. |
| 9 | Secondary unit sprite | ~35% of hex, OFFSET to bottom-right corner, fades slightly |
| 10 | Enemy unit sprite(s) | Red-tinted, small stack badge in top-right if >1 |
| 11 | State-overlay badges (fortified, sleeping, low-hp, XP) | Corner badges on the relevant unit sprite, 12x12px |
| 12 | Stack-count indicator | "+N" chip at top-right when multiple visible entities that didn't get their own sprite |
| 13 | Move/attack preview | Translucent ghost footprint or red crosshair, full hex |
| 14 | Idle-unit pulse | Breathing outline, 2px, subtle, outside the sprite stack |
| 15 | **Selection ring** | Gold outline 2-3px, drawn LAST so it's always visible |

Actual `z-index` token values are set by S-01. S-05 just specifies ordinal precedence.

### Primary-entity rule (which sprite gets the "center-big" slot)

The canvas picks ONE entity to render center-big. Priority order:

1. **City** — if this hex is the city's home hex, the city sprite is primary. Units sit in secondary / offset positions. Rationale: cities anchor the map mentally; finding the city on a glance matters more than finding the Settler waiting to move out.
2. **Wonder** — wonders supersede cities visually on the wonder's hex. Wonders are built in city territory but may or may not be on the city hex itself; when they ARE, wonder wins.
3. **Most-recently-selected own unit** — if the player selected a unit and the unit sits on a hex, that unit is primary while selected. Rationale: the player just chose this unit; it must read as "the thing I'm moving".
4. **Own military unit** — higher strength comes first among military if somehow two exist (shouldn't, but defensive).
5. **Own civilian unit** — next in line.
6. **Visible enemy unit** — if no own unit and no city, the enemy sprite is primary and renders red-tinted.
7. **Structure (district > building > improvement)** — in descending visual weight.
8. **Base terrain only** — default empty hex.

The secondary sprite (layer 9) is the *second* entity from the same list: usually the civilian unit when military is primary, or vice versa.

### Stack-count badge

When a hex has MORE than the 2 sprite slots can render (rare but happens with enemy incursions, with a city containing a unit that's also threatened by an adjacent enemy scout), a small "**+2**" chip appears in the top-right corner of the hex footprint, using token `--hud-badge-bg` + `--panel-accent-gold`. The chip is clickable and opens the stack picker inline (see Context-menu section).

### Selection ring

A 2-3px gold stroke (`--panel-accent-gold`) drawn as the top layer of the hex when some entity on the hex is selected. The ring outlines the HEX, not the sprite; the sprite already has the selection rendered by being the "primary" via rule 3 above. Two visible affordances: sprite-primaryness + hex-outline, so at peripheral vision the selected hex reads unambiguously.

### What's INTENTIONALLY hidden on the map

The map does NOT show: full HP bars (reserved for hover), promotion lists (reserved for hover / panel), city happiness (reserved for city icon badge + panel), district adjacency yield numbers (reserved for detailed tier tooltip or placement-mode). The map says *what's here*; the tooltip and panels say *how it's doing*. Principle P4 (hierarchy) — not everything is worth map-level visibility.

## Tooltip rendering with stacks

The tile tooltip's structure changes with stack depth. It remains cursor-anchored, compact by default, with the detailed tier on Alt-held — same pattern as `ui-overlays.md` / B.1 redesign.

### Compact tier (always)

Shows terrain/feature + yield glance + **stack summary line** + primary entity.

```
+--------------------------------------+
| Grassland + Forest                   |  terrain title, serif, 14px
| Food 2  Prod 1  Gold 0               |  yields, tabular numerics
| City - 1 unit - Farm - Wheat         |  stack summary, one line, muted
|                                      |
| ROMA  (capital, pop 4)               |  primary entity, emphasized
|   HP 100% - next pop in 3 turns      |  primary vitals, one line
+--------------------------------------+
```

The **stack summary** line uses glyph + count-noun format: "1 unit - 1 improvement". When a single category dominates (no stack), that line is suppressed. When N > 3 items are in the stack, it uses an ellipsis: "City - 2 units - +3 more".

### Detailed tier (Alt held)

Shows per-entity breakdown, scrollable if the stack is deep.

```
+--------------------------------------------+
| Grassland + Forest  (-3, 6)                |  coords in muted, for grognards
|                                            |
| YIELDS                                     |
|   Food 2  Grassland base                   |
|   Prod 1  Forest feature                   |
|   Gold 0                                   |
|                                            |
| STRUCTURE                                  |
|   City Center (Palace, Monument)           |
|   Farm (+1 food)                           |
|   Wheat resource                           |
|                                            |
| UNITS HERE - 2 / 2 shown - TAB to cycle    |
|   > Settler - 100/100 HP - 3/3 MP  *0      |  current in cycle (arrow)
|     Warrior - 62/100 HP - 0/2 MP  *1 XP    |  next in cycle, dimmed
|                                            |
| VISIBILITY                                 |
|   Visible to: Egypt, Greece                |
+--------------------------------------------+
```

### TAB cycling

The detailed tier shows ALL entities in `getSelectionCycle(contents, viewerPlayerId)` order. The currently-cycled entity has the `>` prefix; others are muted. Pressing TAB advances the cycle index (handled by `HUDManager.advanceCycle(anchorKey)`); Shift-TAB retreats; ESC resets to 0.

**Never render all entities simultaneously in the compact tier** — this is the M37-B duplicate-content regression; there's a Playwright test already in `packages/web/src/__tests__/playwright/tooltip.spec.ts` guarding it. The compact tier shows PRIMARY only; the detailed tier shows the cycle with the current one highlighted.

### Cycle indicator visibility

When `hasStackedEntities(contents, viewerPlayerId) === true`:
- Compact tier shows a small "(1 / N - Tab)" chip at the bottom-right of the tooltip
- Detailed tier shows the full list with `>` prefix on the current item
- On-map: the hex shows the stack-count badge (rule above)

When FALSE (single entity, most tiles), the indicator is suppressed. Veterans recognize the absence of indicator = "nothing to cycle here".

## Selection-cycle rules (clicking a hex)

Follows the engine's `getSelectionCycle()` ordering: own military → own civilian → own city. Enemies are never selectable (they're targets, not selections).

### First click on a hex

| Hex state | Result |
|---|---|
| Empty terrain | Hex highlights; no selection; hint "Click a unit or city" |
| 1 own unit | That unit selected; BottomBar shows dossier; move/attack previews activate |
| 1 own city (no unit) | CityPanel opens via PanelManager |
| 1 unit + own city (city home hex) | **City wins by default** — CityPanel opens, because city hexes are the primary strategic surface. The unit remains on the hex but isn't individually selected. |
| 1 military unit + 1 own civilian | **Military unit selected by default** (first in `getSelectionCycle`). |
| Enemy unit only (visible) | Hex highlights; no selection; hover tooltip continues showing enemy stats |
| Enemy unit + city under siege | Complex — enemy unit is the target, not selectable. A click behaves as hex-highlight only; attack-intent requires selecting an OWN unit first. |
| Fog-of-war hex | Hex highlights; no selection; tooltip shows "Unexplored" or last-seen state |

### Second click on the SAME hex (cycle forward)

| Current selection | Next selection |
|---|---|
| Military unit | Civilian unit (if present) OR back to military |
| Civilian unit | Own city (if on its home hex) OR back to military |
| Own city | First unit in cycle |
| If no cycle possible | Deselect |

ESC deselects entirely and clears any tooltip cycle.

### Override: Shift-click = "select this exact role"

Holding Shift and clicking bypasses the default:
- **Shift-click on city hex** → force-select the unit instead of opening CityPanel. Opens unit dossier.
- **Shift-click on unit stack** → force-select the civilian unit even when military is default.

A keyboard-modifier filter for grognards; new players click-cycle as in the table above.

## Click-target rules

Hex footprints are ~64px at standard zoom and ~100px at wide/ultra viewport classes. **The ENTIRE hex is the click target for selection.** Sprites within it are visual only — the renderer never subdivides the hex into per-entity click regions. That's a solved problem in every strategy game: hex is the unit of click, cycle resolves the ambiguity. Two reasons:

1. **Fitts's Law**: sub-hex click targets (a 30px Settler sprite within a 64px hex) push precision requirements to their floor. A player fighting a zoomed-out campaign can't land a 30px click reliably — wrist strain and misclicks compound over a 200-turn game (H-14).
2. **Visual ambiguity**: two sprites on one hex overlap their bounding boxes. Which sprite does the click at the overlap region select? The cycle rule (first click = primary, second click = next in cycle) sidesteps this entirely.

The hex footprint IS the click target. The cycle rule determines which entity becomes selected. Right-click (and the resulting context menu, below) handles the "I know exactly which entity I want" case.

### Hover vs click disambiguation

Hovering a hex is for tooltip only; no selection change. Clicking is the ONLY way to advance the cycle. This matters because hover state is fleeting (cursor passes over many hexes per second during panning) and should not thrash the BottomBar dossier.

### Pixel precision at multi-entity hexes — priority when sprites overlap

Though the hex is the click target, the canvas's paint order (layer 8 primary → layer 9 secondary) means the PRIMARY sprite visually occupies the center. Players naturally associate the center-big sprite with the click. The cycle rule aligns with this: first click = primary (the sprite they see in the center) = matches intuition.

## Context-menu on right-click (enumerate entities)

Right-click on a hex opens a compact context menu listing every interactable entity. Inspired by Civ VI's "multiple units on tile" popup and Shadow Empire's information-dense overlays.

```
+-----------------------------+
| HEX (-3, 6) - Grassland     |
+-----------------------------+
| Roma (City)                 |  -> CityPanel
| Warrior - 62 HP             |  -> UnitDossier
| Settler - 3 MP              |  -> UnitDossier
| Farm (improvement)          |  -> ImprovementTooltip (if any)
+-----------------------------+
| Cancel                      |
+-----------------------------+
```

Using a **list menu** (not a radial menu) on desktop — radial menus require more mouse travel and lose usability at large viewports. Keyboard: 1-9 to pick an entry by order; ESC to cancel.

The menu is not a panel — it's a HUD element. Registered as `tileContextMenu` in `hudRegistry` (new entry needed; see Open Questions). Auto-dismisses on outside-click or selection.

**Why a context menu is necessary** — the selection cycle (click-cycle) is good for 2-3 entities but degrades to "click N times to find the thing I want". Context menu cuts that to one action. Grognards will use it; new players won't discover it (that's fine; the cycle still works for them).

## Panel-opening rule (unit vs city on same hex)

The single most-confusing case: the player clicks a city hex that also contains a Settler waiting to move out. What should happen?

### The rule (from S-10 but restated here because it's the flashpoint)

| Precondition | Click result |
|---|---|
| No prior selection | **CityPanel opens.** City wins; the expected action on a city click is "manage city". |
| Unit elsewhere was already selected | **Unit action applies** (move-to, attack). City is not opened; the player is clearly in "act on this unit" mode. The hex highlights; if the move is legal, it happens. |
| Unit on THIS hex was already selected | **Cycle** to city (open CityPanel) — consistent with "second click on same hex cycles to next entity". |
| Shift+click | Always select the unit, never open the city. |
| Right-click | Context menu always; lets the player pick. |

This isn't Civ VII's exact rule (Civ VII opens a city with right-click and unit with left-click, which is a historical artifact of their control scheme); hex-empires uses the cycle rule for consistency with the tooltip and because ui-overlays.md + `getSelectionCycle` already establish city-last-in-cycle ordering.

## Visual treatment — the layered-hex concept in detail

### Structures within a hex footprint

Cities, districts, wonders, improvements, buildings all occupy the hex's interior region. They're stacked visually (z-order above) but footprinted separately so they don't all occupy the same pixels.

| Structure | Footprint zone in hex | Size |
|---|---|---|
| Base terrain | entire hex | 100% |
| Feature overlay | entire hex, partial alpha | 100%, ~60% alpha |
| Resource icon | top-right corner offset | ~20% hex area |
| Improvement sprite | centered, slightly lower | ~40% hex area |
| District/building sprite | centered OR if city-hex, integrated into city | ~40-60% |
| City sprite | centered, larger, with banner | ~60% hex area, banner extends 10% above |
| Wonder sprite | replaces city-center visual | ~50-60% |
| Unit sprite (primary) | centered slightly HIGHER than structure (on top) | ~50% |
| Unit sprite (secondary) | bottom-right offset | ~35%, offset 8px right + 8px down |

Unit sprites render ON TOP of structures — you can always see the Settler standing at the city gate. Structures render ON TOP of terrain — you always see that there's a Farm even when nothing else is there.

### State overlays (badges, glows, rings)

Small visual markers indicating state, rendered above units/structures:

- **Fortified marker** (shield glyph, 12x12px, top-left of unit sprite)
- **Sleeping/skip marker** (Zzz glyph, 12x12px, top-right of unit sprite)
- **Low-HP marker** (red pulse on the unit sprite + a red bar under the sprite showing %)
- **Promotions/XP** (small star or pips, 10x10px, bottom-right of unit sprite)
- **Selection ring** (gold outline on the HEX, 2-3px stroke)
- **Idle-unit pulse** (breathing outline on the hex, subtle, 2s cycle)
- **Move-here highlight** (translucent gold fill on the hex, ~20% alpha)
- **Attack-here highlight** (translucent red fill + crosshair, ~25% alpha)

All using tokens from `hud-tokens.css` — no raw hex colors.

### Fog of war

Undiscovered hexes: pure black + texture hint (maybe a tiny desaturated shape if partially explored). Previously-seen hexes: dimmed terrain (grayscale at 40% alpha), no units/enemies shown, last-seen state noted in tooltip. Visibility is a per-player viewer concept — `TileContents.enemyUnits` already respects fog.

## Extreme stacking examples — end-to-end

Seven scenarios worked through: what the map renders, what the compact tooltip shows, what the detailed tooltip shows, what clicking does, and what right-click shows.

### Example 1 — Scout alone on grassland

- **Map:** Grassland fill. Scout sprite centered. Gold selection ring if selected. No stack badge.
- **Compact tooltip:** Grassland - Food 2 Prod 0 Gold 0 + Scout - 100/100 HP - 2/3 MP
- **Detailed tooltip:** as compact + yields breakdown + unit promotions/XP
- **Click:** selects Scout, dossier appears in BottomBar.
- **Right-click:** menu with one entry (Scout) + Cancel.

### Example 2 — Settler + Warrior on grassland (legal: 1 military + 1 civilian)

- **Map:** Grassland fill. Warrior sprite primary (center, layer 8). Settler sprite secondary (bottom-right offset, layer 9, slightly smaller). No stack badge (2 sprites is within the on-map budget).
- **Compact tooltip:** Grassland - Food 2 Prod 0 Gold 0 + "2 units" summary + Warrior - 100/100 HP - 2/2 MP (primary) + "(1/2 - TAB to cycle)" chip bottom-right
- **Detailed tooltip (Alt):** full yields + `UNITS HERE - 2 / 2 shown - TAB to cycle` with `> Warrior` first, `  Settler` below
- **Click:** selects Warrior (military first in cycle). Second click selects Settler. Third click deselects.
- **Right-click:** menu with both units + Cancel.

### Example 3 — Scout + Warrior on grassland (ILLEGAL — engine rejects move)

The engine's `movementSystem` refuses to place a second military unit on the tile. **This never renders.** If the player attempts the move, validation feedback ("Cannot stack two military units on the same tile") toasts for ~1.5s. The map state stays consistent: the Scout remains where it was, the player learns the rule.

This is the rule-teaching moment — P5 (respond to interactions): the rejection has to FEEL like a clear "no". Validation toast with red accent + shake + "nope" sound. Treated in S-09 (state transitions).

### Example 4 — Warrior + Builder on Grassland + Farm (legal)

- **Map:** Grassland terrain. Farm improvement sprite (layer 4). Warrior sprite primary (layer 8, center, on top of farm). Builder sprite secondary (layer 9, bottom-right). No stack badge.
- **Compact tooltip:** Grassland - Food 3 Prod 0 Gold 0 (note +1 food from Farm) + "2 units - Farm" summary + Warrior - 100/100 HP - 2/2 MP + "(1/2 - TAB)" chip
- **Detailed tooltip:** full yields incl. "+1 Food from Farm" line; UNITS section lists Warrior + Builder; STRUCTURE section lists Farm
- **Click:** Warrior selected; BottomBar dossier. Second click: Builder (different dossier, different actions available). ESC deselects.
- **Right-click:** Warrior + Builder + Farm (improvement tooltip) + Cancel.

### Example 5 — City (capital, pop 4) + Settler about-to-move + Palace + Granary + adjacent enemy Scout

Home hex of Roma, contains the Palace (city wonder slot) and Granary (building), with a Settler unit sitting at the gate. Adjacent hex has an enemy Scout; combat preview NOT active unless the player selects a military unit and hovers the enemy.

- **Map:** City sprite primary (layer 6, ~60% hex, with "Roma" banner above + pop badge "4" on the banner). Palace integrated into city art (layer 7 wonder OR baked into city sprite). Granary small icon on the banner (or it's part of the city detail; engine has `city.buildings` listing it). Settler sprite secondary (layer 9, bottom-right offset, ~35% size). Selection ring drawn ONLY if city or Settler is selected.
- **Compact tooltip:** Grassland - Food 2 Prod 1 Gold 0 + "Roma - 1 unit" + ROMA (capital, pop 4) - next pop in 3 turns (primary = city)
- **Detailed tooltip:** yields breakdown; STRUCTURE: `Roma (capital, pop 4), Palace, Granary`; UNITS: `> Settler - 100/100 HP - 3/3 MP`; VISIBILITY: visible to rivals.
- **Click:** opens **CityPanel** (city wins per panel-opening rule, since no prior selection).
- **Shift-click:** selects the Settler instead. Unit dossier in BottomBar, move/found-city preview available.
- **Right-click:** menu: Roma (opens CityPanel) + Settler (opens dossier) + Cancel.
- **Adjacent enemy Scout:** renders on its own hex, red-tinted, with enemy-unit visibility badge. Hovering that hex shows the enemy tooltip. Does NOT appear in the Roma-hex tooltip (it's a different hex).

### Example 6 — Siege + civilian caravan + adjacent enemy siege tower (combat preview active)

- **Map:** Grassland. Catapult (siege, military) primary. Caravan (civilian) secondary. Adjacent hex has enemy siege tower, which is rendered on ITS own hex with red tint.
- The **combat preview overlay** (S-05 interacts with S-10 here): when the player selects the Catapult and hovers the enemy tower, a combat-preview HUD element appears at `fixed-corner` position (not occluding either hex) showing attacker-defender stats + predicted damage.
- **Compact tooltip** (own hex): Grassland - Food 2 Prod 0 Gold 0 + "2 units" + Catapult - 100/100 HP - 1/1 MP (primary)
- **Detailed tooltip:** yields; UNITS HERE: `> Catapult - Caravan (dimmed)`
- **Click on own hex:** Catapult selected (military first); attack preview on adjacent tower activates.
- **Right-click:** menu: Catapult + Caravan + Cancel. Enemy tower is NOT in THIS hex's menu (it's a different hex).

### Example 7 — Barbarian camp (pseudo-city) + 3 barbarians + Horses resource

Barbarian camps in hex-empires are likely represented as an engine flag on the tile or a pseudo-city CityState with owner "barb". The UI treatment treats it as "other faction city" with enemy tint.

- **Map:** Barb camp sprite primary (layer 6, red-tinted). Horses resource icon top-right (layer 3, always visible on own-or-friendly-visible). Enemy unit stack indicator "+3" at top-right-of-sprite corner (since 3 enemy units share the hex — more than the 2 secondary slot allows). Fog of war may hide it if not scouted.
- **Compact tooltip:** Grassland - Horses + "Barbarian camp - 3 enemies" + primary = camp + "(3 enemy units - visible)"
- **Detailed tooltip:** yields; STRUCTURE: Barbarian camp; ENEMIES HERE: lists 3 barbarians with stats (HP, type); note: TAB cycles only own units, not enemies — enemy list is display-only
- **Click:** highlights hex, no selection (enemies aren't selectable). If the player has a military unit selected elsewhere and this hex is in range, attack preview activates.
- **Right-click:** menu: Barbarian camp (info-only tooltip) + Horses resource (info tooltip) + 3 enemies (info only) + Cancel. No "select" options.

### Principle through all seven examples

**The map says what's there; the tooltip says the details; the cycle resolves ambiguity; right-click enumerates.** Three surfaces, one problem space, no overlap.

## Interaction with other systems

- **S-01 (Layer & z-index):** S-05's layer order (0-15 within hex) maps to the canvas's paint order in the renderer. Selection ring must stay topmost; state overlays mid-stack; terrain bottom. S-01 specifies the actual z-index values and hex-layer tokens.
- **S-02 (Positioning):** tooltip anchor follows the cursor but NEVER occludes the hex it describes (`TooltipShell` position='floating' auto-offsets, `fixed-corner` fallback when tile would be covered). Stack-count badge position is fixed at hex top-right by this doc; S-02 confirms the clamping math.
- **S-04 (Transparency):** fog-of-war opacity, move-highlight alpha, attack-highlight alpha, feature-overlay alpha, idle-pulse alpha — all specified by S-04. S-05 specifies WHAT gets overlay treatment; S-04 specifies the exact values.
- **S-06 (Occlusion & dismissal):** when CityPanel opens, the tooltip (which was showing terrain + city summary on hover) must dismiss. When the stack-cycle indicator is visible, ESC should reset cycle BEFORE dismissing tooltip. The precedence is laid out in S-06; S-05 provides the content of what's being dismissed.
- **S-08 (Focus & keyboard):** TAB/Shift-TAB routing for cycle-through, Alt for detailed tier, ESC for cycle-reset-then-dismiss. S-08 owns the routing; S-05 owns the semantics.
- **S-09 (State transitions):** hover → primary entity glows; press → selection animates; rejection → shake + toast; cycle-advance → 80ms slide. Motion contracts in S-09; stateful meanings in S-05.
- **S-10 (Multi-surface):** the panel-opening rules when clicking a city hex with a unit on it (city wins, unless unit-was-already-selected) are a coordination concern between CityPanel, UnitDossier, and the PanelManager. S-10 owns the coordination; S-05 states the semantic outcome.

Cross-reference from this doc to S-10 is particularly important because the city-vs-unit tiebreaker is a recurring source of confusion and must match across docs.

## Implementation phase

Lands in **Phase 2** (canvas + HUD rethink) of the master plan. Concretely:

- **Phase 2.1 — canvas-fills-viewport + layered-hex rendering.** Renderer gains the layer stack above. Primary/secondary unit slots, stack-count badges, state overlays. ~1-2 weeks including sprite integration.
- **Phase 3.1 — tile tooltip redesign.** TooltipShell refactor for compact/detailed tiers, stack summary line, cycle indicator, TAB cycling integrated with `HUDManager.advanceCycle`. ~3-5 days.
- **Phase 3.5 (new) — context menu (tileContextMenu HUD).** Right-click menu with entity enumeration. ~2-3 days including keyboard (1-9) routing and Playwright spec.
- **Phase 3.6 (new) — selection-cycle polish.** Second-click cycles, Shift-click role-filter, ESC precedence. ~1-2 days (most of the logic is already in `getSelectionCycle`; this is wire-up).

All phases depend on S-01 (z-index tokens) + S-02 (position clamping) being in place. S-05 is ONE of the two largest systems docs by implementation footprint (the other is S-10).

## Open questions

The following need user decisions before implementation:

1. **Context-menu keyboard shortcut.** Right-click opens the list menu; is there ALSO a keyboard shortcut (e.g. `F` for "entities on selected hex")? Default proposal: no keyboard equivalent — context menu is mouse-driven.

2. **Stack-count badge threshold.** At what N (>= 3? >= 4?) does the hex switch from "render 2 sprites" to "render 1 sprite + a '+N' badge"? Default: render secondary if it fits (1 military + 1 civilian = 2 always fits); show "+N" only when enemy units stack beyond what's renderable (rare).

3. **Primary-entity rule ordering — own unit vs city.** The current table says city wins by default when click-no-prior-selection. Alternative (Civ VII): unit wins if a unit is on the city hex, and city opens only via right-click or keyboard `C`. This is one of the most-discussed UX debates in the Civ VII community; recommend the doc's proposal (city wins default, Shift for unit) but user may want to flip it.

4. **District + building + improvement simultaneously on ONE hex.** Engine types allow it. Does the game actually create such hexes, or does district placement mutually-exclude improvement? If it can, does the map render district OR building OR improvement (picking one by priority)? Default: districts outrank buildings outrank improvements for the single structure-sprite slot.

5. **Right-click convention — context menu vs direct-attack.** Civ VI right-clicks to move; Civ VII right-clicks for city management; hex-empires currently: "canvas right-click for gameplay" is mentioned in `ui-overlays.md` but unclear. If right-click is already used for movement/attack, the context menu needs a different binding (Alt+click? Middle-click?). User to confirm current binding.

6. **Enemy-unit visibility badge on primary sprite.** When an enemy occupies a hex you can see, should the red tint be obvious, or should it also show a "contested" marker to distinguish from your own units that happen to be facing an enemy? Default: red tint + small "enemy" glyph on the unit sprite's top-left.

7. **Wonder-hex art treatment.** A Wonder may occupy a city-hex OR a separate hex. When it's the city-hex, does the wonder art *replace* the city sprite or *integrate* with it (flag + wonder icon)? Integrate is more diegetic; replace is clearer. Recommendation: replace for iconic wonders (Pyramid, Colosseum) so players learn the landmark; integrate for civic wonders (Oracle). User to confirm.

8. **Idle-unit pulse visibility.** The pulse draws attention to unmoved units; does it render on ALL unmoved-unit hexes every turn, or only when the turn-end nag fires? Default: always render during player's turn at low intensity; the nag uses a sharper pulse + camera pan.

9. **Right-click menu for hexes with NOTHING interactable (empty grassland).** Show a trivial "Hex (q, r) - Grassland - Cancel"? Or suppress? Default: suppress — no menu on empty hexes. Player learns right-click means "something's here".

10. **Tooltip-to-panel click target.** Clicking an entity in the detailed tooltip — does it open that entity's dossier? E.g., clicking the Settler line in the UNITS HERE list → selects Settler + opens BottomBar dossier? Default: yes, and the tooltip dismisses once the dossier opens. Recommend confirming against S-06's dismiss rules.

---

**Summary for the implementer.** Read `TileContents.ts` + `getSelectionCycle` + `hasStackedEntities` first — the engine's already done the hardest work. The UI layer is layered-hex rendering (15-level z-stack within each hex footprint) + tooltip with compact/detailed tiers and cycle indicator + selection cycle that matches the engine's order + right-click context menu for enumeration. The extreme cases (Examples 1-7) are worked; copy those as test fixtures. Phase 2.1 + 3.1 are where this lands; S-01 / S-02 / S-06 are hard dependencies.
