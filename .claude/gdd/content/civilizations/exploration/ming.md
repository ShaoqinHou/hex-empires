# Ming China - Civ VII

**Slug:** `ming`
**Category:** `civilization`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Ming_China_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The restoration of Han rule after the Yuan. Treasure fleets, porcelain, and the Forbidden City.

## Stats / numeric attributes

- **Civ bonus:** Middle Kingdom: +10% Gold in Capital; +1 Settlement Limit from tech mastery
- **Unique unit:** Xunleichong (Gunpowder) — firelance gunpowder unit
- **Unique civic:** Da Ming Lu — Mandarins get bonus; unlocks Forbidden City
- **Unique improvement:** Ming Great Wall (Ageless) — frontier wall; +3 defense, +2 Gold with Bank
- **Unique quarter:** Ming Imperial Complex — Forbidden City pair
- **Associated leader(s):** Hongwu / Yongle
- **Historical-path unlock from:** Han
- **Age:** exploration

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Middle Kingdom: +10% Gold in Capital; +1 Settlement Limit from tech mastery"
  - type: GRANT_UNIQUE_UNIT
    unit: "xunleichong"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "ming-great-wall"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
