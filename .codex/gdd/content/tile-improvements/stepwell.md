# Stepwell -- Civ VII

**Slug:** stepwell
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Stepwell_(Civ7) -- Fandom Stepwell page
- https://civilization.fandom.com/wiki/1.3.2_Update_(Civ7) -- 1.3.2 Update patch notes (Feb 3, 2026)

## Identity

The Stepwell is the Modern-age unique improvement of the Mughal India civilization. Stepwells (vav or baoli) are ancient and medieval subterranean water-harvesting structures found across the Indian subcontinent, providing community access to groundwater via descending stone steps. The Mughal Empire (1526-1857 CE) maintained and built many stepwells. In-game the Stepwell amplifies Farm yields in its settlement and provides Food from the tile itself.

- Historical period: Mughal Empire, Indian subcontinent, 1526-1857 CE
- Flavor: Farm-adjacent Food amplifier; non-adjacent spacing enforces distribution across the settlement

## Stats / numeric attributes

- Yield(s): +2 Food; +2 Food on all adjacent Farms (as of 1.3.2 update, February 2026)
- Terrain required: Flat tile only
- Placement restriction: Cannot be built adjacent to another Stepwell
- Resource required: None
- Age availability: Ageless (Modern civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: food
    value: +2
  - type: MODIFY_YIELD
    target: adjacent-farms
    yield: food
    value: +2

## Notes / uncertainty

1.3.2 Update (February 3, 2026) changed Stepwell from +2 Gold +2 Food-from-adjacent-Farms to +2 Food +2 Food-from-adjacent-Farms. The current (post-1.3.2) stats are what is documented here. Pre-patch stats had +2 Gold instead of +2 Food on the tile itself. Non-adjacent restriction confirmed. Flat terrain confirmed. Ageless confirmed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._