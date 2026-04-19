# Draft - Civ VII

**Slug:** `draft`
**Category:** `policy`
**Age:** `modern`
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

Universal conscription.

## Stats / numeric attributes

- **Category:** `standard` (standard / crisis / tradition)
- **Age:** modern
- **Unlock:** Fascism civic
- **Effect:** Reduced maintenance for Military units during war

## Effect description

Reduced maintenance for Military units during war. Slottable into any wildcard policy slot (VII has no type restrictions).

## Unique effects (structured)

```yaml
effects:
  - type: POLICY_EFFECT
    category: standard
    description: "Reduced maintenance for Military units during war"
    slot: wildcard  # all VII slots are wildcard
```

## Notes / uncertainty

- All Civ VII policy slots are **wildcard** (no economic/military/diplomatic type split, per systems/government-policies.md)
- Crisis policies unlock during specific crisis stages; see `.claude/gdd/content/crisis-cards/`
- Traditions unlock via civ-unique civics and persist into future ages as selectable social policies
- Numeric effects `[INFERRED]` in some rows where source silent

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
