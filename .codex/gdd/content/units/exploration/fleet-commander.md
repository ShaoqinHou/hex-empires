# Fleet Commander — Civ VII

**Slug:** `fleet-commander`
**Category:** `unit`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://www.well-of-souls.com/civ/civ7_units_exploration.html — Well of Souls Exploration Units
- https://game8.co/games/Civ-7/archives/499157 — Game8: Fleet Commander

## Identity

The Fleet Commander is the naval equivalent of the Army Commander, becoming available at the start of the Exploration Age. It packs naval units into a fleet formation, earns XP from naval combats in its command radius, and persists across age transitions. Like the Army Commander, it does not engage in direct combat but provides command bonuses, formation movement, and a promotion tree (parallel to the Army Commander's 5 trees). See `systems/commanders.md` for full mechanics.

## Stats / numeric attributes

- Combat strength: N/A (commander)
- Defense (civilian): 28
- Movement: 3
- Cost: 120 production [from Well of Souls overview table cross-reference]
- Requires: Cartography (technology)
- Persists across age transitions: Yes
- Abilities:
  - Assemble Fleet — packs adjacent naval units (up to 4 + 1 civilian slot) into formation
  - Deploy Fleet — unpacks naval units to adjacent tiles
  - Command Radius — radius-1 zone; naval units gain passive bonuses
  - Promotion tree — mirrors Army Commander (Engagement, Assault, Logistics, Maneuver + 1 unconfirmed)
  - Key promotion: Weather Gage (Initiative equivalent — immediate action after deploy)
  - Key promotion: Naval Artillery — +5 CS vs fortified districts

## Unique effects (structured — for later code mapping)
