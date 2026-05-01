# Revolutions (Exploration) — Civ VII

**Slug:** `revolutions`
**Category:** `crisis-card`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://www.thegamer.com/civilization-7-vii-all-crisis-crises-guide/
- https://game8.co/games/Civ-7/archives/497227 (notes "Uprising" as alt name)
- https://gameranx.com/features/id/531278/article/civilization-7-all-crisis-events/

## Identity

- Historical period: Early modern class conflicts, French Revolution era upheaval
- Flavor: Growing divide between social classes erupts. Players pick which class to prioritize via Crisis Policies representing different factional interests.
- Distinguished from Antiquity Revolt: Revolutions degrades multiple yield types simultaneously, not just Happiness.

## Stats / numeric attributes

- Age: exploration
- Trigger window: ≥ 70% / 80% / 90%
- Required policy slots: 2 / 3 / 4

**Policy card structure:** Revolutions has the largest pool of crisis policies while requiring the lowest mandatory slot count — most flexible and forgiving.

One confirmed card:

| Card | Penalty | Benefit |
|------|---------|---------|
| Impoverished Nobility | +1 Gold maintenance on all units | [no direct benefit listed — represents siding with lower classes against nobility] |

Policies distribute impact across multiple yield types rather than focusing on single stat (unlike Revolt's Happiness focus). `[LLM-KNOWLEDGE-ONLY]` for full card list.

## Escalation and core effects

- **Multi-yield degradation:** reduces multiple yield categories simultaneously across all settlements
- **Foreign religion accelerant:** Happiness ≤ −1 AND foreign religion → skip Unrest intermediate state, immediately Revolt
- **Secession risk:** ~10 turns unhappy → settlement loss
- **Maintenance cost pressure:** policies raise unit maintenance
- **Broader policy options:** wider pool enables more strategic differentiation

**Government unlock:** Crisis-locked governments (Revolutionary Republic, Revolutionary Authoritarianism, Constitutional Monarchy) unlock via specific Revolutions policy choices at final stage. This is the only crisis that forces mid-age government replacement.

## Survival strategy

Pick policies that punish yield types least critical to your victory path. If empire has foreign religions in many settlements, manage/convert them first — religion-accelerated revolt is the sharpest threat. Revolutions is the most manageable Exploration crisis for diverse empires.

## Crisis legacy bonus

Surviving unlocks a legacy bonus (2 legacy points). `[INFERRED]`.

## Unique effects (structured)

```yaml
effects:
  - type: MODIFY_YIELD
    target: all-settlements
    yield: multiple  # production/science/culture/gold — varies by card
    value: -N  # empire-size-scaled
  - type: MODIFY_UNIT_MAINTENANCE
    target: all-units
    yield: gold
    value: +1  # Impoverished Nobility
  - type: UNLOCK_GOVERNMENT
    target: player
    government: revolutionary-republic|revolutionary-authoritarianism|constitutional-monarchy
    condition: specific-stage-3-policy-choice
```

## Notes / uncertainty

Only 1 card name confirmed publicly. Complete pool + effects not documented. "Foreign religion accelerates revolt" well-sourced.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
