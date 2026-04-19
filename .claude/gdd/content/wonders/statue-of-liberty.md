# Statue of Liberty - Civ VII

**Slug:** statue-of-liberty
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Statue_of_Liberty_-_Modern_Wonder - Fextralife

## Identity

- Historical period: United States of America, 1886 CE. The Statue of Liberty on Liberty Island in New York Harbor was a gift from France symbolizing Franco-American friendship and the ideals of freedom.
- Flavor: Icon of immigration and democratic aspiration. Firaxis associates with America in the Modern Age.

## Stats / numeric attributes

- Cost: 1400 Production
- Effect: +6 Happiness; Spawns 4 Migrants
- Prerequisite: Tier 1 Wartime Manufacturing (civic)
- Placement: Must be built on a Coast tile adjacent to Land
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +6
  - type: GRANT_UNIT
    unit: migrant
    count: 4

## Notes / uncertainty

Migrants are civilian units that trigger population growth events when settled. Spawning 4 at once represents a significant population injection in the Modern Age. Coast adjacent to land requirement is broadly achievable on coastal cities.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
