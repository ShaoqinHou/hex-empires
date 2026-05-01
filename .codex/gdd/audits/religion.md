# Religion — hex-empires Audit

**System slug:** religion
**GDD doc:** [systems/religion.md](../systems/religion.md)
**Audit date:** 2026-04-19
**Auditor:** claude-sonnet-4-6
**Version target:** Firaxis patch 1.3.0 (per commitment.md)

---

## Engine files audited

- packages/engine/src/systems/religionSystem.ts (lines 1–273)
- packages/engine/src/data/religion/pantheons.ts
- packages/engine/src/data/religion/founder-beliefs.ts
- packages/engine/src/data/religion/follower-beliefs.ts
- packages/engine/src/data/religion/index.ts
- packages/web/src/ui/panels/ReligionPanel.tsx

---

## Summary tally

| Status | Count |
|---|---|
| MATCH — code does what VII does | 3 |
| CLOSE — right shape, wrong specifics | 2 |
| DIVERGED — fundamentally different (Civ-VI-ism or custom) | 4 |
| MISSING — GDD describes, engine lacks | 3 |
| EXTRA — engine has, VII/GDD does not | 1 |

**Total findings:** 13 (3 MATCH, 2 CLOSE, 4 DIVERGED, 3 MISSING, 1 EXTRA)

---

## Detailed findings

### F-01: Pantheon missing Mysticism Civic prerequisite — DIVERGED

**Location:** packages/engine/src/systems/religionSystem.ts:68–84,115–178
**GDD reference:** systems/religion.md § Pantheon (Antiquity Age)
**Severity:** HIGH
**Effort:** S
**VII says:** Pantheon adoption is gated on the Mysticism Civic being researched (then 25 Faith is spent).
**Engine does:** canAdoptPantheon checks player.faith >= pantheon.faithCost only. No civic-research guard — a player can dispatch ADOPT_PANTHEON at any game turn regardless of civic progress.
**Gap:** Missing Mysticism Civic prerequisite check. The Faith cost (25) is correct; the trigger condition is not enforced.
**Recommendation:** Add guard in handleAdoptPantheon: verify player.civicsResearched includes mysticism. If PlayerState lacks that field, add a TODO comment and open a tracker issue.

---

### F-02: Pantheon persists across age transition — DIVERGED (Critical VII departure)

**Location:** packages/engine/src/systems/religionSystem.ts (no TRANSITION_AGE handler); packages/engine/src/data/religion/pantheons.ts:9 comment states bonuses persist through age transitions
**GDD reference:** systems/religion.md § VII-specific — Pantheons do NOT persist to Exploration. Once Antiquity ends, the Pantheon is discarded.
**Severity:** HIGH
**Effort:** S
**VII says:** Pantheon is discarded at Antiquity → Exploration transition. No carry-forward.
**Engine does:** pantheons.ts header comment explicitly states bonuses persist through age transitions. No TRANSITION_AGE handler clears player.pantheonId or state.religion.pantheonClaims.
**Gap:** Engine explicitly contradicts VII. The comment in pantheons.ts documents the wrong behavior as intentional.
**Recommendation:** Add TRANSITION_AGE handler in religionSystem.ts that, on Antiquity → Exploration, clears player.pantheonId for all players and resets state.religion.pantheonClaims. Correct the pantheons.ts header comment.

---

### F-03: Religion founding requires Pantheon prerequisite — DIVERGED (Critical VII departure)

**Location:** packages/engine/src/systems/religionSystem.ts:204–205
**GDD reference:** systems/religion.md § Religion Founding (Exploration Age) and § VII-specific — Pantheon and Religion are fully decoupled
**Severity:** HIGH
**Effort:** S
**VII says:** Religion founding requires (1) Piety Civic researched and (2) first Temple constructed. No pantheon prerequisite whatsoever.
**Engine does:** handleFoundReligion line 205 checks if (!player.pantheonId) return state — silently blocks religion founding if the player never adopted a pantheon. This is the Civ VI pantheon-to-religion pipeline that VII explicitly severed.
**Gap:** A player who skips Pantheons in Antiquity cannot found a Religion in Exploration. This is the single most critical VII divergence in the system.
**Recommendation:** Remove the if (!player.pantheonId) return state guard entirely. Replace with a Piety Civic research check and a Temple ownership check (player has at least one city with a Temple).

