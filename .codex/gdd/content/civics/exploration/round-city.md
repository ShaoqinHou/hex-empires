# Round City - Civ VII

**Slug:** `round-city`
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

**Civ-unique: abbasid.** A Exploration-Age civic in Civ VII's per-age civic tree. Baghdad's concentric capital.

## Stats / numeric attributes

- Age: exploration
- Cost (Culture): 800
- Prerequisite: none
- Unlocks: +50% Production to Buildings in Cities with 8+ Urban Pop
- Mastery reward: +4 Food on Science Buildings, City of Peace
- Civ-unique: YES (abbasid only)

## Effect description

Researching unlocks the items listed above. Mastery research provides additional reward (cost ~80% of base civic cost per systems/civic-tree.md; source conflict flagged there).

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "+50% Production to Buildings in Cities with 8+ Urban Pop"
  - type: MASTERY_REWARD
    effect: "+4 Food on Science Buildings, City of Peace"
```

## Notes / uncertainty

- Culture costs from Fextralife cross-referenced with community tables
- Mastery effects partially sourced; some `[INFERRED]` where source ambiguous
- Civ-unique civics only researchable by the associated civ

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
