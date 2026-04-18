# Map & Terrain — Civ VII

**Slug:** `map-terrain`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

- https://civilization.2k.com/civ-vii/from-the-devs/map-generation/ — Firaxis: Improved Map Generation
- https://www.well-of-souls.com/civ/civ7_terrain.html — Well of Souls Analyst
- https://civfanatics.com/civ7/civ-vii-gameplay-mechanics/civilization-vii-land-terrain-guide/ — CivFanatics
- https://blog.playerauctions.com/others/all-civilization-7-terrain-types-explained/ — PlayerAuctions
- https://comradekaine.com/civilization7/biomes-the-new-dynamics-of-terrain-and-rivers-in-civilization-vii/ — ComradeKaine
- https://game8.co/games/Civ-7/archives/500433 — Game8: Navigate Rivers
- https://www.pcgamer.com/games/strategy/civilization-7-guide-to-unexplained-systems-faq/ — PC Gamer
- https://www.thegamer.com/civilization-7-vii-distant-lands-explained/ — TheGamer: Distant Lands
- https://gamerant.com/civilization-vii-civ-7-map-types-continents-plus-archipelago-fractal/ — GameRant: Map Types
- https://gameranx.com/features/id/529321/article/civilization-7-all-natural-wonders-and-bonuses/ — Gameranx: Natural Wonders
- https://primagames.com/tips/what-does-fresh-water-do-in-civilization-7 — Prima Games
- https://support.civilization.com/hc/en-us/articles/46192509687443 — Firaxis Patch Notes 1.3.0

**Source conflicts noted:** Map size tile counts reflect post-launch additions (Large/Huge added in patch 1.2.1). Ocean attrition damage 11-20 vs 10-20. Defense bonuses (+3 Rough, +2 Vegetated) cross-source-confirmed but no datamine accessible — tagged `[INFERRED-confirmed]`. Fandom Civ7 terrain pages 403'd throughout.

---

## Purpose

Defines the physical substrate on which every other system operates: city placement, unit movement, combat, yields, and — uniquely in VII — the Homelands/Distant Lands partition that becomes reachable only in Exploration Age. Key VII innovations: biome-based yield system, navigable rivers naval units traverse, and the Homelands/Distant Lands structure enforcing a geographic act structure mirroring Ages.

---

## Entities

- `Tile.biome` — (R) — `desert | grassland | plains | tropical | tundra | marine`
- `Tile.modifier` — (R) — `flat | rough | vegetated | wet`
- `Tile.feature` — (R) — overlay: river, navigableRiver, floodplain, oasis, marsh, rainforest, taiga, forest, bog, reef, volcano, naturalWonder, etc.
- `Tile.improvement` — (RW) — auto-placed by biome/resource
- `Tile.resource` — (R)
- `Tile.hasFreshWater` — (R) — adjacent navigable river/lake, or on minor river
- `Tile.hasRoad` — (RW) — overrides movement to 1
- `Tile.explored` — (RW) — per-player visibility
- `Tile.isDistantLands` — (R) — set at world gen
- `Tile.isNaturalWonder` — (R) — 1-4 tiles
- `GameState.mapSize` — (R) — `tiny | small | standard | large | huge`
- `GameState.mapType` — (R) — `continentsPlus | continents | archipelago | fractal | shuffle | terraIncognita | pangea | pangeaAndIslands | continentsAndIslands`

---

## Triggers

- **World generation** — terrain, biomes, features, resources, natural wonders, Homelands/Distant Lands split from seed
- **Unit MOVE** — movement cost logic fires
- **Crossing minor river** — all remaining MP depleted
- **Crossing navigable river (embark)** — all MP depleted unless naval-at-sea or bridge
- **Combat resolution** — terrain defense bonus to defender
- **Age transition to Exploration** — Distant Lands becomes reachable (Deep Ocean attrition removable via Cartography → Shipbuilding)
- **FOUND_CITY** — fresh water evaluated; +5/-5 happiness
- **Improvement placement** — auto-placed by biome + modifier + resource
- **Flood event** `[INFERRED]` — floodplain yield bonus

---

## Mechanics

### Biome System

