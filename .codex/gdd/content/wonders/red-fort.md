# Red Fort - Civ VII

**Slug:** red-fort
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Red_Fort_-_Modern_Wonder - Fextralife

## Identity

- Historical period: Mughal Empire (India), 1648 CE. The Red Fort (Lal Qila) in Delhi was the main residence of Mughal emperors for nearly 200 years; a UNESCO World Heritage Site.
- Flavor: Mughal imperial fortress and seat of Mughal power. Firaxis associates with Mughal India in the Modern Age.

## Stats / numeric attributes

- Cost: 1000 Production
- Effect: +4 Gold; Acts as a Fortified District (must be Conquered to capture city); +50 HP to this tile and all City Centers
- Prerequisite: Tier 1 Mansabdari (civic)
- Placement: Adjacent to a District
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: gold
    value: +4
  - type: GRANT_FORTIFICATION
    target: this-city
    stat: must-be-conquered
  - type: MODIFY_CITY_STAT
    target: all-city-centers
    stat: hp
    value: +50

## Notes / uncertainty

Acting as a Fortified District means enemies must capture this tile before taking the city - significant defensive value. +50 HP to all City Centers empire-wide is a unique global defensive bonus. Mansabdari is Mughal-specific.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
