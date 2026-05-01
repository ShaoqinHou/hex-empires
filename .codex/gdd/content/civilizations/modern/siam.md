# Siam - Civ VII

**Slug:** `siam`
**Category:** `civilization`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Siam_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

The only Southeast Asian state never colonized. Diplomacy between French and British empires.

## Stats / numeric attributes

- **Civ bonus:** Mandala: +3 Culture on Palace per City-State suzerainty; diplomatic bonuses
- **Unique unit:** Chang Beun (War Elephant) — +6 Combat near suzerain City-States
- **Unique civic:** Mandala — Chang Beun +6 Combat near suzerains, unlocks Doi Suthep
- **Unique improvement:** Bang (Ageless) — Thai floating village on rivers; +3 Food, +2 Gold
- **Unique quarter:** Grand Palace Complex
- **Associated leader(s):** Rama V (Chulalongkorn) / Naresuan
- **Historical-path unlock from:** Khmer
- **Age:** modern

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Mandala: +3 Culture on Palace per City-State suzerainty; diplomatic bonuses"
  - type: GRANT_UNIQUE_UNIT
    unit: "chang-beun"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "bang"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
