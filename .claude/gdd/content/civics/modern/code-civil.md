# Code Civil des Francais - Civ VII

**Slug:** `code-civil`
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

**Civ-unique: french-empire.** A Modern-Age civic in Civ VII's per-age civic tree. Napoleonic civil law.

## Stats / numeric attributes

- Age: modern
- Cost (Culture): 4000
- Prerequisite: grande-armee
- Unlocks: +2 Culture per slotted Social Policy
- Mastery reward: Eiffel Tower wonder
- Civ-unique: YES (french-empire only)

## Effect description

Researching unlocks the items listed above. Mastery research provides additional reward (cost ~80% of base civic cost per systems/civic-tree.md; source conflict flagged there).

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "+2 Culture per slotted Social Policy"
  - type: MASTERY_REWARD
    effect: "Eiffel Tower wonder"
```

## Notes / uncertainty

- Culture costs from Fextralife cross-referenced with community tables
- Mastery effects partially sourced; some `[INFERRED]` where source ambiguous
- Civ-unique civics only researchable by the associated civ

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
