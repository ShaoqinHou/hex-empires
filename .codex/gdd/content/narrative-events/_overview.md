# Narrative Events - Civ VII

**Slug:** `narrative-events`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (Phase 2 subagent permissions denied; overview captures category-wide rules + full item list)
**Item count:** 1000+ at launch (Firaxis Dev Diary #4 cited 1000+)

## Sources

- `.codex/gdd/systems/narrative-events.md` - primary source for this category
- https://civilization.fandom.com/wiki/Narrative_(Civ7) - Fandom (frequently 403 this session)
- Cross-referenced Firaxis Dev Diaries + community wikis (Fextralife, Game8, TheGamer)

## Purpose in the game

Trigger-driven story events. Player presented with 2-3 choices; each applies effects + writes tags that can gate future callback events. Atmospheric variety with mechanical weight on higher-tier events.

## Category-wide rules

- Triggers: tile, leader attribute, civ, resource, combat outcome, etc.
- Player chooses 2-3 options per event; choice writes tags to PlayerState.narrativeTags
- Tags persist across ages - enable cross-age callback stories
- Effects: yield bonus, policy unlock, unit spawn, relationship change, pure flavor
- Subsystems: authored events, Discoveries (goody hut replacement), systemic crisis framing
- Balance: choices roughly equal value; rarer triggers -> larger rewards
- Only subset of 1000+ events fires per campaign (replay variety)

## Taxonomy / item list

### Triggers

- Tile-based (natural wonder discovery, resource found)
- Leader-agenda
- Civ-specific
- Combat milestones
- Construction milestones
- Diplomatic state changes

### Effect categories

- Yield bonuses (one-off)
- Yield bonuses (per-turn)
- Unit grants
- Policy unlocks
- Relationship adjustments
- Pure flavor/atmospheric

### Special subsystems

- Discoveries (Scouts; replace goody huts)
- Crisis-tied narrative

## How this category connects to systems

Primary system: `systems/narrative-events.md`

## VII-specific notes

- 1000+ events is unprecedented in series
- Tag system enables cross-age narrative continuity
- Explicit focus on atmospheric range (not every event has big mechanical weight)
- Choices roughly equal-weighted (not "obvious right choice")

## Open questions / uncertainty

- Full event catalog (1000+; not feasible to enumerate here)
- Tag vocabulary
- Per-event effect values
- Discovery event roster

## Notes

NO individual fact cards written for this category (1000+ events intractable). Overview + system doc (`systems/narrative-events.md`) cover the mechanics. Implementers should write fact cards per specific event as they become relevant.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
