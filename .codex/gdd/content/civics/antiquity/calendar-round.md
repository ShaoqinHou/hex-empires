# Calendar Round - Civ VII

**Slug:** `calendar-round`
**Category:** `civic`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** subagent-researched + parent-templated

## Sources

- Fextralife Civ 7 Civics Tree
- Game8 Civics Guide
- https://civilization.fandom.com/wiki/List_of_civics_in_Civ7 - 403 (not directly accessed this session)

## Identity

**Civ-unique: maya.** A Antiquity-Age civic in Civ VII's per-age civic tree. Interlocking sacred cycles.

## Stats / numeric attributes

- Age: antiquity
- Cost (Culture): 250
- Prerequisite: rain-of-chaac
- Unlocks: Culture = 10% of researched tech cost
- Mastery reward: +1 Settlement Limit, Mundo Perdido
- Civ-unique: YES (maya only)

## Effect description

Researching unlocks the items listed above. Mastery research provides additional reward (cost ~80% of base civic cost per systems/civic-tree.md; source conflict flagged there).

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "Culture = 10% of researched tech cost"
  - type: MASTERY_REWARD
    effect: "+1 Settlement Limit, Mundo Perdido"
```

## Notes / uncertainty

- Culture costs from Fextralife cross-referenced with community tables
- Mastery effects partially sourced; some `[INFERRED]` where source ambiguous
- Civ-unique civics only researchable by the associated civ

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
