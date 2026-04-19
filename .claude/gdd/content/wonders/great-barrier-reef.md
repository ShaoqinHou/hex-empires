# Great Barrier Reef - Civ VII

**Slug:** great-barrier-reef
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

- Historical period: Coral Sea (Australia). The Great Barrier Reef is the world largest coral reef system at 2,300 km, supporting extraordinary marine biodiversity; a UNESCO World Heritage Site.
- Flavor: Marine natural wonder of biodiversity. Map-placed on Marine/Coast terrain.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: Marine/Ocean terrain
- Antiquity base bonus: +2 Food, +2 Happiness, +2 Science per Age
- Settlement bonus: +2 Science on adjacent marine terrain tiles
- Age scaling: +50% in Exploration, +100% in Modern vs Antiquity base
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: food
    value: +2
    per-age: true
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +2
    per-age: true
  - type: MODIFY_YIELD
    target: this-city
    yield: science
    value: +2
    per-age: true
  - type: MODIFY_YIELD
    target: adjacent-marine-tile
    yield: science
    value: +2

## Notes / uncertainty

One of two natural wonders that provides a triple-resource per-age bonus. Marine placement means only coastal civs can access its bonus without naval exploration. The adjacent marine tile science bonus reinforces the research theme.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
