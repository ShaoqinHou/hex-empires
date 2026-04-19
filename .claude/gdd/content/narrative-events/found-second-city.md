# The Young Empire Grows - Civ VII

**Slug:** `found-second-city`
**Category:** `narrative-event`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `low`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (representative sample; narrative events are procedural/generated and not fully documented)

## Sources

- Firaxis Dev Diary #4: Emergent Narrative
- `.claude/gdd/systems/narrative-events.md` - system doc
- https://civilization.fandom.com/wiki/List_of_narrative_events_in_Civ7 - Fandom (frequently 403)

## Identity

Expansion beyond the founding city.

## Stats / numeric attributes

- **Trigger type:** settlement
- **Trigger condition:** Second Settlement founded
- **Age:** antiquity
- **Options:** 2 choices

## Choice effects

- **A: Invest in growth:** +1 Food in both settlements for 20 turns
- **B: Fortify expansion:** +3 Happiness in both settlements

## Unique effects (structured)

```yaml
triggers:
  - type: settlement
    condition: "Second Settlement founded"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
