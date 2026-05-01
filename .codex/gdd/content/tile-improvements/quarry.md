# Quarry -- Civ VII

**Slug:** `quarry`
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

The Quarry extracts stone-category luxury resources -- Marble, Gypsum, Jade, Kaolin -- providing Production while making the luxury resource exploitable for trade and civic effects. Quarries are placed on rough tiles bearing these resources.

- Historical period: Universal -- stone quarrying spans Antiquity through Modern age
- Flavor: Secondary Production source; supplies marble for wonders and gypsum for construction

## Stats / numeric attributes

- Yield(s): +1 Production [INFERRED]; gains additional Production from warehouse buildings (Brickyard, Masonry, Stonecutter, Guilds II, Ironworks, Industrialization II)
- Terrain required: Rough terrain with stone resource
- Resource required: Marble, Gypsum, Jade, or Kaolin
- Age availability: Antiquity through Modern
- Ageless: No
- Auto-placement: Yes -- game selects Quarry for stone-resource tiles

## Unique effects (structured)

```yaml
effects:
  - type: MODIFY_YIELD
    target: tile
    yield: production
    value: +1
```

Town specialization: Mining Town adds +1 Production on Quarries alongside Mines, Camps, Woodcutters, and Clay Pits.

## Notes / uncertainty

Base yield not numerically confirmed; shares the Mining Town bonus category with Mine. Marble may grant additional Gold for trade [INFERRED].

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._