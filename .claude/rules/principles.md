---
purpose: Index of cross-cutting principles mapped to the canonical rule doc that applies each one. Keeps principle names in one place; details in the specific rule docs.
layer: rule
injected-at: session-start, subagent-start
consumed-by: implementer, reviewer, fixer
last-validated: 2026-04-17
---

# Principles — Index

This doc is an INDEX, not a restatement. For the specifics of each principle read the cited rule doc. Keep this list short; expand the rule docs when a pattern accumulates.

Per integrator-agent review during WF-AUTO-14: a separate abstract principles doc would triple-cover what existing rules already embed. Instead, this file names the principles once, points to their canonical homes, and lists a `trap registry` (the "named traps" — drift patterns we've seen at least twice that deserve a stable name).

---

## Named principles

| Principle | Short form | Canonical rule doc |
|-----------|-----------|--------------------|
| **Single Source of Truth (SSOT)** | Every fact has exactly one authoritative location; consumers derive. | `architecture.md` § "GameState is the Single Source of Truth"; `data-driven.md` § "Registry Pattern"; `ui-overlays.md` § HUDManager ownership |
| **Derivable not stored** | If you can compute it from already-stored state, don't also store it. | `ui-overlays.md` anti-pattern "Hold overlay visibility in `useState<boolean>`"; `panels.md` anti-pattern "local useState for panel visibility" |
| **Orthogonality** | Systems / modules don't import each other; they communicate via shared state or pure utilities. | `architecture.md` § "Systems cannot import from each other"; `import-boundaries.md` |
| **Layering (locality + direction)** | Data → types → state → systems → engine root. Web: engine → providers → canvas + ui. Import direction is one-way. | `import-boundaries.md` (authoritative); `architecture.md` § Engine/renderer separation |
| **Data-driven over hard-coded** | Game content is data files with typed interfaces. Zero code changes to add content. | `data-driven.md` (authoritative) |
| **Explicit over implicit** | No magic. Discriminated unions with explicit `type`. No default exports. No silent-failure paths. | `tech-conventions.md` § TypeScript idioms |
| **Immutable state** | State is never mutated in place; systems return new objects. | `architecture.md` § "GameState is Immutable"; `engine-patterns.md` § Immutable state updates |
| **Determinism** | Same seed → same draws → same game. `Math.random()` forbidden in engine. | `engine-patterns.md` § Seeded RNG; `tech-conventions.md` § Determinism |
| **Concrete assertions** | Tests assert exact values, not shape-only (`.toBeDefined()`, `.toBeTruthy()`). | `testing.md` § Concrete assertions |
| **Token-only chrome** | UI chrome values come from CSS custom properties (`var(--panel-*)`, `var(--hud-*)`). Raw hex in chrome is a BLOCK. | `panels.md` § Styling; `ui-overlays.md` § Styling |

---

## Trap registry

Drift patterns that have appeared at least twice in practice and earned a stable short-name. When Reviewer finds one, cite the trap name; when Fixer addresses one, reference the name in the commit message so future Reviewer runs can grep the history.

| Trap | Principle violated | Where seen | Canonical anti-pattern |
|------|-------------------|------------|-----------------------|
| **UI-useState-visibility** | Derivable not stored | `ValidationFeedback.tsx` pre-UI-C-VF1; `IdleUnitsToast.tsx` pre-UI-C-VF1 | Holding local `useState<boolean>` for "is overlay visible" when `HUDManager.isActive()` already knows. See `ui-overlays.md` anti-pattern table. |
| **registry-doc-desync** | SSOT | `hud-elements.md` pre-c6155628; pre-existing `yieldsToggle` gap | Adding to `hudRegistry.ts` without updating `hud-elements.md`. Now guarded by `hud-registry-sync.test.ts`. |
| **var-hex-alpha-interpolation** | Token-only chrome + derivable | `PanelButton` pre-1f1150e | Template literal `${color}cc` / `${color}80` on a value that's `var(--x)` at runtime becomes invalid CSS. Fix: `color-mix(in srgb, ${color} N%, transparent)`. |
| **chrome-raw-hex-regression** | Token-only chrome | Multiple commits during SYS-D-12 refactor | "Clean" refactor introduces fresh raw hex (`#30363d`, `#1a1f29`) next to tokenized values. Fix: finish the tokenization in the same commit; don't leave siblings behind. |
| **orphan-TODO-stale** | Explicit over implicit | `TopBar.tsx` pre-0a168ce | Adding a `TODO(SYS-D-N)` comment in the same commit that closes SYS-D-N. Self-inconsistent from the first second it lands. Remove the TODO before commit. |
| **head-moved-fixer** | Locality (don't touch files other sessions are editing) | WF-AUTO-2b observation | Background Fixer editing files the active user session changed. Mitigated by HEAD-MOVED check in `fixer-prompt.md`. |
| **worktree-shared-checkout** | Isolation | WF-AUTO-2b pre-ba6f9f6 | Fixer using `git checkout` on the main repo's working tree instead of `git worktree add` into an isolated path. Pulls files out from under active session. |
| **ALL_X-import-in-system** | SSOT | pre-audit era | System file importing `ALL_UNITS` / `ALL_CIVILIZATIONS` directly from `../data/` instead of reading from `state.config.X`. Breaks the test injection seam. |

---

## How to use this doc

- **Implementer:** read the index before touching unfamiliar code; the canonical rule doc has the details.
- **Reviewer:** when a finding matches a named trap, cite the trap name in the `message:` field (not just the rule). Names make patterns visible across reports.
- **Fixer:** when addressing a finding, reference the trap name in the commit message body.
- **Living updates:** when a review finds a new recurring pattern, the orchestrator appends a `[PRINCIPLE-GAP]` entry to `.claude/workflow/issues.md` with a proposed trap name. A human (or the audit-workflow skill) promotes mature gaps into this registry.

---

## What this doc is NOT

- Not a restatement of the rule docs — the index column points you there.
- Not exhaustive — only patterns that have accumulated enough weight to earn a name.
- Not stable — traps can be retired when the underlying risk is eliminated (e.g. when a Tier-4 lint-as-test makes a trap mechanically impossible).
