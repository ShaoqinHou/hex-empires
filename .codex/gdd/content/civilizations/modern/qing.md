# Qing China - Civ VII

**Slug:** `qing`
**Category:** `civilization`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Qing_China_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

The Manchu dynasty at the apex of imperial China. Treasure porcelain, examination scholars, and inner Asia pacified.

## Stats / numeric attributes

- **Civ bonus:** Mandate Renewed: +10% Science empire-wide; Celebration bonus to Trade Routes
- **Unique unit:** Banner Army (Elite Cavalry) — Manchu ethnic military organization
- **Unique civic:** Ten Great Campaigns — +1 Combat per trade-routed Civ/City-State
- **Unique improvement:** Imperial Workshop (Ageless) — Qing artisan; +3 Culture, unique porcelain
- **Unique quarter:** Summer Palace Complex
- **Associated leader(s):** Kangxi / Qianlong
- **Historical-path unlock from:** Ming
- **Age:** modern

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Mandate Renewed: +10% Science empire-wide; Celebration bonus to Trade Routes"
  - type: GRANT_UNIQUE_UNIT
    unit: "banner-army"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "imperial-workshop"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
