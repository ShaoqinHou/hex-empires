# Angkor Wat - Civ VII

**Slug:** angkor-wat
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Angkor_Wat_-_Antiquity_Wonder - Fextralife
- https://civilization.fandom.com/wiki/Angkor_Wat_(Civ7) - Fandom wiki

## Identity

- Historical period: Khmer Empire (Cambodia), early 12th century CE. Angkor Wat is the world largest religious monument, originally Hindu then converted to Buddhist use.
- Flavor: Cosmic mountain temple of the Khmer Empire. Firaxis places this in Antiquity, associated with Khmer civilization.

## Stats / numeric attributes

- Cost: 450 Production
- Effect: +3 Happiness; +1 Specialist Limit in this Settlement
- Prerequisite: Philosophy civic + Amnach (Khmer civic)
- Placement: Adjacent to a River tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +3
  - type: MODIFY_CITY_STAT
    target: this-city
    stat: specialist-limit
    value: +1

## Notes / uncertainty

+1 Specialist Limit allows one extra population slot as specialist, amplifying adjacency bonuses on that urban tile. River adjacency broadly achievable. Amnach is Khmer-specific.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
