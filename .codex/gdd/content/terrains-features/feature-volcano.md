# Feature: Volcano — Civ VII

**Slug:** `feature-volcano`
**Category:** `terrain-feature`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://civilization.fandom.com/wiki/Volcano_(Civ7) — Fandom Volcano (via search; page confirmed)
- https://civilization.fandom.com/wiki/Natural_Disaster_(Civ7) — Fandom Natural Disaster

## Identity

Volcano — a special variant of Mountainous terrain. Can be Dormant or Active. When Active, has a per-turn chance to erupt, damaging adjacent buildings and tile improvements while fertilizing (adding yield to) all adjacent tiles. Two natural wonders are volcanoes: Mt. Kilimanjaro and Thera. Historically associated with fertile agricultural regions like Java, the Andes, and the Mediterranean.

- Historical period: Pacific Ring of Fire, Mediterranean volcanic arcs, East African Rift
- Flavor: Dangerous neighbor; risk-reward terrain that can boost adjacent city yields dramatically.

## Stats / numeric attributes

- Base yield: Impassable (volcano is a mountain variant — no workable yield on the tile itself)
- Movement cost: Impassable (mountain base terrain)
- Defense modifier: Impassable — cannot be entered; ranged attacks can cross
- Combat rules: Impassable; cliffs block passage but permit ranged attacks across
- Can build: No improvements on volcano tile

## Unique effects (structured — for later code mapping)
