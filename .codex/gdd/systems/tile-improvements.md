# Tile Improvements & Urban/Rural Districts — Civ VII

**Slug:** `tile-improvements`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4.6`

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/managing-your-empire/ — Firaxis Dev Diary #3: Managing Your Empire (primary)
- https://civ7.wiki.fextralife.com/Improvements — Fextralife: Improvements list
- https://civ7.wiki.fextralife.com/Quarters — Fextralife: Quarters
- https://civ7.wiki.fextralife.com/Buildings — Fextralife: Buildings
- https://www.pcgamer.com/games/strategy/civilization-7-review/ — PC Gamer: Civ VII Review
- https://www.civfanatics.com/civ7/civ-vii-gameplay-mechanics/civilization-vii-land-terrain-guide/ — CivFanatics: Land Terrain Guide

**Source conflicts noted:** The dev diary is ambiguous on whether the player picks the improvement *type* on population growth. PC Gamer says "you get to instantly upgrade one tile" (player picks tile). CivFanatics says "improvements are automatically picked based on terrain or resource on the tile." Most plausible reconciliation: player picks the tile, game auto-selects improvement type from terrain+resource. Flagged under Open questions.

The four originally-assigned URLs (Fandom Improvement_(Civ7) / Tile_(Civ7) / Quarter_(Civ7), plus the 2k dev-diary at /managing-empire/) returned 403/404 during research. Substitutes above.

---

## Purpose

Tile Improvements & Urban/Rural Districts governs how a settlement's surrounding tiles are developed into yields. Civ VII eliminates the Worker/Builder unit: every population point gained by a settlement is an improvement "charge" — the player picks a tile within city territory, the game assigns the improvement type from terrain and resource, placement is instant. The same system governs urban development: placing a Building turns a tile urban and auto-creates its District; two civ-unique buildings co-located form a named Quarter with amplified effects.

---

## Entities

- `CityState.population` — (RW) — growth increments; each new point activates an improvement-placement opportunity
- `CityState.tiles[]` — (RW) — tiles in city territory; each tracks improvement, urban/rural, buildings
- `Tile.improvement` — (RW) — current rural improvement (`RuralImprovementId` or null)
- `Tile.isUrban` — (RW) — true once at least one Building is placed
- `Tile.buildings[]` — (RW) — 0–2 entries on urban tiles
- `Tile.quarter` — (RW) — `QuarterId` if buildings form a known Quarter pair, else null
- `Tile.resource` — (R) — resident resource; narrows improvement type
- `Tile.terrain` — (R) — Grassland/Plains/Hills/Mountains/Desert/Tundra/Coast; selects improvement type
- `Tile.feature` — (R) — Woods/Rainforest/Marsh/etc.; can override terrain rules
- `PlayerState.specialists` — (RW) — pop points allocated to urban tiles as specialists
- `GameState.currentAge` — (R) — drives Ageless vs. outdated split at transition

---

## Triggers

- **CITY_POPULATION_GROWTH** (food bucket fills): prompt player to spend the new point — improve a tile (rural) or assign as Specialist to an urban tile.
- Action **PLACE_IMPROVEMENT**: game derives type from `Tile.terrain` + `Tile.resource`; placement instant, zero build time.
- Action **PLACE_BUILDING**: tile converts to urban if rural; prior rural improvement is lost; if second building completes a Quarter pair, `Tile.quarter` is set.
- Action **ASSIGN_SPECIALIST**: pop point goes to an urban tile; specialist adds base Science+Culture, costs Food+Happiness, amplifies that tile's adjacency bonuses.
- **AGE_TRANSITION**: non-Ageless buildings lose effects and adjacency, retain base yields; Ageless buildings, civ-unique improvements, Warehouses, and Wonders retain full effects; standard rural improvements likely persist `[INFERRED]`.

---

## Mechanics

### The No-Worker Shift

Civ V had infinite-use Workers; Civ VI had limited-charge Builders; Civ VII has no improvement unit at all. Improvement placement is a city-level event tied to population growth: city grows, player is prompted, player selects a tile within city territory, improvement appears instantly. The player cannot bank charges — each growth event must be resolved. `[INFERRED — exact UI gating not in sources, but follows from "you gain a Population point that can be allocated."]`

### Rural Tiles and Rural Improvements

A tile is **rural** when it has (or could have) a terrain-matching rural improvement. Improvement type is auto-selected from terrain and resource:

- **Farm** — flat terrain (Grassland, Plains, Tropical); primary Food producer.
- **Mine** — rough terrain (Hills, Mountains) with mineral resources (Gold, Iron, Salt, Silver, Niter, Coal).
- **Quarry** — rough terrain with stone resources (Jade, Marble, Kaolin, Gypsum).
- **Pasture** — livestock resources (Horses, Wool).
- **Plantation** — agricultural luxuries (Cotton, Wine, Tea, Coffee, Sugar, Silk).
- **Camp** — animal resources (Ivory, Camels, Hides, Furs, Truffles).
- **Woodcutter** — vegetated tiles with forest resources (Cocoa, Spices, Rubber). Unlike Civ VI, forest-chopping for Production is absent (PC Gamer).
- **Clay Pit** — wet terrain.
- **Fishing Boat** — coastal/river with aquatic resources (Fish, Pearls, Dyes, Whales).
- **Oil Rig** — Oil resource; Modern age only.

Player picks the *tile*; game selects the *type* from terrain+resource. Players cannot force a Farm onto Hills, or a Mine onto Grassland. Most standard improvements span Antiquity–Modern; Oil Rig is Modern-only; Pasture's eligible resources shift across ages `[INFERRED from Fextralife note on placement restrictions changing]`.

### Urban Tiles, Districts, and Building Slots

A tile becomes **urban** when the first Building is placed on it. There is no pre-built District. Placement rules:

1. Select an unimproved or vacant tile adjacent to the City Center or another urban tile.
2. Place a Building from the current age's unlocked list.
3. Tile converts to urban; any prior rural improvement is lost.
4. A District is established automatically around the building.
5. Each urban tile holds **exactly two Building slots** that accept any building type (no per-slot specialization).

District shape is thus determined by *where* the player places buildings, not by pre-committing to a district type as in Civ VI. Players may cluster for adjacency synergy or spread for per-tile reasons.

### Specialist Assignment

Alternative branch at population-growth: assign the point as a **Specialist** on an existing urban tile. Specialists provide base Science and Culture `[INFERRED — exact values not sourced]`, consume Food and Happiness, and amplify that tile's adjacency bonuses. Trade-off: rural improvement for immediate concrete yields (Food, Production); specialist for compounded Science/Culture growth on high-adjacency urban tiles.

### Quarters — Civ-Unique Building Combinations

A **Quarter** is an upgrade state for an urban tile holding two civ-specific Unique Buildings. Quarters give "substantial benefits and distinct visual flair" beyond the two components; they form automatically when the second qualifying building is placed; they are civilization-locked. The dev diary notes "spreading these buildings across different tiles may yield better results depending on strategy and terrain" — concentrating for the Quarter vs. spreading for separate adjacency is a real strategic trade-off.

Known civ-unique Quarter combinations (Fextralife):

| Quarter | Civilization | Buildings Required |
|---|---|---|
| Acropolis | Greece | Parthenon + Odeon |
| Forum | Rome | Temple of Jupiter + Basilica |
| Necropolis | Egypt | Mastaba + Mortuary Temple |
| Uwaybil K'uh | Maya | Jalaw + K'uh Nah |
| Zaibatsu | Meiji Japan | Ginkō + Jukogyo |
| Industrial Park | America | Steel Mill + Railyard |

(Partial list; additional Quarters exist for other civs.)

### Adjacency Bonuses

Buildings receive adjacency bonuses from surrounding natural features (rivers, mountains, forests) and player-made structures (other buildings, improvements, wonders). Specialists amplify the tile's adjacency bonuses. The dev diary confirms "adjacency bonuses are granted to certain Buildings based on the natural features and player-made structures surrounding them" and that calculations are exposed transparently in the UI. Adjacency values per building are data-driven `[INFERRED]`.

### Civ-Unique Rural Improvements

Each civilization has at least one unique rural improvement, placed through the same population-growth mechanism. All are tagged **Ageless** — they persist across transitions and survive the player's civ change at age boundaries (dev diary: "Unique Buildings & Improvements... retain their effects and continue to provide all bonuses regardless of the Age").

| Improvement | Civilization | Age | Placement |
|---|---|---|---|
| Baray | Khmer | Antiquity | Flat tiles; one per settlement |
| Great Wall | Han China | Antiquity | Linear placement only |
| Hawilt | Aksum | Antiquity | Flat tiles |
| Pairidaeza | Persia | Antiquity | Non-adjacent |
| Potkop | Mississippian | Antiquity | Flat tiles |
| Loi Kalo | Hawai'i | Exploration | Grassland/Tropical |
| Mawaskawe Skote | Shawnee | Exploration | Vegetated |
| Ming Great Wall | Ming China | Exploration | Linear |
| Ortoo | Mongolia | Exploration | Flat |
| Terrace Farm | Inca | Exploration | Rough, adj. mountains |
| Caravanserai | Songhai | Exploration | Desert/Plains |
| Bang | Siam | Modern | Navigable River |
| Kabaka's Lake | Buganda | Modern | `[not sourced]` |
| Obshchina | Russia | Modern | Non-adjacent |
| Staatseisenbahn | Prussia | Modern | Auto-placed with Rail Stations |
| Stepwell | Mughal India | Modern | Flat, non-adjacent |

### Age Transitions and Improvement Persistence

**Persists (Ageless):** civ-unique rural improvements, Unique Buildings (Quarter components), Warehouses (named explicitly), Wonders.

**Becomes outdated:** Standard non-Ageless buildings lose effects and adjacency bonuses, retaining only base yields (dev diary: "may eventually become outdated: they will lose their effects and adjacency bonuses, keeping only their base yields"). Standard rural improvements (Farm, Mine, etc.) likely persist because terrain-tied `[INFERRED]`, though resource relevance can shift under the new age's resource-assignment system.

Net effect at transition: ageless core (warehouses, uniques, wonders) fully functional; standard buildings reduced to placeholders with base yields; rural improvement layer intact.

---

## Formulas

```
// Population growth
food_in_bucket += city_food_yield_per_turn
if food_in_bucket >= food_threshold(population):
    population += 1
    food_in_bucket = 0
    trigger CITY_POPULATION_GROWTH

