# Thera - Civ VII

**Slug:** thera
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://gameranx.com/features/id/529321/article/civilization-7-all-natural-wonders-and-bonuses/ - Gameranx

## Identity

- Historical period: Aegean Sea, Greece. The island of Thera (Santorini) was formed by a massive volcanic eruption c. 1600 BCE that created a caldera; the catastrophic eruption may have contributed to the decline of Minoan civilization.
- Flavor: Aegean volcanic island with civilization-altering history. Map-placed natural wonder on Volcano terrain.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: Volcano tile (Marine/Island)
- Antiquity base bonus: +2 Happiness, +4 Culture per Age
- Special: Volcano tile effects apply
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
    yield: culture
    value: +4
    per-age: true

## Notes / uncertainty

Highest Culture bonus among natural wonders at +4/age base (+8 in Modern). Volcano placement on island terrain. One of two volcano natural wonders (alongside Mount Kilimanjaro). Island placement may make this harder to settle than mainland wonders.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
