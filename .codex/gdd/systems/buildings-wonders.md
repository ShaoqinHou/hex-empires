# Buildings & Wonders — Civ VII

**Slug:** `buildings-wonders`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/managing-your-empire/ — Firaxis Dev Diary #3: Managing Your Empire (primary, authoritative)
- https://civ7.wiki.fextralife.com/Buildings — Fextralife: Buildings (Civ7)
- https://civ7.wiki.fextralife.com/Wonders — Fextralife: Wonders (Civ7)
- https://civ7.wiki.fextralife.com/Quarters — Fextralife: Quarters (Civ7)

**Source conflicts noted:** Fextralife Quarters page states quarters form from "two Ageless or same-Age Buildings," implying any two compliant buildings can form a quarter. Firaxis Dev Diary #3 only explicitly names "Unique Quarters" (two civ-specific unique buildings on the same tile). Flagged as `[source-conflict]` in relevant sections.

**Note on Fandom URLs:** All four mandated Fandom wiki URLs returned HTTP 403. Fextralife was substituted.

---

## Purpose

The Buildings & Wonders system gives players a tangible way to express their empire's identity and strategic focus at the city level. Where Civ VI used fixed-purpose districts (pre-placing a Campus before building a Library), Civ VII collapses that two-step into a single flexible urban tile model: any building can go into any urban slot, with districts established automatically on placement. This removes the one-time irreversible district decision and trades it for ongoing per-age construction choices. Wonders are the high-stakes variant — costly, tile-occupying, globally unique structures that reward the first builder. Quarters, formed by placing two qualifying buildings on the same tile, are the emergent bonus layer on top of construction choices, replacing Civ VI's theming bonus with a spatial-arrangement incentive.

---

## Entities

- `CityState.urbanTiles` — (RW) — set of urban tiles inside city borders; each holds two building slots
- `CityState.urbanTiles[i].buildings[0..1]` — (RW) — the buildings in a given tile's slots
- `CityState.urbanTiles[i].quarter` — (RW) — quarter formed when both slots filled with qualifying buildings; null otherwise
- `CityState.yields` — (RW) — recalculated each turn from buildings, adjacency bonuses, quarter bonuses
- `CityState.specialists` — (RW) — population assigned to urban tiles; amplify tile adjacency bonuses
- `GameState.builtWonders` — (RW) — set of wonder IDs completed by any player; enforces once-per-game lock
- `PlayerState.wondersOwned` — (RW) — wonders this player has completed; source of adjacency bonuses to surroundings
- `TileState.improvement` — (R) — read by Warehouse buildings to compute improvement-count bonuses
- `GameState.currentAge` — (R) — determines which buildings are age-valid vs obsolete after transition

---

## Triggers

- On **CONSTRUCT_BUILDING** — player queues a building for production; placed into a specific urban tile slot on completion; quarter formation evaluated immediately after placement
- On **CONSTRUCT_WONDER** — player queues a wonder; if another player completes it first, `GameState.builtWonders` blocks the queue item and cancels it; player receives rival-construction notification
- On **END_TURN** — yields recalculated including base building yields, adjacency bonuses (specialist-amplified), and warehouse improvement-count bonuses
- On **AGE_TRANSITION** — non-ageless buildings become obsolete: lose effect yields and adjacency bonuses, retaining only base tile yield; ageless buildings (Warehouses, Unique Buildings, Wonders) are unaffected; OVERBUILD becomes available for obsolete slots
- On **OVERBUILD** — player constructs a new building into an obsolete slot, overwriting the old; slot resets to fresh state; quarter on that tile re-evaluated

---

## Mechanics

### Urban tiles and building slots

Every city has a set of urban tiles. Each urban tile holds exactly **two building slots**. "Districts are automatically established when you place a Building down." New districts must be "adjacent to the City Center and expand outward." Any building type can fill any slot — no pre-assignment to a district specialty.

How many urban tiles a city can contain at full size is not stated in available sources. [INFERRED] Community observation suggests 6–8 urban tiles at full development, scaling with population or territory.

### Building categories: standard vs unique

**Standard buildings** — available to any civ meeting the research prerequisite. [INFERRED] Unlock via tech or civic trees; provide base yields and adjacency conditions.

**Unique buildings** — civ-specific, approximately two per civ, constructable only by that civilization. Examples: Egypt (Mastaba + Mortuary Temple), Greece (Parthenon + Odeon), Rome (Temple of Jupiter + Basilica), Majapahit (Candi Bentar + Meru). They "synergize well with the Civilization they are associated with."

### Ageless buildings

Three building types are tagged **Ageless** and persist fully across age transitions:

1. **Warehouse buildings** — "provide bonuses based on the number of similar Improvements in a settlement." Example: Granary "boosts Food production from Farms, Plantations, and Pastures." [INFERRED] Bonus scales with improvement count within the settlement.

