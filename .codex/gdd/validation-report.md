# Civ VII GDD — Cross-Reference Validation Report

**Generated:** 2026-04-19 (Phase 3)
**Scanner:** parent-run `_validate.py`

## Summary

- System docs found: 26
- Content categories found: 18
- Content items found: 31
- System refs found: 352
- Content refs found: 242

## System Docs Roster (26 expected)

- `systems/ages.md`
- `systems/buildings-wonders.md`
- `systems/celebrations.md`
- `systems/civic-tree.md`
- `systems/civilizations.md`
- `systems/combat.md`
- `systems/commanders.md`
- `systems/crises.md`
- `systems/diplomacy-influence.md`
- `systems/government-policies.md`
- `systems/independent-powers.md`
- `systems/leaders.md`
- `systems/legacy-paths.md`
- `systems/legends.md`
- `systems/map-terrain.md`
- `systems/mementos.md`
- `systems/narrative-events.md`
- `systems/population-specialists.md`
- `systems/religion.md`
- `systems/resources.md`
- `systems/settlements.md`
- `systems/tech-tree.md`
- `systems/tile-improvements.md`
- `systems/trade-routes.md`
- `systems/victory-paths.md`
- `systems/yields-adjacency.md`

## Content Category Roster (18 expected)

- `content/buildings/` — 0 item fact cards
- `content/civics/` — 0 item fact cards
- `content/civilizations/` — 0 item fact cards
- `content/crisis-cards/` — 0 item fact cards
- `content/governments/` — 13 item fact cards
- `content/independent-powers/` — 0 item fact cards
- `content/leaders/` — 0 item fact cards
- `content/mementos/` — 0 item fact cards
- `content/narrative-events/` — 0 item fact cards
- `content/pantheons/` — 18 item fact cards
- `content/policies/` — 0 item fact cards
- `content/religions/` — 0 item fact cards
- `content/resources/` — 0 item fact cards
- `content/technologies/` — 0 item fact cards
- `content/terrains-features/` — 0 item fact cards
- `content/tile-improvements/` — 0 item fact cards
- `content/units/` — 0 item fact cards
- `content/wonders/` — 0 item fact cards

## ISSUES: Broken System References

- `README.md` references `systems/_example-agent-brief.md` — NOT FOUND

## ISSUES: Broken Content References

- `systems/celebrations.md` references `content/social-policies/` — category NOT FOUND
- `systems/celebrations.md` references `content/social-policies/` — category NOT FOUND

## Slug/Filename Consistency — OK

All files have Slug field matching filename.

## System Roster vs README — OK

All 26 expected systems present; no orphan systems.

## Content Roster vs README — OK

All 18 expected content categories present; no orphans.

## Content Completeness

| Category | Has Overview | Fact Cards | Notes |
|---|---|---|---|
| buildings | YES | 0 | overview only; fact cards deferred |
| civics | YES | 0 | overview only; fact cards deferred |
| civilizations | YES | 0 | overview only; fact cards deferred |
| crisis-cards | YES | 0 | overview only; fact cards deferred |
| governments | YES | 13 | medium category |
| independent-powers | YES | 0 | overview only; fact cards deferred |
| leaders | YES | 0 | overview only; fact cards deferred |
| mementos | YES | 0 | overview only; fact cards deferred |
| narrative-events | YES | 0 | overview only; fact cards deferred |
| pantheons | YES | 18 | medium category |
| policies | YES | 0 | overview only; fact cards deferred |
| religions | YES | 0 | overview only; fact cards deferred |
| resources | YES | 0 | overview only; fact cards deferred |
| technologies | YES | 0 | overview only; fact cards deferred |
| terrains-features | YES | 0 | overview only; fact cards deferred |
| tile-improvements | YES | 0 | overview only; fact cards deferred |
| units | YES | 0 | overview only; fact cards deferred |
| wonders | YES | 0 | overview only; fact cards deferred |

## Author's Assessment

**Phase 1 (systems):** 26/26 complete. All systems have substantive mechanic docs (12-36KB each).

**Phase 2 (content):** 18/18 overviews complete. 2 categories (pantheons, governments) have complete fact cards. Remaining 16 have overviews only — individual fact cards deferred pending session with working subagent permissions OR future research passes.

**Known gaps to flag for Phase 4 (gap matrix):**

- Fandom wiki was frequently 403-blocked during this session; content reconstructed from secondary sources
- Subagent Write/Bash permissions degraded mid-session; many system docs were rescued via inline-content paste + parent Write; Phase 2 fully parent-written
- DLC civ list, full leader roster, full memento roster — cited counts but not exhaustively enumerated
- Narrative events (1000+) — systemic description only, no per-event cards
- Numeric constants (food thresholds, adjacency coefficients, tech costs) flagged as [INFERRED] across systems when source was silent

**Next phase:** Gap matrix comparing GDD against `packages/engine/src/` — classifies each system as match/close/diverged/missing with priority.
