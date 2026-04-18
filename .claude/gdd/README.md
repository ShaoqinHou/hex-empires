# Civ VII Game Design Doc (GDD)

**Purpose.** A structured, source-cited reference for Civilization VII's mechanics and content. This is the **authoritative Civ VII knowledge base** — it describes what Civ VII does, not what hex-empires does. Each doc has a `Mapping to hex-empires` section left blank here; that gets populated during implementation work, not during GDD authoring.

**How this doc is used.**
- **Agent drafting** — parallel Sonnet agents each own one system or one content category. They read `_template-system.md` or `_template-content.md` and the brief in their spawn, then research from the canonical sources and produce their file.
- **Weekly planning** — the `gap-matrix.md` (produced in Phase 4) is the one-page view of "what is Civ VII vs what hex-empires is vs where the gap is".
- **Per-system work** — when you edit a system in code, open the matching `systems/[slug].md` first to anchor decisions.

---

## Canonical sources

The agents draft from these, in order:

| Rank | Source | URL | When to use |
|---|---|---|---|
| 1 | **Firaxis Dev Diaries** | https://civilization.2k.com/civ-vii/game-guide/gameplay/ | Authoritative for design intent and top-level taxonomy. Written by the developers. |
| 2 | **Fandom Civ Wiki (Civ7 pages)** | https://civilization.fandom.com/wiki/[Topic]_(Civ7) | Comprehensive content lists, mechanics details, numeric constants. Community-maintained but well-sourced. |
| 3 | **Fextralife Civ 7 Wiki** | https://civ7.wiki.fextralife.com/ | Cross-reference only. Good for lesser-documented mechanics. |
| 4 | **Game8 Civ 7 Wiki** | https://game8.co/games/Civ-7 | Cross-reference only. Good for strategy-level descriptions. |

**Rule:** Firaxis Dev Diary > Fandom > everything else. If two sources disagree, prefer Firaxis; if Firaxis is silent, prefer Fandom; tag the claim `[source-conflict]` if conflicts remain.

**Hallucination discipline.** Agents MUST NOT invent mechanics. Every numeric constant and every "X always causes Y" claim must trace to a cited URL or be tagged `[INFERRED]` or `[LLM-KNOWLEDGE-ONLY]`. Civ VII was released 2025-02-11 and has received patches since; training cutoffs may lag. When the source is silent, the right answer is a flagged uncertainty, not a confident guess.

---

## Top-level carve-up (from Firaxis's 8 Dev Diaries)

These are Firaxis's own groupings. Used as the section structure of this doc:

1. **Ages** — the three-act structure (Antiquity / Exploration / Modern)
2. **Leaders & Civilizations** — leader/civ separation, age-gated civs, mementos
3. **Empire Management** — settlements, tile improvements, buildings, population, resources
4. **Emergent Narrative** — narrative events, tag system, story callbacks
5. **Combat** — combat resolution, commanders, fortifications
6. **Diplomacy, Influence, and Trade** — inter-civ relations, influence currency, trade routes
7. **Legends & Mementos** — meta-progression across games, equipment items
8. **Victory** — the four victory paths, post-launch content

These eight buckets contain the ~23 systems and ~18 content categories below.

---

## Systems (23) — detail level 2, ~1500–3000 words each

One file per system in `systems/`. Each describes **mechanics**, not data.

### Structural (age-level)
- [ ] `systems/ages.md` — 3 ages, age-transition trigger, what carries vs resets ← **worked example written**
- [ ] `systems/legacy-paths.md` — per-age achievement tracks, how they persist
- [ ] `systems/crises.md` — end-of-age crisis cards, crisis policies, resolution
- [ ] `systems/leaders.md` — leaders separate from civs, leader attributes, persistence
- [ ] `systems/civilizations.md` — civ identity, age-gating, transition choice, uniques
- [ ] `systems/mementos.md` — leader equipment, pre-game loadout

### Empire management (city-level)
- [ ] `systems/settlements.md` — city vs town distinction, founding, specialization
- [ ] `systems/tile-improvements.md` — auto-improve on population growth, urban/rural, no workers
- [ ] `systems/buildings-wonders.md` — building slots, quarters, ageless buildings, wonders
- [ ] `systems/population-specialists.md` — pop growth, specialists, food / housing
- [ ] `systems/resources.md` — bonus / luxury / strategic, per-settlement assignment
- [ ] `systems/yields-adjacency.md` — food / production / science / culture / gold / happiness / influence
- [ ] `systems/celebrations.md` — golden-age-like bursts, trigger + effect
- [ ] `systems/trade-routes.md` — trade route mechanics, yields, interception

