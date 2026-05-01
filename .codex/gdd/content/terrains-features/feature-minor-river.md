# Feature: Minor River — Civ VII

**Slug:** `feature-minor-river`
**Category:** `terrain-feature`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://civilization.fandom.com/wiki/River_(Civ7) — Fandom River
- https://www.well-of-souls.com/civ/civ7_terrain.html — Well of Souls Analyst
- https://comradekaine.com/civilization7/biomes-the-new-dynamics-of-terrain-and-rivers-in-civilization-vii/ — ComradeKaine

## Identity

Minor river — a tile-edge feature crossing between land tiles (not a water tile itself, unlike Navigable Rivers). Represents small rivers, streams, and creeks. Foundational to fresh water access in the early game. Any settlement founded directly on a minor river tile gains the fresh water bonus.

- Historical period: Small tributaries and streams; classical-era defensive moat analogs
- Flavor: Natural barrier and fresh water source; crossing depletes all movement.

## Stats / numeric attributes

- Base yield: None (minor rivers do not provide direct yields to the tile)
- Movement cost: Deplete all remaining MP when crossing a minor river edge
- Defense modifier: -5 Combat Strength to the defending unit on a minor river tile
- Combat rules: Crossing from one bank to the other costs all remaining MP; defender on tile is penalized -5 CS
- Can build: Land buildings only for settlements on minor river tile; roads/bridges reduce crossing cost [INFERRED]

## Unique effects (structured — for later code mapping)
