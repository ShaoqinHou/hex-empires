# Mass Production - Civ VII

**Slug:** `mass-production`
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
- Prerequisite: Combustion + Industrialization
- Cost (Science): `[INFERRED]` - exact per-tech costs not published by Firaxis
- Unlocks: +1 Settlement Limit, Cannery, Factory
- Mastery reward: Sabotage Shipping, +1 Food on Food Buildings/Fishing Boats/Pastures

## Effect description

Researching unlocks the items listed above. Completing the base tech enables Mastery research (additional cost) for the mastery reward.

## Unique effects (structured)

```yaml
effects:
  - type: UNLOCK
    items: "+1 Settlement Limit, Cannery, Factory"
  - type: MASTERY_REWARD
    effect: "Sabotage Shipping, +1 Food on Food Buildings/Fishing Boats/Pastures"
```

## Notes / uncertainty

- Science costs per tech are `[INFERRED]` - not in any accessible source
- Mastery cost is ~80-100% of base tech cost (source conflict; see systems/tech-tree.md)
- Per-age trees do NOT carry over; research in Antiquity does not speed Exploration research

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
