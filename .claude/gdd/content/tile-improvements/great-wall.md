# Han Great Wall -- Civ VII

**Slug:** great-wall
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Han_Great_Wall_(Civ7) -- Fandom Han Great Wall page
- https://civ7.wiki.fextralife.com/Han+China+-+Antiquity+Civilization -- Fextralife Han civ

## Identity

The Han Great Wall is the Antiquity-age unique improvement of the Han Chinese civilization. Each segment of the wall is placed individually in a contiguous line, representing the historical Chinese northern border fortification. The wall provides both Cultural yield and a decisive defensive combat bonus for units stationed on it.

- Historical period: Han Dynasty China, 202 BCE - 220 CE; the original Great Wall construction era
- Flavor: Culture generator and defensive fortification; linear placement creates a contiguous territorial border

## Stats / numeric attributes

- Yield(s): +2 Culture per segment; +1 Happiness for each adjacent Great Wall segment
- Terrain required: Any terrain that is not Rough/impassable; must form a contiguous line
- Resource required: None
- Combat effect: Counts as a Fortification; grants +6 Combat Strength to defending units
- Age availability: Ageless (Antiquity civ-unique; persists across all age transitions)
- Placement rule: Linear only -- segments must connect; cannot branch or fork
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: culture
    value: +2
  - type: MODIFY_YIELD
    target: adjacent-great-wall-segments
    yield: happiness
    value: +1
  - type: MODIFY_COMBAT
    target: defending-units-on-tile
    value: +6

## Notes / uncertainty

+2 Culture and +1 Happiness per adjacent segment sourced from CivFanatics community search results. +6 Combat Strength from Fandom. Linear-only placement confirmed. Ageless confirmed. The Ming Great Wall (Exploration age, Ming civ) is a distinct improvement -- see ming-great-wall.md.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._