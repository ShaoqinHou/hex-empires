# Engine File Map — GDD System → hex-empires Code

**Purpose.** Single-source-of-truth mapping from each of 26 GDD systems to the engine + UI files that audit agents should read. Built from a filesystem survey on 2026-04-19.

**Usage.** Audit agents are given the row for their system. They read the listed files and cross-reference against their GDD doc. The mapping prevents each agent from doing its own file discovery (slow + error-prone).

**Completeness.** Every file listed under "Orphan engine files" has no GDD match and needs an explicit audit call (legacy retirement, utility mapping, or missing GDD coverage).

---

## GDD System → Engine Files (26 rows)

Legend: 🔵 primary | 🟢 state util | 🟡 data | 🔴 UI panel

### Structural systems (ages layer)

| GDD system | Engine files |
|---|---|
| **ages** | 🔵 `packages/engine/src/systems/ageSystem.ts` · 🟢 `state/LegacyPaths.ts` · 🟢 `state/MilestoneTracker.ts` · 🔴 `ui/panels/AgeTransitionPanel.tsx` |
| **legacy-paths** | 🟢 `state/LegacyPaths.ts` · 🟢 `state/MilestoneTracker.ts` · 🔵 `systems/victorySystem.ts` |
| **crises** | 🔵 `systems/crisisSystem.ts` · 🟡 `data/crises/` · 🔴 `ui/panels/CrisisPanel.tsx` |
| **leaders** | 🟡 `data/leaders/` · 🟢 `state/GameInitializer.ts` · 🟢 `state/GameConfigFactory.ts` |
| **civilizations** | 🟡 `data/civilizations/` · 🟢 `state/GameConfigFactory.ts` · 🟢 `state/GameInitializer.ts` |
| **mementos** | _(no dedicated engine file; audit should flag as MISSING. Related: `systems/achievementSystem.ts` as the only meta-progression hook)_ |

### Empire management

| GDD system | Engine files |
|---|---|
| **settlements** | 🔵 `systems/citySystem.ts` · 🔵 `systems/productionSystem.ts` · 🔴 `ui/panels/CityPanel.tsx` · 🔴 `ui/panels/TurnSummaryPanel.tsx` |
| **tile-improvements** | 🔵 `systems/improvementSystem.ts` · 🔵 `systems/districtSystem.ts` · 🟡 `data/improvements/` · 🟢 `state/UrbanPlacementHints.ts` · 🔴 `ui/panels/ImprovementPanel.tsx` |
| **buildings-wonders** | 🔵 `systems/buildingPlacementSystem.ts` · 🔵 `systems/urbanBuildingSystem.ts` · 🔵 `systems/wonderPlacementSystem.ts` · 🟢 `state/BuildingPlacementValidator.ts` · 🟢 `state/WonderPlacement.ts` · 🟢 `state/WonderPlacementUtils.ts` · 🟡 `data/buildings/` · 🟡 `data/wonders/` |
| **population-specialists** | 🔵 `systems/growthSystem.ts` · 🔵 `systems/specialistSystem.ts` · 🟢 `state/GrowthUtils.ts` · 🟢 `state/HappinessUtils.ts` |
| **resources** | 🔵 `systems/resourceSystem.ts` · 🔵 `systems/resourceAssignmentSystem.ts` · 🟡 `data/resources/` · 🟢 `state/ResourceChangeCalculator.ts` |
| **yields-adjacency** | 🟢 `state/CityYieldsWithAdjacency.ts` · 🟢 `state/DistrictAdjacency.ts` · 🟢 `state/YieldCalculator.ts` · 🟢 `state/EconomyAnalytics.ts` |
| **celebrations** | 🟢 `state/HappinessUtils.ts` _(no dedicated system; audit should flag as MISSING)_ |
| **trade-routes** | 🔵 `systems/tradeSystem.ts` · 🔴 `ui/panels/TradeRoutesPanel.tsx` |

### Military

| GDD system | Engine files |
|---|---|
| **combat** | 🔵 `systems/combatSystem.ts` · 🔵 `systems/fortifySystem.ts` · 🔵 `systems/movementSystem.ts` · 🔵 `systems/promotionSystem.ts` · 🟢 `state/CombatAnalytics.ts` · 🟢 `state/CombatPreview.ts` · 🟢 `state/PromotionUtils.ts` |
| **commanders** | 🔵 `systems/commanderPromotionSystem.ts` · 🟡 `data/commanders/` · 🔴 `ui/panels/CommanderPanel.tsx` |

### Political / diplomatic

| GDD system | Engine files |
|---|---|
| **diplomacy-influence** | 🔵 `systems/diplomacySystem.ts` · 🔴 `ui/panels/DiplomacyPanel.tsx` |
| **independent-powers** | _(no dedicated system; likely folded into `diplomacySystem.ts`. Audit should flag as MISSING-DEDICATED or extract boundary from diplomacy system.)_ |
| **government-policies** | 🔵 `systems/governmentSystem.ts` · 🟡 `data/governments/` · 🔴 `ui/panels/GovernmentPanel.tsx` |
| **religion** | 🔵 `systems/religionSystem.ts` · 🟡 `data/religion/` · 🔴 `ui/panels/ReligionPanel.tsx` |