---

### F-04: Religion founding costs 200 Faith — DIVERGED

**Location:** packages/engine/src/systems/religionSystem.ts:47,208
**GDD reference:** systems/religion.md § Religion Founding and § VII-specific — No Faith purchasing currency.
**Severity:** HIGH
**Effort:** S
**VII says:** Religion is founded by building a Temple (production cost). No Faith deduction at founding. Faith currency was removed in VII.
**Engine does:** FOUND_RELIGION_FAITH_COST = 200 is deducted from player.faith on FOUND_RELIGION. Faith is a required scarce currency for religion founding.
**Gap:** Faith-as-founding-currency is a Civ VI holdover. VII gates founding on civic + building, not Faith accumulation.
**Recommendation:** Remove FOUND_RELIGION_FAITH_COST constant and its deduction from handleFoundReligion. If Faith currency is fully removed in VII, player.faith field should also be retired; flag as a GDD open question.

---

### F-05: Belief slots are Founder + Follower only — CLOSE (missing Reliquary + Enhancer)

**Location:** packages/engine/src/systems/religionSystem.ts:246–252 (ReligionRecord shape)
**GDD reference:** systems/religion.md § Belief System — three slot types: Reliquary (1), Founder (1–3), Enhancer (1)
**Severity:** MED
**Effort:** M
**VII says:** Four beliefs per religion across three slots: Reliquary (governs Relic earning, critical for Cultural Legacy Path), Founder (yield bonuses for founder), Enhancer (spread mechanics, unlocked via Theology Civic).
**Engine does:** ReligionRecord has only founderBeliefId and followerBeliefId. No Reliquary or Enhancer slots.
**Gap:** Reliquary slot (critical for relic generation → Cultural Legacy Path) and Enhancer slot absent from both ReligionRecord type and data catalogs.
**Recommendation:** Add reliquaryBeliefId: string and enhancerBeliefId?: string to ReligionRecord. Create reliquary-beliefs.ts and enhancer-beliefs.ts data catalogs.

---

### F-06: Pantheon content catalog diverges from VII — CLOSE

**Location:** packages/engine/src/data/religion/pantheons.ts:15–180
**GDD reference:** content/pantheons/_overview.md — 18 Pantheons (16 unique + 2 non-unique: Trickster God, God of Revelry)
**Severity:** MED
**Effort:** M
**VII says:** God of Healing = +5 healing for units on rural tiles; God of War = +15% Production toward Military Units; God of the Forge = +10% Production toward buildings; God of the Sea = +1 Production on Fishing Boats. Effects are Altar-scoped or tile/improvement-scoped.
**Engine does:** God of Healing = +1 Faith to city; God of War = MODIFY_COMBAT melee +3; God of the Forge = MODIFY_COMBAT siege +4; God of the Sea = MODIFY_COMBAT naval +3. All effects are combat or flat-yield variants. Missing entries: Monument to the Gods, Oral Tradition, City Patron Goddess, Trickster God, God of Revelry, Stone Circles, Earth Goddess, Sacred Waters.
**Gap:** 10+ effect mismatches; 6+ names missing. Engine Pantheons are custom creations, not VII entries.
**Recommendation:** Replace pantheons.ts wholesale with VII-accurate entries from content/pantheons/_overview.md. Requires new EffectDef variants for production-percent and growth-percent bonuses.

---

### F-07: Pantheon effects apply empire-wide (Altar-gating absent) — DIVERGED

