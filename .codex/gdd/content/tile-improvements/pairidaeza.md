# Pairidaeza -- Civ VII

**Slug:** pairidaeza
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Pairidaeza_(Civ7) -- Fandom Pairidaeza page
- https://civilization.2k.com/civ-vii/game-guide/civilizations/persia/ -- Firaxis Persia civ guide

## Identity

The Pairidaeza is the Antiquity-age unique improvement of the Achaemenid Persian civilization. The word pairidaeza (from Old Iranian) literally means walled garden or enclosed park -- the origin of the English word paradise. In-game it is a luxurious garden improvement that generates Culture and Gold but must be spaced out to prevent overdevelopment.

- Historical period: Achaemenid Persian Empire, 550-330 BCE
- Flavor: Culture and Gold generator; spacing restriction forces deliberate placement across the empire

## Stats / numeric attributes

- Yield(s): +2 Culture; +1 Gold (as of November 4, 2025 patch)
- Terrain required: Any terrain with an existing improvement [as per Fandom]; placed on top of existing rural improvement
- Resource required: None
- Placement restriction: Cannot be placed adjacent to another Pairidaeza
- Combat synergy: +5 Healing for Military Units in a Settlement with a Pairidaeza
- Civic bonus: Gains increased Happiness and Culture from adjacent Quarters when Satrapies II civic is unlocked
- Age availability: Ageless (Antiquity civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: culture
    value: +2
  - type: MODIFY_YIELD
    target: tile
    yield: gold
    value: +1
  - type: MODIFY_COMBAT
    target: military-units-healing-in-settlement
    value: +5-healing

## Notes / uncertainty

+2 Culture confirmed (November 4, 2025 patch -- changed from original +1 Culture). +1 Gold confirmed. Non-adjacent placement restriction confirmed. Healing bonus and Satrapies II civic interaction sourced from Fandom. The improvement is placed on top of an existing improvement rather than replacing it [sourced from Fandom -- unusual mechanic].

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._