# Kabaka_s Lake -- Civ VII

**Slug:** kabakas-lake
**Category:** tile-improvement
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civilization.fandom.com/wiki/Kabaka_s_Lake_(Civ7) -- Fandom Kabaka_s Lake page
- https://civilization.2k.com/civ-vii/game-guide/civilizations/buganda/ -- Firaxis Buganda civ guide

## Identity

The Kabaka_s Lake is the Modern-age unique improvement of the Buganda civilization. King Mwanga II of Buganda (reigned 1884-1897 CE) constructed a lake -- reportedly working alongside laborers to shame nobles who refused the hard labor -- as a strategic defensive asset against British encroachment. In-game the Kabaka_s Lake provides Happiness and Lake yield bonuses, synergizing with Buganda_s lake-focused civ abilities.

- Historical period: Buganda Kingdom, East Africa, late 19th century
- Flavor: Happiness tile with Lake-yield synergy; one per settlement -- mirrors the singular historical lake

## Stats / numeric attributes

- Yield(s): +3 Happiness; receives Lake Yield bonuses (yields contributed by Buganda civ ability and Muzibu Azaala Mpanga Wonder)
- Terrain required: Flat tile
- Resource required: None
- Limit: One per Settlement
- Age availability: Ageless (Modern civ-unique; persists across all age transitions)
- Ageless: Yes

## Unique effects (structured)

effects:
  - type: MODIFY_YIELD
    target: tile
    yield: happiness
    value: +3
  - type: APPLY_LAKE_YIELDS
    target: tile

## Notes / uncertainty

+3 Happiness and Lake Yield bonuses sourced from Fandom Kabaka_s Lake page via web search. One-per-settlement limit confirmed. Flat terrain confirmed. The Lake Yield bonus system depends on Buganda_s civ ability and the Muzibu Azaala Mpanga Wonder -- total yield amplified significantly in a Buganda game with full synergy. Ageless confirmed.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._