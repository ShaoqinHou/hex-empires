# Mughal India - Civ VII

**Slug:** `mughal`
**Category:** `civilization`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Mughal_India_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

The Indo-Persian empire. Taj Mahal, miniatures, and the Peacock Throne.

## Stats / numeric attributes

- **Civ bonus:** Padshah: +2 Gold per assigned Resource; Wonders purchasable with Gold
- **Unique unit:** Khurasani Cavalry (Heavy Cavalry) — Persian-style mounted archer
- **Unique civic:** Mansabdari — Increased Gold toward purchasing Infantry, Red Fort
- **Unique improvement:** Stepwell (Ageless) — Mughal baoli; +3 Food, +2 Happiness adjacent to Farms
- **Unique quarter:** Red Fort Complex
- **Associated leader(s):** Akbar / Aurangzeb
- **Historical-path unlock from:** Maurya / Chola
- **Age:** modern

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Padshah: +2 Gold per assigned Resource; Wonders purchasable with Gold"
  - type: GRANT_UNIQUE_UNIT
    unit: "khurasani-cavalry"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "stepwell"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
