# Tomb of Askia - Civ VII

**Slug:** tomb-of-askia
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Tomb_of_Askia_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Songhai Empire (Mali), 1495 CE. The Tomb of Askia at Gao was built by Askia Muhammad I after his pilgrimage to Mecca; a UNESCO World Heritage site comprising a pyramid-like mud-brick mausoleum.
- Flavor: West African Islamic monument of the Songhai Empire. Firaxis associates with an African civilization in the Exploration Age.

## Stats / numeric attributes

- Cost: 400 Production
- Effect: +2 Gold; +2 Resource Capacity; +2 Gold and +1 Production for each Resource assigned to this Settlement
- Prerequisite: Tier 1 Ships of the Desert (civic)
- Placement: Must be built on a Desert tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: gold
    value: +2
  - type: MODIFY_CITY_STAT
    target: this-city
    stat: resource-capacity
    value: +2
  - type: MODIFY_YIELD
    target: this-city
    yield: gold
    value: +2
    per: 1
    resource: assigned-resources
  - type: MODIFY_YIELD
    target: this-city
    yield: production
    value: +1
    per: 1
    resource: assigned-resources

## Notes / uncertainty

Per-assigned-resource bonus makes this most powerful in cities with many resources assigned. Desert placement restricts to arid regions. Ships of the Desert is Songhai/African-specific.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
