# Great Stele - Civ VII

**Slug:** great-stele
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Great_Stele_-_Antiquity_Wonder - Fextralife individual wonder page
- https://civilization.fandom.com/wiki/Great_Stele_(Civ7) - Fandom wiki

## Identity

- Historical period: Kingdom of Aksum (Ethiopia), c. 4th century CE. The Great Stele of Aksum is a 33-metre obelisk erected as a funerary monument, one of the tallest stone structures ever hewn.
- Flavor: Monument-building culture of the Horn of Africa. Firaxis associates with Aksum/Ethiopia in the Antiquity Age.

## Stats / numeric attributes

- Cost: 275 Production
- Effect: Gain 200 Gold whenever you construct a Wonder in this Settlement (scales by age)
- Prerequisite: Periplus of the Erythraean Sea civic + Writing technology
- Placement: Must be built on a Flat terrain tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: GRANT_RESOURCE
    resource: gold
    value: 200
    trigger: wonder-constructed-in-same-city
    per-age-scaling: true

## Notes / uncertainty

Scales-by-age clause means gold reward increases in Exploration and Modern ages - exact multipliers not published; [INFERRED] +50% Exploration, +100% Modern per standard scaling. Low cost (275) means early placement maximizes total gold payback from subsequent wonders in the same city.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._