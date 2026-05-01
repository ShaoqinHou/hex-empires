# Nakaz - Civ VII

**Slug:** `catherine-nakaz`
**Category:** `memento`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from dev diary + per-leader research)

## Sources

- Firaxis Dev Diary #7: Legends & Mementos (per-leader structure)
- `.codex/gdd/content/leaders/catherine-the-great.md` (parent leader fact card)
- `.codex/gdd/systems/mementos.md` + `.codex/gdd/systems/legends.md`

## Identity

Catherine The Great Leader Path memento. Catherine's Instruction to the Legislative Commission.

## Stats / numeric attributes

- **Path:** Leader — Catherine The Great
- **Unlock level:** Leader Path L5
- **Effect:** Science + Culture bonus
- **Availability:** equippable on ANY leader once unlocked (cross-leader per VII design)

## Effect description

Pre-game equippable item. Effect persists the whole game. Science + Culture bonus `[INFERRED]` exact numeric values may require in-game verification; memento effects in Civ VII combine flat bonuses, conditional triggers, and unit-class modifiers.

## Unique effects (structured)

```yaml
effects:
  - type: MEMENTO_BONUS
    path: leader
    leader: catherine-the-great
    level: 5
    description: "Science + Culture bonus"
```

## Notes / uncertainty

- Leader Path mementos thematic to the specific leader but equippable on any leader
- Effect magnitudes `[INFERRED]` where exact values not in public sources
- Some leader personas (Ashoka World Renouncer/Conqueror, Himiko Queen/Shaman, Napoleon Emperor/Revolutionary, Friedrich Oblique/Baroque, Xerxes King/Achaemenid) have SEPARATE memento sets per persona
- DLC leaders (Simon Bolivar, Genghis Khan, Ada Lovelace, Lakshmibai, Sayyida al Hurra) have partial coverage; some L2/L5 mementos `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
