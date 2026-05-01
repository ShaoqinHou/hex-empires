# Army Commander — Civ VII

**Slug:** `army-commander`
**Category:** `unit`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://www.well-of-souls.com/civ/civ7_units_antiquity.html — Well of Souls Antiquity Units
- https://www.thegamer.com/civilization-7-army-commanders-guide/ — TheGamer Army Commanders Guide
- https://game8.co/games/Civ-7/archives/495204 — Game8 Army Commanders Explained

## Identity

The Army Commander is Civ VII's new army-aggregation unit — unique to the game and with no direct Civ VI equivalent. It functions as the command hub for a military formation: packing up to 4 land units (6 with Regiments promotion), gaining XP from units fighting in its command radius, and persisting across all three age transitions with full XP and promotions intact. Unlocked by the Discipline civic in Antiquity. See `systems/commanders.md` for full mechanics.

## Stats / numeric attributes

- Combat strength: N/A (commander — not a combatant)
- Movement: 2
- Cost: 100 production [INFERRED — not fully sourced; one free granted on Discipline]
- Requires: Discipline (civic)
- Unique: No — standard unit available to all civs
- Persists across age transitions: Yes (only unit type to do so)
- Abilities:
  - Assemble Army — packs adjacent units (up to 4 military + 1 civilian) into formation
  - Deploy Army — unpacks units to adjacent tiles
  - Command Radius — radius-1 zone where units gain passive bonuses and Commander earns XP
  - Coordinated Assault — +2 CS to all units in command radius (cooldown ~3 turns)
  - Promotion tree — 5 trees × 6 nodes each: Bastion, Assault, Logistics, Maneuver, Leadership
  - Commendations — 1 per completed tree (max 5); powerful persistent bonuses
  - Respawns on defeat — 20-turn respawn at Capital; all XP/promotions retained

## Unique effects (structured — for later code mapping)
