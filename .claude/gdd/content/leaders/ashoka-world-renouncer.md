# Ashoka (World Renouncer) — Civ VII

**Slug:** `ashoka-world-renouncer`
**Category:** `leader`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://civ7.wiki.fextralife.com/Ashoka+World+Renouncer — Fextralife leader page
- https://www.dexerto.com/gaming/civilization-7-leader-tier-list-every-leader-and-unique-ability-ranked-3056367/ — Dexerto tier list
- https://game8.co/games/Civ-7/archives/495750 — Game8 guide

## Identity

- Historical period: c. 268-232 BCE; Mauryan Emperor who renounced warfare after the bloody Kalinga War and embraced Buddhist dharma
- Flavor: The World Renouncer persona represents Ashoka after his conversion — a ruler who pursues happiness, celebration, and peaceful governance. This is the base game persona (the World Conqueror is DLC/Founders Edition).
- Persona variants: World Conqueror (DLC — Founders Content Pack)

## Stats / numeric attributes

For leaders:
- Attributes: Diplomatic (primary), Expansionist (secondary)
- Agenda: Without Sorrow — Increase Relationship by a Medium Amount with the player with the highest Happiness yield; Decrease Relationship by a Medium Amount with the player with the lowest Happiness yield.
- Unique ability: **Dhammaraja** — +1 Food in Cities for every 5 excess Happiness; 10% Increased Food in all Settlements during a Celebration; All Buildings gain a +1 Happiness adjacency for all Improvements.
- Preferred civs: Maurya (Antiquity — happiness bonus synergy); Mississippian (Antiquity alternative); Khmer or Abbasid (Exploration)
- Starting bias: None

## Unique effects (structured — for later code mapping)

```yaml
effects:
  - type: MODIFY_YIELD
    target: all-cities
    yield: food
    value: +1-per-5-excess-happiness
  - type: MODIFY_YIELD
    target: all-settlements
    yield: food
    value: +10%
    condition: during-celebration
  - type: MODIFY_YIELD
    target: all-buildings
    yield: happiness
    value: +1
    source: adjacency-all-improvements
```

## Notes / uncertainty

World Renouncer is the base game persona. World Conqueror (Devaraja / Without Regret) is part of the Founders Content Pack DLC. Agenda name from Fextralife is "Without Sorrow"; TheGamer also lists it as "Without Sorrow". Note the earlier systems doc listed "Witness Sorrow" — this appears to be incorrect; "Without Sorrow" is the confirmed name per Fextralife and TheGamer.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
