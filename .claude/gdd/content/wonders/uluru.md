# Uluru - Civ VII

**Slug:** uluru
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://gameranx.com/features/id/529321/article/civilization-7-all-natural-wonders-and-bonuses/ - Gameranx
- https://www.method.gg/civ-7/all-natural-wonders-in-civilization-7-stats-bonuses-more - Method.gg

## Identity

- Historical period: Northern Territory, Australia. Uluru (Ayers Rock) is a large sandstone inselberg rising 348 metres above the surrounding desert plain; sacred to the local Anangu people and a UNESCO World Heritage Site.
- Flavor: Australian desert sacred site. Map-placed natural wonder on Desert terrain.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: Desert terrain
- Antiquity base bonus: +6 Happiness per Age
- Settlement bonus: +2 Culture on Desert terrain tiles within this settlement
- Age scaling: +50% in Exploration, +100% in Modern vs Antiquity base
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +6
    per-age: true
  - type: MODIFY_YIELD
    target: desert-tile
    yield: culture
    value: +2

## Notes / uncertainty

Highest raw Happiness bonus among natural wonders at +6/age. The +2 Culture on desert tiles scales with the city desert tile count, making it very strong in desert-heavy starts. Desert placement means primarily arid map regions.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
