# Capitalism - Civ VII

**Slug:** `capitalism`
**Category:** `civic`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** subagent-researched + parent-templated

## Sources

- Fextralife Civ 7 Civics Tree
- Game8 Civics Guide
- https://civilization.fandom.com/wiki/List_of_civics_in_Civ7 - 403 (not directly accessed this session)

## Identity

A Modern-Age civic in Civ VII's per-age civic tree. Markets govern allocation.

## Stats / numeric attributes

- Age: modern
- Cost (Culture): 4500
- Prerequisite: liberalism
- Unlocks: Laissez-Faire, +1 Specialist Limit
- Mastery reward: Statue of Liberty
- Civ-unique: NO (shared)

## Effect description

Researching unlocks the items listed above. Mastery research provides additional reward (cost ~80% of base civic cost per systems/civic-tree.md; source conflict flagged there).

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "Laissez-Faire, +1 Specialist Limit"
  - type: MASTERY_REWARD
    effect: "Statue of Liberty"
```

## Notes / uncertainty

- Culture costs from Fextralife cross-referenced with community tables
- Mastery effects partially sourced; some `[INFERRED]` where source ambiguous
- Civ-unique civics only researchable by the associated civ

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
