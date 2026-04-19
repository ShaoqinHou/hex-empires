# Governments - Civ VII

**Slug:** `governments`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written
**Item count:** 13 total (3 Antiquity + 3 Exploration standard + 3 Exploration crisis-locked + 3 Modern standard + 1 Mexico-specific)

## Sources

- `.claude/gdd/systems/government-policies.md`
- https://civilization.fandom.com/wiki/List_of_governments_in_Civ7 - 403
- Game8: Civ 7 Governments List

## Purpose in the game

Governments are per-age chosen state structures. Each government grants **+1 policy slot** on adoption and offers two Celebration effect options that activate when the empire-wide Happiness reaches a Celebration threshold. Only one government per age; permanent for that age (no mid-age switching, no anarchy penalty). At age transition, the player selects a new government from the next age roster.

## Category-wide rules

- Exactly one government active per player per age
- Selection is permanent for the age (cannot be changed)
- +1 policy slot granted on adoption
- Celebration effect options activate during Celebration periods (happiness-triggered)
- Policy slots are all **wildcard** in VII (no military/economic/diplomatic split as in VI)
- No anarchy penalty between governments
- Crisis-locked governments (Revolutions) require specific end-of-Exploration crisis outcomes to unlock

## Taxonomy within the category

- Antiquity (3): Classical Republic / Despotism / Oligarchy
- Exploration standard (3): Theocracy / Plutocracy / Feudal Monarchy
- Exploration crisis-locked (3): Revolutionary Republic / Revolutionary Authoritarianism / Constitutional Monarchy
- Modern standard (3): Authoritarianism / Bureaucratic Monarchy / Elective Republic
- Civ-specific (1): Revolucion (Mexico-only)

## Complete item list

| Slug | Name | Age | Key celebration bonuses |
|---|---|---|---|
| `classical-republic` | Classical Republic | Antiquity | +10% Science; +10% Culture |
| `despotism` | Despotism | Antiquity | +20% Production in capital; +1 Combat Strength |
| `oligarchy` | Oligarchy | Antiquity | +20% Gold; +2 Influence/turn |
| `theocracy` | Theocracy | Exploration | +50% Faith; +2 Culture per Religious Building |
| `plutocracy` | Plutocracy | Exploration | +25% Gold; +1 Trade Route |
| `feudal-monarchy` | Feudal Monarchy | Exploration | +2 Combat Strength; +15% Military Production |
| `revolutionary-republic` | Revolutionary Republic | Exploration | +1 Policy Slot; +20% Culture |
| `revolutionary-authoritarianism` | Revolutionary Authoritarianism | Exploration | +30% Military Production; -10% Gold |
| `constitutional-monarchy` | Constitutional Monarchy | Exploration | +2 Happiness; +1 Policy Slot |
| `authoritarianism` | Authoritarianism | Modern | +30% Production; -15% Happiness |
| `bureaucratic-monarchy` | Bureaucratic Monarchy | Modern | +2 Amenity per Settlement; +15% Gold |
| `elective-republic` | Elective Republic | Modern | +1 Policy Slot; +15% Science; +15% Culture |
| `revolucion` | Revolucion | Modern | +25% Military Production in captured cities; +1 Infantry per conquest |

## How this category connects to systems

- `systems/government-policies.md` - system that reads government data and applies effects
- `systems/crises.md` - Revolutions crisis at end of Exploration unlocks crisis-locked governments
- `systems/celebrations.md` - Celebration triggers are what activate the government Celebration effects

## VII-specific notes

- All policy slots are **wildcard** (VI had economic/military/diplomatic/wildcard categories)
- One government per age with age-transition forced re-selection (VII innovation)
- No anarchy period - government switch at age transition is clean
- Crisis-locked governments are a new VII concept tied to the end-of-age crisis system

## Open questions

- Exploration crisis-locked governments: exact crisis choice requirements per government - sources partially conflict
- Modern age Revolutions crisis: does it fire? Sources silent
- Policy slot count at game start (before any government adopted) - sources silent
- Celebration duration by age (6 vs 10 turns) - source conflict in systems/celebrations.md

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
