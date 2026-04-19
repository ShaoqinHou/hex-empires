# Jungle Birthplace - Civ VII

**Slug:** `starting-in-tropical`
**Category:** `narrative-event`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `low`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (representative sample; narrative events are procedural/generated and not fully documented)

## Sources

- Firaxis Dev Diary #4: Emergent Narrative
- `.claude/gdd/systems/narrative-events.md` - system doc
- https://civilization.fandom.com/wiki/List_of_narrative_events_in_Civ7 - Fandom (frequently 403)

## Identity

Mayan, Khmer, and Olmec civilizations emerged from tropical forest adaptation.

## Stats / numeric attributes

- **Trigger type:** starting-tile
- **Trigger condition:** Capital founded in Tropical biome
- **Age:** antiquity
- **Options:** 2 choices

## Choice effects

- **A: Clear the jungle:** +2 Production per cleared Rainforest
- **B: Live with the forest:** +1 Science per adjacent Rainforest

## Unique effects (structured)

```yaml
triggers:
  - type: starting-tile
    condition: "Capital founded in Tropical biome"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
