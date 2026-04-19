# Iguazu Falls - Civ VII

**Slug:** iguazu-falls
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

- Historical period: Brazil/Argentina border. Iguazu Falls is a system of 275 waterfalls on the Iguazu River; the largest waterfall system in the world, a UNESCO World Heritage Site.
- Flavor: South American jungle waterfall. Map-placed natural wonder; grants Fresh Water to adjacent settlements.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: Tropical/River terrain
- Antiquity base bonus: +2 Happiness, +4 Food per Age
- Settlement bonus: +2 Production on adjacent Quarters; grants Fresh Water
- Age scaling: +50% in Exploration, +100% in Modern vs Antiquity base
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +2
    per-age: true
  - type: MODIFY_YIELD
    target: this-city
    yield: food
    value: +4
    per-age: true
  - type: MODIFY_YIELD
    target: adjacent-quarter-tiles
    yield: production
    value: +2
  - type: GRANT_FRESH_WATER
    target: adjacent-settlements

## Notes / uncertainty

One of two natural wonders granting Fresh Water (alongside Gullfoss). The +2 Production on adjacent Quarters rewards dense urban development near the falls. Placement in tropical/river terrain means South American-analog map positions primarily.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
