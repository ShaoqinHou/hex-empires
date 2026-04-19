# Civilizations System Audit

**GDD reference:** `.claude/gdd/systems/civilizations.md`
**Engine files:** `packages/engine/src/data/civilizations/`
**Audit date:** 2026-04-19
**Auditor:** claude-sonnet-4-6

---

## Summary

| Status | Count |
|---|---|
| MATCH -- code does what VII does | 3 |
| CLOSE -- right shape, wrong specifics | 2 |
| DIVERGED -- fundamentally different | 2 |
| MISSING -- GDD describes, engine lacks | 3 |
| EXTRA -- engine has, VII/GDD does not | 1 |
| **Total findings** | **11** |

---

## Engine files audited

- `packages/engine/src/data/civilizations/types.ts`
- `packages/engine/src/data/civilizations/antiquity-civs.ts` (7 civs)
- `packages/engine/src/data/civilizations/exploration-civs.ts` (6 civs)
- `packages/engine/src/data/civilizations/modern-civs.ts` (4 civs)
- `packages/engine/src/data/civilizations/index.ts`
- `packages/engine/src/systems/ageSystem.ts` (lines 21-100, 289-317)
- `packages/engine/src/state/GameInitializer.ts` (lines 1-163)
- `packages/engine/src/state/GameConfigFactory.ts`
- `packages/engine/src/types/GameState.ts` (TRANSITION_AGE action)

---

## Detailed findings

### F-01: Age-gating per civ -- MATCH

**Location:** `packages/engine/src/data/civilizations/types.ts:7`
**GDD reference:** Age-gated civ rosters
**Severity:** N/A
**VII says:** Every civ belongs to exactly one age.
**Engine does:** `CivilizationDef.age` literal union present on all 17 civs (7 antiquity, 6 exploration, 4 modern). Age-gating is enforced in `ageSystem` and `aiSystem`.
**Gap:** None.

---

### F-02: Civ-switch on TRANSITION_AGE -- MATCH

**Location:** `packages/engine/src/systems/ageSystem.ts:75-84`, `packages/engine/src/types/GameState.ts:417`
**GDD reference:** Civ-per-age switching
**Severity:** N/A
**VII says:** Player civilizationId replaces the outgoing civ at age transition. Leader persists unchanged.
**Engine does:** TRANSITION_AGE action carries `newCivId`; `handleTransition` sets `civilizationId: newCivId` while all other player fields (leaderId, legacyBonuses, gold) persist. Leader is never touched. `age-transition-rulebook-parity.test.ts` confirms the invariant.
**Gap:** None on the mechanical path. Civ-pick unlock rules (historical-path, leader-unlock, quest) are absent (F-08).

---

### F-03: Legacy bonus accumulates across ages -- MATCH

**Location:** `packages/engine/src/systems/ageSystem.ts:32-53`
**GDD reference:** Traditions and legacyBonus entity
**Severity:** N/A
**VII says:** The outgoing civ legacy bonus is appended to `PlayerState.legacyBonuses` and persists in all future ages.
**Engine does:** `[...player.legacyBonuses, legacyBonus]` spreads-and-appends -- correct immutable accumulation per `engine-patterns.md` invariant 1. Only the source of the bonus is wrong (F-06); the accumulation pattern itself is correct.
**Gap:** See F-06.

---

### F-04: Unique ability -- CLOSE

**Location:** packages/engine/src/data/civilizations/types.ts:8-12, all civ data files
**GDD reference:** Civilization identity, component 1
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** Each civ has a named unique ability with conditional effects.
**Engine does:** CivilizationDef.uniqueAbility.effects: ReadonlyArray is present and wired into EffectUtils.ts via state.config.civilizations. Named-ability structure is correct.
**Gap:** EffectDef values are naive flat bonuses -- conditional modifiers are not encoded. Egypt says +15% production toward wonders but the stored EffectDef is a flat MODIFY_YIELD production value (not a percent, not conditional on wonder target). Persia is tagged during a Golden Age in description but applies unconditionally. DISCOUNT_PRODUCTION and per-context multipliers must be added to the EffectDef discriminated union for MATCH.

---

### F-05: Unique unit -- CLOSE

