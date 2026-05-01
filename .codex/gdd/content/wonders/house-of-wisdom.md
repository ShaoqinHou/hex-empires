# House of Wisdom - Civ VII

**Slug:** house-of-wisdom
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/House_of_Wisdom_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Abbasid Caliphate (Baghdad), 8th-13th century CE. The House of Wisdom was the pre-eminent center of learning in the medieval world, translating and preserving Greek, Persian, and Indian manuscripts.
- Flavor: Islamic Golden Age science hub. Firaxis associates with Abbasid civilization in the Exploration Age.

## Stats / numeric attributes

- Cost: 475 Production
- Effect: +3 Science; +2 Science from Great Works; Gain 3 Relics; Has 3 Relic slots
- Prerequisite: Tier 2 Al-Jabr (technology)
- Placement: Adjacent to an Urban tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: science
    value: +3
  - type: MODIFY_YIELD
    target: great-work-slots
    yield: science
    value: +2
  - type: GRANT_RESOURCE
    resource: relic
    value: 3

## Notes / uncertainty

The immediate relic grant (3 relics) is a one-time bonus at construction. The 3 Relic slots provide ongoing Science from great works placed there. Tier 2 Al-Jabr places this as a mid-to-late Exploration wonder. Urban tile adjacency is broadly accessible.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
