# An Age Drawing to Close - Civ VII

**Slug:** `antiquity-ending`
**Category:** `narrative-event`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `low`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (representative sample; narrative events are procedural/generated and not fully documented)

## Sources

- Firaxis Dev Diary #4: Emergent Narrative
- `.codex/gdd/systems/narrative-events.md` - system doc
- https://civilization.fandom.com/wiki/List_of_narrative_events_in_Civ7 - Fandom (frequently 403)

## Identity

Late-age strategic pivot point.

## Stats / numeric attributes

- **Trigger type:** age-end-imminent
- **Trigger condition:** Antiquity 90% progress
- **Age:** antiquity
- **Options:** 2 choices

## Choice effects

- **A: Push for legacy:** +2 Legacy milestone completion rate
- **B: Prepare for crisis:** Free Fortified District + 1 free policy slot

## Unique effects (structured)

```yaml
triggers:
  - type: age-end-imminent
    condition: "Antiquity 90% progress"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