**Location:** packages/engine/src/data/religion/pantheons.ts (all entries use target city or target empire)
**GDD reference:** systems/religion.md § Pantheon — effects NOT empire-wide by themselves — require an Altar building to activate per settlement
**Severity:** MED
**Effort:** M
**VII says:** Pantheon effects only activate in settlements that have an Altar building.
**Engine does:** All 16 engine Pantheons use target city or target empire EffectDefs. No Altar-building check. Effects apply to every city unconditionally.
**Gap:** Missing per-settlement Altar-activation gate. A player who builds no Altars receives full Pantheon bonuses.
**Recommendation:** Add an altar effect target to the EffectDef union (or a per-building conditional activation flag). The effect system must check whether a city has an Altar building before applying Pantheon bonuses.

---

### F-08: Missionary system entirely absent — MISSING

**Location:** Not found in any engine or UI file.
**GDD reference:** systems/religion.md § Missionary Mechanics
**Severity:** HIGH
**Effort:** L
**VII says:** Missionaries are civilian units with 1–4 charges that convert settlements by spending charges on urban district tiles (Urban population) and improved rural tiles (Rural population). No passive pressure. No theological combat.
**Engine does:** SPREAD_RELIGION is documented as a pass-through no-op (comment line 16). No Missionary unit type. No CityState.religion, CityState.urbanConverted, or CityState.ruralConverted fields exist.
**Gap:** Entire spread mechanic is unimplemented. Religion can be founded but never spreads; Relics never accumulate; Cultural Legacy Path cannot complete.
**Recommendation:** Implement as a dedicated cycle: (1) Add CityState.religion, CityState.urbanConverted, CityState.ruralConverted to state types. (2) Add SPREAD_RELIGION action handler with urban/rural charge logic. (3) Add Missionary unit with charges field. (4) Connect to relic accumulation. Substantial L-effort work.

---

### F-09: Relic system and Cultural Legacy Path connection absent — MISSING

**Location:** Not found.
**GDD reference:** systems/religion.md § Relics and the Cultural Legacy Path — 12 Relics = Cultural Golden Age milestone
**Severity:** HIGH
**Effort:** M
**VII says:** PlayerState.relicCount tracks Relics earned via Reliquary Belief on first-time foreign conversions. 12 Relics triggers Cultural Golden Age legacy milestone.
**Engine does:** No relicCount on PlayerState. No Reliquary Belief type. No milestone check. Dependent on F-08.
**Gap:** Full relic pipeline absent. Cultural Legacy Path via religion cannot complete.
**Recommendation:** Add relicCount: number to PlayerState. Add Reliquary Belief catalog (per F-05). Increment relicCount in SPREAD_RELIGION handler per Reliquary Belief rules. Add milestone check in legacy path system.

---

### F-10: Modern age religion freeze absent — MISSING

**Location:** packages/engine/src/systems/religionSystem.ts (no TRANSITION_AGE handler).
**GDD reference:** systems/religion.md § Modern Age — Exploration→Modern transition permanently locks all CityState.religion values
**Severity:** MED
**Effort:** S
**VII says:** At Exploration→Modern transition, city religion affiliations freeze permanently; no further conversion is possible.
**Engine does:** No TRANSITION_AGE case in religionSystem. No CityState.religion field. No freeze mechanism.
**Gap:** Both the data field and the transition hook are absent. Dependent on F-08.
**Recommendation:** After F-08 lands CityState.religion, add TRANSITION_AGE handler for Exploration→Modern that marks cities religionLocked: true. SPREAD_RELIGION must check this flag.

---

### F-11: ReligionPanel not wired into App.tsx — EXTRA

**Location:** packages/web/src/ui/panels/ReligionPanel.tsx:11 — comment: NOT wired into App.tsx. This panel is intentionally un-integrated.
**GDD reference:** systems/religion.md § UI requirements — ReligionPanel is a persistent overlay with keyboard shortcut R
**Severity:** LOW
**Effort:** S
**VII says:** ReligionPanel should be accessible via TopBar button or keyboard shortcut R at all times.
**Engine does:** Panel exists and renders correctly but is not registered in panelRegistry.ts and not wired in App.tsx.
**Gap:** Panel is unreachable in-game. Complete UI code sitting idle.
**Recommendation:** Register religion in panelRegistry.ts (PanelId union + entry with shortcut R). Add activation branch to App.tsx. Add TopBar trigger.

