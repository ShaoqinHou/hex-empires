# Mount Kilimanjaro - Civ VII

**Slug:** mount-kilimanjaro
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://gameranx.com/features/id/529321/article/civilization-7-all-natural-wonders-and-bonuses/ - Gameranx

## Identity

- Historical period: Tanzania/Kenya border. Mount Kilimanjaro is the highest mountain in Africa at 5,895 metres, a dormant stratovolcano with three volcanic cones; a UNESCO World Heritage Site.
- Flavor: African volcanic peak. Map-placed natural wonder on Volcano terrain.

## Stats / numeric attributes

- Natural wonder type: map-placed, not constructable
- Placement type: Volcano tile
- Antiquity base bonus: +2 Production, +4 Happiness per Age
- Special: Volcano tile effects apply
- Age scaling: +50% in Exploration, +100% in Modern vs Antiquity base
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: production
    value: +2
    per-age: true
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +4
    per-age: true

## Notes / uncertainty

Volcano tile placement means this wonder shares tile behavior with volcanic eruption mechanics (if any). High Production + Happiness combination makes this useful for both economic and population growth. One of two volcano natural wonders (alongside Thera).

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
