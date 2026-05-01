# Haamonga a Maui - Civ VII

**Slug:** haamonga-a-maui
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Haamonga+a+Maui+-+Antiquity+Wonder - Fextralife

## Identity

- Historical period: Tonga (Pacific), c. 1200 CE. The Haamonga a Maui is a trilithon (two upright stones with a lintel) in Tonga, one of the few stone monuments in Polynesia, possibly used as an astronomical calendar.
- Flavor: Polynesian stone calendar monument. Firaxis associates with a Pacific civilization in the Antiquity Age.

## Stats / numeric attributes

- Cost: 375 Production
- Effect: +2 Culture; +1 Culture and +1 Food on all Fishing Boats in this Settlement; +1 Cultural Attribute Point
- Prerequisite: Navigation technology
- Placement: Grassland or Tropical land adjacent to Coast
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +2
  - type: MODIFY_YIELD
    target: fishing-boat-tile
    yield: culture
    value: +1
  - type: MODIFY_YIELD
    target: fishing-boat-tile
    yield: food
    value: +1
  - type: GRANT_ATTRIBUTE_POINT
    type: cultural
    value: +1

## Notes / uncertainty

Fishing Boat bonus rewards maritime coastal cities with developed sea tiles. Navigation technology places this in mid-Antiquity timing. Coast adjacency + Grassland/Tropical placement restricts to temperate or tropical coastlines.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
