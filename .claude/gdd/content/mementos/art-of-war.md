# The Art of War - Civ VII

**Slug:** `art-of-war`
**Category:** `memento`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from Gameranx "All Civ VII Mementos" list + dev diary)

## Sources

- https://gameranx.com/features/id/532499/article/civilization-7-all-mementos-and-how-to-unlock-them
- Firaxis Dev Diary #7: Legends & Mementos
- `.claude/gdd/systems/mementos.md`

## Identity

Foundation Path memento. Sun Tzu (5th century BCE).

## Stats / numeric attributes

- **Path:** Foundation
- **Unlock level:** Foundation Path L44
- **Effect:** Commander XP bonus (+N per kill)
- **Availability:** equippable on any leader once unlocked (cross-leader)

## Effect description

Pre-game equippable item on any leader. Effect applies for the entire game. Commander XP bonus (+N per kill) Unlocks at Foundation Path level 44.

## Unique effects (structured)

```yaml
effects:
  - type: MEMENTO_BONUS
    path: foundation
    level: 44
    description: "Commander XP bonus (+N per kill)"
```

## Notes / uncertainty

- Foundation Path mementos are cross-leader equippable (any leader can use after unlock)
- Level requirement confirmed from Gameranx list
- Exact stacking + duration rules per systems/mementos.md

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
