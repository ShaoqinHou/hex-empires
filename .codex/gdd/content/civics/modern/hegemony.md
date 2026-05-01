# Hegemony - Civ VII

**Slug:** `hegemony`
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

A Modern-Age civic in Civ VII's per-age civic tree. Cultural Victory acceleration.

## Stats / numeric attributes

- Age: modern
- Cost (Culture): 4500
- Prerequisite: nationalism, globalism
- Unlocks: Explorers research Antiquity Artifacts (doubles find rate)
- Mastery reward: Sphere of Influence, Chengde
- Civ-unique: NO (shared)

## Effect description

Researching unlocks the items listed above. Mastery research provides additional reward (cost ~80% of base civic cost per systems/civic-tree.md; source conflict flagged there).

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "Explorers research Antiquity Artifacts (doubles find rate)"
  - type: MASTERY_REWARD
    effect: "Sphere of Influence, Chengde"
```

## Notes / uncertainty

- Culture costs from Fextralife cross-referenced with community tables
- Mastery effects partially sourced; some `[INFERRED]` where source ambiguous
- Civ-unique civics only researchable by the associated civ

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
