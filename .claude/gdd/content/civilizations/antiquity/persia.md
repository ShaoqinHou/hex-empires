# Persia - Civ VII

**Slug:** `persia`
**Category:** `civilization`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Persia_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The multi-cultural empire of the Great King. Satrapies, royal roads, and tolerance.

## Stats / numeric attributes

- **Civ bonus:** King of Kings: +1 Gold per conquered Settlement; Roads reduce movement cost further
- **Unique unit:** Immortal (Spearman replacement) — +2 Combat, never disbanded when unhappy
- **Unique civic:** Satrapies — Pairidaeza, Angarium tradition, unlocks Gate of All Nations
- **Unique improvement:** Pairidaeza (Ageless) — Royal garden providing Culture + Happiness
- **Unique quarter:** Apadana — Persian unique buildings
- **Associated leader(s):** Xerxes (King of Kings / Achaemenid)
- **Historical-path unlock from:** N/A (starting civ in Antiquity)
- **Age:** antiquity

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "King of Kings: +1 Gold per conquered Settlement; Roads reduce movement cost further"
  - type: GRANT_UNIQUE_UNIT
    unit: "immortal"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "pairidaeza"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
