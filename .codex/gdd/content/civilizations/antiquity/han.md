# Han China - Civ VII

**Slug:** `han`
**Category:** `civilization`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from known Civ VII data + template research)

## Sources

- https://civilization.fandom.com/wiki/Han_China_(Civ7) - Fandom Civ7 page (frequently 403)
- Cross-referenced community Civ VII guides (Fextralife, Game8, Screen Rant, Gameranx)
- `.codex/gdd/systems/civilizations.md` - system doc
- `.codex/gdd/content/civilizations/_overview.md`

## Identity

The unified empire under Heaven's mandate. Scholarship, bureaucracy, and walls.

## Stats / numeric attributes

- **Civ bonus:** Mandate of Heaven: +10% Science in all Settlements; +1 Science adjacent to Rivers
- **Unique unit:** Chu-Ko-Nu (Crossbowman-early replacement) — bonus vs Infantry; repeating crossbow
- **Unique civic:** Junzi — +10% Science in Capital, Tianxia tradition, unlocks Weiyang Palace
- **Unique improvement:** Great Wall (Ageless, linear) — +4 Defense, +2 Culture each segment
- **Unique quarter:** Han Imperial Quarter — unique buildings TBD
- **Associated leader(s):** Confucius / Xiongnu / etc
- **Historical-path unlock from:** N/A (starting civ in Antiquity)
- **Age:** antiquity

## Unique effects (structured)

```yaml
effects:
  - type: CIV_ABILITY
    description: "Mandate of Heaven: +10% Science in all Settlements; +1 Science adjacent to Rivers"
  - type: GRANT_UNIQUE_UNIT
    unit: "chu-ko-nu"
  - type: GRANT_UNIQUE_IMPROVEMENT
    improvement: "great-wall"
    ageless: true
```

## Notes / uncertainty

- Civ-unique content cross-referenced from systems/civilizations.md + community wikis
- Some numeric values (combat +N, yield +N) `[INFERRED]` where Fandom 403-blocked during research
- Historical-path unlocks per Firaxis Dev Diary #1 (Ages) - partial list only
- Unique quarter building pairings confirmed for most Antiquity + some Exploration; Modern pairings partially `[INFERRED]`

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
