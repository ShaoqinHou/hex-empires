# Muzibu Azaala Mpanga - Civ VII

**Slug:** muzibu-azaala-mpanga
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Muzibu_Azaala_Mpanga_-_Modern_Wonder - Fextralife

## Identity

- Historical period: Buganda Kingdom (Uganda), c. 1882 CE. The Kasubi Tombs (Muzibu Azaala Mpanga) in Kampala are the burial grounds of four Buganda kings, a UNESCO World Heritage Site and living cultural monument.
- Flavor: East African royal sacred site. Firaxis associates with Buganda civilization in the Modern Age.

## Stats / numeric attributes

- Cost: 1000 Production
- Effect: +4 Food; +2 Food on all Lake tiles; +2 Culture and Happiness on all Lake tiles in the settlement
- Prerequisite: Tier 2 Nnalubaale (civic)
- Placement: Adjacent to a Lake
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: food
    value: +4
  - type: MODIFY_YIELD
    target: lake-tile
    yield: food
    value: +2
  - type: MODIFY_YIELD
    target: lake-tile
    yield: culture
    value: +2
  - type: MODIFY_YIELD
    target: lake-tile
    yield: happiness
    value: +2

## Notes / uncertainty

Lake adjacency restricts placement to inland cities near lakes. The lake tile bonuses scale with how many lake tiles are in the settlement workable area. Nnalubaale is Buganda-specific.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
