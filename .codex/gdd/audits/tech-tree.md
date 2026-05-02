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
| MATCH | 6 |
| CLOSE | 5 |
| DIVERGED | 2 |
| MISSING | 1 |
| EXTRA | 0 |

**Total findings:** 14

---

## Detailed findings

### F-01: Age transition wipes active research state — MATCH

**Location:** `ageSystem.ts` `handleTransition`; `GameEngine.ts` transition pipeline guard
**GDD reference:** `systems/tech-tree.md` § "Age transition: tech tree wipe"
**Severity:** HIGH
**Effort:** S
**VII says:** On TRANSITION_AGE: `researchProgress` discarded, `researchQueue` cleared, `completedTechs` and `completedMasteries` cleared.
**Engine does:** Accepted `TRANSITION_AGE` clears `researchedTechs`, `currentResearch`, `researchProgress`, `masteredTechs`, `currentMastery`, `masteryProgress`, and `techProgressMap`. `GameEngine.applyTransitionAge` runs `ageSystem` first and blocks follow-on transition handlers if validation rejects the transition.
**Gap:** None for the active tech tree reset. Codices and persistent legacy/attribute state intentionally live in separate fields.
**Recommendation:** Keep transition reset ownership in `ageSystem`; preserve the rejected-transition integration regression.

---

### F-02: Mastery bonuses are data-driven but content still approximate — CLOSE

**Location:** `researchSystem.ts` `processMasteryResearch`; `TechnologyDef.masteryEffect`; `TechnologyDef.masteryCodexCount`
**GDD reference:** `systems/tech-tree.md` § "Mastery mechanic" → "Thematic bonuses"
**Severity:** MED
**Effort:** M
**VII says:** Each mastery has thematic bonus. Writing→+1 Science + 1 Codex + Steal Technology. Navigation→+3 CS Naval + 1 Codex. Mathematics→2 Codices. NOT uniform.
**Engine does:** `processMasteryResearch` reads per-tech `masteryEffect` and `masteryCodexCount`, awards codices, and falls back to +1 Science only when a definition has no mastery effect.
**Gap:** The architecture is no longer generic, but the data table is still an inferred parity scaffold rather than a verified one-to-one copy of published Civ VII mastery rewards.
**Recommendation:** Re-verify each mastery payload against current in-game data/source tables.

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

### F-05: Science formula covers codices/policies but still lacks full yield stack — CLOSE

**Location:** `researchSystem.ts:247-263`
**GDD reference:** `systems/tech-tree.md` § "Science accumulation"
**Severity:** HIGH
**Effort:** L
**VII says:** Science = building base + adjacency + tile yields + specialists + codex bonuses + resources + policies (Scholars, Social Science) + Research Collaboration +50% + leader attributes.
**Engine does:** `calculateSciencePerTurn` sums population/building science, placed codices, and slotted science policy bonuses.
**Gap:** Adjacency, tile yields, specialists, resources, Research Collaboration, and percent/leader attribute modifiers are still incomplete.
**Recommendation:** Move research science input onto the shared yield-calculation path instead of adding more one-off branches.

---

### F-06: Research progress preserved on tech switch — MATCH

**Location:** `researchSystem.ts:52-60`
**GDD reference:** `systems/tech-tree.md` § "Triggers" → "SELECT_TECH"
**Severity:** MED
**Effort:** S
**VII says:** Switching research retains accumulated science on previous tech. Can switch back and resume.
**Engine does:** `handleSetResearch` saves current partial progress into `techProgressMap` and restores saved progress when switching back. Accepted age transitions clear the map.
**Gap:** None for switch preservation.
**Recommendation:** Keep `techProgressMap` treated as active per-age state.

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

### F-08: Codex system implemented as a first pass — CLOSE

**Location:** `TechnologyDef.masteryCodexCount`, `PlayerState.ownedCodices`, `PlayerState.codexPlacements`, `BuildingDef.codexSlots`, `researchSystem.ts`
**GDD reference:** `systems/tech-tree.md` § "Codex system"
**Severity:** HIGH
**Effort:** L (multi-sprint)
**VII says:** Codices are Great Works earned via Tech Masteries. Must be slotted into buildings with Codex slots (Palace 1, Library 2, Academy 3, Nalanda 2) for science-per-turn. Antiquity science legacy: 10 displayed Codices at milestones 3/6/10.
**Engine does:** Tech mastery awards codex IDs, buildings expose `codexSlots`, players can place codices into owned buildings, placed codices add science, and science legacy tests now target `codexPlacements`.
**Gap:** This is still a functional scaffold: no dedicated Great Works UI, no pillage/disaster slot loss, and Codex content/slot counts need source verification.
**Recommendation:** Keep the current model, then add UI and loss/overflow rules in a dedicated codex slice.

---

