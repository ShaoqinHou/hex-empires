# Greece - Civ VII

**Slug:** `greece`
**Category:** `civilization`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Greece_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The city-state birthplace of philosophy, democracy, and civic contest.

## Stats / numeric attributes

- **Civ bonus:** Plato's Republic: +1 Science per active City-State Suzerainty; +10% Influence
- **Unique unit:** Hoplite (Spearman replacement) — +2 Combat when adjacent to another Hoplite
- **Unique civic:** Symmachia — +2 Culture per City-State suzerainty, +1 Settlement Limit, unlocks Oracle
- **Unique improvement:** Plaza (Ageless) — +2 Culture per adjacent Wonder
- **Unique quarter:** Acropolis — Parthenon + Odeon
- **Associated leader(s):** Xerxes / Himiko / Confucius
- **Historical-path unlock from:** N/A (starting civ in Antiquity)
- **Age:** antiquity

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Plato's Republic: +1 Science per active City-State Suzerainty; +10% Influence"
  - type: GRANT_UNIQUE_UNIT
    unit: "hoplite"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "plaza"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
