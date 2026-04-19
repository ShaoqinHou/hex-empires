# Oracle — Civ VII

**Slug:** `oracle`
**Category:** `wonder`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://civ7.wiki.fextralife.com/Oracle_-_Antiquity_Wonder — Fextralife individual wonder page
- https://civilization.fandom.com/wiki/Oracle_(Civ7) — Fandom wiki

## Identity

- Historical period: Ancient Greece, c. 800-400 BCE. The Oracle of Delphi was the most authoritative religious site in the Hellenic world, consulted before major decisions.
- Flavor: Built on rough terrain reflecting the remote mountain sanctuary at Delphi. Firaxis ties this wonder to Greek civilization in the Antiquity Age.

## Stats / numeric attributes

- Cost: 375 Production
- Effect: +2 Culture; +10 Culture per Age whenever gaining rewards from a Narrative Event
- Prerequisite: [INFERRED] late Antiquity civic; specific civic not confirmed in sources
- Placement: Must be built on a Rough terrain tile
- Obsoletes: No (Ageless)

## Unique effects (structured — for later code mapping)

```yaml
effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +2
  - type: MODIFY_YIELD
    target: this-city
    yield: culture
    value: +10
    trigger: narrative-event-reward
    per-age-scaling: true
```

## Notes / uncertainty

The +10 Culture "per Age" from narrative events is a scaling mechanic meaning the bonus increments with each age. Rough terrain placement restricts this to hills within city limits. Prerequisite civic not confirmed in Fextralife data.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
