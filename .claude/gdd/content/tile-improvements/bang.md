# Bang -- Civ VII

**Slug:** bang
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Bang_(Civ7) -- Fandom Bang page
- https://civilization.2k.com/civ-vii/game-guide/civilizations/siam/ -- Firaxis Siam civ guide

## Identity

The Bang is the Modern-age unique improvement of the Siamese civilization. A bang (as in Bangkok) is a traditional water-based community built along canals in Central Thailand, distinct from inland settlements. The Ayutthaya and later Siamese kingdoms (14th-19th centuries CE) built their power along navigable river networks. In-game the Bang generates Culture and Happiness from Navigable River tiles.

- Historical period: Siamese/Thai kingdoms, 14th-19th centuries CE, Southeast Asia
- Flavor: Culture and Happiness generator; requires Navigable Rivers -- reflects Siam river civilization identity

## Stats / numeric attributes

- Yield(s): +3 Culture; +3 Happiness [INFERRED -- happiness value not numerically confirmed; community sources cite both yields]
- Terrain required: Navigable River tile
- Resource required: None
- Age availability: Ageless (Modern civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: culture
    value: +3
  - type: MODIFY_YIELD
    target: tile
    yield: happiness
    value: +3

## Notes / uncertainty

+3 Culture confirmed from Fandom Bang page. +3 Happiness partially confirmed from community sources (described as Culture and Happiness base); exact Happiness value is [INFERRED]. Navigable River placement requirement confirmed. Ageless confirmed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._