# Brihadeeswarar Temple - Civ VII

**Slug:** brihadeeswarar-temple
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Brihadeeswarar_Temple_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Chola Empire (India), 1010 CE. The Brihadeeswarar Temple at Thanjavur is a masterwork of Dravidian architecture, built under Raja Raja I with a 66-metre vimana tower.
- Flavor: South Indian temple-state power. Firaxis places this in the Exploration Age, associated with Chola civilization.

## Stats / numeric attributes

- Cost: 475 Production
- Effect: +3 Influence; All Buildings receive +1 Happiness Adjacency for Navigable Rivers
- Prerequisite: Tier 1 Monsoon Winds (technology)
- Placement: Adjacent to a Navigable River or on a Minor River
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: influence
    value: +3
  - type: MODIFY_ADJACENCY_BONUS
    target: all-buildings
    condition: adjacent-to-navigable-river
    yield: happiness
    value: +1

## Notes / uncertainty

The global adjacency bonus (+1 Happiness to all buildings near navigable rivers) is unusually powerful in navigable-river cities. Placement itself requires navigable or minor river adjacency. Monsoon Winds is a tech prerequisite rather than a civic, which is less common for wonders.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
