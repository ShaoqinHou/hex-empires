# Abbasid - Civ VII

**Slug:** `abbasid`
**Category:** `civilization`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Abbasid_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

Baghdad as the center of the medieval world. Algebra, medicine, translation.

## Stats / numeric attributes

- **Civ bonus:** House of Wisdom: +15% Science from buildings; +1 Science per adjacent Library/Academy
- **Unique unit:** Mamluk (Cavalry replacement) — heavy cavalry with urban combat bonus
- **Unique civic:** Al-Jabr — +15% Science in Cities with 8+ Urban Pop, unlocks House of Wisdom
- **Unique improvement:** Madrasa (Ageless) — +3 Science, Codex slots
- **Unique quarter:** Medina — Round City Palace + Madrasa
- **Associated leader(s):** Harun al-Rashid / Ibn Battuta
- **Historical-path unlock from:** Egypt / Maurya
- **Age:** exploration

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "House of Wisdom: +15% Science from buildings; +1 Science per adjacent Library/Academy"
  - type: GRANT_UNIQUE_UNIT
    unit: "mamluk"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "madrasa"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
