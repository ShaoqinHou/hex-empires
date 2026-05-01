# Prussia - Civ VII

**Slug:** `prussia`
**Category:** `civilization`
**Age:** `modern`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Prussia_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

The Junker kingdom forging German unification through disciplined war and iron rail.

## Stats / numeric attributes

- **Civ bonus:** Blood and Iron: Cavalry Skirmish promotion; +50% Combat from Flanking
- **Unique unit:** Prussian Infantry (Rifle Infantry elite) — disciplined volley-fire infantry
- **Unique civic:** Bewegungskrieg — Cavalry get Skirmish, flanking bonus
- **Unique improvement:** Staatseisenbahn (Ageless) — state railway; +25% Trade Yield
- **Unique quarter:** Brandenburg Quarter
- **Associated leader(s):** Frederick the Great (Oblique / Baroque) / Bismarck
- **Historical-path unlock from:** Norman
- **Age:** modern

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Blood and Iron: Cavalry Skirmish promotion; +50% Combat from Flanking"
  - type: GRANT_UNIQUE_UNIT
    unit: "prussian-infantry"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "staatseisenbahn"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
