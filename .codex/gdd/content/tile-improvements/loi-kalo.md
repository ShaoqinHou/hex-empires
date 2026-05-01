# Lo_i Kalo -- Civ VII

**Slug:** loi-kalo
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Lo_i_Kalo_(Civ7) -- Fandom Lo_i Kalo page
- https://civilization.2k.com/civ-vii/game-guide/civilizations/hawaii/ -- Firaxis Hawaii civ guide

## Identity

The Lo_i Kalo (taro patch) is the Exploration-age unique improvement of the Hawaiian civilization. Lo_i kalo are traditional Hawaiian flooded field systems for growing karo, requiring irrigation from mountain streams redirected through stone dams. In-game it combines high Food and Production with Culture bonuses from adjacent Fishing Boats.

- Historical period: Traditional Hawaiian agriculture, Polynesian Hawaii pre-1778
- Flavor: High-yield Food+Production tile with coastal synergy; rewards placing near Fishing Boats

## Stats / numeric attributes

- Yield(s): +3 Food; +2 Production; +1 Culture from each adjacent Fishing Boat
- Terrain required: Grassland or Tropical tiles
- Resource required: None
- Civic bonus: Ohana Civic grants +2 Culture to Lo_i Kalo in settlements with a Pavilion
- Age availability: Ageless (Exploration civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: food
    value: +3
  - type: MODIFY_YIELD
    target: tile
    yield: production
    value: +2
  - type: MODIFY_YIELD
    target: per-adjacent-fishing-boat
    yield: culture
    value: +1

## Notes / uncertainty

+3 Food, +2 Production, and +1 Culture per adjacent Fishing Boat sourced from Fandom. Ohana Civic interaction confirmed. Grassland/Tropical terrain restriction confirmed. Ageless confirmed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._