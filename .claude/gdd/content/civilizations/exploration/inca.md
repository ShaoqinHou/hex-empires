# Inca - Civ VII

**Slug:** `inca`
**Category:** `civilization`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Inca_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The mountain empire of the Andes. Roads, terraces, and knotted quipus.

## Stats / numeric attributes

- **Civ bonus:** Qollasuyu: +1 Food per Mountain adjacency; rough terrain gives +2 CS defense
- **Unique unit:** Warak'aq (Sling unit) — ranged unit with mountain combat bonus
- **Unique civic:** Mit'a — Terrace Farm improvement, unlocks Machu Picchu
- **Unique improvement:** Terrace Farm (Ageless) — mountain-adjacent farm; +4 Food
- **Unique quarter:** Cuzco Quarter — Inca imperial buildings
- **Associated leader(s):** Pachacuti
- **Historical-path unlock from:** Mississippian
- **Age:** exploration

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Qollasuyu: +1 Food per Mountain adjacency; rough terrain gives +2 CS defense"
  - type: GRANT_UNIQUE_UNIT
    unit: "warak-aq"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "terrace-farm"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
