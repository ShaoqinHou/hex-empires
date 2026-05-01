# Brandenburg Gate - Civ VII

**Slug:** brandenburg-gate
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Brandenburg_Gate_-_Modern_Wonder - Fextralife

## Identity

- Historical period: Kingdom of Prussia, 1791 CE. The Brandenburg Gate in Berlin was commissioned by Prussian King Frederick William II as a symbol of peace, later becoming the most recognized symbol of German reunification.
- Flavor: Prussian military-state monument becoming a symbol of national unity. Firaxis associates with Germany in the Modern Age.

## Stats / numeric attributes

- Cost: 750 Production
- Effect: +6 Production; This Settlement suffers no Happiness penalty from War Weariness; +5 Happiness in conquered Settlements
- Prerequisite: Tier 1 Ems Dispatch (civic)
- Placement: Adjacent to a District
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: production
    value: +6
  - type: NEGATE_PENALTY
    target: this-city
    penalty: war-weariness-happiness
  - type: MODIFY_YIELD
    target: conquered-settlements
    yield: happiness
    value: +5

## Notes / uncertainty

War Weariness negation is a unique effect among wonders. +5 Happiness in conquered settlements reduces the stability penalty from conquest, enabling more aggressive expansion. Lowest production cost among Modern wonders (750 vs 1000-1400 average).

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
