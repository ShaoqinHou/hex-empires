# Ayllu - Civ VII

**Slug:** `ayllu`
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

**Civ-unique: inca.** A Exploration-Age civic in Civ VII's per-age civic tree. Extended kin group as economic unit.

## Stats / numeric attributes

- Age: exploration
- Cost (Culture): 1200
- Prerequisite: mita
- Unlocks: +2 Food on Terrace Farms with Granary
- Mastery reward: Farms +3 Food adjacent to mountains
- Civ-unique: YES (inca only)

## Effect description

Researching unlocks the items listed above. Mastery research provides additional reward (cost ~80% of base civic cost per systems/civic-tree.md; source conflict flagged there).

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "+2 Food on Terrace Farms with Granary"
  - type: MASTERY_REWARD
    effect: "Farms +3 Food adjacent to mountains"
```

## Notes / uncertainty

- Culture costs from Fextralife cross-referenced with community tables
- Mastery effects partially sourced; some `[INFERRED]` where source ambiguous
- Civ-unique civics only researchable by the associated civ

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
