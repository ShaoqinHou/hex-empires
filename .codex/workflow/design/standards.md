# Standards Registry

Last generated: 2026-04-15

Source of truth for audit agents. Each standard includes a Detection recipe usable with Grep.

---

## S-ENGINE-PURE
Source: .codex/rules/architecture.md, .codex/rules/tech-conventions.md, .codex/rules/import-boundaries.md, AGENTS.md
Rule: packages/engine/ has ZERO DOM, Canvas, React, or browser dependencies. Must run in Node, Web Worker, or test harness with no DOM environment.
Detection: grep pattern react|@web/|packages/web|document[.][A-Za-z]|window[.][A-Za-z]|[Cc]anvas|requestAnimationFrame inside packages/engine/src/ (excluding __tests__).
Severity: critical (checked via .codex/hooks/check-edited-file.sh and lead review)

---

## S-SYSTEM-INDEPENDENT
Source: .codex/rules/architecture.md, .codex/rules/import-boundaries.md
Rule: Files in systems/ CANNOT import from each other. Shared logic must live in hex/, state/, or effects/. Systems process only actions they care about and return state unchanged for all others.
Detection: grep from.*[.]/[A-Za-z]*System inside packages/engine/src/systems/*.ts (excluding __tests__ and index.ts).
Severity: critical (hook enforced)

---

## S-DATA-PURE
Source: .codex/rules/architecture.md, .codex/rules/data-driven.md, .codex/rules/import-boundaries.md
Rule: Files in packages/engine/src/data/ are pure data exports. No game logic (exception: victory condition check functions are (state, playerId) => result). Only import from ../../types/ for type definitions. Cannot import from systems/, state/, or other data/ categories.
Detection: grep from.*systems/|from.*GameEngine|from.*effects/Effect inside packages/engine/src/data/ (excluding __tests__ and index.ts barrels).
Severity: critical (hook enforced)

---

## S-REGISTRY-PATTERN
Source: .codex/rules/architecture.md, .codex/rules/data-driven.md
Rule: All game content is registered in typed registries at startup. Systems and UI query registries via state.config.* or Registry<T> -- never hardcode content references. Generic Registry<T> in packages/engine/src/registry/Registry.ts. GameConfig embeds ReadonlyMap<string, T> per content type. Adding content = new data file + barrel export update only (2-edit rule).
Detection: grep for global content arrays accessed directly inside systems (e.g. ALL_UNITS.find) instead of state.config.units.get.
Severity: high

---

## S-GAMESTATE-IMMUTABLE
Source: .codex/rules/architecture.md, .codex/rules/tech-conventions.md, AGENTS.md
Rule: GameState is the single source of truth. State is NEVER mutated -- systems return new state objects. All state properties must be readonly. Use ReadonlyMap, ReadonlyArray, readonly fields.
Detection: grep [.]push[(]|[.]delete[(] inside packages/engine/src/systems/*.ts. Also grep for non-readonly Map< and Array< in packages/engine/src/types/GameState.ts.
Severity: critical

---

## S-SEEDED-RNG
Source: .codex/rules/architecture.md, .codex/rules/tech-conventions.md, .codex/rules/testing.md
Rule: ALL randomness in engine systems must use SeededRng (nextRandom, randomInt, shuffle from packages/engine/src/state/SeededRng.ts). Math.random() is forbidden in engine code and tests.
Detection: grep Math[.]random[(] inside packages/engine/src/ (excluding __tests__). For tests: grep Math[.]random[(] inside __tests__ directories.
Severity: critical

---

## S-PANEL-PATTERN
Source: .codex/rules/panels.md, AGENTS.md
Rule: Every UI panel must: (1) register in panelRegistry.ts before any other code; (2) wrap body in <PanelShell>; (3) open/close through usePanelManager() only -- no local useState<boolean> for visibility; (4) use only var(--panel-*) CSS tokens for chrome; (5) not implement its own ESC handler. TopBar triggers get data-panel-trigger attribute. Priority classes: modal (blocks map, has backdrop), overlay (floats, non-blocking), info (non-blocking side column).
Detection:
  - grep useState.*false for visibility state in packages/web/src/ui/panels/*.tsx
  - grep addEventListener.*keydown in individual panel files (per-panel ESC)
  - grep #[0-9a-fA-F] inside packages/web/src/ui/panels/*.tsx (raw hex colors)
  - grep bg-slate-|bg-amber-|bg-red- in panel files (Tailwind color utilities in chrome)
Severity: high

---

## S-HUD-PATTERN
Source: .codex/rules/ui-overlays.md, AGENTS.md
Rule: HUD/overlay elements (tooltips, toasts, validation feedback, turn transitions, minimap, hint badges) must: (1) register in hudRegistry.ts; (2) use TooltipShell for tooltip-shaped overlays (no ad-hoc position:absolute with magic numbers); (3) coordinate through HUDManager for dismiss/stack-cycle; (4) use only var(--panel-*) and var(--hud-*) CSS tokens; (5) not implement per-overlay ESC handlers; (6) not steal keyboard focus; (7) not occlude hovered tile beyond ~30%.
Detection:
  - grep position.*absolute.*top.*[0-9] in HUD component files (magic-number positioning)
  - grep useState.*false for visibility in overlay components
  - grep #[0-9a-fA-F] inside packages/web/src/ui/hud/*.tsx
  - grep tabIndex={0} inside non-interactive overlay components (focus stealing)
Severity: high

---

## S-IMPORT-BOUNDARIES
Source: .codex/rules/import-boundaries.md, AGENTS.md
Rule: Strict import directions: engine/ cannot import from web/; canvas/ cannot import from ui/; ui/ cannot import from canvas/. Data files only import from types/. Systems import from types/, hex/, state/, registry/, effects/. Import aliases: @engine/* -> packages/engine/src/*, @web/* -> packages/web/src/*, @hex/engine -> packages/engine/src/index.ts.
Detection: See .codex/hooks/check-edited-file.sh for full enforcement script.
Severity: critical (hook enforced)

---

## S-NAMED-EXPORTS
Source: .codex/rules/tech-conventions.md
Rule: Named exports only. No default exports anywhere in the codebase.
Detection: grep ^export default  inside packages/engine/src/**/*.ts and packages/web/src/**/*.tsx.
Severity: high

