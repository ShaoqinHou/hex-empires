# Dur-Sharrukin - Civ VII

**Slug:** dur-sharrukin
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Dur-Sharrukin_-_Antiquity_Wonder - Fextralife

## Identity

- Historical period: Assyrian Empire (Iraq), 713-706 BCE. Dur-Sharrukin (Fortress of Sargon) was a royal palace-city built by Sargon II; massive fortified complex never completed after his death in battle.
- Flavor: Assyrian military fortification. Firaxis associates with Assyria in the Antiquity Age.

## Stats / numeric attributes

- Cost: 275 Production
- Effect: Acts as a Fortified District (must be Conquered); +3 Combat Strength to Fortified Districts in all Settlements
- Prerequisite: Discipline civic
- Placement: Adjacent to a District
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: GRANT_FORTIFICATION
    target: this-city
    stat: must-be-conquered
  - type: MODIFY_COMBAT
    target: fortified-districts
    stat: combat-strength
    value: +3
    scope: all-settlements

## Notes / uncertainty

Global +3 CS to all Fortified Districts empire-wide is a powerful defensive bonus. At 275 Production this is among the cheapest Antiquity wonders, favoring early construction. Discipline civic is broadly accessible.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
