# Xenia - Civ VII

**Slug:** `xenia`
**Category:** `policy`
**Age:** `antiquity/ageless`
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

Greek hospitality tradition.

## Stats / numeric attributes

- **Category:** `tradition` (standard / crisis / tradition)
- **Age:** antiquity/ageless
- **Unlock:** Greece civ
- **Effect:** Happiness bonus for Trade Routes with other civs

## Effect description

Happiness bonus for Trade Routes with other civs. This is a **tradition** earned from a civ-unique civic in a past age; it remains selectable in all future ages.

## Unique effects (structured)

```yaml
effects:
  - type: POLICY_EFFECT
    category: tradition
    description: "Happiness bonus for Trade Routes with other civs"
    slot: wildcard  # all VII slots are wildcard
```

## Notes / uncertainty

- All Civ VII policy slots are **wildcard** (no economic/military/diplomatic type split, per systems/government-policies.md)
- Crisis policies unlock during specific crisis stages; see `.claude/gdd/content/crisis-cards/`
- Traditions unlock via civ-unique civics and persist into future ages as selectable social policies
- Numeric effects `[INFERRED]` in some rows where source silent

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
