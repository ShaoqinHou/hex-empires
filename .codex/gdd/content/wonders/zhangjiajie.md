# Zhangjiajie - Civ VII

**Slug:** zhangjiajie
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://gameranx.com/features/id/529321/article/civilization-7-all-natural-wonders-and-bonuses/ - Gameranx

## Identity

- Historical period: Hunan Province, China. Zhangjiajie National Forest Park features thousands of pillar-like sandstone formations rising from the forest floor, up to 200 metres tall; partly inspired the floating mountains of Avatar.
- Flavor: Chinese pillar-rock forest natural wonder. Map-placed on Rough terrain.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: Rough terrain (Vegetated hills)
- Antiquity base bonus: +2 Happiness, +4 Production per Age
- Settlement bonus: +2 Culture on Rough terrain tiles within this settlement
- Age scaling: +50% in Exploration, +100% in Modern vs Antiquity base
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +2
    per-age: true
  - type: MODIFY_YIELD
    target: this-city
    yield: production
    value: +4
    per-age: true
  - type: MODIFY_YIELD
    target: rough-tile
    yield: culture
    value: +2

## Notes / uncertainty

Highest raw Production bonus among natural wonders at +4/age. The +2 Culture on rough terrain scales with the city rough tile count. Rough terrain placement on forested pillar-rock landscape.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
