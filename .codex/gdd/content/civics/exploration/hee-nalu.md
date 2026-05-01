# He'e Nalu - Civ VII

**Slug:** `hee-nalu`
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

**Civ-unique: hawaii.** A Exploration-Age civic in Civ VII's per-age civic tree. Wave-riding as sacred sport.

## Stats / numeric attributes

- Age: exploration
- Cost (Culture): 1200
- Prerequisite: mana, ohana
- Unlocks: +1 Settlement Limit, +2 Relics
- Mastery reward: Hale o Keawe, +2 Culture on marine terrain
- Civ-unique: YES (hawaii only)

## Effect description

Researching unlocks the items listed above. Mastery research provides additional reward (cost ~80% of base civic cost per systems/civic-tree.md; source conflict flagged there).

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "+1 Settlement Limit, +2 Relics"
  - type: MASTERY_REWARD
    effect: "Hale o Keawe, +2 Culture on marine terrain"
```

## Notes / uncertainty

- Culture costs from Fextralife cross-referenced with community tables
- Mastery effects partially sourced; some `[INFERRED]` where source ambiguous
- Civ-unique civics only researchable by the associated civ

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
