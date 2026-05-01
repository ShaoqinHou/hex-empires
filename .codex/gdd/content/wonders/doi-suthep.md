# Doi Suthep - Civ VII

**Slug:** doi-suthep
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Doi_Suthep_-_Modern_Wonder - Fextralife

## Identity

- Historical period: Lanna Kingdom (Thailand), 1383 CE. Wat Phra That Doi Suthep is a Buddhist temple on a mountain above Chiang Mai, established when a sacred relic was carried by a white elephant who chose the site by trumpeting three times.
- Flavor: Thai Buddhist mountain temple. Firaxis associates with Siam in the Modern Age.

## Stats / numeric attributes

- Cost: 1000 Production
- Effect: +4 Influence; +5 Culture and Gold for each City-State the player is Suzerain of
- Prerequisite: Tier 2 Mandala (civic)
- Placement: Must be built on a Rough tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: influence
    value: +4
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +5
    per: 1
    resource: city-state-suzerainties
  - type: MODIFY_YIELD
    target: this-city
    yield: gold
    value: +5
    per: 1
    resource: city-state-suzerainties

## Notes / uncertainty

Per-suzerainty bonus rewards heavy city-state investment. A player with 4 suzerainties would gain +20 Culture and +20 Gold in this city. Mandala is Siam-specific. Rough placement restricts to hills.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
