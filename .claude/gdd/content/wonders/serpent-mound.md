# Serpent Mound - Civ VII

**Slug:** serpent-mound
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Serpent_Mound_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Fort Ancient culture (Ohio, USA), c. 1000 CE. The Great Serpent Mound is a 411-metre effigy mound in the shape of an uncoiling serpent, one of the largest effigy mounds in North America.
- Flavor: Native American ceremonial earthwork. Firaxis associates with Shawnee civilization in the Exploration Age.

## Stats / numeric attributes

- Cost: 550 Production
- Effect: +4 Influence; +3 Science and +2 Production to all Unique Improvements in this Settlement
- Prerequisite: Tier 1 Maleki Kintake (civic)
- Placement: Must be built on a Grassland tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: influence
    value: +4
  - type: MODIFY_YIELD
    target: unique-improvement-tiles
    yield: science
    value: +3
  - type: MODIFY_YIELD
    target: unique-improvement-tiles
    yield: production
    value: +2

## Notes / uncertainty

Unique Improvement bonus makes this most powerful for civilizations with several unique improvements deployed. Maleki Kintake is Shawnee-specific. Grassland placement is broadly accessible.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
