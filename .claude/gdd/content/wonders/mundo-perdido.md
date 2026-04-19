# Mundo Perdido - Civ VII

**Slug:** mundo-perdido
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Mundo_Perdido_-_Antiquity_Wonder - Fextralife
- https://game8.co/games/Civ-7/archives/498825 - Game8

## Identity

- Historical period: Classic Maya civilization, c. 300 BCE-200 CE. Mundo Perdido (Lost World) is the oldest major complex at Tikal, Guatemala, used for astronomical observation from a great pyramid.
- Flavor: Mesoamerican sacred astronomy site. Firaxis associates with Maya civilization in Antiquity.

## Stats / numeric attributes

- Cost: 450 Production
- Effect: +1 Happiness and +1 Science on all Tropical terrain tiles in this Settlement
- Prerequisite: Mysticism + Calendar Round civics
- Placement: Must be built on a Tropical terrain tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tropical-tile
    yield: happiness
    value: +1
  - type: MODIFY_YIELD
    target: tropical-tile
    yield: science
    value: +1

## Notes / uncertainty

Tropical placement restricts construction to equatorial map regions. Per-tile bonus scales with Tropical tile count in the settlement workable area. Calendar Round is Maya-specific.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
