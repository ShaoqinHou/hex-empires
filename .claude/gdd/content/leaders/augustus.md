# Augustus — Civ VII

**Slug:** `augustus`
**Category:** `leader`
**Age:** `ageless`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://civ7.wiki.fextralife.com/Augustus — Fextralife leader page
- https://www.dexerto.com/gaming/civilization-7-leader-tier-list-every-leader-and-unique-ability-ranked-3056367/ — Dexerto tier list
- https://www.thegamer.com/civilization-7-the-best-antiquity-civs-for-every-leader/ — TheGamer civ pairing guide

## Identity

- Historical period: 63 BCE-14 CE; first Roman emperor, founder of the Principate
- Flavor: Augustus represents urban expansion and the integration of conquered territories into a centrally-governed empire. His Civ VII design emphasizes town-to-city conversion and capital production rather than direct conquest.
- Persona variants: None

## Stats / numeric attributes

For leaders:
- Attributes: Cultural (primary), Expansionist (secondary)
- Agenda: Restitutor Orbis — Relationship adjustments tied to opponent city vs. town ratios; rewards civilizations that are converting towns into cities. [INFERRED — exact modifier magnitudes not published]
- Unique ability: **Imperium Maius** — +2 Production in the Capital for every Town you own; +50% Gold towards purchasing Buildings in Towns; can purchase Culture Buildings in Towns.
- Preferred civs: Rome (Antiquity — direct historical pairing, Production bonus synergy); Han (Antiquity alternative); Greece (later age option) [Fextralife, TheGamer]
- Starting bias: None

## Unique effects (structured — for later code mapping)

```yaml
effects:
  - type: MODIFY_YIELD
    target: capital
    yield: production
    value: +2-per-town
  - type: MODIFY_YIELD
    target: towns
    yield: gold-purchase-discount
    value: +50%
```

## Notes / uncertainty

Fextralife gives the production bonus as +2 Production per Town in Capital. Dexerto confirms Culture Building purchasing in Towns. Agenda modifier magnitudes are [INFERRED]. No starting bias documented across multiple sources. The Restitutor Orbis agenda name is confirmed; its exact mechanical text comes from OneEsports (medium source confidence).

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
