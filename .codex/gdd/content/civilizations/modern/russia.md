# Russia - Civ VII

**Slug:** `russia`
**Category:** `civilization`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Russia_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

The Eurasian empire spanning 11 time zones. Serfs, tsars, and the Trans-Siberian.

## Stats / numeric attributes

- **Civ bonus:** Rodina: Tundra tiles gain +1 yield; units immune to blizzard damage
- **Unique unit:** Cossack (Cavalry) — steppe mounted scout and raider
- **Unique civic:** Table of Ranks — +1 Gold on Districts and Cities, Hermitage unlock
- **Unique improvement:** Obshchina (Ageless) — peasant commune; +1 Production on Tundra Town Farms
- **Unique quarter:** Kremlin Complex
- **Associated leader(s):** Peter the Great / Catherine the Great
- **Historical-path unlock from:** Norman / Mongolia
- **Age:** modern

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Rodina: Tundra tiles gain +1 yield; units immune to blizzard damage"
  - type: GRANT_UNIQUE_UNIT
    unit: "cossack"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "obshchina"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
