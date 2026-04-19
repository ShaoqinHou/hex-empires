# Spain - Civ VII

**Slug:** `spain`
**Category:** `civilization`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Spain_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The Catholic Monarchs' empire reaching across the Atlantic. Gold, galleons, and the Armada.

## Stats / numeric attributes

- **Civ bonus:** Imperio: +50% Gold from Treasure Fleets; Fleet Commander bonuses
- **Unique unit:** Conquistador (Modern Cavalry-equivalent) — explorer/conqueror unit
- **Unique civic:** Council of the Indies — Casa Consistorial, +1 Movement to Treasure Fleets
- **Unique improvement:** Cerro Rico (Ageless) — silver mine; +6 Gold, unique to Spain
- **Unique quarter:** Spanish Colonial Quarter
- **Associated leader(s):** Isabella / Charles V
- **Historical-path unlock from:** Rome / Norman
- **Age:** exploration

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Imperio: +50% Gold from Treasure Fleets; Fleet Commander bonuses"
  - type: GRANT_UNIQUE_UNIT
    unit: "conquistador"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "cerro-rico"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
