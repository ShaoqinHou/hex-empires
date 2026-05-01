# Mine -- Civ VII

**Slug:** `mine`
**Category:** `tile-improvement`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://civilization.fandom.com/wiki/Mine_(Civ7) -- Fandom Mine page
- https://well-of-souls.com/civ/civ7_improvements.html -- Civ VII Analyst: Improvements

## Identity

The Mine is the primary Production improvement, auto-placed on Rough terrain tiles (Hills, Mountains) with mineral resources. It extracts Iron, Gold, Silver, Salt, Niter, Coal, and Aluminium. Along with the Woodcutter it is the main source of Production in the early game.

- Historical period: Universal -- mining spans pre-modern and industrial economies
- Flavor: Core production driver; enables military unit production and wonder construction

## Stats / numeric attributes

- Yield(s): +1 Production base [INFERRED]; gains additional Production from Brickyard, Masonry, Stonecutter, Guilds II, Ironworks, and Industrialization II warehouse buildings
- Terrain required: Rough (Hills, Mountains) OR tiles with mineral resources (Iron, Gold, Silver, Salt, Niter, Coal, Aluminium)
- Resource required: Mineral resource OR Rough unresourced terrain
- Age availability: Antiquity through Modern
- Ageless: No
- Auto-placement: Yes -- game selects Mine for mineral-resource or unresourced rough terrain

## Unique effects (structured)

```yaml
effects:
  - type: MODIFY_YIELD
    target: tile
    yield: production
    value: +1
```

Warehouse bonus: Brickyard, Masonry, Stonecutter, Guilds II, Ironworks, Industrialization II each add +1 Production.
Town specialization: Mining Town adds +1 Production on Mines, Camps, Woodcutters, Clay Pits, and Quarries.

## Notes / uncertainty

Base Production yield not numerically confirmed; +1 Production is inferred from Fandom and forum context. Strategic resources (Iron, Niter, Coal) mined via Mine become available for unit production [INFERRED -- consistent with Civ-series design].

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._