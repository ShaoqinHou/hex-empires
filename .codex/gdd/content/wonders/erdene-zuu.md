# Erdene Zuu - Civ VII

**Slug:** erdene-zuu
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Erdene_Zuu_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Mongolia, 1586 CE. Erdene Zuu Monastery was the first Buddhist monastery in Mongolia, built from the ruins of Karakorum using stones from the former Mongol capital.
- Flavor: Mongolian fusion of cavalry power and Buddhist faith. Firaxis associates with Mongolia in the Exploration Age.

## Stats / numeric attributes

- Cost: 550 Production
- Effect: +4 Culture; Acquire Culture equal to 25% of the cost of every Cavalry Unit produced
- Prerequisite: Tier 2 Yassa (civic)
- Placement: Must be built on Flat Desert, Plains, or Tundra tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +4
  - type: GRANT_RESOURCE
    resource: culture
    value: 25-percent-of-cavalry-cost
    trigger: cavalry-unit-produced

## Notes / uncertainty

Ongoing culture-from-cavalry-production makes this strongest in militaristic cavalry-focused civilizations. Yassa is Mongol-specific. Flat placement across Desert/Plains/Tundra is broadly accessible in open terrain starts.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
