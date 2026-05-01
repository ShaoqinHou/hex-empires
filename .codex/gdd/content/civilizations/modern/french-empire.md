# French Empire - Civ VII

**Slug:** `french-empire`
**Category:** `civilization`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/French_Empire_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

Napoleonic France reshaping Europe by code and cannon.

## Stats / numeric attributes

- **Civ bonus:** Gloire: +1 Culture per Wonder; Commander XP bonuses
- **Unique unit:** Imperial Guard (Infantry elite) — Napoleonic heavy infantry
- **Unique civic:** Grande Armee — Commanders immediately gain a Promotion; Bataillon-Carre mastery
- **Unique improvement:** Jardin a la Francaise (Ageless) — formal garden; +2 Happiness, +1 Culture
- **Unique quarter:** Paris Quarter — Salon + Imperial unique building
- **Associated leader(s):** Napoleon (Emperor / Revolutionary) / Lafayette
- **Historical-path unlock from:** Norman / Rome
- **Age:** modern

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Gloire: +1 Culture per Wonder; Commander XP bonuses"
  - type: GRANT_UNIQUE_UNIT
    unit: "imperial-guard"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "jardin-a-la-francaise"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
