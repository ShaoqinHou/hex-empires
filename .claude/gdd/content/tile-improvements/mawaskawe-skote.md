# Mawaskawe Skote -- Civ VII

**Slug:** mawaskawe-skote
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Mawaskawe_Skote_(Civ7) -- Fandom Mawaskawe Skote page
- https://civilization.2k.com/civ-vii/game-guide/civilizations/shawnee/ -- Firaxis Shawnee civ guide

## Identity

The Mawaskawe Skote is the Exploration-age unique improvement of the Shawnee civilization. The Shawnee people (Algonquian, Eastern Woodlands) maintained a deep relationship with forested territories. In-game it is a forest-tile improvement that scales with surrounding resources, rewarding the Shawnee player for settling near diverse resource patches.

- Historical period: Shawnee people, Eastern Woodlands North America, Exploration-era contact period
- Flavor: Food and resource-adjacency scaler; cannot be clustered -- each tile stands alone

## Stats / numeric attributes

- Yield(s): +4 Food; +1 Gold for each adjacent Resource
- Terrain required: Vegetated tile (forest, jungle)
- Resource required: None
- Placement restriction: Cannot be built adjacent to another Mawaskawe Skote
- Age availability: Ageless (Exploration civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: food
    value: +4
  - type: MODIFY_YIELD
    target: per-adjacent-resource
    yield: gold
    value: +1

## Notes / uncertainty

+4 Food and +1 Gold per adjacent Resource sourced from Fandom Mawaskawe Skote page via web search. Non-adjacent restriction confirmed. Vegetated terrain requirement confirmed. Ageless confirmed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._