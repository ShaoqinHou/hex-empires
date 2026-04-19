# Nalanda - Civ VII

**Slug:** nalanda
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Nalanda_-_Antiquity_Wonder - Fextralife

## Identity

- Historical period: Gupta Empire (Bihar, India), c. 5th-12th century CE. Nalanda Mahavihara was the most famous center of Buddhist learning in the ancient world, attracting scholars from across Asia for over 700 years before destruction by Bakhtiyar Khilji in 1193 CE.
- Flavor: Buddhist university and center of ancient Indian scholarship. Firaxis associates with an Indian civilization in the Antiquity Age.

## Stats / numeric attributes

- Cost: 450 Production
- Effect: +3 Science; Gain 1 Codex with 2 Codex Slots; +1 Scientific Attribute Point
- Prerequisite: Literacy civic
- Placement: Must be built on a Plains tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: science
    value: +3
  - type: GRANT_RESOURCE
    resource: codex
    value: 1
  - type: MODIFY_CITY_STAT
    target: this-city
    stat: codex-slots
    value: +2
  - type: GRANT_ATTRIBUTE_POINT
    type: scientific
    value: +1

## Notes / uncertainty

Codex Slots hold codices for additional science bonuses; 2 extra slots from this wonder extend the codex science pipeline. The immediate +1 Codex grant is a one-time bonus at construction. +1 Scientific Attribute Point is a rare bonus affecting technology research.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
