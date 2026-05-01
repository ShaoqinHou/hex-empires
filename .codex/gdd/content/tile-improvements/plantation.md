# Plantation -- Civ VII

**Slug:** `plantation`
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

The Plantation converts agricultural luxury resource tiles into worked outputs. It places on Cotton, Dates, Silk, Wine, Sugar, Tea, Coffee, Tobacco, and Incense tiles, generating Gold and/or Food while making the luxury accessible for diplomacy and civic bonuses.

- Historical period: Universal -- plantation agriculture spans Antiquity spice-trade through Exploration colonial economies
- Flavor: Luxury harvester; key to Gold income and happiness-resource access

## Stats / numeric attributes

- Yield(s): +1 Gold or +1 Food depending on resource type [INFERRED -- exact split not confirmed per resource]
- Terrain required: Any terrain bearing an agricultural luxury resource
- Resource required: Cotton, Dates, Silk, Wine, Sugar, Tea, Coffee, Tobacco, Incense
- Age availability: Antiquity through Modern (age-gated by resource system)
- Ageless: No
- Auto-placement: Yes -- game selects Plantation for agricultural-luxury tiles

## Unique effects (structured)

```yaml
effects:
  - type: MODIFY_YIELD
    target: tile
    yield: gold
    value: +1
```

Warehouse bonus: Granary, Gristmill, Grocer add +1 Food on Plantations.
Town specialization: Farming Town covers Plantations alongside Farms, Pastures, Fishing Boats.

## Notes / uncertainty

Yield split between Food and Gold varies by specific resource type -- not confirmed per-resource. Some luxury resources only appear in later ages; the Plantation improvement itself is available from Antiquity.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._