**Location:** packages/engine/src/data/civilizations/types.ts:13, all civ data files
**GDD reference:** Civilization identity, component 5
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** Each civ has a civilian unique unit AND a military unique unit. Both are age-specific.
**Engine does:** CivilizationDef.uniqueUnit: string | null -- the field exists but all 17 civs have uniqueUnit: null (each file has a TODO comment). The type models exactly one unit; VII requires two.
**Gap 1:** 17/17 civs have uniqueUnit: null -- zero unique units defined.
**Gap 2:** Singular uniqueUnit cannot express civilian + military pair. Type should be uniqueUnits: ReadonlyArray.

---

### F-06: Legacy bonus source -- DIVERGED (data duplicated inside system)

**Location:** packages/engine/src/systems/ageSystem.ts:289-317
**GDD reference:** engine-patterns.md section 2 (state.config not ALL_X)
**Severity:** HIGH
**Effort:** S (half-day)
**VII says:** Legacy bonus is a per-civ data property read via state.config.
**Engine does:** CivilizationDef.legacyBonus is correctly defined as first-class data. But ageSystem.getCivLegacyBonus ignores state.config.civilizations and duplicates bonus values in a hardcoded lookup table inside the system -- same class of bug as ALL_X-import-in-system. Only 6 of 17 civs are listed; 11 civs (vikings, all 6 exploration, all 4 modern) return null and accumulate no legacy bonus despite having the data defined.
**Fix:** Delete getCivLegacyBonus. In handleTransition, read from state.config.civilizations.get(player.civilizationId) and use civDef.legacyBonus.effect to build the ActiveEffect.

---

### F-07: Unique building / unique infrastructure -- DIVERGED

**Location:** packages/engine/src/data/civilizations/types.ts:14, all civ data files
**GDD reference:** Civilization identity, component 2
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** Each civ has unique infrastructure: either a unique rural improvement or a unique quarter (formed by 2 unique buildings). Infrastructure is flagged ageless and persists across age transitions.
**Engine does:** CivilizationDef.uniqueBuilding: string | null -- singular field. Only 2 of 17 civs populate it: rome (bath) and china (great_wall). The remaining 15 have null. No ageless flag. No quarter pairing mechanism (x-ref tile-improvements F-05).
**Gap 1:** Singular uniqueBuilding cannot express: (a) one unique improvement OR (b) two unique buildings pairing into a named Quarter.
**Gap 2:** 15 of 17 civs have uniqueBuilding: null.
**Gap 3:** No ageless: true flag on CivilizationDef or referenced building/improvement.
**Note:** great_wall is a unique rural improvement in VII, not a building -- type mismatch between the data label and the VII entity type.

---

### F-08: Civ unlock system (historical-path / leader-unlock / quest) -- MISSING

**Location:** packages/engine/src/state/GameInitializer.ts, packages/engine/src/systems/ageSystem.ts
**GDD reference:** Unlock rules -- three pathways
**Severity:** HIGH
**Effort:** L (week+)
**VII says:** Three pathways populate PlayerState.unlockedCivIds before each transition: (1) historical-path from current civ, (2) leader-guaranteed unlock, (3) gameplay/quest completion. TRANSITION_AGE validates newCivId is in the unlock set.
**Engine does:** No unlockedCivIds field on PlayerState. TRANSITION_AGE accepts any newCivId without unlock validation. AI picks any unused next-age civ. Human player can pick any civ in the full next-age roster.
**Gap:** The entire three-pathway unlock system is absent. This is the most architecturally significant VII identity gap in the civilizations system.

---

### F-09: Traditions / unique civic tree -- MISSING

**Location:** packages/engine/src/data/civilizations/types.ts
**GDD reference:** Traditions
**Severity:** HIGH
**Effort:** L (week+)
**VII says:** Each civ has a uniqueCivicTreeId. Completing milestones unlocks Traditions that persist in PlayerState.traditions across future civ changes and occupy policy slots.
**Engine does:** CivilizationDef has no uniqueCivicTreeId field. The civic system gates civics by CivicDef.civId -- partial modeling -- but there is no Traditions concept in PlayerState, no milestone-to-Tradition flow, and no cross-age persistence of civic unlocks.
**Gap:** CivilizationDef lacks uniqueCivicTreeId. PlayerState lacks traditions. The full Traditions lifecycle does not exist.

---

### F-10: Civ catalog size and canonical IDs -- MISSING + DIVERGED