Six biomes, each with 4 modifier variants (Flat, Rough, Vegetated, Wet). Replaces per-tile yields with structured regional approach. All biomes viable starters.

| Biome | Flat | Rough | Vegetated | Wet |
|---|---|---|---|---|
| Grassland | 3 Food | 1F 2P | 1F 2P (Forest) | 2F 2P (Marsh) |
| Plains | 2F 1P | 3P | 3P (Savanna Woodland) | 1F 3P (Watering Hole) |
| Desert | 2F 1P | 3P | 2P 1G (Sagebrush Steppe) | 1F 2P 1G (Oasis) |
| Tropical | 3F | 1F 2P | 2P 1Sci (Rainforest) | 1F 2P 1Sci (Mangrove) |
| Tundra | 3F | 3P | 2P 1Cul (Taiga) | 1F 2P 1Cul (Tundra Bog) |
| Marine | Lake/Coast | Ocean | — | — |

**Tropical** is VII-new, separating temperate forest from equatorial rainforest. **Snow not a separate terrain** — subsumed into Tundra visually.

### Movement Rules (Binary)

**1 MP:** Flat (any biome), any tile with road/rail
**Deplete all remaining MP:** Rough (Hills), Vegetated (Forest/Rainforest/Taiga/etc.), Wet (Marsh/Bog/Oasis/etc.), crossing minor river, embarking onto navigable river

**Exceptions:** Scouts ignore most difficult terrain (not minor rivers); promotions bypass certain types; bridges → 1 MP crossing `[INFERRED]`; roads override terrain.

**Mountains impassable.** Cliffs block passage, permit ranged attacks.

### Water Terrain

| Type | Movement | Damage | Yield |
|---|---|---|---|
| Coast | Free for naval | None | Workable (yield unconfirmed) |
| Lake | Free `[INFERRED]` | None | Grants fresh water adjacent |
| Ocean (Deep) | Costs all MP pre-tech | 11-20 HP/turn (Expl Age) | 1 Food, 3 Gold (Modern only) |

Ocean workable only Modern. Attrition removed progressively: Cartography (non-military), Shipbuilding + mastery (military), full path (no damage).

### Navigable Rivers — VII Innovation

**Minor rivers:**
- Tile-edge features between land tiles
- Cross costs all MP
- Fresh water only if settled on river tile
- -5 CS defending on minor river tile
- Land buildings only

**Navigable rivers:**
- Wide water tiles, traversable by naval units including Treasure Fleets
- Connect inland water to coast
- No tech required for naval passage
- Land must embark (all MP; bridges remove cost)
- Adjacent settlements: **+5 Happiness (fresh water)** + river base 1 Food, 1 Gold
- Support BOTH coastal AND land buildings — inland navigable-river settlements near-equal to coastal
- Can be raided by enemy naval — new threat vector

### Defense Bonuses

Terrain CS modifiers (absolute, not %):

| Modifier | CS |
|---|---|
| Rough (Hills) | +3 |
| Vegetated | +2 |
| Flat | 0 |
| Wet | 0 `[INFERRED]` |
| Minor river tile (defender on) | -5 |

### Fresh Water

+5 happiness (present) / -5 happiness (absent) per settlement. Sources:
1. Adjacent to navigable river
2. Adjacent to lake
3. Settled directly ON minor river tile
4. Adjacent to fresh-water natural wonders (Gullfoss, Iguazu Falls)

Strategic: fresh water +5 cancels over-cap -5 penalty exactly, effectively allowing one extra settlement.

### Homelands / Distant Lands

**Homelands:** Antiquity starting region. All civs start here. Playable from turn 1.

**Distant Lands:** Second continental zone. `isDistantLands = true` on all tiles. Fog-of-war + Deep Ocean blocks Antiquity. Accessible in Exploration after ocean-crossing tech. Contains ~5 exclusive luxury/strategic resources (chocolate, tea, spices + 2 unknown) feeding Exploration Economic Victory (Treasure Fleets). Exploration Military Legacy (Non Sufficit Orbis) requires 12 points earned exclusively here. ~25% of games have island chains bridging before Exploration.

