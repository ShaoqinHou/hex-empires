# Monks Mound - Civ VII

**Slug:** monks-mound
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Monks_Mound_-_Antiquity_Wonder - Fextralife
- https://civilization.fandom.com/wiki/Monks_Mound_(Civ7) - Fandom wiki

## Identity

- Historical period: Mississippian culture (North America), c. 900-1100 CE. Monks Mound at Cahokia, Illinois, is the largest pre-Columbian earthwork north of Mexico at 30 metres tall.
- Flavor: Mound-builder ceremonial center of pre-contact North American civilization. Firaxis associates with Mississippian civilization in Antiquity.

## Stats / numeric attributes

- Cost: 450 Production
- Effect: +3 Food; +4 Resource Capacity in this Settlement
- Prerequisite: Commerce + Earthworks civics
- Placement: Adjacent to a River tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: food
    value: +3
  - type: MODIFY_CITY_STAT
    target: this-city
    stat: resource-capacity
    value: +4

## Notes / uncertainty

+4 Resource Capacity is a large increase favoring resource-rich cities. River adjacency is common. Commerce + Earthworks may be mid-to-late Antiquity timing.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
