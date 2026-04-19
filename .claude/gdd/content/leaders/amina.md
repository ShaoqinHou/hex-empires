# Amina — Civ VII

**Slug:** `amina`
**Category:** `leader`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://civ7.wiki.fextralife.com/Amina — Fextralife leader page
- https://www.dexerto.com/gaming/civilization-7-leader-tier-list-every-leader-and-unique-ability-ranked-3056367/ — Dexerto tier list

## Identity

- Historical period: c. 1576-c. 1610 CE, Hausa kingdoms of northern Nigeria
- Flavor: Warrior queen of the Zazzau kingdom (modern Zaria), renowned for expanding trade routes and conducting military campaigns across the Sahel; the first woman to rule the Zazzau emirate.
- Persona variants: None

## Stats / numeric attributes

For leaders:
- Attributes: Economic (primary), Militaristic (secondary)
- Agenda: Desert of the Warrior Queen — Decrease Relationship by a Medium Amount with players who control more Plains and Desert settlements than Amina; Increase Relationship by a Small Amount with players who avoid settling those terrain types.
- Unique ability: **Warrior-Queen of Zazzau** — +1 Resource Capacity in Cities; +1 Gold per Age for each Resource assigned to Cities; +5 Combat Strength for all Units on Plains and Desert tiles.
- Preferred civs: Aksum (Antiquity — trade ship synergy); Songhai (Exploration — river trade network); Buganda (Modern)
- Starting bias: Plains, Desert

## Unique effects (structured — for later code mapping)

```yaml
effects:
  - type: MODIFY_YIELD
    target: all-cities
    yield: resource-capacity
    value: +1
  - type: MODIFY_YIELD
    target: all-cities
    yield: gold
    value: +1-per-age-per-resource-assigned
  - type: MODIFY_COMBAT
    target: all
    value: +5
    condition: unit-on-plains-or-desert
```

## Notes / uncertainty

Agenda modifier direction confirmed from Fextralife (medium decrease for opponents with more plains/desert settlements). Gold yield scales with age level. Combat bonus terrain condition (Plains and Desert) confirmed from multiple sources.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
