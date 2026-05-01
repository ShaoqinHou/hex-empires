# The Gods Speak - Civ VII

**Slug:** `found-religion`
**Category:** `narrative-event`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `low`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (representative sample; narrative events are procedural/generated and not fully documented)

## Sources

- Firaxis Dev Diary #4: Emergent Narrative
- `.codex/gdd/systems/narrative-events.md` - system doc
- https://civilization.fandom.com/wiki/List_of_narrative_events_in_Civ7 - Fandom (frequently 403)

## Identity

Religion founding in Exploration age reshapes empire identity.

## Stats / numeric attributes

- **Trigger type:** religion
- **Trigger condition:** Religion founded in Exploration
- **Age:** exploration
- **Options:** 2 choices

## Choice effects

- **A: Proselytize widely:** +2 Faith per Missionary for 20 turns
- **B: Build sacred center:** +5 Faith in Holy City permanent

## Unique effects (structured)

```yaml
triggers:
  - type: religion
    condition: "Religion founded in Exploration"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