**Map generation (patch 1.2.5):** Voronoi diagram-based:
1. Distribute seed points at low resolution
2. Create Voronoi cells
3. Select starting cells as tectonic plates
4. Grow plates per configurable rules
5. Increase resolution with more points
6. Grow primary landmasses along plate boundaries
7. Add islands, erode coastlines, place mountains/volcanoes
8. Overlay hex grid; assign tile types and resources

Homelands + Distant Lands always separated by Deep Ocean zone.

### Map Types

| Type | Description |
|---|---|
| Continents Plus | Two landmasses + islands. Post-1.2.5 singleplayer default |
| Continents | Minimal islands. Cleaner multiplayer |
| Archipelago | 4-5 medium + many islands. Favors Distant Lands |
| Fractal | Procedural blend |
| Shuffle | L/R each get random type |
| Terra Incognita | Homelands = Continents; Distant = random |
| Continents and Islands | New in 1.2.5 |
| Pangea and Islands | New in 1.2.5 |

### Map Sizes (post-1.2.1)

| Size | Dimensions | Tiles | Default Players |
|---|---|---|---|
| Tiny | 60x38 | ~2,280 | 4 |
| Small | 74x46 | ~3,404 | 6 |
| Standard | 84x54 | ~4,536 | 8 |
| Large | 96x60 | ~5,760 | `[INFERRED]` |
| Huge | 106x66 | ~6,996 | `[INFERRED]` |

Natural Wonders scale: 3 Tiny → 7 Huge (+1 per tier).

### Natural Wonders

12 placed at world gen. Occupy fixed tiles. Scale yields across ages (+50% Expl, +100% Modern vs Antiquity).

| Wonder | Antiquity bonuses |
|---|---|
| Grand Canyon | +2 Cul, +4 Hap/Age; +2 Sci on flat tiles in settlement |
| Great Barrier Reef | +2 F, H, Sci/Age; +2 Sci adjacent marine |
| Gullfoss | +6 F/Age; +1 Cul+P on adjacent rural; Fresh Water |
| Hoerikwaggo | +2 Cul, +4 F/Age; +2 Hap adj Quarters |
| Iguazu Falls | +2 Hap, +4 F/Age; +2 P adj Quarters; Fresh Water |
| Mt Kilimanjaro | +2 P, +4 Hap/Age; Volcano |
| Redwood Forest | +2 F, Hap, P/Age; +1 Cul+Sci on Vegetated in settlement |
| Thera | +2 Hap, +4 Cul/Age; Volcano |
| Torres del Paine | +2 F, +4 Hap/Age; nearby units permanently ignore rough |
| Uluru | +6 Hap/Age; +2 Cul on desert in settlement |
| Valley of Flowers | +2 F, G, Hap/Age; +10 trade route range |
| Zhangjiajie | +2 Hap, +4 P/Age; +2 Cul on rough in settlement |

First civ to settle/integrate wonder gets bonus. No improvements allowed on wonder tile.

---

## Formulas

```
movementCost(tile, unit):
  if tile.hasRoad: return 1
  if tile.modifier == flat: return 1
  if tile.modifier in [rough, vegetated, wet]: return ALL_REMAINING_MOVEMENT
  if tile.isMountain: return IMPASSABLE
  if crossingMinorRiver: return ALL_REMAINING_MOVEMENT
  return 1

defenseBonus(tile, role):
  if tile.modifier == rough: return +3
  if tile.modifier == vegetated: return +2
  if tile.feature == minorRiver AND role == defender: return -5
  return 0

freshWaterBonus(settlement):
  return settlement.hasFreshWater ? +5 : -5

oceanAttrition(unit):
  if !unit.canCrossOcean AND tile.type == ocean:
    return damage in [11, 20] HP/turn

wonderYield(wonder, age):
  base = wonder.antiquityYield
  return age == modern ? base * 2.0
       : age == exploration ? base * 1.5
       : base

naturalWonderCount(mapSize):
  offsets = { tiny:0, small:1, standard:2, large:3, huge:4 }
  return 3 + offsets[mapSize]
```

---

## Interactions

