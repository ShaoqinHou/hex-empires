# Oil Rig -- Civ VII

**Slug:** oil-rig
**Category:** tile-improvement
**Age:** modern
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://well-of-souls.com/civ/civ7_improvements.html -- Civ VII Analyst: Improvements

## Identity

The Oil Rig is the only Modern-age exclusive standard improvement, placed on tiles with Oil resource. It extracts Oil as a strategic resource for Modern units and power generation. It is the only standard improvement gated to a specific age.

- Historical period: Industrial-Modern era -- petroleum extraction from 1850s onward
- Flavor: Modern-only strategic resource extractor; unlocks oil-dependent units and buildings

## Stats / numeric attributes

- Yield(s): +2 Production or +1 Production +1 Gold [INFERRED -- exact values not confirmed]
- Terrain required: Any terrain with Oil resource
- Resource required: Oil (required -- Oil Rig is only valid on Oil tiles)
- Age availability: Modern only
- Tech prerequisite: Requires a Modern-age technology to unlock [INFERRED]
- Ageless: No
- Auto-placement: Yes -- game selects Oil Rig for Oil tiles once Modern age is reached

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: production
    value: +2

## Notes / uncertainty

Oil Rig is confirmed as Modern-only. Exact Production/Gold split not confirmed. Oil tiles in Antiquity/Exploration ages remain unimproved until Modern is reached [INFERRED]. Tech prerequisite name not sourced.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._