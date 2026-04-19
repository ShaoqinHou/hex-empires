# Grand Canyon - Civ VII

**Slug:** grand-canyon
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

- Historical period: Geological formation, SW USA. The Grand Canyon is a 446-km long, 1.6-km deep gorge carved by the Colorado River through layered bands of red rock over millions of years.
- Flavor: Dramatic Flat terrain erosion revealing geological time. Map-placed natural wonder; first civ to settle within range gains its bonus.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: Flat terrain
- Antiquity base bonus: +2 Culture, +4 Happiness per Age
- Settlement bonus: +2 Science on flat terrain tiles within this settlement
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
    yield: happiness
    value: +4
    per-age: true
  - type: MODIFY_YIELD
    target: flat-tile
    yield: science
    value: +2

## Notes / uncertainty

Per-age bonuses mean +2 Culture / +4 Happiness in Antiquity, +3 / +6 in Exploration, +4 / +8 in Modern. The +2 Science on flat tiles is a settlement-scope bonus (all flat tiles in the city, not just adjacent to the wonder). Age-scaling formula: Antiquity x1, Exploration x1.5, Modern x2.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
