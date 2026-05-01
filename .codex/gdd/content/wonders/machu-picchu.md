# Machu Picchu - Civ VII

**Slug:** machu-picchu
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Machu_Pikchu_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Inca Empire (Peru), c. 1450 CE. Machu Picchu is a 15th-century Inca citadel set on a mountain ridge at 2,430 metres elevation, likely a royal estate or religious sanctuary.
- Flavor: High-altitude Andean mountain fortress. Firaxis associates with a South American civilization in the Exploration Age.

## Stats / numeric attributes

- Cost: 550 Production
- Effect: +4 Gold; +2 Resource Capacity; +4 Culture and Gold on all tiles adjacent to this Wonder
- Prerequisite: Tier 2 Mita (civic)
- Placement: Must be built on a Tropical Mountain tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: gold
    value: +4
  - type: MODIFY_CITY_STAT
    target: this-city
    stat: resource-capacity
    value: +2
  - type: MODIFY_YIELD
    target: adjacent-tiles
    yield: culture
    value: +4
  - type: MODIFY_YIELD
    target: adjacent-tiles
    yield: gold
    value: +4

## Notes / uncertainty

Tropical Mountain tile placement is among the most restrictive in the game - requires a mountain tile within city borders in a tropical biome region. The adjacency bonus to surrounding tiles (+4 Culture + Gold) is unusually powerful but dependent on what buildings or improvements border the wonder.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
