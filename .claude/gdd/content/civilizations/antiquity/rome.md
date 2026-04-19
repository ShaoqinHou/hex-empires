# Rome - Civ VII

**Slug:** `rome`
**Category:** `civilization`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Rome_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The Republic turning Empire. Engineering, law, and military discipline underpin Mediterranean conquest.

## Stats / numeric attributes

- **Civ bonus:** SPQR: +1 Culture per Town, +1 Gold per City from Roads
- **Unique unit:** Legion (Warrior replacement) — +2 Combat, +1 Production adjacent to another Legion
- **Unique civic:** Senatus Populusque Romanus — +1 Social Policy Slot, +1 Settlement Limit, unlocks Colosseum
- **Unique improvement:** Cursus Romanum (Ageless road variant) — +1 Gold on roads, faster movement
- **Unique quarter:** Forum — Temple of Jupiter + Basilica
- **Associated leader(s):** Augustus
- **Historical-path unlock from:** N/A (starting civ in Antiquity)
- **Age:** antiquity

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "SPQR: +1 Culture per Town, +1 Gold per City from Roads"
  - type: GRANT_UNIQUE_UNIT
    unit: "legion"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "cursus-romanum"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
