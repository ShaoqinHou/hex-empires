# Colossus - Civ VII

**Slug:** colossus
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Colossus_-_Antiquity_Wonder - Fextralife

## Identity

- Historical period: Ancient Rhodes (Greece), c. 280 BCE. The Colossus of Rhodes was a statue of Helios straddling the harbor entrance, one of the Seven Wonders of the Ancient World, standing approximately 70 metres tall.
- Flavor: Maritime trading hub monument. Firaxis associates with a maritime civilization in the Antiquity Age.

## Stats / numeric attributes

- Cost: 450 Production
- Effect: +3 Gold; +3 Resource Capacity in this Settlement; +1 Economic Attribute Point
- Prerequisite: Skilled Trades civic
- Placement: Coast tile adjacent to land
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: gold
    value: +3
  - type: MODIFY_CITY_STAT
    target: this-city
    stat: resource-capacity
    value: +3
  - type: GRANT_ATTRIBUTE_POINT
    type: economic
    value: +1

## Notes / uncertainty

+1 Economic Attribute Point is a rare bonus. Coast adjacency restricts to harbor cities. Skilled Trades is a broadly accessible Antiquity civic.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
