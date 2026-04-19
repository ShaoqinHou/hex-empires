# Ashoka (World Conqueror) — Civ VII

**Slug:** `ashoka-world-conqueror`
**Category:** `leader`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://civ7.wiki.fextralife.com/Ashoka+World+Conqueror — Fextralife leader page
- https://www.dexerto.com/gaming/civilization-7-leader-tier-list-every-leader-and-unique-ability-ranked-3056367/ — Dexerto tier list
- https://game8.co/games/Civ-7/archives/495751 — Game8 guide

## Identity

- Historical period: c. 268-232 BCE (early reign); the young Ashoka as a ruthless military conqueror before the Kalinga conversion
- Flavor: The World Conqueror persona is a DLC variant (Founders Content Pack) representing Ashoka before his Buddhist conversion. Mechanically aggressive — war declarations trigger celebrations, and production scales with happiness.
- Persona variants: World Renouncer (base game)

## Stats / numeric attributes

For leaders:
- Attributes: Diplomatic (primary), Militaristic (secondary)
- Agenda: Without Regret — Decrease Relationship by a Medium Amount with the leader whose lands cover the most tiles; Increase Relationship by a Medium Amount with the leader occupying the fewest tiles.
- Unique ability: **Devaraja** — Increased Production in Cities for excess Happiness beyond a set amount; Increased Production in Settlements not founded by you; Declaring a Formal War grants a Celebration; +5 Combat Strength against Districts during a Celebration.
- Preferred civs: Maurya (Antiquity — Production + happiness synergy); Persia (Antiquity — military conquest option)
- Starting bias: None
- DLC status: Founders Content Pack (not base game)

## Unique effects (structured — for later code mapping)

```yaml
effects:
  - type: MODIFY_YIELD
    target: all-cities
    yield: production
    value: +variable-per-excess-happiness
  - type: MODIFY_YIELD
    target: non-founded-settlements
    yield: production
    value: +variable
  - type: GRANT_CELEBRATION
    trigger: formal-war-declaration
  - type: MODIFY_COMBAT
    target: all
    value: +5
    condition: against-districts-during-celebration
```

## Notes / uncertainty

DLC persona — Founders Content Pack. Exact production bonus values per happiness excess are [INFERRED] (not published in accessible sources). Agenda modifier direction confirmed from Fextralife. Note the agenda name discrepancy: Fextralife lists Without Regret for the World Renouncer page (possible data error on their end); Dexerto and Game8 list Without Regret for World Conqueror and Without Sorrow for World Renouncer.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
