# Ruins of a Forgotten People - Civ VII

**Slug:** `scout-finds-ruins`
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

The goody-hut replacement in Civ VII. Scouts discover various rewards on exploration.

## Stats / numeric attributes

- **Trigger type:** scout-action
- **Trigger condition:** Scout enters ruins tile
- **Age:** antiquity
- **Options:** 3 choices

## Choice effects

- **A: Excavate for knowledge:** 1 free Technology
- **B: Loot for gold:** 50 Gold
- **C: Claim as cultural site:** +2 Culture in nearest Settlement

## Unique effects (structured)

```yaml
triggers:
  - type: scout-action
    condition: "Scout enters ruins tile"
effects: narrative-choice-dependent  # see options above
```

## Notes / uncertainty

- Civ VII ships with 1000+ narrative events per Firaxis Dev Diary #4; this is a REPRESENTATIVE sample, not exhaustive
- All effect magnitudes `[INFERRED]` - exact event catalog proprietary to Firaxis
- Tag system (used for cross-age callback events) not yet modeled in these fact cards
- This fact-card scaffold is implementation guidance; real Civ VII events are more numerous and more varied

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
