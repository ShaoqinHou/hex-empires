# The Ancestral Ways - Civ VII

**Slug:** `civ-heritage`
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

Cultural continuity-vs-change choice at transition.

## Stats / numeric attributes

- **Trigger type:** age-transition
- **Trigger condition:** Transitioning to Exploration with full Antiquity legacy
- **Age:** exploration
- **Options:** 2 choices

## Choice effects

- **A: Preserve heritage:** +1 Culture per Wonder from past Age
- **B: Embrace modernity:** +1 Science per Specialist

## Unique effects (structured)

```yaml
triggers:
  - type: age-transition
    condition: "Transitioning to Exploration with full Antiquity legacy"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