// Specialist-assigned urban tile yield
urban_tile_yield = sum(building_base_yields)
                 + sum(building_adjacency_bonuses) * (1 + specialist_count * specialist_adjacency_multiplier)

// Non-specialist urban tile yield
urban_tile_yield = sum(building_base_yields) + sum(building_adjacency_bonuses)
```

Where:
- `food_threshold(population)` — scaling growth cost; exact curve not published. `[INFERRED]` standard Civ-series shape.
- `BASE_SPECIALIST_SCIENCE` / `BASE_SPECIALIST_CULTURE` / `BASE_SPECIALIST_FOOD` / `BASE_SPECIALIST_HAPPINESS` — balance-tuned; not published.
- `specialist_adjacency_multiplier` — amplifier; exact value not published.

---

## Interactions

- `systems/population-specialists.md` — this system is the output channel for every population-growth event; every point becomes either a rural improvement or a specialist.
- `systems/settlements.md` — city vs. town distinction governs workable radius and improvement cadence `[INFERRED]`.
- `systems/buildings-wonders.md` — buildings drive the "place a building → district" trigger; ageless/non-ageless flags originate in building data.
- `systems/yields-adjacency.md` — downstream consumer; this system writes tile state that yields read.
- `systems/resources.md` — resources determine rural improvement type; a Pasture "improves" a Horses tile, making the resource exploitable.
- `systems/tech-tree.md` — tech gates some improvements/buildings (Oil Rig → Modern; `[INFERRED]` others follow tech prerequisites).
- `systems/ages.md` — transition triggers the Ageless/outdated split; this system reads `GameState.currentAge`.
- `systems/civilizations.md` — civ data defines unique buildings, unique improvements, Quarter pairings.
- `systems/combat.md` — some unique improvements (Great Wall, Ming Great Wall) have defensive effects `[INFERRED from Civ VII design heritage]`.

---

## Content flowing through this system

- [`content/tile-improvements/`](../content/tile-improvements/) — rural improvement definitions (standard + civ-unique), terrain requirements, age eligibility, resource linkages, Ageless tags.
- [`content/buildings/`](../content/buildings/) — building definitions: yield values, adjacency rules, Ageless tags, Quarter pairings.
- [`content/civilizations/`](../content/civilizations/) — civ-unique buildings/improvements authored here.
- [`content/resources/`](../content/resources/) — resource→improvement-type mapping.
- [`content/terrains-features/`](../content/terrains-features/) — terrain tags (Flat, Rough, Vegetated, Wet) driving improvement eligibility.

---

## VII-specific (how this differs from VI/V)

- **No Workers/Builders.** VII has no improvement unit at all. Improvement is a city-level event, not a unit-action.
- **Population-gated improvement speed.** VI let players rush-build multiple Builders for burst city improvement; VII strictly one-per-population-growth-event.
- **No forest-chop.** VI Builders could chop Woods/Rainforest for a one-time Production burst; VII removes this (PC Gamer review).
- **Improvement type is terrain-automatic.** VI players explicitly chose improvement type; VII terrain+resource dictate it, player picks only the tile.
- **Districts emerge from building placement.** VI districts were a full pre-build action at cost; VII districts form automatically when a building is placed.
- **Two flexible slots per urban tile.** VI districts were highly specialized (a Campus only held Campus buildings); VII slots accept any building type.
- **Quarters reward two-building civ-unique combos.** VI had no equivalent; VII Quarters give named bonuses for pairing unique buildings on one tile.
- **Ageless tag replaces implicit era obsolescence.** VI buildings weakened implicitly across eras; VII makes it explicit — non-ageless loses effects+adjacency on transition, ageless retains all.
- **Specialists amplify adjacency.** VI specialists gave flat per-type yields; VII specialists amplify the urban tile's adjacency bonuses, coupling placement strategy to specialist assignment.

---

## UI requirements

- **Improvement placement prompt** — opens on CITY_POPULATION_GROWTH. Highlights valid tiles; player picks one, improvement appears instantly. Offers "assign as Specialist" as an alternative path.
- **Tile tooltip (compact)** — terrain, feature, current improvement/buildings, summed yields, adjacency breakdown.
- **Tile tooltip (detailed, Alt-held)** — full adjacency source breakdown per building.
- **Urban/rural indicator** — visual distinction between rural (improvement icon) and urban (building icons).
- **Building placement UI** — shows the tile's two slots, the current age's unlocked buildings, and projected adjacency contribution of each candidate.
- **Quarter formation notification** — fires when the second unique building completes a Quarter pairing.
- **Age-transition summary** — shows which buildings became outdated vs. which retained full effects (Ageless).
- **Specialist assignment overlay** — from the alternate prompt branch; shows existing urban tiles with specialist counts and projected yield/cost impact.

---

## Edge cases

- Population grows but city has no unimproved tiles in radius → `[INFERRED]` player must assign Specialist or game auto-assigns.
- Player places a building on a tile with a rural improvement → tile converts to urban, rural improvement is lost. `[INFERRED — urban/rural exclusive]`
- Two players play the same civ (e.g., two Romes) and both assemble the Forum pairing → both form the Forum Quarter independently.
- Civ-unique improvement on tile when player transitions civs at age boundary → improvement is Ageless, stays and retains effects.
- Standard building in a Quarter becomes outdated while its partner is Ageless → `[INFERRED]` non-ageless loses effects; Quarter-bonus survival with one non-functional component is unconfirmed.
- Oil tile exists in Antiquity/Exploration → `[INFERRED]` unimproved until Modern unlocks Oil Rig.
- Staatseisenbahn "auto-placed with Rail Stations" → `[INFERRED]` secondary auto-placement from building trigger; may not consume a pop-growth charge.
- Outdated building still occupies its slot after transition → `[INFERRED]` yes, blocking new placement until demolished. Demolition mechanics not sourced.
- Culture-driven border growth adds new tiles → `[INFERRED]` new tiles improvable on next growth event, not auto-improved on claim.
- Player deliberately spreads unique buildings rather than pairing → no penalty; dev diary calls this a legitimate strategic choice.

---

## Open questions

- Does the player also choose the improvement *type* on growth, or only the tile? Dev diary ambiguous; PC Gamer and CivFanatics describe slightly different stages. Needs in-game confirmation.
- `food_threshold(population)` exact curve — not published.
- Specialist base yield values (Science, Culture, Food cost, Happiness cost) — not numerically sourced.
- Specialist adjacency multiplier — exact amplifier not published.
- Quarter persistence at age transition when one component goes non-ageless — dev diary silent.
- Manual building demolition to free a slot after transition — dev diary silent.
- Total count of unique improvements — one Fextralife page shows 21, another 15–16; discrepancy unresolved.
- City-State improvements (Emporium, Institute, etc., per Fextralife) — appear tied to Independent-Powers suzerainty; relationship to this system unclear.
- "Linear placement only" (Great Wall, Ming Great Wall) — exact meaning not spelled out (contiguous line? extend from existing segment?).

---

## Mapping to hex-empires

**Status tally:** 0 MATCH / 3 CLOSE / 3 DIVERGED / 4 MISSING / 1 EXTRA
**Audit:** [.codex/gdd/audits/tile-improvements.md](../audits/tile-improvements.md)
**Highest-severity finding:** F-01 — Worker/Builder unit triggers improvements (DIVERGED, HIGH)
**Convergence status:** Divergent — 3 finding(s) require(s) architectural refactor

_(Full details in audit file. 11 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

The four originally-assigned URLs (Fandom Improvement_(Civ7) / Tile_(Civ7) / Quarter_(Civ7), and civilization.2k.com /managing-empire/) all returned 403/404. Substitutes — Firaxis Dev Diary #3 at the sibling slug `managing-your-empire`, Fextralife Improvements/Quarters/Buildings, PC Gamer review, and CivFanatics land terrain guide — carried the load. Specific yield numbers (Farm: +X Food) are not in any accessible source; the CivFanatics terrain guide notes its yield table is image-only. Confidence is `medium` rather than `high` because the central player-interaction mechanic (player picks tile; game auto-selects improvement type) reconciles two slightly divergent source descriptions.
