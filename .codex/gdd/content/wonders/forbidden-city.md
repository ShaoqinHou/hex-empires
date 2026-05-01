# Forbidden City - Civ VII

**Slug:** forbidden-city
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Forbidden_City_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Ming Dynasty China, 1406-1420 CE. The Forbidden City (Palace Museum) in Beijing served as the imperial palace for 24 emperors across the Ming and Qing dynasties.
- Flavor: Imperial court of the Ming emperors. Firaxis associates with Ming civilization in the Exploration Age.

## Stats / numeric attributes

- Cost: 400 Production
- Effect: +2 Culture; +2 Culture and Gold on all Fortification Buildings in this Settlement
- Prerequisite: Tier 2 Da Ming Lu (technology)
- Placement: Adjacent to a District
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +2
  - type: MODIFY_YIELD
    target: fortification-buildings
    yield: culture
    value: +2
  - type: MODIFY_YIELD
    target: fortification-buildings
    yield: gold
    value: +2

## Notes / uncertainty

Fortification building bonus makes this most valuable in militarily developed cities with walls and towers. Da Ming Lu is Ming-specific. District adjacency is broadly achievable.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
