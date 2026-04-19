# Clay Pit -- Civ VII

**Slug:** clay-pit
**Category:** tile-improvement
**Age:** antiquity
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://well-of-souls.com/civ/civ7_improvements.html -- Civ VII Analyst: Improvements

## Identity

The Clay Pit is placed on Wet terrain tiles -- marshes, floodplains, and moisture-heavy ground -- to extract clay and earth materials for Production. It converts difficult-to-work wet terrain into a productive rural improvement.

- Historical period: Universal -- clay extraction is foundational to ceramics, bricks, and pottery from Antiquity onward
- Flavor: Converts swampy terrain into productive rural tiles; niche Production source

## Stats / numeric attributes

- Yield(s): +1 Production [INFERRED]
- Terrain required: Wet tiles (Marsh, Floodplains, or other Wet-tagged terrain)
- Resource required: None required (terrain type alone determines eligibility)
- Age availability: Antiquity through Modern
- Ageless: No
- Auto-placement: Yes -- game selects Clay Pit for Wet terrain tiles

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: production
    value: +1

Town specialization: Mining Town adds +1 Production on Clay Pits alongside Mines, Woodcutters, Camps, Quarries.

## Notes / uncertainty

Base yield not numerically confirmed. Floodplain tiles may be contested between Clay Pit and Farm depending on Wet vs. Flat terrain tag overlap [INFERRED].

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._