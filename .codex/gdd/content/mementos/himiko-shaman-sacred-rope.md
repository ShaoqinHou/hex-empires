# Shimenawa - Civ VII

**Slug:** `himiko-shaman-sacred-rope`
**Category:** `memento`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from dev diary + per-leader research)

## Sources

- Firaxis Dev Diary #7: Legends & Mementos (per-leader structure)
- `.codex/gdd/content/leaders/himiko-high-shaman.md` (parent leader fact card)
- `.codex/gdd/systems/mementos.md` + `.codex/gdd/systems/legends.md`

## Identity

Himiko High Shaman Leader Path memento. Sacred rope marking holy sites.

## Stats / numeric attributes

- **Path:** Leader — Himiko High Shaman
- **Unlock level:** Leader Path L9
- **Effect:** Sacred tile bonus
- **Availability:** equippable on ANY leader once unlocked (cross-leader per VII design)

## Effect description

Pre-game equippable item. Effect persists the whole game. Sacred tile bonus `[INFERRED]` exact numeric values may require in-game verification; memento effects in Civ VII combine flat bonuses, conditional triggers, and unit-class modifiers.

## Unique effects (structured)

```yaml
effects:
  - type: MEMENTO_BONUS
    path: leader
    leader: himiko-high-shaman
    level: 9
    description: "Sacred tile bonus"
```

## Notes / uncertainty

- Leader Path mementos thematic to the specific leader but equippable on any leader
- Effect magnitudes `[INFERRED]` where exact values not in public sources
- Some leader personas (Ashoka World Renouncer/Conqueror, Himiko Queen/Shaman, Napoleon Emperor/Revolutionary, Friedrich Oblique/Baroque, Xerxes King/Achaemenid) have SEPARATE memento sets per persona
- DLC leaders (Simon Bolivar, Genghis Khan, Ada Lovelace, Lakshmibai, Sayyida al Hurra) have partial coverage; some L2/L5 mementos `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
