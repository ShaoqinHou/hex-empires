# Egypt - Civ VII

**Slug:** `egypt`
**Category:** `civilization`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Egypt_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

The Nile kingdom. Agricultural surplus from annual flooding drives a civilization of monumental builders.

## Stats / numeric attributes

- **Civ bonus:** Pharaonic: +15% Production toward Wonders in Cities adjacent to Navigable Rivers
- **Unique unit:** Medjay (Scout replacement) — ranged desert scout with bonus vs Barbarians
- **Unique civic:** Light of Amun-Ra — +5 Gold on Palace, +1 Settlement Limit, unlocks Pyramids
- **Unique improvement:** Mortuary Temple (Ageless) — +3 Faith; unique to Egypt
- **Unique quarter:** Necropolis — Mastaba + Mortuary Temple
- **Associated leader(s):** Hatshepsut
- **Historical-path unlock from:** N/A (starting civ in Antiquity)
- **Age:** antiquity

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Pharaonic: +15% Production toward Wonders in Cities adjacent to Navigable Rivers"
  - type: GRANT_UNIQUE_UNIT
    unit: "medjay"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "mortuary-temple"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
