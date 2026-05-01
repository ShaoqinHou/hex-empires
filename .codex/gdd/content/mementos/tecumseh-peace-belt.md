# Wampum Peace Belt - Civ VII

**Slug:** `tecumseh-peace-belt`
**Category:** `memento`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from dev diary + per-leader research)

## Sources

- Firaxis Dev Diary #7: Legends & Mementos (per-leader structure)
- `.codex/gdd/content/leaders/tecumseh.md` (parent leader fact card)
- `.codex/gdd/systems/mementos.md` + `.codex/gdd/systems/legends.md`

## Identity

Tecumseh Leader Path memento. Shawnee wampum diplomacy.

## Stats / numeric attributes

- **Path:** Leader — Tecumseh
- **Unlock level:** Leader Path L2
- **Effect:** Influence from Independent Powers
- **Availability:** equippable on ANY leader once unlocked (cross-leader per VII design)

## Effect description

Pre-game equippable item. Effect persists the whole game. Influence from Independent Powers `[INFERRED]` exact numeric values may require in-game verification; memento effects in Civ VII combine flat bonuses, conditional triggers, and unit-class modifiers.

## Unique effects (structured)

```yaml
effects:
  - type: MEMENTO_BONUS
    path: leader
    leader: tecumseh
    level: 2
    description: "Influence from Independent Powers"
```

## Notes / uncertainty

- Leader Path mementos thematic to the specific leader but equippable on any leader
- Effect magnitudes `[INFERRED]` where exact values not in public sources
- Some leader personas (Ashoka World Renouncer/Conqueror, Himiko Queen/Shaman, Napoleon Emperor/Revolutionary, Friedrich Oblique/Baroque, Xerxes King/Achaemenid) have SEPARATE memento sets per persona
- DLC leaders (Simon Bolivar, Genghis Khan, Ada Lovelace, Lakshmibai, Sayyida al Hurra) have partial coverage; some L2/L5 mementos `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
