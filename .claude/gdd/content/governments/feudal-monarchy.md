# Feudal Monarchy - Civ VII

**Slug:** `feudal-monarchy`
**Category:** `government`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from system doc data)

## Sources

- `.claude/gdd/systems/government-policies.md` - primary source (cross-references Game8 + fandom)
- https://civilization.fandom.com/wiki/List_of_governments_in_Civ7 - 403 during research
- Game8: Civ 7 Governments List

## Identity

One of the Civ VII governments in the **Exploration** age. Standard government - available to all civs once the relevant age is reached.

## Stats / numeric attributes

- **Age:** exploration
- **Policy slots granted on adoption:** +1 (all governments grant this baseline)
- **Celebration effect options:** +2 Combat Strength; +15% Military Production
- **Unlock:** Reach Exploration age (selected at age transition)
- **Switch cost:** One government per age, permanently locked for that age (no mid-age switching, no anarchy penalty)

## Effect description

Exploration-age military government. For players pursuing Non Sufficit Orbis (Distant Lands military Legacy).

## Unique effects (structured)

```yaml
effects:
  - type: GRANT_POLICY_SLOT
    count: 1
    duration: current_age
  - type: CELEBRATION_BONUS_OPTIONS
    options: "+2 Combat Strength; +15% Military Production"
    condition: happiness_threshold_met
```

## Notes / uncertainty

- Celebration bonuses apply only during Celebration periods (not always-on); exact Celebration duration is ~6-10 turns (source conflict noted in systems/celebrations.md).
- Government selection at age start is permanent for that age; next government chosen at age transition.
- Crisis-locked governments require specific crisis-response choices during the end-of-Exploration Revolutions crisis.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
