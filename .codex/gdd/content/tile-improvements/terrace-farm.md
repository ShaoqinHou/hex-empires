# Terrace Farm -- Civ VII

**Slug:** terrace-farm
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Terrace_Farm_(Civ7) -- Fandom Terrace Farm page
- https://game8.co/games/Civ-7/archives/495731 -- Game8 Inca Civ Guide

## Identity

The Terrace Farm is the Exploration-age unique improvement of the Incan civilization. Andean terrace farming (andenes) allowed the Inca (1438-1533 CE) to cultivate steep mountain slopes that would otherwise be unusable. In-game the Terrace Farm is described as the most powerful Food improvement in the game and synergizes with Mountain adjacency.

- Historical period: Inca Empire, Andes, 1438-1533 CE
- Flavor: The premier Food tile improvement; converts rough mountain terrain into high-yield agricultural output

## Stats / numeric attributes

- Yield(s): +4 Food [INFERRED -- described as highest Food improvement; exact value not numerically confirmed]
- Bonus: Additional Food if adjacent to at least one Mountain
- Terrain required: Rough terrain (Hills, Mountains) -- NOT River edge, NOT tiles with a Resource or other feature
- Resource required: None (must NOT have a resource on the tile)
- Age availability: Ageless (Exploration civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: food
    value: +4
  - type: MODIFY_YIELD
    target: tile-if-adjacent-to-mountain
    yield: food
    value: +1

## Notes / uncertainty

Described as far the most powerful tile improvement for Food acquisition -- exact base value inferred as +4 Food from community forum context; not numerically confirmed in available sources. Rough terrain requirement confirmed; tile must not have a Resource or River. Mountain-adjacency bonus confirmed. The combination of high Food + Production from Rough terrain makes this ideally suited for Incan city growth strategy.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._