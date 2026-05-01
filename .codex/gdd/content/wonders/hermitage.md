# Hermitage - Civ VII

**Slug:** hermitage
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Hermitage_-_Modern_Wonder - Fextralife

## Identity

- Historical period: Russian Empire, 1764 CE. The Winter Palace and Hermitage Museum complex in Saint Petersburg was founded by Catherine the Great as an art museum; now one of the largest museums in the world.
- Flavor: Russian imperial cultural patronage. Firaxis associates with Russia in the Modern Age.

## Stats / numeric attributes

- Cost: 1000 Production
- Effect: +4 Culture; +10% Culture in Cities with a Great Work slotted; 3 Great Work slots
- Prerequisite: Tier 1 Table of Ranks (civic)
- Placement: Must be built on a Tundra tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +4
  - type: MODIFY_YIELD
    target: any-city-with-great-work
    yield: culture
    value: 10-percent

## Notes / uncertainty

The +10% Culture multiplier applies to any city with a Great Work slotted, making this empire-wide for civilizations that have distributed great works across multiple cities. Tundra placement restricts to colder map regions.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
