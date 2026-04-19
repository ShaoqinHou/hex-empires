# Mississippian - Civ VII

**Slug:** `mississippian`
**Category:** `civilization`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Mississippian_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The mound-builders of the great Mississippi river system. Cahokia stood as the largest city north of Mexico.

## Stats / numeric attributes

- **Civ bonus:** Great Sun: +1 Food per adjacent River; +2 Production on Woodland improvements
- **Unique unit:** Potkop Warrior (War Club) — melee unit with terrain bonus
- **Unique civic:** Earthworks — Potkop, +10% Production for buildings, unlocks Monks Mound
- **Unique improvement:** Potkop (Ageless) — monumental earthen mound; +2 Culture, +2 Faith
- **Unique quarter:** Mississippian Mound Complex
- **Associated leader(s):** Tecumseh
- **Historical-path unlock from:** N/A (starting civ in Antiquity)
- **Age:** antiquity

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Great Sun: +1 Food per adjacent River; +2 Production on Woodland improvements"
  - type: GRANT_UNIQUE_UNIT
    unit: "potkop-warrior"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "potkop"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
