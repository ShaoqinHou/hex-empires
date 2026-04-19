# Technologies - Civ VII

**Slug:** `technologies`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (Phase 2 subagent permissions denied; overview captures category-wide rules + full item list)
**Item count:** ~80-90 across three age trees (~27-30 per age)

## Sources

- `.claude/gdd/systems/tech-tree.md` - primary source for this category
- https://civilization.fandom.com/wiki/Technologies_(Civ7) - Fandom (frequently 403 this session)
- Cross-referenced Firaxis Dev Diaries + community wikis (Fextralife, Game8, TheGamer)

## Purpose in the game

Per-age tech trees. Tree swap at age transition - previous tree discarded. Masteries provide additional rewards per tech. Certain techs gate buildings/units/improvements.

## Category-wide rules

- Separate tree per age (NOT cumulative like VI)
- Science yield drives progress; cost scales with tree depth
- Mastery: completing a tech enables secondary mastery research (~80-100% base cost) for extra reward
- Tree resets at age transition; mid-research progress lost
- Codices (Great Works) provide science boost (Antiquity Scientific Legacy Path)
- Prerequisites branching within tree

## Taxonomy / item list

### Antiquity (~27 techs)

- pottery
- animal-husbandry
- bronze-working
- masonry
- sailing
- writing
- wheel
- horseback-riding
- mathematics
- iron-working
- currency

### Exploration (~30 techs)

- cartography
- shipbuilding
- feudalism
- castles
- banking
- printing
- gunpowder
- astronomy
- medicine

### Modern (~30+ techs)

- industrialization
- steam-power
- electricity
- flight
- mass-production
- rocketry
- aerodynamics
- urbanization
- capitalism

## How this category connects to systems

Primary system: `systems/tech-tree.md`

## VII-specific notes

- Per-age trees (not cumulative) - VI had one tree
- Mastery mechanic gives secondary reward (VI had Eureka boosts at 50% cost)
- Tree reset on age transition - VI had no reset
- No Eureka / Inspiration boosts (removed in VII)

## Open questions / uncertainty

- Full tech list per age
- Science cost per tech per age
- Mastery cost (80% or same as base?)
- Prerequisites per tech

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
