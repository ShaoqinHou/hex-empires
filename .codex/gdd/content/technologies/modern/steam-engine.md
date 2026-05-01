# Steam Engine - Civ VII

**Slug:** `steam-engine`
**Category:** `technology`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** subagent-researched (claude-sonnet-4-6) + parent-templated

## Sources

- Game8: Civ 7 Technology Tree
- GameRant: Civilization 7 Tech Tree Guide
- https://civilization.fandom.com/wiki/Technology_(Civ7) - 403

## Identity

A Modern Age technology in Civ VII's per-age tech tree.

## Stats / numeric attributes

- Age: modern
- Prerequisite: None (age start)
- Cost (Science): `[INFERRED]` - exact per-tech costs not published by Firaxis
- Unlocks: Ironworks, Port, Merchant, Ironclad
- Mastery reward: +1 Prod on Camps, +1 Food on Farms/Plantations

## Effect description

Researching unlocks the items listed above. Completing the base tech enables Mastery research (additional cost) for the mastery reward.

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "Ironworks, Port, Merchant, Ironclad"
  - type: MASTERY_REWARD
    effect: "+1 Prod on Camps, +1 Food on Farms/Plantations"
```

## Notes / uncertainty

- Science costs per tech are `[INFERRED]` - not in any accessible source
- Mastery cost is ~80-100% of base tech cost (source conflict; see systems/tech-tree.md)
- Per-age trees do NOT carry over; research in Antiquity does not speed Exploration research

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
