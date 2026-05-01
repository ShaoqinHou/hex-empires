# Envoys at the Gate - Civ VII

**Slug:** `meet-independent-power`
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

First diplomatic contact shapes the relationship trajectory.

## Stats / numeric attributes

- **Trigger type:** first-contact
- **Trigger condition:** First meeting with an Independent Power
- **Age:** antiquity
- **Options:** 2 choices

## Choice effects

- **A: Embrace peacefully:** 30 befriend points toward Suzerainty
- **B: Demand tribute:** 50 Gold but -20 opinion

## Unique effects (structured)

```yaml
triggers:
  - type: first-contact
    condition: "First meeting with an Independent Power"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
