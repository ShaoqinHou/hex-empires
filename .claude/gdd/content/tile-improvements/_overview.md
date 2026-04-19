# Tile Improvements - Civ VII

**Slug:** `tile-improvements`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (Phase 2 subagent permissions denied; overview captures category-wide rules + full item list)
**Item count:** ~25-30 (10 standard rural + ~16 civ-unique)

## Sources

- `.claude/gdd/systems/tile-improvements.md` - primary source for this category
- https://civilization.fandom.com/wiki/Tile_(Civ7) - Fandom (frequently 403 this session)
- Cross-referenced Firaxis Dev Diaries + community wikis (Fextralife, Game8, TheGamer)

## Purpose in the game

Rural tile improvements auto-placed by population growth (NO worker units). Type selected by terrain+resource. Urban tiles convert from rural when building placed. Civ-unique improvements are Ageless.

## Category-wide rules

- No Worker/Builder units in VII - improvements gated by population growth
- Auto-placed by terrain+resource: Farm (flat), Mine (hills/mountain ore), Quarry (stone), Pasture (livestock), Plantation (ag luxuries), Camp (animal), Woodcutter (forest), Clay Pit (wet), Fishing Boat (water), Oil Rig (Modern only)
- Civ-unique improvements are Ageless (persist across transitions)
- Urban/rural split: building placement converts rural to urban, old improvement lost

## Taxonomy / item list

### Standard rural (10)

- farm
- mine
- quarry
- pasture
- plantation
- camp
- woodcutter
- clay-pit
- fishing-boat
- oil-rig

### Civ-unique (Antiquity)

- baray (Khmer)
- great-wall (Han)
- hawilt (Aksum)
- pairidaeza (Persia)
- potkop (Mississippian)

### Civ-unique (Exploration)

- loi-kalo (Hawaii)
- mawaskawe-skote (Shawnee)
- ming-great-wall (Ming)
- ortoo (Mongolia)
- terrace-farm (Inca)
- caravanserai (Songhai)

### Civ-unique (Modern)

- bang (Siam)
- kabakas-lake (Buganda)
- obshchina (Russia)
- staatseisenbahn (Prussia)
- stepwell (Mughal)

## How this category connects to systems

Primary system: `systems/tile-improvements.md`

## VII-specific notes

- NO builder/worker units
- Improvement type determined by terrain+resource (not player choice)
- Population-gated improvement speed (1 per growth event)
- Civ-unique improvements Ageless
- No forest chopping (VI had chop-for-production)

## Open questions / uncertainty

- Yield values per improvement per age
- Oil Rig age/tech prerequisite
- Full civ-unique improvement list (some unclear)

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
