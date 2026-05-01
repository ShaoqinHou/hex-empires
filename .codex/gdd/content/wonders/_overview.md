# Wonders - Civ VII

**Slug:** `wonders`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (Phase 2 subagent permissions denied; overview captures category-wide rules + full item list)
**Item count:** 44 total (33 constructable [11/age x 3 ages] + 11 Natural Wonders)

## Sources

- `.codex/gdd/systems/buildings-wonders.md, map-terrain.md` - primary source for this category
- https://civilization.fandom.com/wiki/Wonders_(Civ7) - Fandom (frequently 403 this session)
- Cross-referenced Firaxis Dev Diaries + community wikis (Fextralife, Game8, TheGamer)

## Purpose in the game

Unique one-per-game structures. Once-per-game global lock. Occupy full tile. Ageless. Provide powerful effect + adjacency bonus to all surrounding buildings. Natural wonders are map-placed (not built).

## Category-wide rules

- Constructable wonders: 11 per age, 33 total, Ageless
- Once built globally, no other civ can build that wonder
- Tile-occupying (full tile, not slot)
- Provide adjacency bonus to all surrounding buildings
- Specific terrain placement requirements per wonder (rivers, deserts, etc.)
- Natural Wonders (11): map-placed at world gen; first civ to settle gets bonus; cannot be built
- Natural wonder count per map size: 3 (Tiny) -> 7 (Huge)

## Taxonomy / item list

### Antiquity constructable

- pyramids
- oracle
- colosseum
- hanging-gardens
- great-library
- mausoleum-of-halicarnassus
- petra
- stonehenge
- weiyang-palace
- pantheon
- sanchi-stupa

### Exploration constructable

- angkor-wat
- machu-picchu
- serpent-mound
- notre-dame
- forbidden-city
- mosque-of-djenne
- meiji-restoration (?)
- torre-de-belem
- hagia-sophia

### Modern constructable

- big-ben
- eiffel-tower
- statue-of-liberty
- manhattan-project (terminal)
- world-fair (terminal)
- cristo-redentor
- golden-gate-bridge

### Natural Wonders

- grand-canyon
- great-barrier-reef
- gullfoss
- hoerikwaggo
- iguazu-falls
- mount-kilimanjaro
- redwood-forest
- thera
- torres-del-paine
- uluru
- valley-of-flowers
- zhangjiajie

## How this category connects to systems

Primary system: `systems/buildings-wonders.md, map-terrain.md`

## VII-specific notes

- Wonders propagate adjacency bonus to surrounding buildings (VI wonders had direct effects only)
- All wonders Ageless (new concept)
- Natural wonders scale yields per age (+50% Expl, +100% Modern)
- Terrain placement requirements explicit and strict

## Open questions / uncertainty

- Full Exploration + Modern wonder lists
- Production costs per wonder
- Exact adjacency values per wonder
- Terrain placement requirements per wonder

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
