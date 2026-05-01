# Weiyang Palace - Civ VII

**Slug:** weiyang-palace
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Weiyang_Palace_-_Antiquity_Wonder - Fextralife
- https://game8.co/games/Civ-7/archives/498822 - Game8

## Identity

- Historical period: Han Dynasty China, c. 200 BCE. The Weiyang Palace was the largest palace complex ever built, covering 4.8 sq km in the capital as seat of Han imperial power.
- Flavor: Centralized bureaucratic power radiating from a palatial seat. Firaxis associates with Han civilization in Antiquity.

## Stats / numeric attributes

- Cost: 375 Production
- Effect: +6 Influence
- Prerequisite: Tier 1 Junzi (civic)
- Placement: Must be built on a Grassland tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: influence
    value: +6

## Notes / uncertainty

Influence drives city-state suzerainty and foreign policy. +6 flat is substantial for Antiquity. Grassland placement is favorable high-yield terrain. Tier 1 Junzi ties to Han civic tree but accessible to any civ.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
