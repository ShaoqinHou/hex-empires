# Khmer - Civ VII

**Slug:** `khmer`
**Category:** `civilization`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Khmer_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

The hydraulic empire of Angkor. Temple-mountains rise from irrigated rice plains.

## Stats / numeric attributes

- **Civ bonus:** Devaraja: +1 Food on Rivers; Navigable River tiles provide extra yield
- **Unique unit:** Yuthahathi (War Elephant) — heavy cavalry unit with terrain bonuses
- **Unique civic:** Amnach — Yuthahathi +1 Movement, Varna tradition, unlocks Angkor Wat
- **Unique improvement:** Baray (Ageless) — +3 Food; flood protection; all-settlement Floodplain bonus
- **Unique quarter:** Angkorian Complex — Khmer unique buildings
- **Associated leader(s):** Jayavarman / Ashoka
- **Historical-path unlock from:** N/A (starting civ in Antiquity)
- **Age:** antiquity

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Devaraja: +1 Food on Rivers; Navigable River tiles provide extra yield"
  - type: GRANT_UNIQUE_UNIT
    unit: "yuthahathi"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "baray"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
