# Chengde Mountain Resort - Civ VII

**Slug:** chengde-mountain-resort
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Chengde_Mountain_Resort_-_Modern_Wonder - Fextralife

## Identity

- Historical period: Qing Dynasty China, 1703-1792 CE. The Chengde Mountain Resort (Bishu Shanzhuang) was the Qing imperial summer palace north of Beijing, the largest imperial garden in China covering 564 hectares.
- Flavor: Qing imperial diplomacy conducted in a mountain garden setting. Firaxis associates with Qing China in the Modern Age.

## Stats / numeric attributes

- Cost: 1400 Production
- Effect: +6 Gold; +5% Culture for every other civilization with which the player has a Trade Route
- Prerequisite: Tier 1 Stabilizing Frontier (civic)
- Placement: Adjacent to a Mountain
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: gold
    value: +6
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: 5-percent-per-trade-route

## Notes / uncertainty

Culture-per-trade-route scales with diplomatic breadth. A civilization with 5 active trade routes would gain +25% Culture in this city. Mountain adjacency restricts placement to mountainous terrain. Stabilizing Frontier is Qing-specific.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
