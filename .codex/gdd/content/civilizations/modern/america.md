# America - Civ VII

**Slug:** `america`
**Category:** `civilization`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/America_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

The constitutional republic on the continent-wide frontier. Industry, innovation, and the Pacific.

## Stats / numeric attributes

- **Civ bonus:** Manifest Destiny: +1 Production on Resources; +1 Settlement Limit
- **Unique unit:** Rough Rider (Infantry variant) — +2 CS in home territory
- **Unique civic:** Wartime Manufacturing — +3 Combat per adjacent enemy; +25% Production in favorable wars
- **Unique improvement:** Railyard (Ageless) — +2 Gold, enables rail network
- **Unique quarter:** American Industrial Complex — Steel Mill + Railyard
- **Associated leader(s):** Benjamin Franklin / Harriet Tubman / Abraham Lincoln
- **Historical-path unlock from:** Various (New World)
- **Age:** modern

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Manifest Destiny: +1 Production on Resources; +1 Settlement Limit"
  - type: GRANT_UNIQUE_UNIT
    unit: "rough-rider"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "railyard"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
