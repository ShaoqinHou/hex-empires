# Potkop -- Civ VII

**Slug:** potkop
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Potkop_(Civ7) -- Fandom Potkop page
- https://civilization.2k.com/civ-vii/game-guide/civilizations/mississippian/ -- Firaxis Mississippian civ guide

## Identity

The Potkop is the Antiquity-age unique improvement of the Mississippian civilization. The Mississippian culture (800-1600 CE) built large earthen mounds (potkop in Choctaw tradition) at ceremonial and trade centers such as Cahokia. In-game the Potkop is a resource-adjacency improvement that scales with nearby resources.

- Historical period: Mississippian culture, North America, 800-1600 CE
- Flavor: Resource-adjacency scaler; rewards building the Mississippian empire near diverse resources

## Stats / numeric attributes

- Yield(s): +1 Gold; +1 Food for each adjacent Resource
- Terrain required: Flat tile only
- Resource required: None
- Age availability: Ageless (Antiquity civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: gold
    value: +1
  - type: MODIFY_YIELD
    target: per-adjacent-resource
    yield: food
    value: +1

## Notes / uncertainty

+1 Gold and +1 Food per adjacent Resource sourced from Fandom Potkop page and CivFanatics community search. Flat-tile restriction confirmed. Adjacent Resources include both improved and unimproved resource tiles [INFERRED from standard adjacency mechanics].

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._