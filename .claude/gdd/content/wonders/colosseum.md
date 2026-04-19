# Colosseum - Civ VII

**Slug:** colosseum
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Colosseum+-+Antiquity+Wonder - Fextralife individual wonder page

## Identity

- Historical period: Roman Empire, completed 80 CE. The Flavian Amphitheatre held up to 80,000 spectators for gladiatorial contests.
- Flavor: Roman civic entertainment hub. Firaxis associates with Rome in the Antiquity Age.

## Stats / numeric attributes

- Cost: 450 Production
- Effect: +3 Culture; +2 Happiness on all Quarters in this Settlement
- Prerequisite: Entertainment + Senatus Populusque Romanus civics
- Placement: Adjacent to a District
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +3
  - type: MODIFY_YIELD
    target: quarter-tiles
    yield: happiness
    value: +2

## Notes / uncertainty

Dual civic prerequisite (Entertainment + Senatus Populusque Romanus) makes this primarily Roman, though any civ unlocking both civics may build it. +2 Happiness on Quarters incentivizes quarter formation.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._