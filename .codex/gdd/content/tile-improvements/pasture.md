# Pasture -- Civ VII

**Slug:** `pasture`
**Category:** `tile-improvement`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://civilization.fandom.com/wiki/Pasture_(Civ7) -- Fandom Pasture page
- https://well-of-souls.com/civ/civ7_improvements.html -- Civ VII Analyst: Improvements

## Identity

The Pasture is placed on livestock resource tiles to make those resources exploitable and generate Food. Horses are a strategic resource enabling mounted unit production; Wool is a luxury. Pastures unlock cavalry and provide animal-product luxuries for diplomacy.

- Historical period: Universal -- herding predates civilization
- Flavor: Food plus strategic access; the improvement that unlocks Horses for cavalry units

## Stats / numeric attributes

- Yield(s): +1 Food base [INFERRED]; gains +1 Food from Granary, +1 Food from Gristmill, +1 Food from Grocer
- Terrain required: Any terrain with livestock resource
- Resource required: Horses or Wool (Antiquity/Exploration); eligible resources may shift across ages [INFERRED]
- Age availability: Antiquity through Modern
- Ageless: No
- Auto-placement: Yes -- game selects Pasture for livestock-resource tiles

## Unique effects (structured)

```yaml
effects:
  - type: MODIFY_YIELD
    target: tile
    yield: food
    value: +1
```

Warehouse bonus: Granary, Gristmill, Grocer each add +1 Food.
Town specialization: Farming Town adds +1 Food on Pastures alongside Farms, Plantations, Fishing Boats.

## Notes / uncertainty

Horses unlocked by Pasture enable cavalry unit production [INFERRED -- consistent with Civ-series design]. Exact resource list across ages unconfirmed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._