---

### F-12: Belief uniqueness per-game enforced — MATCH

**Location:** packages/engine/src/systems/religionSystem.ts:225–231
**GDD reference:** systems/religion.md § Belief System
**Severity:** —
**VII says:** Each belief can only be held by one religion in a game.
**Engine does:** founderTaken and followerTaken scans block founding if either belief is already claimed. Correct per-game uniqueness for current two-slot model.
**Gap:** None for current slots. Will need extending for Reliquary and Enhancer (F-05).

---

### F-13: Immutable state patterns in religionSystem — MATCH

**Location:** packages/engine/src/systems/religionSystem.ts:150–178,243–262
**GDD reference:** engine-patterns.md § Immutable state updates
**Severity:** —
**VII says:** N/A — engine invariant.
**Engine does:** Both handleAdoptPantheon and handleFoundReligion use new Map(state.players), spread-append [...existingReligions, newRecord], and return new state objects. No direct .set() on live state.
**Gap:** None.

---

## Extras to retire

- religionSystem.ts:47 — FOUND_RELIGION_FAITH_COST = 200 constant and deduction at line 208: VII removed Faith as a founding currency; delete when F-04 is resolved.
- religionSystem.ts:205 — if (!player.pantheonId) return state guard: direct Civ-VI-ism; remove per F-03.
- pantheons.ts — entire content catalog: replace with VII-accurate entries (F-06); current entries are not VII pantheons.

---

## Missing items (not yet implemented)

- **Reliquary Belief catalog** (data/religion/reliquary-beliefs.ts) — required for Cultural Legacy Path; deferred to belief-expansion cycle.
- **Enhancer Belief catalog** (data/religion/enhancer-beliefs.ts) — required for Theology Civic interaction; deferred to belief-expansion cycle.
- **SPREAD_RELIGION action handler** — entire missionary conversion pipeline; deferred per cycle comment in religionSystem.ts.
- **CityState.religion / CityState.urbanConverted / CityState.ruralConverted** — per-city religion tracking fields.
- **PlayerState.relicCount** — relic accumulation for Cultural Legacy Path.
- **TRANSITION_AGE handlers** — Antiquity→Exploration (pantheon discard) and Exploration→Modern (religion freeze).
- **Piety Civic + Temple building prerequisites** for religion founding (replaces Faith gate in F-04).
- **Mysticism Civic prerequisite** for pantheon adoption (F-01).
- **Altar-building gate** for per-settlement Pantheon effect activation (F-07).

---

## Mapping recommendation for GDD system doc

Paste this back into .codex/gdd/systems/religion.md § Mapping to hex-empires:



---

## Open questions for the audit

- **Faith currency status:** GDD marks source-conflict — Screen Rant says Faith removed entirely; other sources show 25-Faith pantheon cost. If Faith is removed entirely, player.faith should be retired and all gating must switch to civic+building checks.
- **Altar-as-activation-gate vs Altar-as-yield-source:** Implementing F-07 likely requires a new EffectDef target variant. Interaction with the broader effect system design needs a design review.
- **Founder Belief slot count:** GDD says up to 2 (possibly 3) unlock through gameplay; engine has exactly one founderBeliefId. Implement as single slot initially and extend.

---

## Effort estimate

| Bucket | Findings | Estimated total effort |
|---|---|---|
| S (half-day) | F-01, F-02, F-03, F-04, F-10, F-11 | ~3d |
| M (1–3 days) | F-05, F-06, F-07, F-09 | ~8d |
| L (week+) | F-08 | ~1w |
| **Total** | 10 actionable | **~2.5w** |

Recommended tackle order (highest severity / lowest effort first): **F-03 → F-02 → F-04 → F-11 → F-01 → F-05 → F-09 → F-06 → F-07 → F-08 → F-10**.

F-03, F-02, and F-04 form the purge-Civ-VI-isms cluster — addressable in one session as single-file edits. F-08 (Missionary system) is the long-pole item and should be a dedicated implementation cycle after the preceding fixes land.

---

<!-- END OF AUDIT TEMPLATE -->
