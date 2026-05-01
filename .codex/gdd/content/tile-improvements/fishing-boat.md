# Fishing Boat -- Civ VII

**Slug:** fishing-boat
**Category:** tile-improvement
**Age:** antiquity
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://well-of-souls.com/civ/civ7_improvements.html -- Civ VII Analyst: Improvements

## Identity

The Fishing Boat is the water-tile rural improvement, placed on Navigable Rivers and Coast tiles with aquatic resources. It provides Food and makes aquatic resources (Fish, Pearls, Dyes, Whales) exploitable. Coastal cities depend on Fishing Boats for early Food output.

- Historical period: Universal -- maritime fishing spans all ages
- Flavor: Coastal Food source; enables aquatic luxury exploitation (Pearls, Whales, Dyes)

## Stats / numeric attributes

- Yield(s): +1 Food base; +1 Gold for luxury aquatic resources [INFERRED]
- Terrain required: Navigable Rivers or Coast tiles with aquatic resources
- Resource required: Fish, Pearls, Dyes, Whales (and other aquatic resources)
- Age availability: Antiquity through Modern
- Ageless: No
- Auto-placement: Yes -- game selects Fishing Boat for water tiles with aquatic resources

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: food
    value: +1

Town specialization: Farming Town adds +1 Food on Fishing Boats alongside Farms, Pastures, Plantations.

## Notes / uncertainty

Both Navigable Rivers (inland) and Coast tiles support Fishing Boats. Pearls and Whales as luxury resources provide additional Gold beyond base Food yield [INFERRED].

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._