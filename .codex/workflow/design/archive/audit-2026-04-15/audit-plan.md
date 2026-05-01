# Codebase Audit — Migration Plan

Synthesized from 10 parallel Phase-2 audit reports. Ordered by severity; each batch runs as parallel Sonnet subagents with disjoint file sets.

## Severity triage

### Correctness bugs (real runtime impact)
1. **Content ID graph broken — 46 dangling refs**
   - 16 civs reference non-existent `uniqueUnit`
   - 14 civs reference non-existent `uniqueBuilding`
   - 7 districts require non-existent civics
   - 2 districts require non-existent techs
   - 6 civic unlocks reference non-existent governments
   - WonderPlacementRule for `machu_picchu` with no BuildingDef
2. **4 ID collisions** — `market`, `workshop`, `barracks`, `military_science` each appear in two barrel exports → `ALL_*` has duplicates → `state.config.X.get(id)` returns wrong record.
3. **Audio silently broken** — `SoundGenerator` method names don't match `AudioManager` call sites (`playClick` vs `click`) + `SoundGenerator` creates a second `AudioContext` (leak).
4. **Non-determinism** — `Math.random()` in `CombatPreview.ts:339-340` (combat odds) and `AnimationRenderer.ts:173-174` (shake effect). Breaks seeded replays.

### Architecture violations
5. **4 systems bypass GameConfig**: `aiSystem`, `governmentSystem`, `improvementSystem`, `religionSystem` import `ALL_*` globals instead of using `state.config.X`. Root cause: `improvements`, `pantheons`, `governments`, `policies` maps missing from `GameConfig` type.
6. **Layering inversion** — `state/BuildingPlacementValidator.ts` and `state/ResourceChangeCalculator.ts` import from `systems/` (forbidden direction).
7. **Cross-boundary imports** — `GameCanvas.tsx` imports from `ui/`; `GameProvider.tsx` imports from `canvas/`. Both violate `packages/web` internal boundaries.
8. **Data purity violation** — `wonders/placement-rules.ts` imports `HexMath` runtime functions, has predicate logic. Should live in `hex/` or `state/`.
9. **Duplicate Alt tracking** — `GameProvider` has its own Alt keydown listener; `useAltKey` hook exists. Provider hasn't migrated.

### Code quality
10. **`any` types** — 8 instances across `districtSystem.ts` + `aiSystem.ts`.
11. **CrisisPanel bypasses PanelManager** — always-mounted, self-gated via engine state, registry entry orphan.
12. **HUD sticky overlays not registered with HUDManager** — `CombatHoverPreview`, `TurnTransition`, `ValidationFeedback` use `<TooltipShell sticky>` but don't `register()` → ESC doesn't dismiss them via the manager (known skip in `hud.spec.ts`).
13. **Hardcoded keyboard shortcuts** — App.tsx keydown handler has shortcut letters baked in; `PANEL_REGISTRY.keyboardShortcut` exists but isn't sourced.
14. **Vague test assertions** — `AnimationManager.test.ts` has 8 `toBeDefined()` on pixel coordinates; ~20 similar across engine tests.

