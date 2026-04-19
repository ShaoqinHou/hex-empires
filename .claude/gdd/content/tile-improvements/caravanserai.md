# Caravanserai -- Civ VII

**Slug:** caravanserai
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Caravanserai_(Civ7) -- Fandom Caravanserai page
- https://civilization.2k.com/civ-vii/game-guide/civilizations/songhai/ -- Firaxis Songhai civ guide

## Identity

The Caravanserai is the Exploration-age unique improvement of the Songhai civilization. Caravanserais were roadside inns and trade stations that supported merchants along the trans-Saharan and Silk Road trade routes. The Songhai Empire (1464-1591 CE) controlled key trade nodes in West Africa. In-game the Caravanserai is a high-Gold improvement that scales with river and resource adjacency.

- Historical period: Songhai Empire, West Africa, 1464-1591 CE
- Flavor: Gold generator and trade amplifier; Desert/Plains placement reflects the Saharan trade route context

## Stats / numeric attributes

- Yield(s): +5 Gold base; +1 Gold for each adjacent Navigable River tile; +1 Gold for each adjacent Resource
- Terrain required: Desert or Plains tiles
- Resource required: None
- Age availability: Ageless (Exploration civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: gold
    value: +5
  - type: MODIFY_YIELD
    target: per-adjacent-navigable-river
    yield: gold
    value: +1
  - type: MODIFY_YIELD
    target: per-adjacent-resource
    yield: gold
    value: +1

## Notes / uncertainty

+5 Gold base, +1 Gold per adjacent Navigable River, +1 Gold per adjacent Resource sourced from Fandom Caravanserai page via web search. Desert/Plains terrain restriction confirmed. Ageless confirmed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._