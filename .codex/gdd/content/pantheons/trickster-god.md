# Trickster God — Civ VII

**Slug:** `trickster-god`
**Category:** `pantheon`
**Age:** `antiquity`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from research subagent data)

## Sources

- TheGamer: Civilization 7 All Pantheons Ranked
- Screen Rant: Civ 7 Pantheon Guide
- Game8: Civ 7 Pantheon List
- https://civilization.fandom.com/wiki/Pantheon_(Civ7) — 403 during research

## Identity

One of the 18 Antiquity-age pantheons available to all civs after accumulating 25 Faith. **Non-unique:** multiple players may adopt this same pantheon in one game.

## Stats / numeric attributes

- **Type:** pantheon
- **Age:** Antiquity (only)
- **Unlock condition:** 25 Faith accumulated
- **Effect:** +25% Influence toward Endeavors / Sanctions
- **Stacking:** Empire-wide. Does NOT stack with itself (only one player can adopt, unless marked non-unique).
- **Persistence:** Does NOT carry into Exploration age. All pantheon effects end at Antiquity → Exploration transition.

## Effect description

**Non-unique** — multiple players can adopt. Cuts Influence cost of diplomatic Endeavors/Sanctions by 20% (i.e. 25% more efficient).

## Unique effects (structured)

```yaml
effects:
  - type: PANTHEON_BONUS
    description: "+25% Influence toward Endeavors / Sanctions"
    scope: empire
    duration: antiquity_only
```

## Notes / uncertainty

- Exact base for "%" modifiers (Production / Growth) not published — assumed standard game-speed base.
- Non-unique status inferred from community sources; Fandom wiki (403) would confirm.
- No interaction with Exploration-age religion founding (VII departure from VI).

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
