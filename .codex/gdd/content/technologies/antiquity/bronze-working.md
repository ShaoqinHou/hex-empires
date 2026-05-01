# Bronze Working - Civ VII

**Slug:** `bronze-working`
**Category:** `technology`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** subagent-researched (claude-sonnet-4-6) + parent-templated

## Sources

- Game8: Civ 7 Technology Tree
- GameRant: Civilization 7 Tech Tree Guide
- https://civilization.fandom.com/wiki/Technology_(Civ7) - 403

## Identity

A Antiquity Age technology in Civ VII's per-age tech tree.

## Stats / numeric attributes

- Age: antiquity
- Prerequisite: Writing + Irrigation
- Cost (Science): `[INFERRED]` - exact per-tech costs not published by Firaxis
- Unlocks: Barracks, Spearman, Archer
- Mastery reward: +3 CS Infantry, +2 Prod Military Buildings

## Effect description

Researching unlocks the items listed above. Completing the base tech enables Mastery research (additional cost) for the mastery reward.

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "Barracks, Spearman, Archer"
  - type: MASTERY_REWARD
    effect: "+3 CS Infantry, +2 Prod Military Buildings"
```

## Notes / uncertainty

- Science costs per tech are `[INFERRED]` - not in any accessible source
- Mastery cost is ~80-100% of base tech cost (source conflict; see systems/tech-tree.md)
- Per-age trees do NOT carry over; research in Antiquity does not speed Exploration research

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
