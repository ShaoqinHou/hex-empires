# Notre Dame - Civ VII

**Slug:** notre-dame
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Notre_Dame_-_Exploration_Wonder - Fextralife

## Identity

- Historical period: Kingdom of France, 1163-1345 CE. Notre-Dame de Paris is a Gothic cathedral on the Ile de la Cite in Paris, renowned for its stained glass and flying buttresses.
- Flavor: Gothic cathedral of medieval Catholic France. Firaxis associates with France in the Exploration Age.

## Stats / numeric attributes

- Cost: 550 Production
- Effect: +4 Happiness; All Specialists yield +3 Culture during Celebrations; Start a Celebration immediately upon construction
- Prerequisite: [INFERRED] French or religious civic; specific not confirmed
- Placement: Adjacent to both a River and a District
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +4
  - type: MODIFY_YIELD
    target: specialist
    yield: culture
    value: +3
    condition: during-celebration
  - type: TRIGGER_EVENT
    event: start-celebration
    trigger: on-construction

## Notes / uncertainty

Immediate Celebration trigger is a one-time bonus at construction. Specialist culture bonus during celebrations rewards dense specialist cities. River + District dual adjacency is moderately restrictive.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
