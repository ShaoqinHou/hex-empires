# Chola - Civ VII

**Slug:** `chola`
**Category:** `civilization`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Chola_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

South Indian maritime empire projecting power across the Indian Ocean to Java and Sumatra.

## Stats / numeric attributes

- **Civ bonus:** Naval Supremacy: +2 Trade Route range; coastal dominance bonuses
- **Unique unit:** Kaval Chozhan (Naval unit) — Indian Ocean warship
- **Unique civic:** Monsoon Winds — +1 Settlement Limit, Brihadeeswarar Temple unlock
- **Unique improvement:** Pulavar (Ageless) — coastal temple-fort; +2 Gold, +1 Culture
- **Unique quarter:** Chola Port — unique maritime quarter
- **Associated leader(s):** Rajaraja / Ashoka
- **Historical-path unlock from:** Maurya / Khmer
- **Age:** exploration

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Naval Supremacy: +2 Trade Route range; coastal dominance bonuses"
  - type: GRANT_UNIQUE_UNIT
    unit: "kaval-chozhan"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "pulavar"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
