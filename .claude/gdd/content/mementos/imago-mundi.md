# Imago Mundi - Civ VII

**Slug:** `imago-mundi`
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

Foundation Path memento. Babylonian world map tablet.

## Stats / numeric attributes

- **Path:** Foundation
- **Unlock level:** Foundation Path L7
- **Effect:** +3 Sight for Scout Lookout / Search
- **Availability:** equippable on any leader once unlocked (cross-leader)

## Effect description

Pre-game equippable item on any leader. Effect applies for the entire game. +3 Sight for Scout Lookout / Search Unlocks at Foundation Path level 7.

## Unique effects (structured)

```yaml
effects:
  - type: MEMENTO_BONUS
    path: foundation
    level: 7
    description: "+3 Sight for Scout Lookout / Search"
```

## Notes / uncertainty

- Foundation Path mementos are cross-leader equippable (any leader can use after unlock)
- Level requirement confirmed from Gameranx list
- Exact stacking + duration rules per systems/mementos.md

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
