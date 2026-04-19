# Songhai - Civ VII

**Slug:** `songhai`
**Category:** `civilization`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Songhai_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The West African empire ruling the Niger bend. Trans-Saharan caravans, gold, and scholarship at Timbuktu.

## Stats / numeric attributes

- **Civ bonus:** Sahel Trade: +3 Gold per Trade Route crossing Desert; Caravanserai bonuses
- **Unique unit:** Sofa Warrior (Cavalry) — West African mounted unit
- **Unique civic:** Ships of the Desert — Caravanserai improvement, Tomb of Askia
- **Unique improvement:** Caravanserai (Ageless) — desert trade post; +5 Gold with Bazaar
- **Unique quarter:** Gao Market — Songhai commercial quarter
- **Associated leader(s):** Askia Mohammed / Mansa Musa (DLC)
- **Historical-path unlock from:** Aksum / Maurya
- **Age:** exploration

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Sahel Trade: +3 Gold per Trade Route crossing Desert; Caravanserai bonuses"
  - type: GRANT_UNIQUE_UNIT
    unit: "sofa-warrior"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "caravanserai"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