### Military
- [ ] `systems/combat.md` — unit-vs-unit resolution, combat modifiers, terrain
- [ ] `systems/commanders.md` — army stacking under commander, XP, promotions

### Political / social
- [ ] `systems/diplomacy-influence.md` — relations, influence currency, sanctions, endeavors
- [ ] `systems/independent-powers.md` — replace city-states, suzerainty, interaction modes
- [ ] `systems/government-policies.md` — government types, policy slots (all wildcard in VII)
- [ ] `systems/religion.md` — pantheons (Antiquity), religion founding (Exploration), beliefs

### Research
- [ ] `systems/tech-tree.md` — technologies per age, masteries, prerequisites
- [ ] `systems/civic-tree.md` — civics per age, masteries, age-gated civs

### Narrative + victory
- [ ] `systems/narrative-events.md` — tag-based event system, story callbacks, crisis tie-ins
- [ ] `systems/victory-paths.md` — Economic / Military / Cultural / Scientific, age-gated progression
- [ ] `systems/legends.md` — cross-game meta-progression, unlockable leader abilities

### Map
- [ ] `systems/map-terrain.md` — world gen, terrains (grassland / plains / hills / etc.), features (woods / river / etc.), navigable rivers

---

## Content (18 categories) — detail level 3 + 4

One category folder in `content/`. Each folder has:
- `_overview.md` — category-wide rules, counts, list (detail 3, ~500–1000 words)
- `[slug].md` — one fact-card per item (detail 4, ~200–500 words each)

### Roster
- [ ] `content/civilizations/` — 43 civs (30 vanilla + 13 DLC), split by age
- [ ] `content/leaders/` — ~40 leaders (ageless)
- [ ] `content/mementos/` — leader-equipable pre-game items
- [ ] `content/units/` — military + civilian + naval, per age
- [ ] `content/buildings/` — yield buildings, adjacency buildings, quarters
- [ ] `content/wonders/` — world wonders, per age
- [ ] `content/tile-improvements/` — auto-placed improvements
- [ ] `content/technologies/` — per age (Antiquity / Exploration / Modern)
- [ ] `content/civics/` — per age
- [ ] `content/pantheons/` — Antiquity-age faith belief
- [ ] `content/religions/` — Exploration-age religion beliefs
- [ ] `content/governments/` — government types
- [ ] `content/policies/` — social policies / crisis policies
- [ ] `content/resources/` — bonus / luxury / strategic, per age
- [ ] `content/crisis-cards/` — end-of-age crisis options
- [ ] `content/narrative-events/` — event cards
- [ ] `content/independent-powers/` — non-civ factions
- [ ] `content/terrains-features/` — world tiles

---

## Detail-level matrix

The agents need to know how much text to produce per layer. Here's the contract:

| Layer | File | Target length | Depth | Example |
|---|---|---|---|---|
| **1. Taxonomy (this file)** | `README.md` | ~1500 words | Enumeration + IDs | you are here |
| **2. System mechanics** | `systems/*.md` | 1500–3000 words | Implementation-ready. Triggers, formulas, edge cases, interactions. | `systems/ages.md` |
| **3. Content overview** | `content/*/README.md` or `_overview.md` | 500–1000 words | Category rules, counts, list of items, cross-category relationships | `content/civilizations/_overview.md` |
| **4. Content item** | `content/*/[slug].md` | 200–500 words | Fact card. Structured fields: identity, stats, uniques, sources. | `content/civilizations/antiquity/egypt.md` |
| **5. Gap matrix (Phase 4)** | `gap-matrix.md` | One-page table | System-by-system: Civ VII behavior vs hex-empires behavior vs delta vs priority | (produced last) |

**Why these lengths.** Under 1500 words for a system is too shallow to implement from. Over 3000 invites LLM padding. Content items over 500 duplicate what's on the wiki; under 200 is a stub. The matrix intentionally fits on one page — if it grows, it stops being a planning view and becomes another document to read.

---

## ID namespace (preassigned — agents MUST use these slugs)

To prevent cross-reference drift, content slugs are preassigned here. Agents fill files at these paths, not paths of their own invention.

### Civilizations (43) — `content/civilizations/<age>/<slug>.md`

**Antiquity (10 + DLC):**
`egypt` `rome` `han` `greece` `khmer` `persia` `maurya` `mississippian` `aksum` `maya` + DLC civs

**Exploration (10 + DLC):**
`abbasid` `chola` `hawaii` `inca` `ming` `mongolia` `norman` `shawnee` `songhai` `spain` + DLC civs

