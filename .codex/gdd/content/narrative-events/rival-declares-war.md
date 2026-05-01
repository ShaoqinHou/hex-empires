# The Horns of War - Civ VII

**Slug:** `rival-declares-war`
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

War declaration narrative response.

## Stats / numeric attributes

- **Trigger type:** diplomatic
- **Trigger condition:** Rival civ declares war on you
- **Age:** antiquity
- **Options:** 2 choices

## Choice effects

- **A: Defensive alliance:** Seek alliance with 3rd civ at -100 Influence
- **B: Counter-offensive:** +3 CS to all your units for 10 turns

## Unique effects (structured)

```yaml
triggers:
  - type: diplomatic
    condition: "Rival civ declares war on you"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