2. **Unique buildings** — all civ-specific unique buildings are ageless. "Unique Buildings & Improvements... retain their effects and continue to provide all bonuses regardless of the Age."

3. **Wonders** — all wonders are ageless. "Wonders retain their effects and continue to provide all bonuses regardless of the Age. They are tagged in the game as Ageless."

One explicitly confirmed ageless standard building in Fextralife's list: **Meru** (Majapahit), tagged "Ageless." Full enumeration of all ageless non-warehouse standard buildings is unavailable in sources.

### Non-ageless buildings and obsolescence

At age transition, standard non-ageless buildings become outdated: "they will lose their effects and adjacency bonuses, keeping only their base yields, prompting opportunities to overbuild and evolve your empire to better suit the new Age's requirements and resources."

Slots are not auto-freed. The player uses **overbuilding** to queue a new building into the occupied slot; the new building overwrites on completion. This is framed by Firaxis as a positive opportunity — age transitions become a time to strategically re-evaluate and rebuild city infrastructure rather than a pure loss event.

### Quarter formation

A Quarter forms when an urban tile has both slots filled with qualifying buildings. Qualifying condition (Fextralife Quarters): "two Ageless or same-Age Buildings" — both must be ageless OR both must belong to the same age.

**Unique Quarters** — formed when two civ-specific unique buildings (the civ's own pair) share a tile. Per Dev Diary: "Unique Quarters are formed when two civ-specific Unique Buildings share the same tile. They offer substantial benefits and distinct visual flair that reflects your civilization's culture and progress." 16 named unique quarters in the Fextralife list, including:
- Acropolis (Greece — Parthenon + Odeon)
- Forum (Rome — Temple of Jupiter + Basilica)
- Zaibatsu (Meiji Japan — Ginko + Jukogyo)
- Zocalo (Mexico — Catedral + Portal de Mercaderes)
- Plus 12 others

**Generic quarters** `[source-conflict]` — Fextralife Quarters says "same-Age Buildings" (implying any standard building pair of the same age can form a quarter), leading to "an enormous amount of potential combinations, each giving a different bonus to the District." The Firaxis Dev Diary only mentions unique quarters explicitly. This distinction is implementation-critical: if generic quarters exist, the system requires a full combination-bonus table; if only unique quarters exist, each civ has exactly one possible quarter.

Exact bonus values per quarter are not enumerated in sources.

### Adjacency bonuses

Adjacency bonuses are "granted to certain Buildings based on the natural features and player-made structures surrounding them." Specialists on a tile amplify adjacency bonuses: "Allocating Population to Urban tiles creates Specialists, who provide base Science and Culture yields while consuming Food and Happiness. They also amplify adjacency bonuses of their tile, making them vital for maximizing your City's potential."

The UI shows exact adjacency calculations for informed placement decisions.

Wonders add a special adjacency layer: "Each Wonder occupies a full tile and has a powerful effect, and provides adjacency bonuses to every surrounding Building." Well-placed wonders therefore act as spatial multipliers for the surrounding district.

### Wonders

**Once-per-game global lock** — "once a Wonder is built by a Civilization, no others can build it from that point on during that game."

**Tile occupation** — "Wonders are among the most powerful things you can construct in Civ VII. Each Wonder occupies a full tile." [INFERRED] Wonder tiles are distinct from the two-slot urban building tiles.

**Ageless** — all wonders persist across age transitions with full effects retained.

**Terrain placement requirements** — each wonder has specific terrain preconditions. Sample from Fextralife wonder list:
- Pyramids: Desert adjacent to a Navigable River
- Oracle: rough terrain
- Angkor Wat: river adjacency
- Weiyang Palace: Grassland
- Sanchi Stupa: Plains

**Adjacency bonus to neighbors** — every wonder "provides adjacency bonuses to every surrounding Building," making wonder placement a spatial multiplier for the surrounding district.

**Rival warning** — players receive notification "if a Wonder you're building is already being constructed by another player."

**Roster** — 11 constructable wonders per age × 3 ages = 33 constructable wonders total. Plus 13 Natural Wonders pre-placed on the map (not constructable).

Production costs not published in accessible sources. [INFERRED] Per Civ series convention, lower difficulty settings likely include AI production penalties that favor human wonder completion speed.

### Towns vs. cities

**Cities** have a Production Menu; players queue buildings, units, wonders using accumulated Production output.

**Towns** do not have a Production Menu — "they automatically convert their Production into Gold." Towns cannot queue buildings or wonders. They gain **Focus specializations** at population thresholds (Farming Town, Mining Town, Trade Outpost, Fort Town, Religious Site, Hub Town, Urban Center, Factory Town), which grant yields without construction queues.

Towns can be upgraded to full Cities for Gold, unlocking the complete building/wonder system. The upgrade decision (spend Gold now vs remain an automatic-Gold generator) is a key "Tall vs Wide" tradeoff.

---

## Formulas

```
// Quarter formation rule
quarterFormed(tile) =
  tile.buildings.length == 2
  AND (allAgeless(tile.buildings) OR sameAge(tile.buildings))

// Warehouse bonus (Granary example)
granaryFoodBonus =
  count(settlement.improvements, type IN {Farm, Plantation, Pasture})
  * GRANARY_BONUS_PER_IMPROVEMENT

// Specialist adjacency amplification
effectiveAdjacencyBonus(tile) =
  baseAdjacencyBonus(tile)
  * (1 + SPECIALIST_AMPLIFIER * tile.specialistCount)

// Wonder adjacency contribution to a neighboring building
wonderNeighborBonus(building) =
  WONDER_ADJACENCY_VALUE  if building.tile is adjacent to wonder tile
  0                       otherwise

// Building effective yield after age transition
building.yield =
  ageless(building) ? building.fullYield
                    : building.baseTileYield
```

Where:
- `GRANARY_BONUS_PER_IMPROVEMENT` — not sourced; [INFERRED] likely +1 Food per qualifying improvement, consistent with series conventions
- `SPECIALIST_AMPLIFIER` — not sourced; described as "significantly" amplifying adjacency `[INFERRED]`
- `WONDER_ADJACENCY_VALUE` — per-wonder, not published
- `baseTileYield` — raw terrain tile yield, stripped of all building-sourced bonuses
- `allAgeless(buildings)` — true when both buildings are tagged Ageless
- `sameAge(buildings)` — true when both buildings belong to the same age

---

## Interactions

- `systems/ages.md` — age transition triggers building obsolescence; ageless tagging is the carry-forward mechanism described there
- `systems/settlements.md` — city vs town distinction gates building-queue access; population growth drives urban tile expansion
- `systems/population-specialists.md` — specialists live on urban tiles and amplify building adjacency bonuses; both systems share the urban tile as their core unit
- `systems/yields-adjacency.md` — buildings are the primary source of non-tile yields; this system produces yield deltas that yields-adjacency aggregates per-city
- `systems/tile-improvements.md` — warehouse buildings read improvement counts from the settlement; rural improvement placement feeds urban warehouse yields
- `systems/tech-tree.md` — standard buildings are gated behind tech tree research; tech unlocks add building options to the production menu
- `systems/civic-tree.md` — some buildings (cultural, governance, religious) may be gated behind civic research rather than tech `[INFERRED]`
- `systems/civilizations.md` — unique buildings and unique quarters are civ-specific; civ chosen at age transition determines which unique buildings are constructable
- `systems/victory-paths.md` — building yields (Culture, Science, Gold, Production) feed victory path resource pools; wonders often satisfy legacy milestone conditions directly

---

## Content flowing through this system

- [`content/buildings/`](../content/buildings/) — all buildings (standard + unique), with yield, age, ageless tag, prerequisites, civ association
- [`content/wonders/`](../content/wonders/) — all constructable wonders per age (11 × 3 = 33 total), with placement requirements, yields, adjacency bonus grants

---

## VII-specific (how this differs from VI/V)

- **No pre-placed districts** — Civ VI required placing a district tile (Campus, Harbor) before any buildings could be constructed in it; an irreversible spatial commitment. Civ VII eliminates this: buildings establish their own district automatically on placement.
- **Uniform two-slot urban tile** — Civ VI district types had varying building caps (Campus: 3 slots; Commercial Hub: 3 slots). VII standardizes every urban tile to exactly 2 slots with no type restriction.
- **Quarters replace Theming Bonuses** — Civ VI rewarded collecting three same-category great works in a single building. VII replaces this with quarter formation from two co-located buildings, applying the spatial flavor mechanic to construction choices instead of great work curation.
- **Ageless buildings are a new concept** — no equivalent in Civ VI (no ages existed). The ageless tag is entirely new to VII.
- **Wonders provide adjacency bonuses to surrounding buildings** — in Civ VI, wonders had direct effects but did not generally propagate adjacency yields outward to neighboring district buildings; VII makes this explicit.
- **Automated tile improvements remove builder micro** — Civ VI had Builder units manually constructing improvements; VII automates via population growth. Warehouse buildings read an auto-produced improvement landscape rather than a manually-controlled one.
- **Town/city production split** — Civ V/VI did not formally split settlements into production-enabled Cities and automatic-Gold Towns; all settlements had production queues. VII makes the town-to-city upgrade an explicit economic decision.

---

## UI requirements

- **City Production Queue panel** — lists available buildings, wonders, units for construction; filters to age-valid and prerequisite-met items; shows turns-to-complete at current output; marks already-built buildings and globally-locked wonders
- **Urban tile detail view** — visual layout of city's urban tiles; shows each tile's two slots (filled/empty), quarter name if formed, specialist count; accessible from city panel
- **Adjacency bonus breakdown tooltip** — per-building yield breakdown showing each adjacency source (terrain, improvement, wonder proximity, specialist amplifier)
- **Obsolescence highlight** — at age transition, non-ageless buildings visually flagged as outdated; overbuilding opportunities surfaced
- **Wonder race notification** — HUD toast when a rival begins constructing a wonder the player is also building; shows rival name and estimated completion if estimable `[INFERRED]`
- **Quarter formation celebration** — visual fanfare and bonus-reveal overlay when a quarter forms; shows quarter name and bonus
- **Ageless badge** — ageless buildings and wonders display a persistent icon in city view so players know what survives age transitions

---

## Edge cases

- What if a rival completes a wonder while the player has it mid-queue? Construction is cancelled (production lost `[INFERRED]`); the player may not receive a warning if the rival started and finished within one turn cycle.
- What if both slots on a tile contain obsolete buildings after age transition? The tile yields only base tile yield; the quarter (if any) dissolves. Two independent overbuilding opportunities remain.
- What if the player transitions to a new civ whose unique buildings differ from the old civ's? Old civ's unique buildings remain (ageless) and the unique quarter persists. The player cannot build more old-civ unique buildings but can build the new civ's unique buildings in new or overbuilt slots.
- What if the required terrain tile for a wonder is already occupied by an improvement? [INFERRED] Placing the wonder likely removes the improvement; whether this is automatic or explicit is unclear.
- What if a town is upgraded to a city — does it immediately gain all researched building options? [INFERRED] Yes; upgrade grants the Production Menu and access to all currently-researched buildings.
- What if a specialist is removed from a tile? Adjacency amplification from that specialist is immediately lost; building yields drop. The buildings themselves remain.
- What if two players complete the same wonder on the same turn? [INFERRED] Turn-processing order determines the winner; second player's construction is cancelled.
- What if a natural wonder is inside a city's borders — does it grant adjacency bonuses to surrounding buildings? [INFERRED] Likely yes, consistent with the stated wonder mechanic; but natural wonders do not trigger the once-per-game lock.
- What if a civ has only one unique building placed on a tile (second not yet built) when an age transition fires? No quarter exists; the one unique building remains ageless. The quarter cannot form retroactively.

---

## Open questions

- Exact maximum urban tile count per fully-developed city — not stated in Dev Diary #3 or Fextralife; community suggests 6–8; no citable source.
- Whether standard (non-unique) buildings can form generic quarters — `[source-conflict]`: Fextralife says "same-Age Buildings," Dev Diary only describes unique quarters. Implementation-critical.
- Full list of ageless standard buildings beyond Warehouse-type — only Meru (Majapahit) explicitly confirmed; no complete enumeration in sources.
- Production costs for buildings and wonders — not available in any source consulted.
- Whether difficulty settings affect wonder production speed for human vs AI players — not confirmed; `[INFERRED]` yes per series convention.
- What happens to mid-queue wonder production when a rival finishes first — cancellation mechanics not described in Dev Diary.
- Whether overbuilding accepts only current-age buildings or any age-valid building — not stated; `[INFERRED]` current-age only.
- Exact bonus values for quarters — described as "substantial" but no numeric values published.
- Maximum number of wonders a single city can hold — not stated; `[INFERRED]` no hard limit beyond available tile count.
- All four Fandom wiki URLs returned HTTP 403 during research — content unavailable; Fextralife substituted.

---

## Mapping to hex-empires

**Status tally:** 9 MATCH / 2 CLOSE / 0 DIVERGED / 1 MISSING / 0 EXTRA
**Audit:** [.codex/gdd/audits/buildings-wonders.md](../audits/buildings-wonders.md)
**Highest-severity finding:** F-03 — Wonder geography validation is enforced through the placement validator, but the system wrapper remains pass-through (CLOSE, HIGH)
**Convergence status:** Partial — 1 VII mechanic(s) absent

_(Full details in audit file. 12 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

All four mandated Fandom wiki URLs (Building, Wonder, Quarter, List of wonders in Civ7) returned HTTP 403 and could not be accessed. Fextralife wiki pages (Buildings, Wonders, Quarters) and Firaxis Dev Diary #3 were used as primary sources. Firaxis Dev Diary #3 is authoritative for design intent; Fextralife pages provide the building/wonder lists. Key gaps: numeric constants (production costs, exact adjacency values, quarter bonuses) are unavailable in any accessible source. Most significant conceptual gap: whether generic quarters (non-unique same-age building pairs) exist as a mechanic — this is `[source-conflict]` and directly changes the implementation scope of the quarter system.

---

<!-- END OF TEMPLATE — do not add sections after this line. -->
