# Mausoleum of Theodoric - Civ VII

**Slug:** mausoleum-of-theodoric
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Mausoleum_of_Theodoric_-_Antiquity_Wonder - Fextralife

## Identity

- Historical period: Ostrogothic Kingdom (Ravenna, Italy), c. 520 CE. The Mausoleum of Theodoric is a 10-sided rotunda built by the Ostrogothic king as his burial monument; unusual for its single-block limestone dome.
- Flavor: Gothic barbarian-turned-Roman-emperor tomb architecture. Firaxis associates with a Germanic civilization in the Antiquity Age.

## Stats / numeric attributes

- Cost: 450 Production
- Effect: +3 Production; +100% yields and HP from pillaging; +1 Militaristic Attribute Point
- Prerequisite: Organized Military civic
- Placement: Adjacent to a Coast
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: production
    value: +3
  - type: MODIFY_COMBAT
    target: all
    stat: pillage-yield
    value: 100-percent-bonus
  - type: MODIFY_COMBAT
    target: all
    stat: pillage-hp
    value: 100-percent-bonus
  - type: GRANT_ATTRIBUTE_POINT
    type: militaristic
    value: +1

## Notes / uncertainty

+100% pillage yields and HP recovery doubles what units receive from pillaging enemy improvements and districts. Strong for aggressive militaristic civilizations that raid frequently. Coast adjacency restricts placement.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
