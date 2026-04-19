# Ming Great Wall -- Civ VII

**Slug:** ming-great-wall
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Ming_Great_Wall_(Civ7) -- Fandom Ming Great Wall page
- https://game8.co/games/Civ-7/archives/498912 -- Game8 Ming Great Wall guide

## Identity

The Ming Great Wall is the Exploration-age unique improvement of the Ming Chinese civilization. The historical Ming Dynasty (1368-1644 CE) rebuilt and extended the Great Wall to its most recognizable stone-and-brick form. In-game it is a fortification line providing Culture and scaling with adjacent fortifications.

- Historical period: Ming Dynasty China, 1368-1644 CE
- Flavor: Cultural fortification line; Exploration-age counterpart to the Han Great Wall

## Stats / numeric attributes

- Yield(s): +5 Culture; +1 Gold for each adjacent Fortification
- Combat effect: Counts as a Fortification; grants +6 Combat Strength to defending units
- Terrain required: Linear contiguous placement only; cannot branch or fork
- Resource required: None
- Age availability: Ageless (Exploration civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: culture
    value: +5
  - type: MODIFY_YIELD
    target: per-adjacent-fortification
    yield: gold
    value: +1
  - type: MODIFY_COMBAT
    target: defending-units-on-tile
    value: +6

## Notes / uncertainty

+5 Culture and +1 Gold per adjacent Fortification sourced from Fandom Ming Great Wall page via web search. +6 Combat Strength confirmed. Linear placement confirmed. Distinct from the Han Great Wall (Antiquity, Han civ) -- see great-wall.md.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._