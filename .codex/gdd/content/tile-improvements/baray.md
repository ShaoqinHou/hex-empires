# Baray -- Civ VII

**Slug:** baray
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Baray_(Civ7) -- Fandom Baray page
- https://civilization.2k.com/civ-vii/game-guide/civilizations/khmer/ -- Firaxis Khmer civ guide

## Identity

The Baray is the unique Antiquity-age rural improvement of the Khmer civilization. Barays were large artificial water reservoirs central to the hydraulic engineering of the Khmer Empire (802-1431 CE), enabling intensive wet-rice cultivation. In-game the Baray converts a flat tile into a Food-boosting irrigation hub for the settlement.

- Historical period: Khmer Empire, Cambodia, 9th-15th centuries
- Flavor: Settlement-wide Food amplifier with Floodplain synergy; one per settlement enforces scarcity

## Stats / numeric attributes

- Yield(s): +3 Food; +1 Food on all Floodplains in this Settlement
- Terrain required: Flat tile
- Resource required: None
- Age availability: Ageless (Antiquity civ-unique; persists across all age transitions)
- Limit: One per Settlement
- Ageless: Yes
- Auto-placement: No -- player assigns population to this tile; improvement type selected by game from Khmer civ rules

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: food
    value: +3
  - type: MODIFY_YIELD
    target: floodplains-in-settlement
    yield: food
    value: +1

## Notes / uncertainty

+3 Food and +1 Food on all Floodplains in settlement sourced from Fandom Baray page and CivFanatics community. One-per-settlement limit confirmed. Ageless tag confirmed by Firaxis dev diary (civ-unique improvements retain full effects across age transitions).

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._