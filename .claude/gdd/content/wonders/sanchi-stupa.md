# Sanchi Stupa - Civ VII

**Slug:** sanchi-stupa
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Sanchi_Stupa_-_Antiquity_Wonder - Fextralife
- https://civilization.fandom.com/wiki/Sanchi_Stupa_(Civ7) - Fandom wiki

## Identity

- Historical period: Mauryan India, c. 3rd century BCE. The Great Stupa at Sanchi was commissioned by Emperor Ashoka, one of the oldest stone structures in India housing Buddhist relics.
- Flavor: Buddhist monument of the Maurya Empire. Firaxis associates with Maurya civilization in Antiquity.

## Stats / numeric attributes

- Cost: 375 Production (patched from 450 in August 2025)
- Effect: +2 Happiness; +1 Culture for every 5 excess Happiness in this Settlement
- Prerequisite: Tier 1 Mantriparishad (Maurya civic); moved to Skilled Trades Civic per patch
- Placement: Must be built on a Plains tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +2
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +1
    per: 5
    resource: happiness-excess

## Notes / uncertainty

Culture-from-excess-happiness formula is unique among Antiquity wonders. Cost reduced from 450 to 375 in August 2025 patch. Plains placement broadly accessible.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
