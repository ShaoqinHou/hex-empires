# Staatseisenbahn -- Civ VII

**Slug:** staatseisenbahn
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Staatseisenbahn_(Civ7) -- Fandom Staatseisenbahn page
- https://game8.co/games/Civ-7/archives/498936 -- Game8 Staatseisenbahn guide

## Identity

The Staatseisenbahn (state railway) is the Modern-age unique improvement of the Prussian civilization. Prussia pioneered state-owned railway development in the 19th century, using the rail network for rapid military mobilization and industrial logistics. In-game the Staatseisenbahn replaces standard Railroads and provides Gold and Production bonuses to rural tiles, auto-placed alongside Rail Stations.

- Historical period: Kingdom of Prussia, 19th century CE, military-industrial railway era
- Flavor: Replaces Railroad; auto-placed with Rail Stations; boosts all rural tiles with Gold and Production

## Stats / numeric attributes

- Yield(s): +2 Gold; +2 Production for Rural tiles with a Staatseisenbahn
- Terrain required: Flat terrain (railroad routing)
- Resource required: None
- Auto-placement: Yes -- placed automatically when Rail Stations are built [INFERRED from systems doc note]
- Age availability: Ageless (Modern civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: rural-tile-with-improvement
    yield: gold
    value: +2
  - type: MODIFY_YIELD
    target: rural-tile-with-improvement
    yield: production
    value: +2

## Notes / uncertainty

+2 Gold and +2 Production on rural tiles confirmed from Fandom and Game8. Auto-placement with Rail Stations noted in systems/tile-improvements.md. The auto-placement mechanic is unique among civ-unique improvements -- Staatseisenbahn may not consume a standard population-growth improvement charge [INFERRED].

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._