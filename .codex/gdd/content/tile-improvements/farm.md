# Farm -- Civ VII

**Slug:** `farm`
**Category:** `tile-improvement`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://well-of-souls.com/civ/civ7_improvements.html -- Civ VII Analyst: Improvements
- https://forums.civfanatics.com/threads/tiles-resources-and-improvements-a-guide-to-explaining-yields.382196/ -- CivFanatics Yields Guide

## Identity

The Farm is the foundational rural improvement placed on flat terrain to sustain population growth. Civ VII auto-selects Farm when population is assigned to a flat, non-Vegetated, non-Wet tile with no resource. Unlike Civ VI, the player selects the tile and the game picks the improvement type from terrain context.

- Historical period: Universal -- agricultural development across all ages
- Flavor: Population-growth engine; the most commonly placed improvement in the early game

## Stats / numeric attributes

- Yield(s): +2 Food [INFERRED -- base value not numerically confirmed in accessible sources; inferred from Civ-series precedent]
- Terrain required: Flat (Grassland, Plains, Tropical) -- NOT Vegetated, NOT Wet
- Resource required: None (resource-free tiles only; resource tiles receive Plantation, Pasture, or Camp)
- Age availability: Antiquity through Modern
- Ageless: No (standard rural improvement; likely persists across transitions but no Ageless tag)
- Auto-placement: Yes -- player selects tile; game auto-selects improvement type

## Unique effects (structured)

```yaml
effects:
  - type: MODIFY_YIELD
    target: tile
    yield: food
    value: +2
```

Warehouse bonus: Granary (+1 Food), Gristmill (+1 Food), Grocer (+1 Food) on Farm tiles.
Town specialization: Farming Town adds +1 Food on Farms, Pastures, Plantations, and Fishing Boats.

## Notes / uncertainty

Base Food yield not numerically confirmed in any accessible source. River adjacency may grant an additional +1 Food [INFERRED]. Farms are referenced by civ-unique improvements (Obshchina, Stepwell, Lo_i Kalo) that provide bonuses from adjacent Farms.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._