### F-09: Science legacy milestones use displayed Codex count — MATCH

**Location:** `ageSystem.ts:238`, `LegacyPaths.ts:119-136`
**GDD reference:** `systems/tech-tree.md` § "Codex system" → milestones 3/6/10
**Severity:** HIGH
**Effort:** S (after F-08)
**VII says:** Antiquity science legacy milestones at 3, 6, 10 **displayed Codices**. Tier-3 (10) grants "Great Library" carry-forward.
**Engine does:** `LegacyPaths` and the score/victory tests now use displayed codices (`codexPlacements`) rather than researched-tech count or library proxies.
**Gap:** Carry-forward Great Library/Academy effects still need source-verified implementation outside the raw milestone predicate.
**Recommendation:** Keep milestone predicates codex-driven; implement carry-forward bonuses in the legacy reward slice.

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

### F-11: Normal tech completion does not grant age progress — MATCH

**Location:** `researchSystem.ts:163`
**GDD reference:** `systems/tech-tree.md` (mechanic not in VII)
**Severity:** MED
**Effort:** S
**VII says:** Age Progress advances via Future Tech completion (+10), legacy path milestones, natural per-turn tick. No per-tech-researched ageProgress bonus.
**Engine does:** Normal tech completion no longer increments `ageProgress`; Future Tech remains the tech-tree age-progress source.
**Gap:** None for this extra mechanic.
**Recommendation:** Keep the integration regression that normal tech completion only advances the natural END_TURN age tick.

---

### F-12: Science dark age is a yield penalty, not random tech removal — MATCH

**Location:** `ageSystem.ts` `getGoldenDarkAgeEffects`
**GDD reference:** `systems/tech-tree.md` — no tech-removal mechanic in VII dark ages
**Severity:** MED
**Effort:** S
**VII says:** Science dark-age effects are yield penalties, not tech removal.
**Engine does:** Science dark age applies a science yield penalty effect. The prior `lostTech` path is gone.
**Gap:** Penalty value still needs source verification.
**Recommendation:** Keep dark-age effects as yield/effect records, never as destructive tech-tree mutation.

---

### F-13: Exploration + Modern Future Tech exist but prereqs are broad — DIVERGED

**Location:** `data/technologies/exploration/index.ts`, `modern/index.ts`
**GDD reference:** `systems/tech-tree.md` § "Future Tech"
**Severity:** LOW
**Effort:** S (after F-03)
**VII says:** Every age has Future Tech with two confirmed end-tree prerequisites.
**Engine does:** Each age has a `future_tech_*` registry entry and tests. Current prerequisite tests require all non-future techs in the age, not the two-terminal-tech model described by the GDD.
**Gap:** Future Tech is no longer missing, but its gate is stricter than the VII model.
**Recommendation:** Replace all-nonfuture prerequisites with source-verified terminal prerequisite pairs.

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

- None currently tracked for this system; the prior normal-tech age-progress bonus and random tech-loss dark age were retired.

---

## Missing items

1. Mastery UI entry point (F-10).
2. Full science formula completeness: adjacency, specialists, tile/resource yields, collaboration, and percent modifiers (F-05).
3. Future Tech +1 Wildcard Attribute + next-age boost (F-04).
4. Source-verified mastery payloads and Codex slot/loss polish (F-02, F-08).
5. Future Tech terminal prerequisite pairs instead of all-nonfuture gates (F-13).

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/tech-tree.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/researchSystem.ts`
- `packages/engine/src/systems/ageSystem.ts` (accepted transition clears active tech tree state — F-01)
- `packages/engine/src/data/technologies/{antiquity,exploration,modern}/index.ts`
- `packages/engine/src/state/LegacyPaths.ts` (milestone proxy — F-09)
- `packages/web/src/ui/panels/TechTreePanel.tsx` (missing mastery UI — F-10)

**Status:** 6 MATCH / 5 CLOSE / 2 DIVERGED / 1 MISSING / 0 EXTRA

**Highest-severity finding:** F-05 — science input still bypasses the full shared yield stack; F-10 — mastery UI remains absent.

---

## Open questions

1. Codex system phasing — Phase 1 (`codexSlots` on BuildingDef) is cheap; full integration takes multiple sprints.
2. Research Collaboration implementation — does `DiplomacyState.activeEndeavors` already track collaborations?
3. Next-age tech boost — nominated manually or auto-selected from first-tier?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-04, F-10, F-13 | 1.5d |
| M | F-02, F-07, F-08 | 4d |
| L | F-05 | 1w+ |
| **Total** | 14 | **~4w** |

Recommended order: F-10 (mastery UI), F-13 (Future Tech prereq pairs), F-04 (Future Tech effects), F-05 (science formula completeness), F-02/F-08 (source-verified mastery/Codex polish), F-07 (content cleanup).

---

<!-- END OF AUDIT -->
