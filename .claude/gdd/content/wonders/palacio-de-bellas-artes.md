# Palacio de Bellas Artes - Civ VII

**Slug:** palacio-de-bellas-artes
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Palacio_de_Bellas_Artes_-_Modern_Wonder - Fextralife

## Identity

- Historical period: Mexico, 1934 CE. The Palacio de Bellas Artes in Mexico City is the premier cultural center of Mexico, blending Art Nouveau and Art Deco styles with a marble exterior; hosts the most prestigious cultural events in the country.
- Flavor: Mexican modernist monument to arts and culture. Firaxis associates with Mexico in the Modern Age.

## Stats / numeric attributes

- Cost: 1200 Production
- Effect: +5 Culture; +2 Happiness on Great Works; +10% Happiness in the City; 3 Artifact slots
- Prerequisite: Tier 2 Planes Politicos (civic)
- Placement: Adjacent to an Urban District
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +5
  - type: MODIFY_YIELD
    target: great-work-slots
    yield: happiness
    value: +2
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: 10-percent

## Notes / uncertainty

+10% Happiness is a percentage multiplier, unusual among wonders. Combined with 3 Artifact slots and +2 Happiness on Great Works, this rewards art collection. Planes Politicos is Mexico-specific.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
