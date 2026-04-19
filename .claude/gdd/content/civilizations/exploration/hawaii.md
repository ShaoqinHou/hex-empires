# Hawaii - Civ VII

**Slug:** `hawaii`
**Category:** `civilization`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Hawaii_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The Polynesian navigators. Ocean crossings and volcanic islands.

## Stats / numeric attributes

- **Civ bonus:** Aloha Aina: +2 Culture on Storm/Flood/Eruption Fertility; Ocean workable in Exploration
- **Unique unit:** Koa Warrior (Swordsman replacement) — melee with terrain defense bonus
- **Unique civic:** He'e Nalu — +1 Settlement Limit, +2 Relics, unlocks Hale o Keawe
- **Unique improvement:** Loi Kalo (Ageless) — taro pond-field; +3 Food on coast/tropical
- **Unique quarter:** Heiau Complex — Hawaiian sacred quarter
- **Associated leader(s):** Kamehameha
- **Historical-path unlock from:** Various (archipelago start)
- **Age:** exploration

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Aloha Aina: +2 Culture on Storm/Flood/Eruption Fertility; Ocean workable in Exploration"
  - type: GRANT_UNIQUE_UNIT
    unit: "koa-warrior"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "loi-kalo"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
