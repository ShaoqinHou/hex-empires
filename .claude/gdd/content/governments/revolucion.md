# Revolucion - Civ VII

**Slug:** `revolucion`
**Category:** `government`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from system doc data)

## Sources

- `.claude/gdd/systems/government-policies.md` - primary source (cross-references Game8 + fandom)
- https://civilization.fandom.com/wiki/List_of_governments_in_Civ7 - 403 during research
- Game8: Civ 7 Governments List

## Identity

One of the Civ VII governments in the **Modern** age. Civilization-specific: available only to Mexico.

## Stats / numeric attributes

- **Age:** modern
- **Policy slots granted on adoption:** +1 (all governments grant this baseline)
- **Celebration effect options:** +25% Military Production in captured cities; +1 Infantry per conquest
- **Unlock:** Play as Mexico in Modern age
- **Switch cost:** One government per age, permanently locked for that age (no mid-age switching, no anarchy penalty)

## Effect description

**Mexico civ-specific.** Only available to Mexico players in Modern age. Conquest-oriented bonuses.

## Unique effects (structured)

```yaml
effects:
  - type: GRANT_POLICY_SLOT
    count: 1
    duration: current_age
  - type: CELEBRATION_BONUS_OPTIONS
    options: "+25% Military Production in captured cities; +1 Infantry per conquest"
    condition: happiness_threshold_met
```

## Notes / uncertainty

- Celebration bonuses apply only during Celebration periods (not always-on); exact Celebration duration is ~6-10 turns (source conflict noted in systems/celebrations.md).
- Government selection at age start is permanent for that age; next government chosen at age transition.
- Crisis-locked governments require specific crisis-response choices during the end-of-Exploration Revolutions crisis.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
