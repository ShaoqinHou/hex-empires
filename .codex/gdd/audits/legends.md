# Legends — hex-empires Audit

**System slug:** `legends`
**GDD doc:** [systems/legends.md](../systems/legends.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/systems/achievementSystem.ts` — closest analog
- `packages/engine/src/data/achievements/index.ts` — 6 intra-game milestones
- `packages/web/src/ui/panels/AchievementsPanel.tsx`
- Grep for `legend`, `foundation`, `leaderLevel`, `challengeXP`, `accountState` — 0 hits (confirming absence)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 0 |
| CLOSE | 1 |
| DIVERGED | 2 |
| MISSING | 5 |
| EXTRA | 0 |

**Total findings:** 8

---

## Detailed findings

### F-01: `AccountState` cross-session persistence layer absent — MISSING

**Location:** no file
**GDD reference:** `systems/legends.md` § "Entities" (cross-cut `mementos.md` F-04)
**Severity:** HIGH
**Effort:** L
**VII says:** All Legends progress (Foundation level+XP, per-leader level+XP, completed challenges, unlocked Mementos, Attribute Nodes, Legacy Cards, cosmetics) lives in `AccountState`. Persists across reinstalls via 2K account binding.
**Engine does:** `GameState` fully session-scoped. `state.unlockedAchievements` resets on `createInitialState()`. No `AccountState`, no persistence adapter.
**Gap:** Every other finding blocks on this. Mementos F-04 independently identified the same gap.
**Recommendation:** Define `AccountState` in `types/AccountState.ts`. Host app owns persistence (localStorage). Engine owns type + pure mutators computing `AccountStateDelta`.

---

### F-02: Foundation Path level + XP tracking absent — MISSING

**Location:** no file
**GDD reference:** `systems/legends.md` § "Foundation Path"
**Severity:** HIGH
**Effort:** M
**VII says:** 50-level Foundation Path. `AccountState.foundationLevel` (1-50) + `foundationXP`. Level 2 unlocks Memento Slot 1; Level 5 unlocks Slot 2. Levels 2-49 yield Mementos/cosmetics (18 total).
**Engine does:** `achievementSystem` records binary unlock flags — no XP, no level, no level-up dispatch.
**Gap:** XP→level→reward loop absent.
**Recommendation:** Add `foundationXP`/`foundationLevel` to `AccountState`. Add `legendsSystem.ts` with `checkFoundationLevelUp` + reward dispatch.

---

### F-03: Per-leader Level + XP tracking absent — MISSING

**Location:** no file
**GDD reference:** `systems/legends.md` § "Leader Paths"
**Severity:** HIGH
**Effort:** M
**VII says:** ~25 leaders with independent 10-level paths × 57 challenges. `AccountState.leaderLevels: Map<LeaderId, 1..10>`. Level-ups unlock Mementos (2/5/9), Attribute Nodes (3/7), Legacy Cards (4/8), cosmetics (6/10).
**Engine does:** `AchievementId` flat union, no leader dimension. No per-leader XP/level.
**Gap:** 57 × 25 = 1,425 leader challenges unrepresented.
**Recommendation:** Add `leaderLevels` + `leaderXP` Maps to `AccountState`. Define `LeaderChallengeDef` with `leaderId` discriminator.

---

### F-04: Challenge category schema absent — MISSING

**Location:** `data/achievements/index.ts`, `types` for AchievementDef
**GDD reference:** `systems/legends.md` § "Challenge structure"
**Severity:** MED
**Effort:** M
**VII says:** 5 categories: Tutorials (16), Wonders (32), Civ Victories (32), Milestones (151), Accomplishments (34). Different XP per category. Conditions need `legacy_path_completed`, `wonder_built`, `turns_played_at_least`, `campaigns_completed_as_leader`.
**Engine does:** `AchievementDef` has no `category` or `xp` field. 6 stub entries. `AchievementCondition` lacks the needed types.
**Gap:** Data schema cannot express VII taxonomy.
**Recommendation:** Add `category` + `xp` to `AchievementDef`. Extend `AchievementCondition` union.

---

### F-05: Attribute Node and Legacy Card unlock dispatch absent — MISSING

**Location:** no `AccountState` fields
**GDD reference:** `systems/legends.md` § "Attribute Node unlocks", "Legacy Card unlocks"
**Severity:** MED
**Effort:** M
**VII says:** Leader Path levels 3 & 7 unlock Attribute Nodes. Levels 4 & 8 unlock bonus Legacy Cards.
**Engine does:** No `unlockedAttributeNodes`, no `unlockedLegacyCards`. `legacyBonuses` on `PlayerState` is different (intra-campaign).
**Gap:** Mechanical unlocks giving Legends its depth have no engine surface.
**Recommendation:** Add `unlockedAttributeNodes: Map<LeaderId, AttributeNodeId[]>` + `unlockedLegacyCards: Map<LeaderId, LegacyCardId[]>` to `AccountState`. Gate availability in respective systems.

---

### F-06: `AchievementsPanel` imports `ALL_ACHIEVEMENTS` global — DIVERGED (trap: `ALL_X-import-in-ui`)

**Location:** `AchievementsPanel.tsx:10`
**GDD reference:** `.codex/rules/data-driven.md` § "Registry pattern"
**Severity:** LOW
**Effort:** S
**VII says:** UI should read from `state.config.achievements`.
**Engine does:** `import { ALL_ACHIEVEMENTS, type AchievementDef } from '@hex/engine'`. Bypasses state.config. Tests can't substitute fixture.
**Gap:** Trap violation.
**Recommendation:** Replace with `[...state.config.achievements.values()]`. Half-hour fix.

---

### F-07: `achievementSystem` is in-session only — CLOSE (needs extension, not retirement)

**Location:** `systems/achievementSystem.ts`
**GDD reference:** `systems/legends.md` § "Triggers — On challenge completion"
**Severity:** MED
**Effort:** M
**VII says:** Challenges feed persistent XP + level system accumulating across games.
**Engine does:** Evaluates conditions on END_TURN, records binary unlock in `state.unlockedAchievements`. Predicate logic is reusable — terminates 3 steps early (before XP award, level-up, reward dispatch).
**Gap:** Right idea, wrong scope.
**Recommendation:** KEEP `achievementSystem` for intra-game binary. Create `legendsSystem.ts` that shares predicate evaluators but writes to `AccountState`. Both run on END_TURN.

---

### F-08: `AchievementsPanel` models Legends UI incorrectly — DIVERGED

**Location:** `AchievementsPanel.tsx`
**GDD reference:** `systems/legends.md` § "UI requirements"
**Severity:** LOW
**Effort:** M
**VII says:** 3 Legends UI surfaces: Legend Progress Panel, Challenges Log Panel, Level-up notification. All main-menu context, not in-game.
**Engine does:** `AchievementsPanel` is in-game `overlay`. Flat earned/locked cards, no XP bars, no level indicators.
**Gap:** Wrong UI split.
**Recommendation:** Retain `AchievementsPanel` for intra-session. Build separate `LegendsPanel` after AccountState scaffolding.

---

## Extras to retire

None. `achievementSystem.ts` extension, not retirement.

---

## Missing items

1. `AccountState` type + persistence adapter (F-01) — root blocker.
2. Foundation level + XP + level-up dispatch (F-02).
3. Per-leader level + XP (F-03).
4. Challenge category + XP schema (F-04).
5. Attribute Node + Legacy Card unlock dispatch (F-05).
6. `legendsSystem.ts` cross-session system (F-07).
7. `LegendsPanel` UI (F-08).

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/legends.md` § "Mapping to hex-empires":

**Engine files:**
- Currently: `systems/achievementSystem.ts` (intra-session analog — keep as-is).
- Related: `data/achievements/index.ts`, `web/src/ui/panels/AchievementsPanel.tsx`.
- To add: `types/AccountState.ts`, `systems/legendsSystem.ts`, UI `LegendsPanel.tsx`.

**Status:** 0 MATCH / 1 CLOSE / 2 DIVERGED / 5 MISSING / 0 EXTRA

**Highest-severity finding:** F-01 — `AccountState` persistence layer entirely absent (cross-cut `mementos.md` F-04).

---

## Open questions

1. Persistence implementation — engine owns type + delta computation; host app owns storage?
2. Challenge authoring — 265 Foundation + 1,425 Leader = 1,690 total; multi-pass content effort.

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-06 | 0.25d |
| M | F-02, F-03, F-04, F-05, F-07, F-08 | ~18d |
| L | F-01 | 1w+ |
| **Total** | 8 | **~3-4 weeks** |

Recommended order: F-01 (AccountState) → F-04 (schema) → F-02 (Foundation) → F-03 (Leader) → F-07 (legendsSystem) → F-05 (dispatch) → F-08 (UI) → F-06 (ALL_X fix — anytime).

---

<!-- END OF AUDIT -->
