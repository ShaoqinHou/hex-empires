# Defeat Remembered - Civ VII

**Slug:** `first-defeat`
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

Loss drives narrative of revenge or reflection.

## Stats / numeric attributes

- **Trigger type:** combat
- **Trigger condition:** First unit loss by player
- **Age:** antiquity
- **Options:** 2 choices

## Choice effects

- **A: Mourn and rebuild:** +1 Production toward military units for 10 turns
- **B: Demand revenge:** +2 CS against the civ that killed your unit

## Unique effects (structured)

```yaml
triggers:
  - type: combat
    condition: "First unit loss by player"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
