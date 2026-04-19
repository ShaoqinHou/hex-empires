# The Historian's Ledger - Civ VII

**Slug:** `legacy-accomplishment`
**Category:** `narrative-event`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `low`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (representative sample; narrative events are procedural/generated and not fully documented)

## Sources

- Firaxis Dev Diary #4: Emergent Narrative
- `.claude/gdd/systems/narrative-events.md` - system doc
- https://civilization.fandom.com/wiki/List_of_narrative_events_in_Civ7 - Fandom (frequently 403)

## Identity

Legacy Path completion with narrative framing.

## Stats / numeric attributes

- **Trigger type:** legacy-path
- **Trigger condition:** Completing any Legacy Path in Modern Age
- **Age:** modern
- **Options:** 2 choices

## Choice effects

- **A: Monument to victory:** +5 Culture/turn from the chosen path's theme
- **B: Pivot to another path:** +2 Wildcard Attribute Points, old path rewards reduced

## Unique effects (structured)

```yaml
triggers:
  - type: legacy-path
    condition: "Completing any Legacy Path in Modern Age"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
