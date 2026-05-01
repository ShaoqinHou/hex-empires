# Silver - Civ VII

**Slug:** `silver`
**Category:** `resource`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from Phase 3 research + known data)

## Sources

- https://civilization.fandom.com/wiki/List_of_resources_in_Civ7 - Fandom (frequently 403)
- Cross-referenced PlayerAuctions resource tables + Fextralife resource lists
- `.codex/gdd/systems/resources.md` - system doc

## Identity

Ancient coinage metal; Andean and Spanish colonial mining.

## Stats / numeric attributes

- **Type:** `empire` resource
- **Age(s) available:** Antiquity + Exploration + Modern
- **Terrain spawn:** mountains/hills
- **Yield / Effect:** +20% Gold toward purchasing Units (ageless)
- **Distant Lands exclusive:** no

## Effect description

Assigned to a settlement to provide empire-wide or per-settlement effect depending on resource type:
- **Bonus** resources provide flat yields/happiness to the assigned settlement
- **City** resources buff specific city-type buildings or grant per-city yields
- **Empire** resources provide combat strength bonuses to relevant unit types
- **Factory** resources (Modern) require Factory building; slot into Factory buildings

## Unique effects (structured)

```yaml
effects:
  - type: RESOURCE_ASSIGNMENT
    resource_type: empire
    effect: "+20% Gold toward purchasing Units (ageless)"
```

## Notes / uncertainty

- Exact numeric values `[INFERRED]` in some cases where Fandom source returned 403
- Distant Lands exclusivity per `systems/resources.md`; the 5 confirmed Distant-exclusives are spices, sugar, cocoa, tea + 1 unnamed
- Terrain spawn rules partially `[INFERRED]` from series convention; not all resources have published spawn terrain

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
