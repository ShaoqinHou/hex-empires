# Maurya India - Civ VII

**Slug:** `maurya`
**Category:** `civilization`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Maurya_India_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The first pan-Indian empire. Ashoka's edicts carved into pillars proclaim dharma from Kabul to Karnataka.

## Stats / numeric attributes

- **Civ bonus:** Dharmashastra: +1 Happiness in Settlements with a Temple; Faith-generation bonus
- **Unique unit:** Chariot Archer (Chariot ranged variant) — mobile ranged unit
- **Unique civic:** Mantriparishad — Increased yields in non-founded settlements, +1 Settlement Limit, unlocks Sanchi Stupa
- **Unique improvement:** Vihara (Ageless) — Buddhist monastery; +2 Faith, +1 Science
- **Unique quarter:** Mauryan Quarter — Dharmashala + K'uh Nah [INFERRED pair]
- **Associated leader(s):** Ashoka (World Renouncer / World Conqueror)
- **Historical-path unlock from:** N/A (starting civ in Antiquity)
- **Age:** antiquity

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Dharmashastra: +1 Happiness in Settlements with a Temple; Faith-generation bonus"
  - type: GRANT_UNIQUE_UNIT
    unit: "chariot-archer"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "vihara"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
