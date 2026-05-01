# Terracotta Army - Civ VII

**Slug:** terracotta-army
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Terracotta_Army_-_Antiquity_Wonder - Fextralife

## Identity

- Historical period: Qin Dynasty China, c. 210 BCE. The Terracotta Army is a collection of 8,000+ life-size clay warriors buried with Emperor Qin Shi Huang to protect him in the afterlife; a UNESCO World Heritage Site.
- Flavor: Qin imperial military monument. Firaxis associates with Qin China in the Antiquity Age.

## Stats / numeric attributes

- Cost: 375 Production
- Effect: +2 Production; +25% Army experience for all units; Grants a free Army Commander
- Prerequisite: [INFERRED] not confirmed in sources
- Placement: Must be built on a Grassland tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: production
    value: +2
  - type: MODIFY_COMBAT
    target: all-units
    stat: experience-gain
    value: 25-percent
  - type: GRANT_UNIT
    unit: army-commander
    count: 1

## Notes / uncertainty

Free Army Commander is a one-time grant at construction - commanders are powerful strategic units. +25% Army experience is empire-wide, accelerating unit promotion for all armies. Grassland placement is broadly accessible.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
