# Maya - Civ VII

**Slug:** `maya`
**Category:** `civilization`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Maya_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.claude/gdd/systems/civilizations.md` - system doc
- `.claude/gdd/content/civilizations/_overview.md`

## Identity

The jungle city-states of Mesoamerica. Astronomy, mathematics, and the calendar.

## Stats / numeric attributes

- **Civ bonus:** Long Count: +1 Culture per researched Technology; +2 Science on Jungle
- **Unique unit:** Atlatlist (Ranged) — obsidian-armed ranged unit
- **Unique civic:** Calendar Round — After a Technology, gain Culture = 10% of its cost, unlocks Mundo Perdido
- **Unique improvement:** K'uh Nah (Ageless) — sacred house; +2 Faith, unlocks religious buildings
- **Unique quarter:** Mayan Temple Plaza — Jalaw + K'uh Nah
- **Associated leader(s):** Pacal / Ix Waka Chan K'awiil
- **Historical-path unlock from:** N/A (starting civ in Antiquity)
- **Age:** antiquity

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Long Count: +1 Culture per researched Technology; +2 Science on Jungle"
  - type: GRANT_UNIQUE_UNIT
    unit: "atlatlist"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "k-uh-nah"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
