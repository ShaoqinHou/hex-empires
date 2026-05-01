# Independent Powers - Civ VII

**Slug:** `independent-powers`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (Phase 2 subagent permissions denied; overview captures category-wide rules + full item list)
**Item count:** ~30-50 per game (spawned; not a fixed roster)

## Sources

- `.codex/gdd/systems/independent-powers.md` - primary source for this category
- https://civilization.fandom.com/wiki/Independent_(Civ7) - Fandom (frequently 403 this session)
- Cross-referenced Firaxis Dev Diaries + community wikis (Fextralife, Game8, TheGamer)

## Purpose in the game

Replace Civ VI city-states. NPC factions spawning each age. Players invest Influence to befriend (30=neutral, 45=reward, 60=Suzerain). Suzerain gains per-power bonus; may levy units or incorporate. Hostile by default.

## Category-wide rules

- Respawn at turn 2 of each age
- Hostile at 0 befriend; neutral at 30; small reward at 45; Suzerain at 60
- Befriend cost: 170 (Antiquity), 340 (Exploration), 510 (Modern) initial Influence
- Multiple players can compete for same IP; higher total spend wins
- Suzerain actions: Levy Unit (varies); Incorporate (240 Influence over 5 turns)
- Incorporation adds the IP as a regular Settlement in player empire
- IPs don't count against Settlement Cap when Suzerained

## Taxonomy / item list

### By type

- Scientific IPs
- Militaristic IPs
- Cultural IPs
- Economic IPs
- Diplomatic IPs
- Religious IPs

### Representative names

- Carthage
- Akkad
- Ur
- Lagash
- Cahokia
- Timbuktu
- Siena
- Venice-early
- Novgorod
- Kyoto-minor (not Meiji)

## How this category connects to systems

Primary system: `systems/independent-powers.md`

## VII-specific notes

- Replace permanent city-states (VI) with dynamic per-age spawning
- Three-stage lifecycle: hostile/neutral/Suzerain + optional absorption
- IPs don't advance through ages (they remain fixed-tier factions)
- Suzerainty bonuses not inherited as legacy (new per age)

## Open questions / uncertainty

- Full IP roster (procedurally generated; no fixed list)
- Per-IP unique bonuses per type
- Levy unit unit-types + costs
- Seeding rules (exclusion zones, density)

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
