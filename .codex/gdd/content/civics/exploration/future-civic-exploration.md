# Future Civic (Exploration) - Civ VII

**Slug:** `future-civic-exploration`
**Category:** `civic`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** subagent-researched + parent-templated

## Sources

- Fextralife Civ 7 Civics Tree
- Game8 Civics Guide
- https://civilization.fandom.com/wiki/List_of_civics_in_Civ7 - 403 (not directly accessed this session)

## Identity

A Exploration-Age civic in Civ VII's per-age civic tree. End-of-tree repeatable.

## Stats / numeric attributes

- Age: exploration
- Cost (Culture): 3000
- Prerequisite: imperialism, social-class, sovereignty
- Unlocks: +1 Wildcard Attribute, +10 Age Progress
- Mastery reward: `[none listed]`
- Civ-unique: NO (shared)

## Effect description

Researching unlocks the items listed above. Mastery research provides additional reward (cost ~80% of base civic cost per systems/civic-tree.md; source conflict flagged there).

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "+1 Wildcard Attribute, +10 Age Progress"
  - type: MASTERY_REWARD
    effect: "`[none listed]`"
```

## Notes / uncertainty

- Culture costs from Fextralife cross-referenced with community tables
- Mastery effects partially sourced; some `[INFERRED]` where source ambiguous
- Civ-unique civics only researchable by the associated civ

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
