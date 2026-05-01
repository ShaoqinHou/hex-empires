# Pyramid of the Sun - Civ VII

**Slug:** pyramid-of-the-sun
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Pyramid+of+the+Sun+-+Antiquity+Wonder - Fextralife

## Identity

- Historical period: Teotihuacan civilization (Mexico), c. 100 CE. The Pyramid of the Sun is the third largest pyramid in the world at 65 metres tall, located in the ancient city of Teotihuacan near Mexico City.
- Flavor: Mesoamerican monumental architecture. Firaxis associates with Teotihuacan/a Mesoamerican civilization in the Antiquity Age.

## Stats / numeric attributes

- Cost: 450 Production
- Effect: +3 Culture; +2 Culture on each Quarter in this Settlement
- Prerequisite: [INFERRED] not confirmed in sources
- Placement: Flat tile adjacent to a District
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +3
  - type: MODIFY_YIELD
    target: quarter-tiles
    yield: culture
    value: +2

## Notes / uncertainty

Similar to the Colosseum (Happiness on Quarters) but Culture-focused. A third Antiquity wonder with Quarter synergy alongside Colosseum and Pyramid of the Sun. Flat + District adjacency is broadly accessible.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
