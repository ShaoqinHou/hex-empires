# A Stranger's Faith - Civ VII

**Slug:** `foreign-religion-missionary`
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

Religious diversity choice affecting future Wars of Religion crisis.

## Stats / numeric attributes

- **Trigger type:** religion-spread
- **Trigger condition:** Foreign missionary enters your territory
- **Age:** exploration
- **Options:** 2 choices

## Choice effects

- **A: Expel the missionary:** -30 opinion with that religion's founder
- **B: Allow conversion:** That settlement adopts foreign religion; +1 Culture per age

## Unique effects (structured)

```yaml
triggers:
  - type: religion-spread
    condition: "Foreign missionary enters your territory"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
