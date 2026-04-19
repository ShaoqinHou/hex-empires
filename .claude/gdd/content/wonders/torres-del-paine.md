# Torres del Paine - Civ VII

**Slug:** torres-del-paine
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://gameranx.com/features/id/529321/article/civilization-7-all-natural-wonders-and-bonuses/ - Gameranx

## Identity

- Historical period: Chilean Patagonia. Torres del Paine National Park features dramatic granite towers (the Torres), blue icebergs, and glaciers in southern Chile near the southern tip of the Andes.
- Flavor: Patagonian mountain wilderness. Map-placed natural wonder.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: Rough terrain (mountain region)
- Antiquity base bonus: +2 Food, +4 Happiness per Age
- Special ability: Land units permanently ignore Rough terrain movement penalty
- Age scaling: +50% in Exploration, +100% in Modern vs Antiquity base
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: food
    value: +2
    per-age: true
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +4
    per-age: true
  - type: GRANT_ABILITY
    target: all-land-units
    ability: ignore-rough-terrain-movement

## Notes / uncertainty

The permanent rough terrain ignore for all land units is one of the most strategically impactful natural wonder bonuses - eliminates the deplete-movement penalty for hills, forests, and vegetated terrain globally for the settling civ. This is a civilization-wide effect, not city-scoped.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