### Docs stale
15. **CLAUDE.md** shows 24-system pipeline (actually 29); HUD section still says "planned — audit phase"; GameAction union missing 6 new M5-M19 actions.
16. **`add-hud-element/SKILL.md`** documents a fictional `HUDRegistryEntry` shape (fields that don't exist).
17. **`add-panel/SKILL.md`** mentions legacy `setActivePanel('none')` pattern.
18. **`check-edited-file.sh` hook** — cross-system regex missing 6 new systems.
19. **Stale workflow/design/ docs** — several "planned" docs for shipped features.

### Build/config debt
20. **`__tests__` excluded from tsc** — type errors in tests surface only at Vitest runtime.
21. **`noUncheckedIndexedAccess` off** — array-indexed access masks bounds issues.
22. **`test:e2e` not in `npm test`** — E2E never runs by default.
23. **Hook system list hardcoded** — unprotected against new systems.

## Batch plan (parallel execution, cherry-pick between batches)

### Batch 1 — Correctness (4 parallel agents)
- **1A — Content graph repair**: remove dangling `uniqueUnit` / `uniqueBuilding` / `requiredCivic` / `requiredTech` / `unlocks` refs from civs, districts, civics where the target doesn't exist. Leave TODOs on the civ entries for future content creation. Zero runtime breakage target.
- **1B — ID collision resolution**: rename exploration-age `market`, `workshop`, `barracks` → `market_exp`, `workshop_exp`, `barracks_exp` (or pick suffix); rename modern `military_science` → `military_science_modern`. Update all references.
- **1C — Audio fix**: align `SoundGenerator` method names with `AudioManager` call sites; fix `AudioContext` leak by using the passed-in context.
- **1D — Seeded RNG**: replace `Math.random()` in `CombatPreview.ts` + `AnimationRenderer.ts` with seeded RNG from engine state.

### Batch 2 — Architecture (5 parallel agents)
- **2A — GameConfig extension**: add `improvements`, `pantheons`, `governments`, `policies` maps to `GameConfig`; populate in `GameConfigFactory`; migrate 4 systems to `state.config.X`.
- **2B — Layering fix**: move `BuildingPlacementValidator` + `ResourceChangeCalculator` cross-system imports out (shared util or redesign).
- **2C — Canvas↔UI boundary**: remove `CombatHoverPreview` import from `GameCanvas` (lift to App.tsx); stop `GameCanvas` using `usePanelManager` directly (use callback prop or engine state).
- **2D — Provider→canvas boundary**: untangle `AnimationManager` dependency from `GameProvider` (invert the dep or move AM into canvas-only).
- **2E — Data purity**: move `wonders/placement-rules.ts` logic to `hex/` or `state/`, keep data rules table pure.

### Batch 3 — Code quality + UI integration (5 parallel agents)
- **3A — Kill `any`**: fix 8 `any` types in districtSystem + aiSystem with concrete types.
- **3B — CrisisPanel via PanelManager**: conditional render from App.tsx, drop always-mounted.
- **3C — HUD stickies register**: `CombatHoverPreview` / `TurnTransition` / `ValidationFeedback` call `register()` so ESC works through the manager; un-skip the Playwright test.
- **3D — Consolidate Alt tracking**: GameProvider uses `useAltKey` hook; delete its own listener.
- **3E — Registry-driven shortcuts**: App.tsx keydown sources letters from `PANEL_REGISTRY.keyboardShortcut`.

### Batch 4 — Tests + tsconfig (3 parallel agents)
- **4A — Concrete assertions**: fix AnimationManager.test.ts pixel asserts + sample of engine tests (cap at ~15 highest-value swaps).
- **4B — Add L2 integration tests**: 2-3 multi-system pipeline tests (combat→promotion, research→age-transition).
- **4C — tsconfig hardening**: un-exclude `__tests__` from `tsc`, add `noUncheckedIndexedAccess`, add `test:e2e` to root `npm test`.

### Batch 5 — Docs + meta (3 parallel agents)
- **5A — CLAUDE.md**: update to 29 systems + new GameAction members + drop "planned" from HUD section.
- **5B — Skills fix**: repair `add-hud-element/SKILL.md` schema; fix `add-panel/SKILL.md` legacy ref; update `consistency-audit` skill broken reference.
- **5C — Hook update**: add new system names to `check-edited-file.sh` regex; archive stale design docs.

### Batch 6 — Notification UX redesign (1 agent, maybe 2)
- **6A — Right-click dismiss + dismiss-all button**: in Notifications.tsx.
- **6B — Engine `blocksTurn` flag on critical events**: barbarian incursion, crisis trigger, war declaration, surrender; filter low-value events (tech progress, "citizen born").

## Execution order

Batches must land sequentially (each batch depends on the previous or has overlapping files):
1. Batch 1 → cherry-pick → push → verify.
2. Batch 2 → …
3. …
4. Batch 6 (last).
5. Phase 5 gap sweep.

Within each batch, agents work in isolated worktrees; I cherry-pick + resolve conflicts.

## Out of scope for this pass
- Creating 30 new units/buildings for the broken uniqueUnit refs — that's content work, not pattern work. Batch 1A just removes the dangling refs; a future content cycle creates them.
- Full AI rewrite to use new action types (governments, religion, commanders). Noted as a known gap in audit-status.md.
- `skipLibCheck: true` keep — removing it is risky + out of scope.
