# Eiffel Tower - Civ VII

**Slug:** eiffel-tower
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Eiffel_Tower_-_Modern_Wonder - Fextralife

## Identity

- Historical period: French Third Republic, 1889 CE. The Eiffel Tower was built as the entrance arch to the 1889 World Fair in Paris, designed by Gustave Eiffel; initially temporary but became the city permanent symbol.
- Flavor: Triumph of industrial engineering and Belle Epoque culture. Firaxis associates with France in the Modern Age.

## Stats / numeric attributes

- Cost: 1200 Production
- Effect: +5 Culture; +2 Culture and Happiness on Quarters in this Settlement
- Prerequisite: Tier 1 Code Civil des Francais (civic)
- Placement: Adjacent to a District
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +5
  - type: MODIFY_YIELD
    target: quarter-tiles
    yield: culture
    value: +2
  - type: MODIFY_YIELD
    target: quarter-tiles
    yield: happiness
    value: +2

## Notes / uncertainty

Similar to the Antiquity Colosseum in rewarding quarter formation, but scaled to Modern Age costs and yields. Code Civil des Francais is French-specific. District adjacency broadly achievable.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
