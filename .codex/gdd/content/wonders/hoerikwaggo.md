# Hoerikwaggo - Civ VII

**Slug:** hoerikwaggo
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://gameranx.com/features/id/529321/article/civilization-7-all-natural-wonders-and-bonuses/ - Gameranx

## Identity

- Historical period: South Africa. Hoerikwaggo is the Khoikhoi name for Table Mountain in Cape Town, meaning Sea Mountain; a flat-topped landmark rising 1,086 metres above the Cape Peninsula.
- Flavor: Iconic southern African mountain. Map-placed natural wonder.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: Rough/Mountain terrain
- Antiquity base bonus: +2 Culture, +4 Food per Age
- Settlement bonus: +2 Happiness on adjacent Quarters
- Age scaling: +50% in Exploration, +100% in Modern vs Antiquity base
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +2
    per-age: true
  - type: MODIFY_YIELD
    target: this-city
    yield: food
    value: +4
    per-age: true
  - type: MODIFY_YIELD
    target: adjacent-quarter-tiles
    yield: happiness
    value: +2

## Notes / uncertainty

Quarter adjacency bonus rewards building Quarters near this natural wonder. Placement in mountainous southern terrain. The combination of Food + Culture per age makes this a solid rounded bonus wonder.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
