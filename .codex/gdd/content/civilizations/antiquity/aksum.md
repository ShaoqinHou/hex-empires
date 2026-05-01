# Aksum - Civ VII

**Slug:** `aksum`
**Category:** `civilization`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Aksum_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

The Horn of Africa kingdom controlling Red Sea trade between Rome and India.

## Stats / numeric attributes

- **Civ bonus:** Red Sea Trade: +2 Gold per Trade Route; coastal city bonus
- **Unique unit:** Shotel Warrior (Curved Sword) — melee bonus in rough terrain
- **Unique civic:** Periplus of Erythraean Sea — Hawilt, coastal/river bonuses, unlocks Great Stele
- **Unique improvement:** Hawilt (Ageless) — carved obelisk; +2 Culture, +1 Faith
- **Unique quarter:** Aksumite Trading Quarter
- **Associated leader(s):** Amanirenas / Menelik
- **Historical-path unlock from:** N/A (starting civ in Antiquity)
- **Age:** antiquity

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Red Sea Trade: +2 Gold per Trade Route; coastal city bonus"
  - type: GRANT_UNIQUE_UNIT
    unit: "shotel-warrior"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "hawilt"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
