# Buganda - Civ VII

**Slug:** `buganda`
**Category:** `civilization`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Buganda_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

The Great Lakes kingdom ruled by the Kabaka. Drum ensembles, lakeshore agriculture, and royal ritual.

## Stats / numeric attributes

- **Civ bonus:** Ngabi na Kkoba: +2 Culture from Lake tiles; +1 Happiness per Lake adjacency
- **Unique unit:** Basalikkali (Royal Guard) — melee unit defending the Kabaka
- **Unique civic:** Nnalubaale — Kabaka's Lake improvement, Muzibu Azaala Mpanga unlock
- **Unique improvement:** Kabaka's Lake (Ageless) — sacred lake reservoir; +4 Food, +2 Culture
- **Unique quarter:** Royal Enclosure Complex
- **Associated leader(s):** Mutesa I / Kabaka Muteesa
- **Historical-path unlock from:** Aksum
- **Age:** modern

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Ngabi na Kkoba: +2 Culture from Lake tiles; +1 Happiness per Lake adjacency"
  - type: GRANT_UNIQUE_UNIT
    unit: "basalikkali"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "kabaka-s-lake"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
