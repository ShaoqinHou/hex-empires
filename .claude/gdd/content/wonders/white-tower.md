# White Tower - Civ VII

**Slug:** white-tower
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/White_Tower_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Norman England, 1078 CE. The White Tower (Tower of London) was built by William the Conqueror as a symbol of Norman authority, serving as fortress, palace, and later prison.
- Flavor: Norman feudal stronghold and seat of royal power. Firaxis associates with Norman civilization in the Exploration Age.

## Stats / numeric attributes

- Cost: 550 Production
- Effect: +4 Happiness in this Settlement; +4 Happiness for each Tradition slotted in the Government
- Prerequisite: Tier 2 Domesday Book civic (Norman civilization)
- Placement: Adjacent to a City Hall
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +4
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +4
    per: 1
    resource: government-traditions-slotted

## Notes / uncertainty

Happiness scales with government Traditions, making this most powerful in civs with fully-slotted governments. City Hall adjacency is restrictive - must be near the administrative center tile. Domesday Book is Norman-specific.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