---

## S-NO-ANY
Source: .codex/rules/tech-conventions.md
Rule: TypeScript strict mode, no any -- use unknown + type narrowing. tsconfig.json has strict: true. Exception: files with @ts-nocheck (e.g. AudioManager.ts).
Detection: grep pattern : any|as any inside packages/engine/src/ and packages/web/src/ (excluding @ts-nocheck files).
Severity: high

---

## S-READONLY
Source: .codex/rules/tech-conventions.md, .codex/rules/architecture.md
Rule: Use readonly for all state properties: ReadonlyMap, ReadonlyArray, readonly fields. Use as const for literal arrays and objects in data files.
Detection: grep non-readonly Map< and Array< inside packages/engine/src/types/*.ts.
Severity: high

---

## S-ESM-ONLY
Source: .codex/rules/tech-conventions.md
Rule: ESM only -- import/export, no require(). Both packages have type: module in package.json.
Detection: grep require[(] inside packages/engine/src/ and packages/web/src/.
Severity: high

---

## S-DISCRIMINATED-UNIONS
Source: .codex/rules/tech-conventions.md, AGENTS.md
Rule: Use discriminated unions for actions and effects (not class hierarchies). GameAction is a discriminated union on type. EffectDef is a discriminated union on type.
Detection: grep class.*Action|class.*Effect inside packages/engine/src/.
Severity: medium

---

## S-TESTS-L1
Source: .codex/rules/testing.md, .codex/workflow/e2e-standards.md
Rule: Layer 1 (Unit) tests: test pure system functions with concrete game states and concrete assertions. Required for any change to a system, hex math, pathfinding, or state utility. Located in packages/engine/src/systems/__tests__/{System}.test.ts and packages/engine/src/hex/__tests__/.
Detection: Verify every system file in systems/ has a corresponding __tests__/{Name}.test.ts.
Severity: high

---

## S-TESTS-L2
Source: .codex/rules/testing.md, .codex/workflow/e2e-standards.md
Rule: Layer 2 (Integration) tests: multi-system pipeline testing via applyAction. Required for cross-system features. Located in packages/engine/src/__tests__/.
Detection: Verify packages/engine/src/__tests__/integration-*.test.ts exists for cross-system features.
Severity: medium

---

## S-TESTS-L3
Source: .codex/rules/testing.md, .codex/workflow/e2e-standards.md
Rule: Layer 3 (Behavioral/Browser) tests: Playwright E2E. Required for new UI panels, canvas interactions, game flow. Located in packages/web/e2e/*.spec.ts.
Detection: Verify new UI surfaces have corresponding spec files in packages/web/e2e/.
Severity: medium

---

## S-TESTS-L4
Source: .codex/rules/testing.md, .codex/workflow/e2e-standards.md
Rule: Layer 4 (Output Verification): serialization/deserialization round-trip tests. Required for save/load, replay, AI decision output.
Detection: Verify packages/engine/src/state/__tests__/SaveLoad*.test.ts covers state round-trips without data loss.
Severity: medium

---

## S-CONCRETE-ASSERTIONS
Source: .codex/rules/testing.md
Rule: Tests use concrete assertions: expect(pos).toEqual({ q: 3, r: -1 }) not expect(pos).toBeDefined(). expect(gold).toBe(150) not expect(gold).toBeGreaterThan(0). Assert both changed AND unchanged state parts.
Detection: grep toBeDefined[(][)]|toBeGreaterThan[(]0[)]|toBeTruthy[(][)] inside **/__tests__/*.ts (review individually for vagueness).
Severity: high

---

## S-DETERMINISM
Source: .codex/rules/testing.md, .codex/rules/tech-conventions.md
Rule: Tests use seeded RNG, never Math.random(). Games must be deterministic and replayable.
Detection: grep Math[.]random[(][)] inside **/__tests__/*.ts and **/*.spec.ts.
Severity: critical

