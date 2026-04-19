# Gullfoss - Civ VII

**Slug:** gullfoss
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://gameranx.com/features/id/529321/article/civilization-7-all-natural-wonders-and-bonuses/ - Gameranx
- https://screenrant.com/civ-7-all-natural-wonders-bonuses/ - Screen Rant

## Identity

- Historical period: Iceland. Gullfoss (Golden Falls) is a double-cascade waterfall on the Hvita river dropping 32 metres; one of Iceland most visited natural attractions.
- Flavor: Nordic waterfall providing fresh water and agricultural fertility. Map-placed natural wonder; also grants Fresh Water to adjacent settlements.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: River/waterfall terrain
- Antiquity base bonus: +6 Food per Age
- Settlement bonus: +1 Culture and +1 Production on adjacent rural tiles; grants Fresh Water
- Age scaling: +50% in Exploration, +100% in Modern vs Antiquity base
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: food
    value: +6
    per-age: true
  - type: MODIFY_YIELD
    target: adjacent-rural-tile
    yield: culture
    value: +1
  - type: MODIFY_YIELD
    target: adjacent-rural-tile
    yield: production
    value: +1
  - type: GRANT_FRESH_WATER
    target: adjacent-settlements

## Notes / uncertainty

One of two natural wonders granting Fresh Water (alongside Iguazu Falls). Fresh water provides +5 Happiness to any settlement settled adjacent to it, and can strategically enable one extra settlement placement. Highest Food bonus among natural wonders at +6/age base.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
