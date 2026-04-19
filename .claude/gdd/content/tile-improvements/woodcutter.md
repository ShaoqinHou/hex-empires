# Woodcutter -- Civ VII

**Slug:** woodcutter
**Category:** tile-improvement
**Age:** antiquity
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://well-of-souls.com/civ/civ7_improvements.html -- Civ VII Analyst: Improvements
- https://www.pcgamer.com/games/strategy/civilization-7-review/ -- PC Gamer: Civ VII Review

## Identity

The Woodcutter is placed on Vegetated tiles (forest, jungle) with or without forest resources. It provides Production from wood-working and harvesting. Unlike Civ VI, there is no option to chop a forest for a one-time Production burst in Civ VII -- the Woodcutter works the forest sustainably.

- Historical period: Universal -- forestry spans all ages of civilization
- Flavor: Secondary Production source alongside Mine; preserves the forest tile while exploiting it

## Stats / numeric attributes

- Yield(s): +1 Production base [INFERRED]
- Terrain required: Vegetated tiles (tiles with Woods, Rainforest, or other forest features)
- Resource required: None required; also applies to Cocoa, Spices, Quinine, Rubber when present on Vegetated tiles
- Age availability: Antiquity through Modern
- Ageless: No
- Auto-placement: Yes -- game selects Woodcutter for Vegetated tiles and forest-resource tiles

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: production
    value: +1

Town specialization: Mining Town adds +1 Production on Woodcutters alongside Mines, Camps, Clay Pits, Quarries.

## Notes / uncertainty

Civ VII explicitly removes forest-chopping (PC Gamer review confirmed). Base Production yield inferred. Forest resources on Vegetated tiles (Cocoa, Spices, Quinine, Rubber) are exploited via the Woodcutter improvement rather than a dedicated Camp.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._