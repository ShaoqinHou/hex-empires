# Invasion (Antiquity) — Civ VII

**Slug:** `invasion`
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
- https://forums.civfanatics.com/threads/invasion-crisis.700190/

## Identity

- Historical period: Late antiquity barbarian invasions, migration period incursions
- Flavor: External hostile forces press into the gaps between established empires.
- Most manageable Antiquity crisis for militaristic players; free XP opportunity.

## Stats / numeric attributes

- Age: antiquity
- Trigger window: ≥ 70% (Stage 1), ≥ 80% (Stage 2), ≥ 90% (Stage 3)
- Required policy slots: 2 / 3 / 4

**Policy card structure (confirmed names only):**

| Card | Penalty | Benefit |
|------|---------|---------|
| Tribute | −10 Gold per city-state you suzerain | [none listed] |
| Powerful Fortifications | [penalty not confirmed] | Defensive bonus |

Additional Invasion policy card names + effects not documented publicly. `[INFERRED]` unit maintenance increases via "wartime mobilization strain" framing.

## Escalation and core effects

- **Hostile independent powers:** spawn in unclaimed territory at each crisis stage (1, 2, 3)
- **Escalation:** same IPs return stronger at each stage; neglecting Stage 1 makes Stage 3 hard
- **Combat opportunity:** defeating invaders grants Army Commander XP — crisis as leveling opportunity
- **Unit maintenance pressure:** `[INFERRED]` crisis policies raise maintenance
- **Resource rewards at risk:** rival civs defeating invaders first take the rewards

## Survival strategy

Maintain modest standing military entering late Antiquity. Prioritize Stage 1 spawns before Stage 2 escalation. Use invader encounters to level Commanders. Avoid Tribute if suzerainty is core strategy. Rush to defeat spawns before rivals.

## Crisis legacy bonus

Surviving unlocks a legacy bonus (2 legacy points). `[INFERRED]`.

## Unique effects (structured)

```yaml
effects:
  - type: SPAWN_HOSTILE_INDEPENDENT_POWER
    trigger: each-crisis-stage
    escalation: true
  - type: MODIFY_YIELD
    target: suzerain-city-states
    yield: gold
    value: -10  # Tribute card
```

## Notes / uncertainty

Only 2 policy card names confirmed publicly. Unit maintenance increase is generic, unnamed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
