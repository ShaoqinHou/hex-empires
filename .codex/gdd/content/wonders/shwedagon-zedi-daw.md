# Shwedagon Zedi Daw - Civ VII

**Slug:** shwedagon-zedi-daw
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Shwedagon_Zedi_Daw_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Mon Kingdom/Pagan Empire (Myanmar), c. 6th-10th century CE. The Shwedagon Pagoda in Yangon is a 99-metre gilded stupa housing relics of four Buddhas; the most sacred Buddhist site in Myanmar.
- Flavor: Burmese golden pagoda of Buddhist devotion. Firaxis places in the Exploration Age.

## Stats / numeric attributes

- Cost: 550 Production
- Effect: +4 Science; +2 Science on Rural tiles in settlements with at least 1 Happiness; +1 Wildcard Attribute Point
- Prerequisite: [INFERRED] Buddhist or Asian civilization civic; not confirmed
- Placement: Adjacent to a Lake
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: science
    value: +4
  - type: MODIFY_YIELD
    target: rural-tile
    yield: science
    value: +2
    condition: settlement-has-happiness
  - type: GRANT_ATTRIBUTE_POINT
    type: wildcard
    value: +1

## Notes / uncertainty

Rural tile science bonus requires at least 1 Happiness in the settlement. Lake adjacency restricts to inland lake cities. One of the stronger science wonders in the Exploration Age.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
