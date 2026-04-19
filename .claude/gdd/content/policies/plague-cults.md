# Plague Cults - Civ VII

**Slug:** `plague-cults`
**Category:** `policy`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (from Phase 3 research + community policy tables)

## Sources

- PlayerAuctions Civ VII policies table (confirmed 62+ neutral policies)
- `.claude/gdd/systems/government-policies.md` - system doc
- Fextralife Civics tree (civic unlocks cross-ref)
- https://civilization.fandom.com/wiki/Policy_(Civ7) - Fandom (frequently 403)

## Identity

Plague-era religious cults.

## Stats / numeric attributes

- **Category:** `crisis` (standard / crisis / tradition)
- **Age:** exploration
- **Unlock:** Plague Resurgence Stage 2
- **Effect:** Culture when Physician treats on Temple tile

## Effect description

Culture when Physician treats on Temple tile. This is a **crisis-only** policy unlocked during specific end-of-age crisis stages; see `content/crisis-cards/`.

## Unique effects (structured)

```yaml
effects:
  - type: POLICY_EFFECT
    category: crisis
    description: "Culture when Physician treats on Temple tile"
    slot: wildcard  # all VII slots are wildcard
```

## Notes / uncertainty

- All Civ VII policy slots are **wildcard** (no economic/military/diplomatic type split, per systems/government-policies.md)
- Crisis policies unlock during specific crisis stages; see `.claude/gdd/content/crisis-cards/`
- Traditions unlock via civ-unique civics and persist into future ages as selectable social policies
- Numeric effects `[INFERRED]` in some rows where source silent

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
