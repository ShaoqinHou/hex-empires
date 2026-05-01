# Redwood Forest - Civ VII

**Slug:** redwood-forest
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://gameranx.com/features/id/529321/article/civilization-7-all-natural-wonders-and-bonuses/ - Gameranx

## Identity

- Historical period: California coast, USA. The Redwood Forests of Northern California contain the world tallest living trees (up to 115 metres); among the oldest living organisms, some over 2,000 years old.
- Flavor: Ancient temperate forest of the Pacific coast. Map-placed natural wonder on Vegetated terrain.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: Vegetated (Forest) terrain
- Antiquity base bonus: +2 Food, +2 Happiness, +2 Production per Age
- Settlement bonus: +1 Culture and +1 Science on Vegetated terrain within this settlement
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
    yield: production
    value: +2
    per-age: true
  - type: MODIFY_YIELD
    target: vegetated-tile
    yield: culture
    value: +1
  - type: MODIFY_YIELD
    target: vegetated-tile
    yield: science
    value: +1

## Notes / uncertainty

Triple per-age bonus (Food + Happiness + Production) is unique among natural wonders. The Vegetated terrain settlement bonus scales with how many forest/jungle tiles are in the workable area.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