- `systems/ages.md` — Homelands/Distant Lands split is physical expression of age structure
- `systems/combat.md` — terrain defense bonuses read by combat resolution
- `systems/settlements.md` — fresh water drives +5/-5 happiness baseline
- `systems/yields-adjacency.md` — biome yields feed per-city aggregation
- `systems/resources.md` — resources spawn on biome/modifier combinations; Distant Lands exclusive
- `systems/trade-routes.md` — Treasure Fleets use navigable rivers + ocean lanes
- `systems/tech-tree.md` — ocean-crossing gated by Shipbuilding path
- `systems/commanders.md` — Amphibious skill removes embark penalty
- `systems/victory-paths.md` — Expl Economic + Military paths require Distant Lands

---

## Content flowing through this system

- [`content/terrains-features/`](../content/terrains-features/) — all biomes, modifiers, features
- [`content/resources/`](../content/resources/) — resource-biome mapping; Distant Lands tags
- [`content/wonders/`](../content/wonders/) — 12 natural wonders (map-placed)

---

## VII-specific (how this differs from VI/V)

- **Biome system replaces per-tile yields** — VI/V fixed per terrain. VII by biome + modifier, all biomes viable starters.
- **Navigable rivers are naval waterways** — inland naval raids possible for first time in series.
- **Homelands/Distant Lands partition** — unprecedented. VI/V had single continuous world.
- **Binary movement cost** — VI fractional (Hills 3 MP, Forest 2 MP); VII 1 MP or deplete-all.
- **Snow not separate terrain** — folded into Tundra visually.
- **Fresh water binary +5/-5 happiness** — VI was +3 Housing.
- **Ocean attrition in Exploration** — penalizes ocean entry 11-20 HP/turn until full tech path.
- **Voronoi map generation** (1.2.5) replacing fractal noise.
- **Large/Huge post-launch** — shipped with Standard max.

---

## UI requirements

- **Map view** — hex grid, biome colors, feature overlays, resources, units, city borders, fog of war, Distant Lands permafog until Exploration
- **Yield overlay** — toggleable per-tile yields
- **Movement range** — selected unit shows reachable tiles; difficult terrain distinct color
- **Terrain tooltip** — biome, modifier, feature, yields, defense, movement, fresh water, resource
- **River indicator** — navigable vs minor visually distinct
- **Distant Lands indicator** — tooltip marker once revealed
- **Ocean danger indicator** — attrition preview in movement display
- **Natural wonder notification** — first line-of-sight popup with bonuses
- **Fresh water preview** — city placement cursor shows +5/-5 before placement

---

## Edge cases

- Navigable river bordering Distant Lands: doesn't bypass Deep Ocean barrier `[INFERRED]`
- Navigable + minor river on same settlement: navigable grants FW; no conflict
- Natural wonder in Distant Lands: no bonus until Expl-age settled `[INFERRED]`
- Unit with 1 MP enters rough: turn ends immediately
- Scout in rough: continues moving (except minor rivers)
- Road on forested hills: 1 MP regardless
- Two players claim one natural wonder: standard territory ownership `[INFERRED]`
- Ocean attrition kills unit: destroyed, no wreckage
- No port access in Modern: rail blocked; must use ship
- Distant Lands adjacent to start coast: ~25% of games; Distant tag still applies

---

## Open questions

- Coast / Lake exact base yields (Ocean Modern confirmed 1F 3G)
- Wet terrain defense bonus (0? inferred)
- Full exhaustive list of units ignoring which terrain types
- Minor river yield when settled on
- Whether rail crosses Deep Ocean between port-settlements (single source)
- Remaining 2 Distant Lands exclusive resources (named: chocolate, tea, spices)
- Floodplain yield bonus per flood (VI behavior assumed)
- Large/Huge default player counts

---

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._

---

## Author notes

Fandom wiki pages for Terrain/Feature/Distant Lands/Map all 403'd. Primary yields from well-of-souls.com, PlayerAuctions (biome yield table), CivFanatics, PC Gamer. Combat defense values cross-source agreed but no datamine page — `[INFERRED-confirmed]`. Homelands/Distant Lands well-sourced from TheGamer + Firaxis map-gen article (Voronoi generation). Map size tile counts from Steam community reflecting post-1.2.1 state. Coastal/lake base yields not recoverable.

Write/Bash permissions denied to subagent; parent wrote from fenced-block extraction.

---

<!-- END OF TEMPLATE — do not add sections after this line. -->