---

## S-NO-HARDCODE-COLORS
Source: .codex/rules/tech-conventions.md, .codex/rules/panels.md, .codex/rules/ui-overlays.md
Rule: Never hardcode colors -- use CSS token references (var(--panel-*), var(--hud-*), var(--color-*)). No raw hex in inline styles, no Tailwind color utilities for chrome (bg-slate-900, bg-amber-500/30), no lookup tables with raw hex strings.
Detection:
  - grep pattern #[0-9a-fA-F]{3,6} inside packages/web/src/**/*.tsx
  - grep bg-slate-|bg-amber-|bg-red-|text-red-|border-red- in panel/HUD component files for chrome usage
Severity: high

---

## S-GIT-CONVENTIONS
Source: .codex/rules/tech-conventions.md
Rule: Branch naming: feat/{system}-{description}, fix/{system}-{description}. Commit messages: imperative mood, reference system: feat(combat): add ranged attack resolution.
Detection: Review git branch names and commit messages for pattern conformance.
Severity: low

---

## S-WINDOWS-ENV
Source: .codex/rules/tech-conventions.md, AGENTS.md
Rule: Windows MINGW64 environment. Use python not python3. Use forward slashes in paths. Use node -e for JSON parsing (jq may not be available). Web server runs on port 5174 (not 5173). Set MSYS_NO_PATHCONV=1 when needed.
Detection: grep python3 inside .codex/hooks/*.sh, AGENTS.md, and .codex/rules/*.md.
Severity: medium

---

## S-NO-BOOLEAN-PANEL-STATE
Source: .codex/rules/panels.md
Rule: Do NOT hold useState<boolean> for panel visibility. Panel open/close owned exclusively by PanelManagerProvider. No props-drilled onOpenXxx callbacks through layout components.
Detection: grep useState.*false|useState.*boolean inside packages/web/src/ui/panels/*.tsx.
Severity: high

---

## S-ESC-OWNERSHIP-PANEL
Source: .codex/rules/panels.md
Rule: Exactly one ESC handler for panels in the entire web package, in PanelManagerProvider (capture phase). Ignores keypress when focus is in INPUT, TEXTAREA, or SELECT. No per-panel addEventListener keydown or useEffect ESC handlers.
Detection: grep addEventListener.*keydown|useEffect.*keydown.*Escape inside packages/web/src/ui/panels/*.tsx.
Severity: high

---

## S-ESC-OWNERSHIP-HUD
Source: .codex/rules/ui-overlays.md
Rule: ESC for HUD overlays owned by HUDManagerProvider in capture phase (after PanelManagerProvider). Per-overlay ESC handlers forbidden. Precedence: panel ESC -> sticky overlay ESC -> stack-cycle reset -> canvas deselect.
Detection: grep addEventListener.*keydown|useEffect.*keydown.*Escape inside packages/web/src/ui/hud/*.tsx and packages/web/src/ui/components/*.tsx.
Severity: high

---

## S-NO-RAW-HEX-CHROME
Source: .codex/rules/panels.md, .codex/rules/ui-overlays.md
Rule: Panel and HUD chrome must use var(--panel-*) or var(--hud-*) tokens only. Never raw hex values in chrome surfaces. Never Tailwind color classes for chrome.
Detection: grep pattern #[0-9a-fA-F]{3,6} inside panel and HUD component files. Also grep STATUS_COLORS.*=.*{.*# (raw hex lookup tables).
Severity: high

---

## S-ADD-CONTENT-2-EDIT
Source: .codex/rules/data-driven.md, AGENTS.md
Rule: Adding a new content item requires exactly 2 edits: (1) create entry in the appropriate age data file; (2) add to barrel export ALL_{TYPE} in {type}/index.ts. Zero changes to engine systems, rendering, or UI.
Detection: PRs adding content that touch system files or UI components should be flagged for review.
Severity: high

---

## S-HUD-REGISTRATION
Source: .codex/rules/ui-overlays.md, .codex/workflow/design/hud-elements.md
Rule: Every HUD element must: (1) add id to HUDElementId union in hudRegistry.ts; (2) add entry to HUD_REGISTRY with priority and optional timeout; (3) update .codex/workflow/design/hud-elements.md with a row entry.
Detection: Compare HUDElementId union in hudRegistry.ts with table in hud-elements.md. Grep for HUD id strings used in components but absent from the union.
Severity: high

---

## S-PANEL-REGISTRATION
Source: .codex/rules/panels.md
Rule: Every panel must: (1) add id to PanelId union in panelRegistry.ts; (2) add entry to PANEL_REGISTRY with title, priority, optional icon and keyboard shortcut; (3) wrap body in <PanelShell id={id}>. openPanel(newId) fails TypeScript compilation if id is not in the union.
Detection: grep for panel tsx files in ui/panels/ that do not have a corresponding entry in PANEL_REGISTRY.
Severity: high

---

## S-DATA-TRIGGER-ATTR
Source: .codex/rules/panels.md
Rule: TopBar buttons that open a panel must have data-panel-trigger attribute and call togglePanel from usePanelManager. Keyboard shortcuts are wired in App.tsx keydown handler sourced from PANEL_REGISTRY -- not hard-coded letters.
Detection: grep togglePanel|openPanel inside packages/web/src/ui/layout/TopBar.tsx and verify corresponding data-panel-trigger attribute is present.
Severity: medium

---

## S-GAME-FEEL-INVARIANTS
Source: .codex/rules/ui-overlays.md, AGENTS.md
Rule: No browser text selection on game surface (user-select: none on .game-app). No default right-click context menu in canvas/overlay regions. ESC dismisses transient overlays or resets stack-cycle. Overlays never steal keyboard focus. No autoscroll or viewport jumps. Cursor unchanged unless in drag-select or hot-zone.
Detection:
  - grep user-select.*text inside panel/HUD components (re-enabling selection)
  - grep tabIndex={0} inside non-interactive overlay components (focus stealing)
  - grep scrollIntoView inside HUD/overlay components (viewport jump)
Severity: high

---

## S-STACK-CYCLE
Source: .codex/rules/ui-overlays.md
Rule: When multiple entities occupy one hex, overlay must indicate cycle-ability (Tab/arrows) and render through HUDManager.cycleIndex. Never silently show only one entity. Never duplicate-render all entities simultaneously. M37-B regression test guards this in packages/web/e2e/.
Detection: grep for tile/entity tooltip rendering not consuming cycleIndex from HUDManager when anchor may have multiple entities.
Severity: high

---

## S-NO-OCCLUDE
Source: .codex/rules/ui-overlays.md
Rule: Overlays must not occlude the hovered entity beyond ~30% visible-tile area. TooltipShell auto-switches to fixed-corner when threshold exceeded. Every shell clamps final position to viewport bounds. No overlay may be partially off-screen.
Detection: grep for position=floating in TooltipShell usage for overlays with large content bodies without offset=auto.
Severity: medium

---

## S-CANVAS-THIN-VIEW
Source: .codex/rules/architecture.md, AGENTS.md
Rule: Canvas renderer is a thin, read-only view of engine state. NEVER mutates state. Animations are purely visual interpolations -- state is already updated before animation starts. canvas/ cannot import from ui/.
Detection: grep for direct state mutation inside packages/web/src/canvas/*.ts. Grep from.*ui/ inside canvas files.
Severity: critical

---

## S-SYSTEM-PURE-FUNCTION
Source: .codex/rules/architecture.md, .codex/rules/tech-conventions.md
Rule: Systems MUST be pure functions: (state: GameState, action: GameAction) => GameState. Same input always produces same output. No side effects (no DOM, no network, no Math.random). aiSystem is NOT in the pipeline -- it is (state) => GameAction[].
Detection: grep console[.]log|fetch[(]|axios|XMLHttpRequest|Math[.]random inside packages/engine/src/systems/*.ts.
Severity: critical

---

## S-REACT-FUNCTIONAL
Source: .codex/rules/tech-conventions.md
Rule: React 19, functional components only. No class components. No useEffect for game state -- use GameProvider dispatch pattern. Canvas rendering via requestAnimationFrame not React re-renders.
Detection: grep class.*extends.*Component|class.*extends.*PureComponent inside packages/web/src/.
Severity: medium

---

## S-PANEL-SHELL-CHROME
Source: .codex/rules/panels.md
Rule: PanelShell owns title bar, close button (x U+00D7 with aria-label and data-testid), backdrop (modal only), role=dialog, aria-label, z-index from --panel-z-* tokens, context-menu suppression, data-panel-id/priority/width attributes. Individual panels must NOT hand-roll any of those.
Detection: grep role=dialog or close-glyph variants inside individual panel tsx files other than PanelShell.tsx.
Severity: high

---

## S-TOOLTIP-SHELL-CHROME
Source: .codex/rules/ui-overlays.md
Rule: TooltipShell owns anchor-to-screen translation, user-select: none, context-menu suppression, aria-hidden on compact tier, data-hud-id/position/tier, pointer-events discipline. Individual overlays must NOT re-implement positioning or these attributes.
Detection: grep data-hud-id|aria-hidden|pointer-events.*none|onContextMenu.*prevent inside individual overlay files other than TooltipShell.tsx.
Severity: high

---

## S-EFFECT-DEF-DISCRIMINATED
Source: .codex/rules/data-driven.md, AGENTS.md
Rule: Abilities use composable EffectDef discriminated unions on type. New effect types require: (1) add variant to EffectDef union in types/GameState.ts; (2) add handling in effectSystem/EffectUtils.ts. Existing effect types can be freely composed in data files.
Detection: grep EffectDef usage in data files for effect type strings not in the union defined in types/GameState.ts.
Severity: high

---

## S-GAMECONFIG-EMBEDDED
Source: AGENTS.md, .codex/rules/architecture.md
Rule: Content is embedded in GameState.config as a GameConfig object with ReadonlyMap<string, T> fields per content type. Systems access content via state.config.* -- no global singletons. GameConfigFactory builds GameConfig at game initialization.
Detection: grep for global content arrays accessed directly inside systems (e.g. ALL_UNITS.find instead of state.config.units.get).
Severity: high
