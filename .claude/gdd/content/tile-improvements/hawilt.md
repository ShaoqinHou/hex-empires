# Hawilt -- Civ VII

**Slug:** hawilt
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Hawilt_(Civ7) -- Fandom Hawilt page
- https://civilization.2k.com/civ-vii/game-guide/civilizations/aksum/ -- Firaxis Aksum civ guide

## Identity

The Hawilt is the Antiquity-age unique improvement of the Aksum civilization. Havilts were monumental standing stone stelae and burial obelisks of the ancient Aksumite kingdom in modern-day Ethiopia/Eritrea (100-940 CE). In-game they generate Gold and accumulate Culture bonuses from proximity to Wonders and neighboring Havilts.

- Historical period: Kingdom of Aksum, 1st-10th centuries CE, Horn of Africa
- Flavor: Gold and adjacency Culture generator; scales with Wonder density and self-clustering

## Stats / numeric attributes

- Yield(s): +2 Gold; +1 Culture for each adjacent Wonder; +1 Culture for each adjacent Hawilt
- Terrain required: Flat tile only
- Resource required: None
- Age availability: Ageless (Antiquity civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: gold
    value: +2
  - type: MODIFY_YIELD
    target: per-adjacent-wonder
    yield: culture
    value: +1
  - type: MODIFY_YIELD
    target: per-adjacent-hawilt
    yield: culture
    value: +1

## Notes / uncertainty

+2 Gold and adjacency Culture bonuses sourced from Fandom Hawilt page and CivFanatics community search. Flat-tile restriction confirmed. No adjacency or distance restriction mentioned (Havilts can cluster unlike Pairidaeza). Ageless confirmed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._