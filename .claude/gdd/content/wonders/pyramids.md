# Pyramids — Civ VII

**Slug:** `pyramids`
**Category:** `wonder`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://civ7.wiki.fextralife.com/Pyramids+-+Antiquity+Wonder — Fextralife individual wonder page
- https://gamerant.com/civilization-vii-civ-7-how-build-pyramids-wonder/ — GameRant placement guide

## Identity

- Historical period: Old Kingdom Egypt, c. 2550 BCE. The Great Pyramids of Giza are the oldest of the Seven Wonders of the Ancient World and remain standing today.
- Flavor: Desert monuments connecting the pharaonic state to divine order through monumental labor. Firaxis associates this wonder with Egypt in the Antiquity Age.

## Stats / numeric attributes

For wonders:
- Cost: 275 Production
- Effect: +1 Gold and +1 Production on Minor and Navigable River tiles in this Settlement
- Prerequisite: Tier 1 Light of Amun-Ra (civic)
- Placement: Must be built on a Desert tile adjacent to a Navigable River
- Obsoletes: No (Ageless)

## Unique effects (structured — for later code mapping)

```yaml
effects:
  - type: MODIFY_YIELD
    target: minor-river-tile
    yield: gold
    value: +1
  - type: MODIFY_YIELD
    target: minor-river-tile
    yield: production
    value: +1
  - type: MODIFY_YIELD
    target: navigable-river-tile
    yield: gold
    value: +1
  - type: MODIFY_YIELD
    target: navigable-river-tile
    yield: production
    value: +1
```

## Notes / uncertainty

Placement is strictly Desert + adjacent Navigable River — not just any desert tile. Production cost of 275 confirmed via Fextralife. The Tier 1 Light of Amun-Ra prerequisite ties this wonder to Egyptian civic path, but any civ can build it if they unlock the civic. The adjacency bonus to surrounding buildings (generic to all wonders) is in addition to the tile yield bonuses listed here.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
