# World Fair - Civ VII

**Slug:** worlds-fair
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/List_of_wonders_in_Civ7 - Fandom wiki
- https://game8.co/games/Civ-7/archives/498871 - Game8

## Identity

- Historical period: Multiple nations, 1851-present. World Fairs have been held globally since the Great Exhibition of 1851 in London, showcasing industrial and cultural achievements.
- Flavor: Modern cultural victory terminal wonder. Completing this wonder wins the Cultural Victory condition.

## Stats / numeric attributes

- Cost: [INFERRED] Very high; not confirmed in sources
- Effect: Wins the Cultural Victory immediately upon completion
- Prerequisite: Complete the Geographic Society legacy path; slot 15 Artifacts in Museums empire-wide
- Placement: Empty tile within City borders
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: TRIGGER_VICTORY
    victory-type: cultural

## Notes / uncertainty

Terminal wonder - winning the Cultural Victory is its sole effect. Culture Legacy Points from earlier ages speed up construction. The 15-Artifact prerequisite makes this a late-game goal. Production cost not published in accessible sources.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
