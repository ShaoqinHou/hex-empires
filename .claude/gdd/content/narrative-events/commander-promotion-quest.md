# A Commander of Legend - Civ VII

**Slug:** `commander-promotion-quest`
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

Commanders becoming legendary figures.

## Stats / numeric attributes

- **Trigger type:** commander-level
- **Trigger condition:** Commander reaches level 4+
- **Age:** exploration
- **Options:** 2 choices

## Choice effects

- **A: Knight the commander:** +1 promotion point, +1 Happiness empire-wide
- **B: Send on distant campaign:** +2 Movement but commander unavailable for 5 turns

## Unique effects (structured)

```yaml
triggers:
  - type: commander-level
    condition: "Commander reaches level 4+"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
