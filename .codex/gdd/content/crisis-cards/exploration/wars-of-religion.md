# Wars of Religion (Exploration) — Civ VII

**Slug:** `wars-of-religion`
**Category:** `crisis-card`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://www.thegamer.com/civilization-7-vii-all-crisis-crises-guide/
- https://game8.co/games/Civ-7/archives/497227 (notes "Holy War" alt label)
- https://gameranx.com/features/id/531278/article/civilization-7-all-crisis-events/

## Identity

- Historical period: European Wars of Religion (1524–1648), Reformation + Counter-Reformation
- In-game alt title: "Holy War"
- Flavor: Nations spread religions; violent clashes among disparate belief systems. Tests how deliberately you built religious infrastructure during Exploration.
- Unique: penalizes players who neglected religion with no viable offset path.

## Stats / numeric attributes

- Age: exploration
- Trigger window: ≥ 70% / 80% / 90%
- Required policy slots: 2 / 3 / 4

**Dual-path policy structure:**

**Conversion-and-Consolidate Path (religion spread focus):**
- Bonuses for cities where you spread your own religion
- Suits players who pursued religious legacy milestones aggressively

**Tolerance Path (multi-religion embrace):**
- Benefits for players with multiple religions within borders
- Leverages religious diversity for yield benefits

One confirmed partial policy: **Religious Tolerance** (Exploration Crisis Policy; full effect not confirmed).

**No viable path for religion-ignorers:** Players who built no religion infrastructure have no beneficial policies. Deliberate design penalty.

## Escalation and core effects

- **Aggressive spread:** all civs spread their religions aggressively; foreign-religion settlements face pressure
- **Conversion path bonus:** wide own-religion spread → positive effects from converted cities
- **Tolerance path bonus:** multi-religious empires gain from diversity
- **No-religion penalty:** no offsetting benefit for religion-ignorers
- **Foreign religion + low happiness → revolt risk** (same mechanic as Revolutions)

## Survival strategy

Critical decision at Exploration Age start: either rigorously defend faith (spread wide) OR deliberately embrace diversity. Half-measures leave you on neither branch. No religion at all = most punishing crisis with no mitigation.

## Crisis legacy bonus

Surviving unlocks a legacy bonus (2 legacy points). `[INFERRED]`.

## Unique effects (structured)

```yaml
effects:
  - type: RELIGION_SPREAD
    target: all-civs
    value: aggressive
  - type: MODIFY_YIELD
    target: own-religion-settlements
    yield: multiple  # conversion path bonuses
    value: +N
  - type: MODIFY_YIELD
    target: multi-religion-settlements
    yield: multiple  # tolerance path bonuses
    value: +N
```

## Notes / uncertainty

Only 1 partial card name confirmed (Religious Tolerance). Dual-path structure well-sourced. "Holy War" vs "Wars of Religion" naming may reflect patch rename or regional localization.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
