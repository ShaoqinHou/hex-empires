# Terrains and Features - Civ VII

**Slug:** `terrains-features`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (Phase 2 subagent permissions denied; overview captures category-wide rules + full item list)
**Item count:** 6 biomes x 4 modifiers (24 terrain variants) + ~16 features

## Sources

- `.codex/gdd/systems/map-terrain.md` - primary source for this category
- https://civilization.fandom.com/wiki/Terrains_(Civ7) - Fandom (frequently 403 this session)
- Cross-referenced Firaxis Dev Diaries + community wikis (Fextralife, Game8, TheGamer)

## Purpose in the game

Physical substrate for all other systems. Biome + modifier determines base yields; features overlay (rivers, forests, etc.). Navigable rivers (new in VII) are water tiles. Snow subsumed into Tundra.

## Category-wide rules

- Biomes: Grassland, Plains, Desert, Tropical, Tundra, Marine
- Modifiers: Flat, Rough (Hills), Vegetated, Wet
- Features: River (minor or navigable), Floodplain, Oasis, Marsh, Rainforest, Taiga, Forest, Bog, Sagebrush, Savanna, Mangrove, Reef, Volcano, Geothermal Fissure, Natural Wonder
- Movement: 1 MP or deplete-all (binary)
- Defense bonus: Rough +3 CS, Vegetated +2 CS, Minor River -5 CS (defender on it)
- Fresh water: +5/-5 happiness to settlement
- Ocean unworkable until Modern

## Taxonomy / item list

### Land biomes (6)

- grassland
- plains
- desert
- tropical
- tundra
- marine

### Terrain modifiers (4)

- flat
- rough (hills)
- vegetated
- wet

### Impassable

- mountain
- deep-ocean-pre-tech

### Special features

- navigable-river (water tile)
- minor-river (tile edge)
- floodplain
- oasis
- volcano
- geothermal-fissure
- natural-wonder

## How this category connects to systems

Primary system: `systems/map-terrain.md`

## VII-specific notes

- Biome + modifier system replaces per-terrain yields
- Tropical biome separates from Grassland (VII-new)
- Snow subsumed into Tundra (visual only)
- Navigable rivers are water tiles (VI: rivers were land-edge only)
- Homelands/Distant Lands partition
- Binary movement (1 MP or deplete-all)

## Open questions / uncertainty

- Coast/Lake exact base yields
- Wet terrain defense bonus (0 or other)
- Per-feature yields + movement costs
- Floodplain post-flood yield bonus

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
