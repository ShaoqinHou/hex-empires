# The Weight of Years - Civ VII

**Slug:** `leader-aging`
**Category:** `narrative-event`
**Age:** `any`
**Status:** `draft`
**Confidence:** `low`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (representative sample; narrative events are procedural/generated and not fully documented)

## Sources

- Firaxis Dev Diary #4: Emergent Narrative
- `.codex/gdd/systems/narrative-events.md` - system doc
- https://civilization.fandom.com/wiki/List_of_narrative_events_in_Civ7 - Fandom (frequently 403)

## Identity

Leader persisting across ages but aging narratively.

## Stats / numeric attributes

- **Trigger type:** leader-age
- **Trigger condition:** Leader's age becomes visible (Modern Age)
- **Age:** any
- **Options:** 2 choices

## Choice effects

- **A: Regency/succession:** +1 Policy Slot, some old bonuses fade
- **B: Continued reign:** +2 Culture per turn, but cannot swap government next age

## Unique effects (structured)

```yaml
triggers:
  - type: leader-age
    condition: "Leader's age becomes visible (Modern Age)"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
