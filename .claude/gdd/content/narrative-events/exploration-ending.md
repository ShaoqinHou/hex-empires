# The Ocean Calls - Civ VII

**Slug:** `exploration-ending`
**Category:** `narrative-event`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `low`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (representative sample; narrative events are procedural/generated and not fully documented)

## Sources

- Firaxis Dev Diary #4: Emergent Narrative
- `.claude/gdd/systems/narrative-events.md` - system doc
- https://civilization.fandom.com/wiki/List_of_narrative_events_in_Civ7 - Fandom (frequently 403)

## Identity

Late-Exploration strategic pivot.

## Stats / numeric attributes

- **Trigger type:** age-end-imminent
- **Trigger condition:** Exploration 90% progress
- **Age:** exploration
- **Options:** 2 choices

## Choice effects

- **A: Final voyages:** +3 Trade Route range, +2 Gold per Treasure Fleet
- **B: Defensive consolidation:** +5 CS defending districts

## Unique effects (structured)

```yaml
triggers:
  - type: age-end-imminent
    condition: "Exploration 90% progress"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
