# Valley of Flowers - Civ VII

**Slug:** valley-of-flowers
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://gameranx.com/features/id/529321/article/civilization-7-all-natural-wonders-and-bonuses/ - Gameranx

## Identity

- Historical period: Uttarakhand, India. The Valley of Flowers National Park in the Himalayas is a UNESCO World Heritage Site known for its meadows of endemic alpine flowers, situated at 3,352-3,858 metres elevation.
- Flavor: Himalayan alpine floral meadow. Map-placed natural wonder.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: Grassland/Plains terrain (alpine)
- Antiquity base bonus: +2 Food, +2 Gold, +2 Happiness per Age
- Special ability: +10 land Trade Route range
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
    yield: gold
    value: +2
    per-age: true
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +2
    per-age: true
  - type: MODIFY_GLOBAL_STAT
    stat: land-trade-route-range
    value: +10

## Notes / uncertainty

+10 land Trade Route range is a globally unique natural wonder effect, directly enabling longer overland trade connections. Triple yield bonus (Food + Gold + Happiness) per age is also one of the broadest among natural wonders. Placement in highland/alpine regions.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
