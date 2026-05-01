# Obshchina -- Civ VII

**Slug:** obshchina
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Obshchina_(Civ7) -- Fandom Obshchina page
- https://civilization.2k.com/civ-vii/game-guide/civilizations/russia/ -- Firaxis Russia civ guide
- https://support.civilization.com/hc/en-us/articles/41630356903443-Civilization-VII-Patch-Notes-May-27-2025 -- Patch notes (patch rework)

## Identity

The Obshchina is the Modern-age unique improvement of the Russian civilization. In Tsarist Russia, the obshchina (commune) was a collective land-tenure system where individuals farmed personal plots but the collective controlled redistribution. In-game the Obshchina amplifies Farm yields in the settlement and provides Culture bonus in Tundra, reflecting Russian agricultural tradition and vast northern territories.

- Historical period: Imperial Russia, 18th-19th centuries CE
- Flavor: Farm yield amplifier and Tundra Culture generator; rewards Russian Tundra settlement

## Stats / numeric attributes

- Yield(s): +2 Culture if built on Tundra; +2 Food on all Farms in this Settlement
- Terrain required: Any flat terrain (Tundra gives bonus Culture)
- Resource required: None
- Placement restriction: Cannot be built adjacent to another Obshchina
- Age availability: Ageless (Modern civ-unique; persists across all age transitions)
- Ageless: Yes
- Special: Does not remove Warehouse bonuses on the tile

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile-if-tundra
    yield: culture
    value: +2
  - type: MODIFY_YIELD
    target: all-farms-in-settlement
    yield: food
    value: +2

## Notes / uncertainty

+2 Culture on Tundra and +2 Food on all Farms in settlement sourced from patch notes (May 27, 2025 rework) and Fandom. Original pre-patch stats differed. Non-adjacent restriction confirmed. Does not remove Warehouse bonuses confirmed from patch notes. Ageless confirmed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._