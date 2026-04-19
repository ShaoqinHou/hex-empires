# Plague (Antiquity) — Civ VII

**Slug:** `plague`
**Category:** `crisis-card`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://gamerant.com/civilization-vii-civ-7-how-cure-plague/ — Game Rant: How to Cure the Plague (primary; full policy card list)
- https://xboxplay.games/civilization-7/how-to-cure-the-plague-in-civilization-7-62060 — Xbox Play: corroborating policy list
- https://www.thegamer.com/civilization-7-vii-all-crisis-crises-guide/ — TheGamer: All Crisis Types

## Identity

- Historical period: Ancient epidemics (Plague of Athens, Antonine Plague)
- In-game crisis title: "A Strange Year"
- Considered the hardest Antiquity crisis; minimal medical tools exist. Infected settlements lose yields; units risk elimination; unhappiness can cascade into revolt.

## Stats / numeric attributes

- Age: antiquity
- Trigger window: age progress ≥ 70% (Stage 1), ≥ 80% (Stage 2), ≥ 90% (Stage 3)
- Required policy slots: 2 / 3 / 4

**Stage 1 (70%) — pick 1 of 2:**

| Card | Penalty | Benefit |
|------|---------|---------|
| Healing Cults | −10 Gold on Altars in infected settlements | +5 Happiness on Altars in infected settlements |
| Prognosis | −4 Gold on Science Buildings in infected settlements | +2 Science on Science Buildings in infected settlements |

**Stage 2 (80%) — pick 1 of 3:**

| Card | Penalty | Benefit |
|------|---------|---------|
| Miasma | −25% Growth in Cities | Gain 1 Migrant when a City is Infected |
| Recruitment Shortfalls | −15 Healing on all Units | +2 Food in Towns |
| Prosecute Apostates | −5 Happiness in Settlements with no Altar | +5 Happiness in infected Settlements with Commander Stationed |

**Stage 3 (90%) — pick 1 of 2:**

| Card | Effect |
|------|--------|
| Lazarettos | Buildings/Improvements/Districts in Coastal Settlements with a Dungeon not damaged by Major Outbreaks |
| Cordon Sanitaire | Buildings/Improvements/Districts in Settlements with a Commander Stationed not damaged by Major Outbreaks |

## Escalation and core effects

- **Spread:** plague spreads to neighboring settlements automatically; unchecked spread affects multiple cities
- **Infected tile effects:** Urban and Rural District tiles lose yields (production loss, general suppression)
- **Unit risk:** Units stationed in infected settlements risk damage or death each turn
- **Revolt cascade:** productivity loss pushes happiness negative → 1 building/improvement damaged per turn while Happiness ≤ −1

## Survival strategy

Move units out of infected settlements. Maximize Happiness. Pick Healing Cults if heavy Altar infrastructure; Prognosis if Science-heavy. At Stage 3, Cordon Sanitaire suits military-focused (Commanders in field); Lazarettos suits coastal-heavy empires.

## Crisis legacy bonus

Surviving unlocks a crisis legacy bonus (costs 2 legacy points). `[INFERRED]` exact Antiquity Plague legacy bonus not documented.

## Unique effects (structured)

```yaml
effects:
  - type: MODIFY_YIELD
    target: infected-settlement-tiles
    yield: production
    value: -N  # magnitude not published
  - type: MODIFY_YIELD
    target: altars-in-infected-settlements
    yield: gold
    value: -10
  - type: MODIFY_YIELD
    target: altars-in-infected-settlements
    yield: happiness
    value: +5
```

## Notes / uncertainty

Stage 3 cards appear to have no listed direct penalty — may carry hidden gold maintenance costs [INFERRED]. Exact infected-tile yield suppression magnitude not published.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
