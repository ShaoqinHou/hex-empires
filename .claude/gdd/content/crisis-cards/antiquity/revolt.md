# Revolt (Antiquity) — Civ VII

**Slug:** `revolt`
**Category:** `crisis-card`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://www.thegamer.com/civilization-7-vii-all-crisis-crises-guide/
- https://game8.co/games/Civ-7/archives/497227
- https://gameranx.com/features/id/531278/article/civilization-7-all-crisis-events/

## Identity

- Historical period: Fracturing of imperial authority — Roman provincial revolts
- Flavor: Citizens question the legitimacy of their authoritarian government. Discontent spreads empire-wide.
- Considered moderately difficult; strategic deflection mechanic rewards empire self-awareness.

## Stats / numeric attributes

- Age: antiquity
- Trigger window: ≥ 70% (Stage 1), ≥ 80% (Stage 2), ≥ 90% (Stage 3)
- Required policy slots: 2 / 3 / 4

**Policy card structure:** Players choose Crisis Policies that impose Happiness penalties. Each card targets a different settlement category, letting the player direct the penalty toward expendable parts of their empire.

Documented targeting options (exact card names not confirmed):
- Penalty falls on Towns (sparing Cities)
- Penalty falls on Cities (sparing Towns)
- Penalty falls on the Capital specifically
- Penalty falls on Founded settlements (sparing conquered ones)
- Penalty falls on Conquered settlements (sparing founded ones)

Exact card names and numeric happiness values for Revolt (Antiquity) are not documented in available sources. `[LLM-KNOWLEDGE-ONLY]` for specific names.

## Escalation and core effects

- **Revolt threshold:** settlement at Happiness ≤ −1 immediately enters Revolt state
- **Damage tick:** 1 Building or Improvement damaged per turn in Revolt
- **Secession risk:** ~10 consecutive turns unhappy → settlement defects to neighboring civ; rival gets a narrative event offering them the disloyal settlement
- **Empire-size scaling:** Crisis policy severity scales with empire size; wider empires hit harder
- **No Physician unit:** only mitigation is policy selection + Happiness infrastructure

## Survival strategy

Identify which settlement category is most expendable; pick policies that redirect penalties there. Warmonger empires → deflect to conquered. Tall peaceful empires → deflect to conquered (little to lose). Never exceed settlement cap before crisis. Rush Happiness improvements before onset.

## Crisis legacy bonus

Surviving unlocks a crisis legacy bonus (costs 2 legacy points). `[INFERRED]`.

## Unique effects (structured)

```yaml
effects:
  - type: MODIFY_YIELD
    target: targeted-settlement-category
    yield: happiness
    value: -N  # empire-size-scaled
  - type: BUILDING_DAMAGE
    target: revolting-settlement
    value: 1  # per turn while happiness <= -1
```

## Notes / uncertainty

Exact policy card names + numeric happiness penalties not documented publicly. ~10-turn secession timer cited as "several turns" across sources.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
