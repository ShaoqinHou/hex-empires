# Mongolia - Civ VII

**Slug:** `mongolia`
**Category:** `civilization`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Mongolia_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The steppe horde conquering Eurasia. Horse archers and the Yassa code.

## Stats / numeric attributes

- **Civ bonus:** Pax Mongolica: Cavalry +1 Movement; trade routes through enemy territory
- **Unique unit:** Keshig (Elite Cavalry) — heavy mounted unit
- **Unique civic:** Four Hounds — +1 Settlement Limit, free Noyan in Capital
- **Unique improvement:** Ortoo (Ageless) — postal station; +2 Gold, +2 Gold in non-founded Settlements
- **Unique quarter:** Mongol Ger Circle
- **Associated leader(s):** Genghis Khan (DLC) / Kublai
- **Historical-path unlock from:** Various (steppe)
- **Age:** exploration

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Pax Mongolica: Cavalry +1 Movement; trade routes through enemy territory"
  - type: GRANT_UNIQUE_UNIT
    unit: "keshig"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "ortoo"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
