# Tech Tree — hex-empires Audit

**System slug:** `tech-tree`
**GDD doc:** [systems/tech-tree.md](../systems/tech-tree.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/systems/researchSystem.ts` (1-276)
- `packages/engine/src/systems/ageSystem.ts`
- `packages/engine/src/data/technologies/antiquity/index.ts`
- `packages/engine/src/data/technologies/exploration/index.ts`
- `packages/engine/src/data/technologies/modern/index.ts`
- `packages/engine/src/types/Technology.ts`
- `packages/engine/src/types/GameState.ts` (PlayerState)
- `packages/engine/src/state/LegacyPaths.ts`
- `packages/web/src/ui/panels/TechTreePanel.tsx`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 1 |
| CLOSE | 3 |
| DIVERGED | 4 |
| MISSING | 4 |
| EXTRA | 2 |

**Total findings:** 14

---

## Detailed findings

### F-01: Age transition does NOT wipe research state — DIVERGED

**Location:** `ageSystem.ts:76-84`
**GDD reference:** `systems/tech-tree.md` § "Age transition: tech tree wipe"
**Severity:** HIGH
**Effort:** S
**VII says:** On TRANSITION_AGE: `researchProgress` discarded, `researchQueue` cleared, `completedTechs` and `completedMasteries` cleared.
**Engine does:** `handleTransition` spreads `...player` and only overrides civ/age/progress/legacy/gold/researchedTechs. Five fields persist: `currentResearch`, `researchProgress`, `masteredTechs`, `currentMastery`, `masteryProgress`.
**Gap:** Player carries science + in-progress mastery into new age. `masteredTechs` from Antiquity blocks mastering again in Exploration.
**Recommendation:** Add to player update: `currentResearch: null, researchProgress: 0, masteredTechs: [], currentMastery: null, masteryProgress: 0`.

---

### F-02: Mastery bonus is generic `+1 science` for all techs — DIVERGED

**Location:** `researchSystem.ts:202-213`
**GDD reference:** `systems/tech-tree.md` § "Mastery mechanic" → "Thematic bonuses"
**Severity:** MED
**Effort:** M
**VII says:** Each mastery has thematic bonus. Writing→+1 Science + 1 Codex + Steal Technology. Navigation→+3 CS Naval + 1 Codex. Mathematics→2 Codices. NOT uniform.
**Engine does:** `processMasteryResearch` hard-codes `MODIFY_YIELD empire science +1` for every mastery. `TechnologyDef` has no `masteryBonus` or `masteryCodexCount`.
**Gap:** Strategic mastery-timing flattened to single reward. Codex awards (primary driver of science legacy path) never produced.
**Recommendation:** Add `masteryBonus?: ReadonlyArray<EffectDef>` and `masteryCodexCount?: number` to `TechnologyDef`. Populate per-tech.

---

### F-03: Future Tech prerequisite requires ALL age techs, not 2 specific — DIVERGED

**Location:** `researchSystem.ts:35-44`, `98-105`
**GDD reference:** `systems/tech-tree.md` § "Future Tech"
**Severity:** MED
**Effort:** S
**VII says:** Antiquity Future Tech requires Mathematics + Iron Working. Exploration/Modern: two analogous end-tree techs.
**Engine does:** `allAgeTechsResearched()` iterates full registry, returns false until EVERY tech researched. Future Tech is floating constant `FUTURE_TECH_ID = 'future_tech'`, not a registry entry.
**Gap:** Skipping any early tech blocks Future Tech access. Future Tech invisible to normal prerequisite system.
**Recommendation:** Add Future Tech entries to each age's data file with explicit `prerequisites`. Remove `allAgeTechsResearched()`.

---

### F-04: Future Tech missing `+1 Wildcard Attribute Point` and next-age boost — CLOSE

**Location:** `researchSystem.ts:133-151`
**GDD reference:** `systems/tech-tree.md` § "Future Tech" → effects
**Severity:** MED
**Effort:** S
**VII says:** Future Tech completion: +10 Age Progress, +1 Wildcard Attribute Point, boost to one starting tech in next age.
**Engine does:** Only `ageProgress + 10` applied. Wildcard Attribute Point and next-age boost absent.
**Gap:** 2 of 3 Future Tech effects missing.
**Recommendation:** Add `wildcardAttributePoints: number` + `nextAgeTechBoost: TechnologyId | null` to `PlayerState`. Apply credit in `handleTransition`.

---

### F-05: Science formula limited to population + flat building yields — MISSING

**Location:** `researchSystem.ts:247-263`
**GDD reference:** `systems/tech-tree.md` § "Science accumulation"
**Severity:** HIGH
**Effort:** L
**VII says:** Science = building base + adjacency + tile yields + specialists + codex bonuses + resources + policies (Scholars, Social Science) + Research Collaboration +50% + leader attributes.
**Engine does:** `calculateSciencePerTurn` sums `city.population` + `buildingDef.yields.science`. No adjacency, specialists, codex, policies, collaboration, resources.
**Gap:** ~20-40% of full science computation. Specialists are 70-80% of late-game science per GDD. Policies (Scholars, Social Science) defined but never applied.
**Recommendation:** Incremental: (1) adjacency lookup, (2) specialist science, (3) `player.slottedPolicies` multipliers, (4) `diplomacyState` Research Collaboration +50%.

---

### F-06: Research progress wiped on tech switch, not preserved — CLOSE

**Location:** `researchSystem.ts:52-60`
**GDD reference:** `systems/tech-tree.md` § "Triggers" → "SELECT_TECH"
**Severity:** MED
**Effort:** S
**VII says:** Switching research retains accumulated science on previous tech. Can switch back and resume.
**Engine does:** `handleSetResearch` always sets `researchProgress: 0`. Previous science destroyed.
**Gap:** Strategic partial-research + burst completion impossible.
**Recommendation:** Add `techProgressMap: ReadonlyMap<TechnologyId, number>` to `PlayerState`. On switch, persist/restore. Clear on age transition.

---

### F-07: Antiquity tech content does not match GDD canonical — CLOSE

**Location:** `data/technologies/antiquity/index.ts:212-217`
**GDD reference:** `systems/tech-tree.md` § "Per-age tech trees"
**Severity:** LOW
**Effort:** S
**VII says:** 15 confirmed Antiquity techs: Agriculture, Sailing, Pottery, Animal Husbandry, Writing, Irrigation, Masonry, Currency, Bronze Working, Wheel, Navigation, Engineering, Military Training, Mathematics, Iron Working.
**Engine does:** 19 Antiquity techs — includes Astrology (Civ VI), Archery, Mining, Construction. CONSTRUCTION and MILITARY_TRAINING share `treePosition: { row: 2, col: 3 }` — collision causing UI artifacts.
**Gap:** 4 extra techs; Astrology confirmed Civ-VI holdover; position collision.
**Recommendation:** Remove Astrology. Verify Archery/Mining/Construction vs VII sources. Fix position collision.

---

### F-08: Codex system entirely absent — MISSING

**Location:** No `codexSystem.ts`. `PlayerState` has no codex fields. `TechnologyDef` has no `masteryCodexCount`. `BuildingDef` has no `codexSlots`.
**GDD reference:** `systems/tech-tree.md` § "Codex system"
**Severity:** HIGH
**Effort:** L (multi-sprint)
**VII says:** Codices are Great Works earned via Tech Masteries. Must be slotted into buildings with Codex slots (Palace 1, Library 2, Academy 3, Nalanda 2) for science-per-turn. Antiquity science legacy: 10 displayed Codices at milestones 3/6/10.
**Engine does:** `Government.ts` has `CodexId` type + `CodexPlacement` interface as dead scaffolding. `researchSystem` mastery awards no codices. `calculateSciencePerTurn` doesn't include codex yield. `LegacyPaths.ts` uses `hasBuildingInEveryCity(s, pid, 'library')` as proxy for 10-Codex milestone.
**Gap:** Largest single gap. Type scaffolding exists in `Government.ts` but inert.
**Recommendation:** Phase 1: `codexSlots: number` on `BuildingDef`. Phase 2: `ownedCodices` + `codexPlacements` on `PlayerState`. Phase 3: award in `processMasteryResearch`. Phase 4: include in `calculateSciencePerTurn`. Phase 5: replace `LegacyPaths` proxy.

---

### F-09: Science legacy milestones use techs-count proxy, not Codex count — DIVERGED

**Location:** `ageSystem.ts:238`, `LegacyPaths.ts:119-136`
**GDD reference:** `systems/tech-tree.md` § "Codex system" → milestones 3/6/10
**Severity:** HIGH
**Effort:** S (after F-08)
**VII says:** Antiquity science legacy milestones at 3, 6, 10 **displayed Codices**. Tier-3 (10) grants "Great Library" carry-forward.
**Engine does:** `ageSystem.checkLegacyMilestones` uses `Math.floor(researchedTechs.length / 5)`. `LegacyPaths.ts` Antiquity science milestones use "4 techs", "8 techs", "Library in every city" — all proxies. Two independent implementations with inconsistent thresholds.
**Gap:** Dual proxies, both diverging from GDD. Codex carry-forward never applied.
**Recommendation:** After F-08: replace both proxies with `player.codexPlacements.length >= N`. Consolidate implementations.

---

### F-10: SET_MASTERY engine action has no UI entry point — MISSING

**Location:** `web/src/ui/panels/TechTreePanel.tsx:21-30`
**GDD reference:** `systems/tech-tree.md` § "UI requirements" → "Mastery sub-panel"
**Severity:** MED
**Effort:** S
**VII says:** After a tech is researched, its Mastery tier appears within the same node. Player queues Mastery like a base tech.
**Engine does:** `handleSetMastery` fully implemented. `TechTreePanel.tsx` passes only `onSelect → SET_RESEARCH`. SET_MASTERY never dispatched. Mastery props not passed to TreeView.
**Gap:** Mastery mechanic engine-complete but UI-orphaned.
**Recommendation:** Add `onMasterySelect` callback. Pass mastery props to TreeView. Render mastery nodes for researched techs not yet mastered.

---

### F-11: Normal tech completion grants `+5 ageProgress` — EXTRA

**Location:** `researchSystem.ts:163`
**GDD reference:** `systems/tech-tree.md` (mechanic not in VII)
**Severity:** MED
**Effort:** S
**VII says:** Age Progress advances via Future Tech completion (+10), legacy path milestones, natural per-turn tick. No per-tech-researched ageProgress bonus.
**Engine does:** `processNormalResearch` applies `ageProgress + 5` on every normal tech completion. ~15 techs per age adds 75 Age Progress from research alone.
**Gap:** Engine-original compounding mechanic. GDD decouples tech research from age progression except via Future Tech.
**Recommendation:** Remove `ageProgress + 5`.

---

### F-12: Dark-age random-tech-removal — EXTRA (no GDD basis)

**Location:** `ageSystem.ts:185-198`
**GDD reference:** `systems/tech-tree.md` — no tech-removal mechanic in VII dark ages
**Severity:** MED
**Effort:** S
**VII says:** Science dark-age effects are yield penalties, not tech removal.
**Engine does:** When `paths.science === 0`, `getGoldenDarkAgeEffects` picks random tech from `researchedTechs` to remove. `handleTransition` filters it out.
**Gap:** Creates cascading data inconsistency — buildings/units unlocked by removed tech remain in game state, creating phantom-unlocked content.
**Recommendation:** Replace with VII-style science dark-age yield penalty (e.g., `-2 science per city for next age`). Remove `lostTech` path.

---

### F-13: Exploration + Modern Future Tech have no prerequisite data — MISSING

**Location:** `data/technologies/exploration/index.ts`, `modern/index.ts`
**GDD reference:** `systems/tech-tree.md` § "Future Tech"
**Severity:** LOW
**Effort:** S (after F-03)
**VII says:** Every age has Future Tech with two confirmed end-tree prerequisites.
**Engine does:** No Future Tech entry in any age's data. Magic constant bypasses registry. Exploration/Modern have no defined terminal tech.
**Gap:** Future Tech architecturally separate from registry.
**Recommendation:** Create `future_tech_antiquity/exploration/modern` entries. Infer Exploration prereqs as `['economics', 'military_science']`, Modern as `['rocketry', 'nuclear_fission']` — tag [INFERRED].

---

### F-14: Science overflow carries correctly to next tech — MATCH

**Location:** `researchSystem.ts:157-159`
**GDD reference:** `systems/tech-tree.md` § "Triggers" → END_TURN
**Severity:** LOW
**Effort:** S
**VII says:** Excess science carries forward (standard Civ convention).
**Engine does:** `const overflow = newProgress - techCost; ... researchProgress: overflow`. Correct.
**Gap:** None.
**Recommendation:** No action.

---

## Extras to retire

- `researchSystem.ts:163` `+5 ageProgress` per tech (F-11) — no GDD basis.
- `ageSystem.ts:185-198` dark-age random tech removal (F-12) — creates data inconsistency.

---

## Missing items

1. Codex system (F-08) — largest gap; blocks F-09 fidelity.
2. Science formula completeness (adjacency, specialists, policies, collaboration) (F-05).
3. Per-tech mastery bonuses + codex counts (F-02).
4. Research progress preservation on switch (F-06) — `techProgressMap`.
5. Future Tech +1 Wildcard Attribute + next-age boost (F-04).
6. Mastery UI entry point (F-10).
7. Exploration + Modern Future Tech data (F-13).

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/tech-tree.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/researchSystem.ts`
- `packages/engine/src/systems/ageSystem.ts` (missing tech reset — F-01)
- `packages/engine/src/data/technologies/{antiquity,exploration,modern}/index.ts`
- `packages/engine/src/state/LegacyPaths.ts` (milestone proxy — F-09)
- `packages/web/src/ui/panels/TechTreePanel.tsx` (missing mastery UI — F-10)

**Status:** 1 MATCH / 3 CLOSE / 4 DIVERGED / 4 MISSING / 2 EXTRA

**Highest-severity finding:** F-01 — age transition doesn't wipe research state (5-field persistence bug); F-08 — Codex system entirely absent (largest architectural gap).

---

## Open questions

1. Codex system phasing — Phase 1 (`codexSlots` on BuildingDef) is cheap; full integration takes multiple sprints.
2. Research Collaboration implementation — does `DiplomacyState.activeEndeavors` already track collaborations?
3. Next-age tech boost — nominated manually or auto-selected from first-tier?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-01, F-03, F-04, F-06, F-07, F-09, F-10, F-11, F-12, F-13 | 5d |
| M | F-02 | 2d |
| L | F-05, F-08 | 3w+ |
| **Total** | 14 | **~4w** |

Recommended order: F-01 (age transition wipe — 5-line fix), F-11 (remove +5 ageProgress), F-12 (remove tech-loss dark-age), F-06 (preserve switch progress), F-10 (mastery UI), F-03+F-13 (Future Tech as registry), F-04 (Future Tech effects), F-07 (content cleanup), F-02 (per-tech mastery bonuses), F-08 (codex system — XL), F-09 (legacy milestone — unblocked by F-08), F-05 (science formula completeness).

---

<!-- END OF AUDIT -->
