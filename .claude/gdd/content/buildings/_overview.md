# Buildings - Civ VII

**Slug:** `buildings`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (Phase 2 subagent permissions denied; overview captures category-wide rules + full item list)
**Item count:** ~30-50 standard + ~2 per civ unique

## Sources

- `.claude/gdd/systems/buildings-wonders.md` - primary source for this category
- https://civilization.fandom.com/wiki/Buildings_(Civ7) - Fandom (frequently 403 this session)
- Cross-referenced Firaxis Dev Diaries + community wikis (Fextralife, Game8, TheGamer)

## Purpose in the game

Constructed in City urban tiles (2 slots per tile). Provide yields, adjacency bonuses. Ageless types (Warehouses, civ-unique, Wonders) survive age transitions; non-ageless become outdated.

## Category-wide rules

- 2 slots per urban tile; any building any slot (no district specialization)
- Building types: Warehouse (ageless), civ-unique (ageless), standard (non-ageless), Wonder (ageless)
- Quarter = two civ-unique buildings on same tile (substantial bonus)
- Standard buildings obsolete at age transition (lose effects + adjacency, keep base yield)
- Overbuilding: construct new building into obsolete slot (replaces)

## Taxonomy / item list

### Warehouse buildings

- granary
- brickyard
- sawmill
- market-quarter
- library (with codex slots)

### Altar/religion

- altar
- temple
- monument

### Military

- barracks
- stable
- armory

### Civic

- amphitheater
- academy
- council-chamber
- villa

### Civ-unique examples

- Parthenon+Odeon (Greece -> Acropolis)
- Temple-of-Jupiter+Basilica (Rome -> Forum)
- Mastaba+Mortuary-Temple (Egypt -> Necropolis)

## How this category connects to systems

Primary system: `systems/buildings-wonders.md`

## VII-specific notes

- No pre-placed districts - VI required Campus/Harbor/etc. placed before buildings
- 2-slot urban tiles (uniform) replace variable district slot counts
- Quarters replace theming bonuses
- Ageless tag is new

## Open questions / uncertainty

- Full standard building roster
- Production costs + maintenance
- Adjacency bonus specifics per building
- Full civ-unique building pairings

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
