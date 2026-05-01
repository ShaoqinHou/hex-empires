# Emile Bell - Civ VII

**Slug:** emile-bell
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Emile+Bell+-+Antiquity+Wonder - Fextralife

## Identity

- Historical period: [LLM-KNOWLEDGE-ONLY] The Emile Bell is likely a fictional or less-documented historical structure in the Civ VII context. The name may reference a colonial-era bell tower, possibly from Pacific or African history.
- Flavor: Diplomatic structure granting a unique agreement mechanic. Firaxis includes this as an Antiquity wonder.

## Stats / numeric attributes

- Cost: 275 Production
- Effect: Grants unique Diplomatic Endeavor: Ginseng Agreement (both leaders gain Food in their capitals); +1 Diplomatic Attribute Point
- Prerequisite: Code of Laws civic
- Placement: Must be built on Rough terrain
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: GRANT_ABILITY
    ability: ginseng-agreement-diplomatic-endeavor
  - type: GRANT_ATTRIBUTE_POINT
    type: diplomatic
    value: +1

## Notes / uncertainty

The Ginseng Agreement is a unique wonder-specific Diplomatic Endeavor not available otherwise. Firaxis source material does not fully explain what the Emile Bell refers to historically - [LLM-KNOWLEDGE-ONLY] flag. The Ginseng Agreement food bonus exact values not confirmed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
