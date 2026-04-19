# Meiji Japan - Civ VII

**Slug:** `meiji`
**Category:** `civilization`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Meiji_Japan_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The late-19th-century restoration turning isolation into industrial power in a generation.

## Stats / numeric attributes

- **Civ bonus:** Bunmei Kaika: +1 Production on Jukogyo buildings; rapid industrialization bonus
- **Unique unit:** Teikoku Rikugun (Modern Infantry) — Meiji imperial army
- **Unique civic:** Bunmei Kaika — Jukogyo building, industrialization acceleration
- **Unique improvement:** Ginko (Ageless, unique) — Meiji bank; +3 Gold in Capital
- **Unique quarter:** Zaibatsu — Ginko + Jukogyo
- **Associated leader(s):** Meiji Emperor / Himiko (persona)
- **Historical-path unlock from:** Han / Various
- **Age:** modern

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Bunmei Kaika: +1 Production on Jukogyo buildings; rapid industrialization bonus"
  - type: GRANT_UNIQUE_UNIT
    unit: "teikoku-rikugun"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "ginko"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
