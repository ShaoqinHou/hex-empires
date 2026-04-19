# El Escorial - Civ VII

**Slug:** el-escorial
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/El_Escorial_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Spanish Empire, 1584 CE. El Escorial is King Philip II royal monastery-palace complex near Madrid, built as seat of the Spanish Crown and mausoleum of the Spanish monarchs.
- Flavor: Counter-Reformation imperial power center. Firaxis associates with Spain in the Exploration Age.

## Stats / numeric attributes

- Cost: 475 Production
- Effect: +3 Happiness; +1 Settlement Limit; +4 Happiness on Cities within 7 tiles of this Wonder; 3 Relic slots
- Prerequisite: Tier 2 New World Riches (technology)
- Placement: Must be built on a Rough tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +3
  - type: MODIFY_GLOBAL_STAT
    stat: settlement-limit
    value: +1
  - type: MODIFY_YIELD
    target: nearby-cities
    yield: happiness
    value: +4
    radius: 7

## Notes / uncertainty

+1 Settlement Limit is a globally rare bonus (allows one extra city or town). The area-of-effect +4 Happiness to nearby cities within 7 tiles is one of the few wonders with an empire-wide geographic spread effect. New World Riches links to Spanish colonialism theme.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
