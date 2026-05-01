# Common Law - Civ VII

**Slug:** `common-law`
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

**Civ-unique: norman.** A Exploration-Age civic in Civ VII's per-age civic tree. Precedent as spine of justice.

## Stats / numeric attributes

- Age: exploration
- Cost (Culture): 1200
- Prerequisite: consuetudines
- Unlocks: +1 Social Policy slot
- Mastery reward: +1 Settlement Limit, Servitium Debitum, Familia Regis
- Civ-unique: YES (norman only)

## Effect description

Researching unlocks the items listed above. Mastery research provides additional reward (cost ~80% of base civic cost per systems/civic-tree.md; source conflict flagged there).

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "+1 Social Policy slot"
  - type: MASTERY_REWARD
    effect: "+1 Settlement Limit, Servitium Debitum, Familia Regis"
```

## Notes / uncertainty

- Culture costs from Fextralife cross-referenced with community tables
- Mastery effects partially sourced; some `[INFERRED]` where source ambiguous
- Civ-unique civics only researchable by the associated civ

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
