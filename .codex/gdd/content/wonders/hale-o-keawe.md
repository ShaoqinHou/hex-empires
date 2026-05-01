# Hale o Keawe - Civ VII

**Slug:** hale-o-keawe
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Hale_o_Keawe_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Hawaiian kingdom, c. 1650 CE. The Hale o Keawe (House of Keawe) was a heiau (temple) on the Big Island housing the bones of Hawaiian chiefs, considered a source of great mana.
- Flavor: Pacific island sacred site. Firaxis associates with a Pacific civilization in the Exploration Age.

## Stats / numeric attributes

- Cost: 400 Production
- Effect: +2 Culture; Acquire Culture equal to 50% of the cost of every Building constructed on a Coast Terrain; 3 Relic slots
- Prerequisite: Tier 2 He-e nalu (technology)
- Placement: Marine tile adjacent to land; cannot be adjacent to Tundra
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +2
  - type: GRANT_RESOURCE
    resource: culture
    value: 50-percent-of-building-cost
    trigger: building-constructed-on-coast

## Notes / uncertainty

The 50% culture bonus from Coast building construction is a potentially powerful ongoing effect depending on how many buildings the city constructs on coastal terrain. Marine placement means island or coastal city only. Tundra adjacency restriction limits cold-coast viability.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
