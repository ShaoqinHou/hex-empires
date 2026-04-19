# Taj Mahal - Civ VII

**Slug:** taj-mahal
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Taj_Mahal_-_Modern_Wonder - Fextralife

## Identity

- Historical period: Mughal Empire (India), 1653 CE. The Taj Mahal in Agra was commissioned by Emperor Shah Jahan as a mausoleum for his wife Mumtaz Mahal; a UNESCO World Heritage Site and one of the New Seven Wonders of the World.
- Flavor: Mughal imperial monument of love and architectural perfection. Firaxis places in the Modern Age, associated with Mughal India.

## Stats / numeric attributes

- Cost: 1200 Production
- Effect: +5 Gold; +50% Celebration duration; +1 Wildcard Attribute point
- Prerequisite: [INFERRED] Mughal-associated civic; specific prerequisite not confirmed in sources
- Placement: Must be built on a Plains tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: gold
    value: +5
  - type: MODIFY_GLOBAL_STAT
    stat: celebration-duration
    value: 50-percent-increase
  - type: GRANT_ATTRIBUTE_POINT
    type: wildcard
    value: +1

## Notes / uncertainty

+1 Wildcard Attribute is a very rare bonus allowing flexible attribute allocation. +50% Celebration duration extends the celebration bonus window significantly. Specific prerequisite civic not confirmed in Fextralife data - listed as [INFERRED].

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
