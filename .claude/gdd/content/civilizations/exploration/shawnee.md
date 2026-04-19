# Shawnee - Civ VII

**Slug:** `shawnee`
**Category:** `civilization`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Shawnee_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The Algonquian-speaking nation of the Ohio Valley. Resistance, diplomacy, and the prophet.

## Stats / numeric attributes

- **Civ bonus:** Absentee Shawnee: +1 Science per explored Natural Wonder; +1 Food per forest
- **Unique unit:** Wyehi (Forest Warrior) — ambush melee unit
- **Unique civic:** Wyehi Simekofi — Serpent Mound, Mawaskawe Skote improvement unlock
- **Unique improvement:** Mawaskawe Skote (Ageless) — council fire; +2 Culture per allied City-State
- **Unique quarter:** Shawnee Longhouse Quarter
- **Associated leader(s):** Tecumseh
- **Historical-path unlock from:** Mississippian
- **Age:** exploration

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Absentee Shawnee: +1 Science per explored Natural Wonder; +1 Food per forest"
  - type: GRANT_UNIQUE_UNIT
    unit: "wyehi"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "mawaskawe-skote"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
