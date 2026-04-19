# Dogo Onsen - Civ VII

**Slug:** dogo-onsen
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** high
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Dogo_Onsen_-_Modern_Wonder - Fextralife

## Identity

- Historical period: Japan (Ehime Prefecture), c. 3000 years old, with the current building dating to 1894 CE. Dogo Onsen is Japan oldest hot spring bath, said to be 3,000 years old; the main building is a Japanese National Important Cultural Property.
- Flavor: Ancient Japanese hot spring resort and cultural institution. Firaxis associates with Meiji Japan in the Modern Age.

## Stats / numeric attributes

- Cost: 1000 Production
- Effect: +4 Happiness; This Settlement gains 1 Population upon entering a Celebration
- Prerequisite: Tier 1 Bunmei Kaika (civic)
- Placement: Adjacent to a Coast tile
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: this-city
    yield: happiness
    value: +4
  - type: GRANT_POPULATION
    target: this-city
    value: +1
    trigger: celebration-start

## Notes / uncertainty

Population gain per celebration is a strong long-term bonus as celebrations recur throughout the Modern Age. Coast adjacency restricts to coastal cities. Bunmei Kaika is Meiji Japan-specific.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