**Modern (10 + DLC):**
`america` `buganda` `french-empire` `meiji` `mexico` `mughal` `prussia` `qing` `russia` `siam` + DLC civs

_Civ slugs above come from fandom wiki lists; each age-research agent should verify the current roster from https://civilization.fandom.com/wiki/Civilizations_(Civ7) and append DLC civs discovered there. Slugs in kebab-case; hyphenate multi-word._

### Leaders (~40) — `content/leaders/<slug>.md`

Leaders are ageless. Slug = kebab-case of the leader's most commonly-used name.
Example slugs: `hatshepsut`, `augustus`, `confucius`, `himiko`, `ada-lovelace`, `tecumseh`, etc. The leader-research agent pulls the full list from https://civilization.fandom.com/wiki/Leaders_(Civ7).

### Other content — slug rules

- Units — `content/units/<age>/<slug>.md` where `<age>` ∈ {antiquity, exploration, modern, all}. Unique units include the civ prefix: `egypt-medjay.md`.
- Buildings — `content/buildings/<slug>.md`. Ageless buildings tagged inside; no age prefix in slug.
- Wonders — `content/wonders/<slug>.md`. Slug = English wonder name, kebab-case. `pyramids`, `great-wall`, `library-of-alexandria`.
- Technologies — `content/technologies/<age>/<slug>.md`. `antiquity/pottery`, `exploration/printing`, etc.
- Civics — `content/civics/<age>/<slug>.md`.
- Pantheons — `content/pantheons/<slug>.md`. One folder, Antiquity-only.
- Religions — `content/religions/<slug>.md`. Exploration-founded.
- Governments — `content/governments/<slug>.md`.
- Policies — `content/policies/<slug>.md`. Crisis policies tagged inside.
- Resources — `content/resources/<slug>.md`. Tag inside: bonus / luxury / strategic; tag the age it unlocks in.
- Crisis cards — `content/crisis-cards/<age>/<slug>.md`. `antiquity/plague`, `exploration/mercenary-wars`, etc.
- Narrative events — `content/narrative-events/<slug>.md`. Long list — may use numeric ordering if names are ambiguous.
- Independent powers — `content/independent-powers/<slug>.md`.
- Terrains / features — `content/terrains-features/<slug>.md`. `grassland`, `plains`, `hills`, `river`, `woods`, `mountain`, `ocean`, `coast`, `lake`, `reef`, etc.

**Rule.** If an agent needs a slug not on this list, they append it to their doc's `ID-additions` section at the bottom and flag it in their return. Parent reconciles in the validation phase.

---

## Status table

Updated as phases complete.

| Phase | Artifact | Status |
|---|---|---|
| 0 | Taxonomy + templates + 1 worked example (ages.md) | **in flight** |
| 1 | 22 system docs (parallel Sonnet agents) | pending |
| 2 | 18 content category overviews + items (parallel agents) | pending |
| 3 | Cross-reference validation (1 agent) | pending |
| 4 | Gap matrix vs hex-empires code (1 agent) | pending |

---

## Agent spawn recipe (Phase 1 — systems)

When ready to fan out: one `Agent` call per system, all `run_in_background: true`, single message with all spawns, model `sonnet`.

Each agent's prompt is `_template-system.md` + a customized preamble:
- System name
- Slug
- 2-4 preselected URLs from fandom + Firaxis
- Output path

The orchestrator (parent session) does NOT let agents pick their own URLs. URLs are preselected in the spawn brief to prevent agents wandering into Civ VI pages.

A sample brief is at `systems/_example-agent-brief.md` (written alongside the template).

---

## Anti-patterns to watch for

- Agent writes in Civ VI voice (workers building farms, districts placed by player, etc.). **Mitigation:** the preselected URLs are all `_(Civ7)` pages.
- Agent invents numbers (e.g. "cities produce 2 food per farm" without source). **Mitigation:** `[INFERRED]` tag discipline enforced in template.
- Agent produces 4000-word essay instead of 2000-word spec. **Mitigation:** word budget in template + in brief.
- Two agents use different slugs for the same thing (`rome` vs `roman`). **Mitigation:** ID namespace above.
- Agent writes "in hex-empires this corresponds to...". **Mitigation:** template explicitly says leave that section blank.

---

## Why this approach vs a dual rulebook

See the discussion at [parent decision-doc — to be cross-linked when written]. TL;DR: one authoritative GDD (this folder) plus a thin gap matrix is more maintainable than two parallel rulebooks, and the embedded Civ VII references per section are higher-signal than a separate Civ VII-only document.
