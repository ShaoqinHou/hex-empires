# Ortoo -- Civ VII

**Slug:** ortoo
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Ortoo_(Civ7) -- Fandom Ortoo page (Oertoo)
- https://civ7.wiki.fextralife.com/Mongolia_-_Exploration_Civilization -- Fextralife Mongolia civ

## Identity

The Ortoo (or Oertoo) is the Exploration-age unique improvement of the Mongolian civilization. The ortoo was a relay station system created by Genghis Khan that spanned the Mongol Empire, allowing rapid communication and military movement across vast distances. In-game it provides Gold and restores the movement of units that move onto it.

- Historical period: Mongol Empire, 13th-14th centuries CE
- Flavor: Movement relay station; enables rapid Mongolian army repositioning across the map

## Stats / numeric attributes

- Yield(s): +5 Gold base; restores full movement to units that move onto this tile
- Terrain required: Flat terrain; NOT Rough, NOT River edge, NOT tiles with a feature
- Resource required: None
- Age availability: Ageless (Exploration civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: gold
    value: +5
  - type: GRANT_MOVEMENT_RESTORE
    target: units-moving-onto-tile
    value: full-movement-restore

## Notes / uncertainty

+5 Gold and movement restoration sourced from Fandom via CivFanatics community search. Placement restriction (no Rough, River, or feature tiles) confirmed. The movement-restore mechanic is a unique non-yield effect -- units passing through regain their movement allowance, enabling the Mongolian army to strike from unexpected distances.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._