**Location:** packages/engine/src/data/civilizations/index.ts
**GDD reference:** Age-gated civ rosters
**Severity:** MED
**Effort:** M per civ
**VII says:** 30 vanilla civs (10 antiquity + 11 exploration + 9 modern).
**Engine does:** 17 civs total (7 antiquity + 6 exploration + 4 modern).
**Roster gaps:**
  Antiquity: missing Aksum, Khmer, Maya, Mississippian. Vikings is not a VII vanilla civ. India and China have wrong canonical IDs (maurya, han).
  Exploration: missing Abbasid, Chola, Hawaii, Inca, Majapahit, Shawnee, Songhai.
  Modern: missing Buganda, French Empire, Meiji Japan, Mexico, Qing China, Siam. Germany (VII: Prussia) and Brazil are not VII vanilla civs.
**Canonical ID mismatches:** india (VII: maurya), china (VII: han), germany (VII: prussia). vikings and brazil are not VII vanilla civs. These are id-casing-mismatch-in-registry candidates for cross-system lookups.

---

### F-11: GameInitializer uses Date.now() as seed -- EXTRA (seeded-RNG violation)

**Location:** packages/engine/src/state/GameInitializer.ts:19
**GDD reference:** engine-patterns.md section 3 Seeded RNG
**Severity:** MED
**Effort:** S (half-day)
**Rule says:** createRng(Date.now()) is a BLOCK in tests, WARN otherwise. Games must be reproducible from seed.
**Engine does:** const gameSeed = seed ?? Date.now(). When seed is omitted (UI-triggered new game), the RNG seed is non-deterministic. Non-reproducible games cannot be replayed or tested deterministically.
**Fix:** Require seed: number in GameSetupConfig (no optional fallback). Callers supply crypto.getRandomValues so the value is stored and replayable.

---

## Coverage Matrix

| GDD Feature | Status | Finding |
|---|---|---|
| Age-gating (each civ = one age only) | MATCH | F-01 |
| Civ switch on TRANSITION_AGE | MATCH | F-02 |
| Leader persists across civ switch | MATCH | F-02 |
| Legacy bonus accumulation pattern | MATCH | F-03 |
| Legacy bonus source (state.config not hardcoded) | DIVERGED | F-06 |
| Unique ability structure | CLOSE | F-04 |
| Unique unit (civilian + military) | CLOSE (all null, singular type) | F-05 |
| Unique building / improvement | DIVERGED | F-07 |
| Ageless flag on infrastructure | MISSING | F-07 |
| Quarter pairing (2 UBs -> named Quarter) | MISSING (x-ref tile-improvements F-05) | F-07 |
| Civ unlock system (historical-path/leader/quest) | MISSING | F-08 |
| Traditions / unique civic tree | MISSING | F-09 |
| Civ catalog size (30 vanilla) | 17 of 30 | F-10 |
| Canonical VII civ IDs | 3 wrong IDs + 2 non-canonical civs | F-10 |
| Seeded RNG on game init | WARN | F-11 |

---

## Extras to retire

- getCivLegacyBonus hardcoded table in ageSystem.ts -- replace with state.config.civilizations lookup (F-06)
- Vikings civ -- not a Civ VII vanilla civ; candidate for replacement with Aksum, Khmer, Maya, or Mississippian
- germany in modern-civs.ts -- VII vanilla equivalent is Prussia
- brazil in modern-civs.ts -- not VII vanilla; no direct equivalent in VII vanilla Modern roster

---

## Effort estimate

| Bucket | Findings | Estimated effort |
|---|---|---|
| S (half-day) | F-06, F-11 | 1d |
| M (1-3 days) | F-04, F-05, F-07, F-10 (partial) | ~10d |
| L (week+) | F-08, F-09 | ~3w |
| **Total** | 9 actionable | ~4w |

Recommended order: F-06 (trivial fix, unblocks 11 civs immediately), F-11 (RNG hygiene), F-04 (EffectDef conditionals), F-05 + F-07 (type + content), F-10 (ID canon + missing civs), then F-08 (unlock system), F-09 (Traditions).

---

## Open questions

- Should Vikings be kept as a custom non-canonical civ or replaced with a VII-authentic antiquity civ?
- Which 13 missing vanilla civs are highest roadmap priority?
- Is DISCOUNT_PRODUCTION already an EffectDef variant or does it need to be added for F-04?
- great_wall is typed as a building -- should it move to a uniqueImprovement field once that field exists on CivilizationDef?

---

<!-- END OF AUDIT TEMPLATE -->
