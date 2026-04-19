# Hanging Gardens - Civ VII

**Slug:** hanging-gardens
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Hanging_Gardens_-_Antiquity_Wonder - Fextralife

## Identity

- Historical period: Babylon (Iraq), c. 600 BCE. The Hanging Gardens of Babylon are the only one of the Seven Wonders of the Ancient World whose location is still debated; ancient sources describe terraced gardens irrigated by the Euphrates.
- Flavor: Babylonian royal garden and irrigation marvel. Firaxis associates with Babylon in the Antiquity Age.

## Stats / numeric attributes

- Cost: 275 Production
- Effect: +1 Food on all Farms in this Settlement; +10% Growth Rate in all cities; +1 Expansionist Attribute Point
- Prerequisite: Irrigation technology
- Placement: Adjacent to a River
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: farm-tile
    yield: food
    value: +1
  - type: MODIFY_GLOBAL_STAT
    stat: growth-rate
    value: 10-percent
    scope: all-cities
  - type: GRANT_ATTRIBUTE_POINT
    type: expansionist
    value: +1

## Notes / uncertainty

+10% Growth Rate empire-wide is a powerful global bonus. Per-Farm food bonus scales with Farm count in the settlement. River adjacency is broadly accessible. Irrigation technology is an early-Antiquity unlock making this an early-game priority.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
