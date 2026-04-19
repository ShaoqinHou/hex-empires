# Camp -- Civ VII

**Slug:** `camp`
**Category:** `tile-improvement`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://well-of-souls.com/civ/civ7_improvements.html -- Civ VII Analyst: Improvements
- https://civilization.fandom.com/wiki/List_of_improvements_in_Civ7 -- Fandom improvements list

## Identity

The Camp is placed on animal resource tiles -- Ivory, Camels, Hides, Furs, Truffles -- converting wild-animal luxury resources into exploitable yields. Camps generate Production and/or Gold while making the resource accessible. Unlike VI, no Builder charges needed; population growth auto-places.

- Historical period: Universal -- hunting camps predate settled agriculture
- Flavor: Luxury extractor from animal resources; contributes to Production alongside Mine and Woodcutter

## Stats / numeric attributes

- Yield(s): +1 Production or +1 Gold depending on resource type [INFERRED]
- Terrain required: Any terrain bearing an animal resource
- Resource required: Ivory, Camels, Hides, Furs, or Truffles
- Age availability: Antiquity through Modern
- Ageless: No
- Auto-placement: Yes -- game selects Camp for animal-resource tiles

## Unique effects (structured)

```yaml
effects:
  - type: MODIFY_YIELD
    target: tile
    yield: production
    value: +1
```

Town specialization: Mining Town adds +1 Production on Camps alongside Mines, Woodcutters, Clay Pits, Quarries.

## Notes / uncertainty

Base yield split not confirmed per resource type. Truffles may yield Gold rather than Production [INFERRED from luxury vs strategic resource distinction].

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._