### Research

| GDD system | Engine files |
|---|---|
| **tech-tree** | 🔵 `systems/researchSystem.ts` · 🟡 `data/technologies/` · 🔴 `ui/panels/TechTreePanel.tsx` · 🔴 `ui/panels/TreeView.tsx` |
| **civic-tree** | 🔵 `systems/civicSystem.ts` · 🟡 `data/civics/` · 🔴 `ui/panels/CivicTreePanel.tsx` · 🔴 `ui/panels/TreeView.tsx` |

### Narrative + victory

| GDD system | Engine files |
|---|---|
| **narrative-events** | 🔵 `systems/narrativeEventSystem.ts` · 🔵 `systems/discoverySystem.ts` · 🟢 `state/narrativeEventUtils.ts` · 🟡 `data/narrative-events/` · 🟡 `data/discoveries/` · 🔴 `ui/panels/NarrativeEventPanel.tsx` |
| **victory-paths** | 🔵 `systems/victorySystem.ts` · 🔴 `ui/panels/VictoryPanel.tsx` · 🔴 `ui/panels/VictoryProgressPanel.tsx` |
| **legends** | 🔵 `systems/achievementSystem.ts` _(legacy / related; VII Legends would supersede. Audit recommendation: retire achievementSystem OR refactor.)_ · 🔴 `ui/panels/AchievementsPanel.tsx` |

### Map

| GDD system | Engine files |
|---|---|
| **map-terrain** | 🔵 `systems/visibilitySystem.ts` · 🟡 `data/terrains/` · 🟡 `data/districts/` · 🟢 `state/TileContents.ts` · 🟢 `state/MapAnalytics.ts` |

---

## Orphan engine files (no GDD match)

These need an explicit "orphan audit" pass to classify as legacy/retire/repurpose or cross-system shared utility. One orphan-audit per cluster, not 26:

| Engine file | Suspected class | Notes |
|---|---|---|
| `systems/aiSystem.ts` | AI implementation | Not a Civ VII mechanic; engine-specific. Audit as architectural (does it make VII-consistent decisions?) |
| `systems/governorSystem.ts` + `data/governors/` + `ui/panels/GovernorPanel.tsx` | LEGACY | VII removed governors. Retire OR refactor into Town Focus specializations. |
| `systems/effectSystem.ts` | Shared utility | EffectDef dispatch; internal. Quick audit for VII effect types coverage. |
| `systems/turnSystem.ts` | Meta | Turn loop + system orchestration. Audit as architectural. |
| `systems/productionSystem.ts` | Shared | Used by cities + buildings + units. Audit as shared utility. |
| `state/AllUnitsActed.ts` | UX utility | End-turn convenience. Probably fine. |
| `state/SaveLoad.ts` | Meta | Serialization. Not a VII mechanic; audit for completeness. |
| `state/SeededRng.ts` | Meta | Determinism. Already canonical per engine-patterns.md. |
| `ui/panels/AudioSettingsPanel.tsx`, `DramaModal.tsx`, `EventLogPanel.tsx`, `HelpPanel.tsx`, `SetupScreen.tsx`, `TreeView.tsx` | UX | Not mechanics; no audit needed unless they encode divergent rules. |

---

## Audit scope per agent

**Each audit agent reads:**

1. Its row's GDD system doc: `.codex/gdd/systems/<slug>.md`
2. All files in its row above (typically 2–6 files, max ~10 for combat)
3. Any cross-referenced GDD docs the system links to (e.g. ages links to legacy-paths)

**Each audit agent does NOT read:**

- Other systems' engine files (cross-system concerns are noted, not audited)
- Tests (audits are about production code shape)
- Content fact cards under `.codex/gdd/content/<cat>/<slug>.md` (except `_overview.md` when mechanic references counts) — fact cards are VII data, not engine logic
- Node modules or build artifacts

---

## Expected audit sizes

Based on file counts:

| Bucket | System count | Typical audit size |
|---|---|---|
| Small (1–2 files) | mementos, celebrations, independent-powers | 100–200 lines — mostly MISSING findings |
| Medium (2–4 files) | ages, crises, legacy-paths, trade-routes, commanders, diplomacy-influence, religion, tech-tree, civic-tree, victory-paths, legends, map-terrain, leaders, civilizations, yields-adjacency, resources, population-specialists | 300–500 lines |
| Large (5+ files) | combat, buildings-wonders, settlements, narrative-events, tile-improvements | 500–800 lines |

Total audit output: **~10,000 lines** across 26 files. Lives on disk; doesn't hit parent context with strict-brief discipline.

---

## Update policy

If engine structure changes (new file, renamed file, deleted file), update this map before running any new audits. This map is the authoritative source — agents trust it.

Re-run the filesystem survey at the top of this doc when updating:

```bash
ls packages/engine/src/systems/*.ts | grep -v __tests__
ls packages/engine/src/state/*.ts | grep -v __tests__
ls packages/engine/src/data/
ls packages/web/src/ui/panels/*.tsx
```
