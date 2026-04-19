# Borobudur - Civ VII

**Slug:** borobudur
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Borobudur_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Sailendra dynasty (Java, Indonesia), c. 800 CE. Borobudur is the world largest Buddhist temple, a nine-level stupa with 2,672 relief panels and 504 Buddha statues.
- Flavor: Javanese Buddhist maritime monument. Firaxis associates with Majapahit civilization in the Exploration Age.

## Stats / numeric attributes

- Cost: 475 Production
- Effect: +3 Happiness; +2 Food and Happiness on Quarters in this Settlement
- Prerequisite: Tier 2 Gamelan (technology)
- Placement: Adjacent to a Coast tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +3
  - type: MODIFY_YIELD
    target: quarter-tiles
    yield: food
    value: +2
  - type: MODIFY_YIELD
    target: quarter-tiles
    yield: happiness
    value: +2

## Notes / uncertainty

Dual Quarter bonus (+2 Food and +2 Happiness) makes this strongest in cities with multiple quarters formed. Coast adjacency requirement means coastal or navigable-river cities primarily. Gamelan is Majapahit-specific but accessible to any civ.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
