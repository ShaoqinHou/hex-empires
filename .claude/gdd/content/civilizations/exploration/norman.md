# Norman - Civ VII

**Slug:** `norman`
**Category:** `civilization`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Norman_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The Norse-French knights who conquered England, Sicily, and the Holy Land.

## Stats / numeric attributes

- **Civ bonus:** Feudal Hierarchy: +1 Combat per slotted Tradition; strong castles
- **Unique unit:** Chevelar (Cavalry) — mounted feudal knight
- **Unique civic:** Common Law — +1 Social Policy slot; Servitium Debitum tradition
- **Unique improvement:** Motte (Ageless) — Norman castle mound; +2 Defense
- **Unique quarter:** Norman Keep — Motte + Bailey
- **Associated leader(s):** William / Matilda
- **Historical-path unlock from:** Rome
- **Age:** exploration

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Feudal Hierarchy: +1 Combat per slotted Tradition; strong castles"
  - type: GRANT_UNIQUE_UNIT
    unit: "chevelar"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "motte"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
