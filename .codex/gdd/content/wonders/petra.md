# Petra - Civ VII

**Slug:** petra
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Petra_-_Antiquity_Wonder - Fextralife

## Identity

- Historical period: Nabataean Kingdom (Jordan), c. 300 BCE. Petra is the rock-cut capital of the Nabataean Kingdom, famous for its carved-stone facades including the Treasury; a UNESCO World Heritage Site and one of the New Seven Wonders of the World.
- Flavor: Desert trade city carved from rose-red stone. Firaxis associates with a Middle Eastern/Arabian civilization in the Antiquity Age.

## Stats / numeric attributes

- Cost: 375 Production
- Effect: +2 Gold; +1 Gold and +1 Production on all Desert terrain tiles in this Settlement
- Prerequisite: [INFERRED] not confirmed in sources
- Placement: Must be built on Desert terrain
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: gold
    value: +2
  - type: MODIFY_YIELD
    target: desert-tile
    yield: gold
    value: +1
  - type: MODIFY_YIELD
    target: desert-tile
    yield: production
    value: +1

## Notes / uncertainty

Per-Desert-tile bonus scales with how many desert tiles are in the settlement workable area, making this much stronger in arid starts. Desert placement requirement aligns with the historical Arabian location. Prerequisite not confirmed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
