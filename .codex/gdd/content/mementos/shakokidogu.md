# Shakōkidogū - Civ VII

**Slug:** `shakokidogu`
**Category:** `memento`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from Gameranx "All Civ VII Mementos" list + dev diary)

## Sources

- https://gameranx.com/features/id/532499/article/civilization-7-all-mementos-and-how-to-unlock-them
- Firaxis Dev Diary #7: Legends & Mementos
- `.codex/gdd/systems/mementos.md`

## Identity

Foundation Path memento. Jōmon-period Japanese clay figurines with "goggle-eyed" features.

## Stats / numeric attributes

- **Path:** Foundation
- **Unlock level:** Foundation Path L4
- **Effect:** +1 Cultural Attribute Point
- **Availability:** equippable on any leader once unlocked (cross-leader)

## Effect description

Pre-game equippable item on any leader. Effect applies for the entire game. +1 Cultural Attribute Point Unlocks at Foundation Path level 4.

## Unique effects (structured)

```yaml
effects:
  - type: MEMENTO_BONUS
    path: foundation
    level: 4
    description: "+1 Cultural Attribute Point"
```

## Notes / uncertainty

- Foundation Path mementos are cross-leader equippable (any leader can use after unlock)
- Level requirement confirmed from Gameranx list
- Exact stacking + duration rules per systems/mementos.md

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
