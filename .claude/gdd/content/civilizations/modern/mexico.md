# Mexico - Civ VII

**Slug:** `mexico`
**Category:** `civilization`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Mexico_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The post-colonial republic. Revolutionary plans, muralists, and the Zocalo.

## Stats / numeric attributes

- **Civ bonus:** Revolucion: +25% Military Production in captured cities; +1 Infantry per conquest
- **Unique unit:** Soldadera (Revolutionary Infantry) — armed women combatants of 1910
- **Unique civic:** Planes Politicos — Catedral + Portal de Mercaderes, Palacio de Bellas Artes
- **Unique improvement:** Revolucion Mural (Ageless) — public mural; +2 Culture per Celebration
- **Unique quarter:** Zocalo — Catedral + Portal de Mercaderes
- **Associated leader(s):** Benito Juarez / Pancho Villa
- **Historical-path unlock from:** Maya / Spain
- **Age:** modern

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Revolucion: +25% Military Production in captured cities; +1 Infantry per conquest"
  - type: GRANT_UNIQUE_UNIT
    unit: "soldadera"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "revolucion-mural"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
