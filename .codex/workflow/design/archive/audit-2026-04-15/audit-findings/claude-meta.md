# Claude Meta Audit — Findings

**Date:** 2026-04-15
**Scope:** `.codex/rules/*.md` (7), `.codex/skills/*/SKILL.md` (7), `.codex/hooks/*.sh` (6),
`.codex/workflow/*.md` + `.codex/workflow/design/*.md`, `.codex/settings*.json`,
root `CLAUDE.md`, `packages/engine/CLAUDE.md`, `packages/web/CLAUDE.md`

**Package-level CLAUDE.md:** Both `packages/engine/CLAUDE.md` and `packages/web/CLAUDE.md` are
MISSING from the tree. The root CLAUDE.md covers both packages sufficiently, but if Claude Code is
ever opened inside a package subdirectory there is no guidance there. Low-priority gap; note for
completeness.

---

## Classification key

- **A — Stale / wrong** (doc says X but reality is Y; will mislead a contributor)
- **B — Inconsistent** (two docs contradict each other)
- **C — Minor gap** (correct but incomplete; low mislead risk)

---

## Findings

### F-01 [A] Root CLAUDE.md — system pipeline list is 5 systems behind reality

**File:** `CLAUDE.md`, lines 52–77 (the `SYSTEMS` array in the Engine Architecture section)

**Problem:** The pipeline code-block shows 24 systems (the original set). As of STATUS.md the
live pipeline has 29 systems. Missing from the CLAUDE.md list:

- `religionSystem` (committed `bb7a83d`)
- `governmentSystem` (committed `82f80f3`)
- `urbanBuildingSystem` (committed `68d6a65`)
- `resourceAssignmentSystem` (committed `9552f4e`)
- `commanderPromotionSystem` (committed `15a4e30`)

The comment on line 191 also says "24 systems, one file per system" and the engine source directory
confirms 30 system files (excluding index.ts). STATUS.md and system-inventory.md both say 29 in
the pipeline. This will cause a new contributor to believe they are missing something when they look
at the actual GameEngine.ts.

**Fix:** Update the SYSTEMS array code-block to show all 29 in their correct pipeline order (from
system-inventory.md). Update the comment on line 191 from "24 systems" to "29 systems".

---

### F-02 [A] Root CLAUDE.md — HUD/Overlay section still says "planned" for shipped foundation

**File:** `CLAUDE.md`, section "HUD / Overlay Conventions (planned — audit phase)"

**Problem:** The heading contains "(planned — audit phase)" and the opening paragraph contains:
> "Implementation is staged behind the HUD audit; `HUDManager`, `TooltipShell`, and `hud-tokens.css`
> do not yet exist in the tree."

Reality: All four artifacts exist and have shipped (`HUDManager.tsx`, `TooltipShell.tsx`,
`hudRegistry.ts`, `hud-tokens.css` in `packages/web/src/ui/hud/` and
`packages/web/src/styles/`). The rule doc `ui-overlays.md` was updated correctly (it now says
"The foundation shipped across HUD cycles a–k") but CLAUDE.md was not updated to match.

**Fix:**
- Change section heading from "HUD / Overlay Conventions (planned — audit phase)" to
  "HUD / Overlay Conventions".
- Replace the "do not yet exist in the tree" paragraph with the shipped-state description already
  present in `ui-overlays.md` ("The foundation shipped across HUD cycles a–k, M-HUD1 → M-HUD3").
- Update the bullet list that says "will live under `packages/web/src/ui/hud/`" to remove "will"
  (they already do).

---

### F-03 [A] `add-hud-element` skill — registry entry schema does not match actual `hudRegistry.ts`

**File:** `.codex/skills/add-hud-element/SKILL.md`, Step 3 (lines ~57–76)

**Problem:** The skill's Step 3 instructs the contributor to add a registry entry with these fields:
```typescript
{ id, type, defaultPosition, supportsCycle, supportsTiers, sticky }
```

The actual `hudRegistry.ts` `HUDRegistryEntry` interface is:
```typescript
{ id: HUDElementId; priority: HUDPriority; defaultTimeout?: number; }
```

Fields `type`, `defaultPosition`, `supportsCycle`, `supportsTiers`, and `sticky` do not exist in
the real interface. The `priority` field (`'floating' | 'fixed' | 'toast'`) is not mentioned in
the skill at all. A contributor following Step 3 verbatim will produce a TypeScript compile error.

**Fix:** Rewrite Step 3 to show the real registry entry shape:
```typescript
['myOverlay', {
  id: 'myOverlay',
  priority: 'floating',          // 'floating' | 'fixed' | 'toast'
  defaultTimeout: 3000,          // optional — omit for cursor-driven overlays
}],
```
Remove the non-existent fields. Update the "If you skip this step" note to reference
`HUDManager.register('myOverlay', ...)` not type-checking (currently correct) but also note
TypeScript will catch the wrong field names immediately.

---

### F-04 [A] `add-hud-element` skill — Step 1 table references `ToastShell (planned)` and `ValidationShell (planned)` as unshipped

**File:** `.codex/skills/add-hud-element/SKILL.md`, Step 1 type table (lines ~38–39)

**Problem:** Two overlay type rows say:
> "Dedicated `ToastShell` (planned)"
> "Dedicated `ValidationShell` (planned)"

These shells do not exist in the tree and are not in the design docs as upcoming work items.
The hud-elements.md catalogue shows `notification` and `validationFeedback` are already registered
and use `TooltipShell fixed-corner` mode — not dedicated shells. The "planned" label will make
contributors either wait for a shell that is not coming or create one unnecessarily.

**Fix:** Update both rows to match the actual implementation pattern:
- Notification/toast: "fixed-corner `TooltipShell` with `defaultTimeout` in registry"
- Validation feedback: "fixed-corner `TooltipShell` with `sticky: false` and `defaultTimeout: 2500`"

---

### F-05 [B] `add-panel` skill — mixes legacy `setActivePanel('none')` with new `usePanelManager` API

**File:** `.codex/skills/add-panel/SKILL.md`, Step 3 (lines ~62–66)

**Problem:** Step 3's code example shows:
```tsx
{activePanel === 'myPanel' && (
  <MyPanel onClose={() => setActivePanel('none')} />
)}
```
and then parenthetically says "(Once GameUI fully migrates to `usePanelManager`, the wrapping
changes...)". Similarly, Step 4 says "If TopBar does not yet use `usePanelManager` directly...
follow the existing pattern for now and add an `onOpenMyPanel` prop."

The instructions contradict the rule set in `panels.md`, which explicitly says:
> "New panels must use `PanelManager` from day one."
> "Do NOT use local `useState<Panel>` for a new panel's visibility."
> "Do not props-drill `onOpenTechTree`, `onOpenCity`, `onOpenDiplomacy` callbacks..."

The skill tells a new contributor to use the legacy pattern if App.tsx currently uses it, when
the rule says they must not. This will propagate the legacy pattern instead of driving migration.

**Fix:** Remove the "use whichever style App.tsx is currently on" hedge. Step 3 should show only
the `isOpen('myPanel') && <MyPanel onClose={closePanel} />` form. Add a note that if the
surrounding panels still use `setActivePanel`, that is tech debt to migrate — the new panel should
still use `closePanel` from `usePanelManager`.

---

### F-06 [B] `add-panel` skill smoke-test — references `panel-shell-${id}` testid but `panels.md` rule shows `panel-close-${id}` as data-testid

**File:** `.codex/skills/add-panel/SKILL.md`, Step 7 smoke test (line ~133)

**Problem:** The smoke test checks:
```typescript
expect(screen.getByTestId('panel-shell-myPanel')).toBeInTheDocument();
```

The `PanelShell.tsx` source confirms `data-testid={`panel-shell-${id}`}` is correct (line 195 of
PanelShell.tsx). The close button uses `data-testid={`panel-close-${id}`}`. Both testids match.
However, `panels.md` rule text only mentions `data-testid={`panel-close-${id}`}` — it does not
mention `panel-shell-${id}`. No contradiction but the skill's smoke-test assertion relying on
`panel-shell-myPanel` is using an undocumented testid.

**Severity:** Low — both testids actually exist on PanelShell; no runtime issue. But the rules doc
should document `panel-shell-${id}` if it is part of the public test API.

**Fix (C-class):** Add `data-panel-id` and `data-testid="panel-shell-${id}"` to the shell contract
description in `panels.md`.

---

### F-07 [A] Root CLAUDE.md `GameAction` union is missing ~6 new action types shipped in M5–M19

**File:** `CLAUDE.md`, the `GameAction` discriminated union section

**Problem:** The action union documents actions up to the original 24-system era. Missing shipped
actions:
- `FOUND_PANTHEON` / `FOUND_RELIGION` (religionSystem, committed `bb7a83d`)
- `SET_GOVERNMENT` / `SLOT_POLICY` (governmentSystem, committed `82f80f3`)
- `PROMOTE_COMMANDER` (commanderPromotionSystem, committed `15a4e30`)
- `ASSIGN_RESOURCE` (resourceAssignmentSystem, committed `9552f4e`)

STATUS.md lists all of these. A contributor reading CLAUDE.md to understand what actions exist
will not find them.

**Fix:** Append the missing action variants to the `GameAction` union block. Add a comment noting
the religion/government/commander actions are dispatched by the engine but not yet dispatched by
the AI or exposed in UI panels (per STATUS.md known remaining work).

---

### F-08 [C] `check-edited-file.sh` hook does not detect the four new systems in cross-system import check

**File:** `.codex/hooks/check-edited-file.sh`, lines 38 (the regex matching system names)

**Problem:** The cross-system import detection regex is:
```
from.*['\"]\./(turn|movement|combat|production|research|growth|diplomacy|resource|age|crisis|victory|effect|visibility|promotion|improvement|buildingPlacement|district|civic|specialist|trade|governor|fortify|ai)System
```

The four new systems — `religionSystem`, `governmentSystem`, `urbanBuildingSystem`,
`commanderPromotionSystem` — are absent. A file that imports from `religionSystem` would not be
caught. `resourceAssignmentSystem` and `wonderPlacementSystem` are also missing.

**Severity:** Medium — the critical S-SYSTEM-INDEPENDENT rule is partially unenforced. Currently
these systems likely have no cross-imports, so no violations are happening, but the gap will grow
as more systems are added.

**Fix:** Add the missing system names to the regex alternation:
`religion|government|urbanBuilding|commanderPromotion|resourceAssignment|wonderPlacement`

---

### F-09 [C] `hud-ui-audit.md` is an active design doc used as a reference but its "planned migration" language is now retroactively describing shipped work

**File:** `.codex/workflow/design/hud-ui-audit.md`

**Problem:** The audit document opens with:
> "Status: Design / audit only — no code changes in this cycle."

And the plan it describes (HUDManager + TooltipShell staged migration) has now shipped. The doc
still reads as if migration is upcoming. Several components it flags as violators
(`ValidationFeedback`, `TurnTransition`, `CombatHoverPreview`) have presumably been migrated
(per hud-elements.md). The document is the "before" snapshot; it does not record "after" status.

This is a workflow doc (archival value as the audit origin) so it does not need full rewriting, but
the status line should reflect that migration is complete.

**Fix:** Update the Status line at the top from "Design / audit only" to
"Archived — migration completed HUD cycles a–k. See `hud-elements.md` for current state."

---

### F-10 [C] `panel-manager-audit.md` has the same stale-status issue as `hud-ui-audit.md`

**File:** `.codex/workflow/design/panel-manager-audit.md`

**Problem:** Status line reads "Design / audit only — no code changes in this cycle." The M33
migration is complete — `PanelShell`, `PanelManager`, and `panelRegistry` all exist in the tree.

**Fix:** Update Status line to "Archived — migration completed M33. See `panelRegistry.ts` and
`panels.md` for current state."

---

### F-11 [C] `audit-status.md` shows Phases 1–5 with only Phase 0 checked; Phase 1 is marked complete in task list

**File:** `.codex/workflow/audit-status.md`

**Problem:** The live log shows Phase 0 done. The task list (from settings) shows Task #5
(Phase 1: codebase inventory) as `[completed]` and Task #6 (Phase 2: per-system audits) as
`[in_progress]`. The audit-status.md Phase 2 checkbox is still unchecked.

**Fix:** Tick the Phase 1 checkbox. Update the "Live log" to reflect Phase 1 completion and Phase 2
in-progress status.

---

### F-12 [C] `consistency-audit` skill references `references/audit-layers.md` which does not exist

**File:** `.codex/skills/consistency-audit/SKILL.md`, line 9

**Problem:** "Read `references/audit-layers.md` for methodology." No `references/` directory
exists under `.codex/skills/consistency-audit/`. The skill is unusable as written — step 1 fails
immediately.

**Fix:** Either create the referenced file or replace the reference with the actual methodology
inline (or point to `standards.md` in `.codex/workflow/design/` which now serves this role).

---

### F-13 [C] `inject-rules.sh` subagent context is missing the HUD/panel pattern rules that shipped in M33+

**File:** `.codex/hooks/inject-rules.sh`

**Problem:** The injected context covers import boundaries, architecture, testing, and tech
conventions. It does not mention:
- The PanelManager / PanelShell / panelRegistry pattern
- The HUDManager / TooltipShell / hudRegistry pattern
- The no-raw-hex / token-only styling rule
- The no-local-useState-for-panel-visibility rule

Subagents editing UI code will not be nudged toward the central patterns without context injection.

**Fix:** Add a "## UI Patterns (CRITICAL)" section to the injected context covering: (1) panels use
PanelShell + PanelManager, (2) HUD uses TooltipShell + HUDManager, (3) tokens only — no raw hex,
(4) no useState for visibility.

---

### F-14 [C] `log-bash-failure.sh` logs only that "Bash command failed" — no command, no exit code

**File:** `.codex/hooks/log-bash-failure.sh`

**Problem:** The entry appended to `issues.md` is always:
`- [timestamp] [command_failure] Bash command failed`
No command, no exit code, no context. The issues.md log (currently 63 entries, all identical) is
effectively unactionable for diagnosing what failed. The hook is wired as `PostToolUseFailure` but
does not receive or log the tool input or error.

**Severity:** Low for correctness, medium for usefulness. The hook works (it fires, it writes), but
the output is near-useless.

**Fix:** If `CLAUDE_TOOL_INPUT` or `CLAUDE_TOOL_RESULT` env vars are available in the
PostToolUseFailure hook, extract and log the command excerpt. At minimum log the first 100 chars of
`$CLAUDE_TOOL_INPUT` to give context.

---

## Summary table

| ID | Class | File | Issue |
|----|-------|------|-------|
| F-01 | A | `CLAUDE.md` | Pipeline code-block shows 24 systems; reality is 29 |
| F-02 | A | `CLAUDE.md` | HUD section says "planned / do not yet exist"; all shipped |
| F-03 | A | `add-hud-element/SKILL.md` | Registry entry schema wrong (fictional fields, missing `priority`) |
| F-04 | A | `add-hud-element/SKILL.md` | `ToastShell (planned)` / `ValidationShell (planned)` — neither exists nor is planned |
| F-05 | B | `add-panel/SKILL.md` | Tells contributor to use legacy `setActivePanel` pattern if App.tsx does; rule says must not |
| F-06 | C | `panels.md` + `add-panel/SKILL.md` | `panel-shell-${id}` testid exists but undocumented in rule doc |
| F-07 | A | `CLAUDE.md` | GameAction union missing 6 new actions from M5–M19 |
| F-08 | C | `check-edited-file.sh` | Cross-system import regex missing 6 new systems |
| F-09 | C | `hud-ui-audit.md` | Status line still says "Design only"; migration complete |
| F-10 | C | `panel-manager-audit.md` | Status line still says "Design only"; migration complete |
| F-11 | C | `audit-status.md` | Phase 1 checkbox unchecked; task list says completed |
| F-12 | C | `consistency-audit/SKILL.md` | References `references/audit-layers.md` that does not exist |
| F-13 | C | `inject-rules.sh` | Subagent context missing panel + HUD pattern rules |
| F-14 | C | `log-bash-failure.sh` | Failure log entries contain no actionable detail |

---

## What is NOT wrong

- **`ui-overlays.md`** — correctly says HUD shipped. No "planned" language remaining.
- **`panels.md`** — accurately describes PanelShell / PanelManager / panelRegistry as shipped.
  Good cross-references to skill and audit docs.
- **`add-panel/SKILL.md`** — Steps 1, 2, 5, 7, 8 are accurate. Template code is correct.
  Only Step 3 and the legacy-pattern hedge (F-05) need fixing.
- **`architecture.md`**, **`data-driven.md`**, **`import-boundaries.md`**, **`testing.md`**,
  **`tech-conventions.md`** — all internally consistent, no contradictions, no stale language.
- **`add-content/SKILL.md`** — matches current data directory layout exactly. 2-edit rule
  accurately described.
- **`build/SKILL.md`**, **`test/SKILL.md`**, **`verify/SKILL.md`** — accurate and up to date.
- **`run-tests.sh`** — functions correctly; workspace flag is correct.
- **`session-start.sh`** — health summary accurate; port check is correct (5174).
- **`stop-nudge-verify.sh`** — logic is correct; guard file prevents double-fire.
- **`check-edited-file.sh`** — enforces the four critical boundary rules correctly for the
  original 24 systems. Only the new-system gap (F-08) is missing.
- **`settings.json`** — hooks are correctly wired; PostToolUse fires on Edit|Write; SubagentStart
  fires inject-rules.
- **`settings.local.json`** — very permissive `allow: [Bash(*), Edit(*), Write(*), ...]`.
  Noted as expected for this workflow; no security-in-depth concerns to flag in this context.
- **`hud-elements.md`** — running registry looks complete and consistent with `hudRegistry.ts`
  contents (9 elements in both).
- **`standards.md`** — comprehensive, current, and internally consistent.
- **`system-inventory.md`** — accurate snapshot of 29-system pipeline as of 2026-04-15.
- **`STATUS.md`** — detailed and accurate; good single source of truth for current state.

---

## Priority order for fixes

1. **F-03** — Compile-breaking misguidance in `add-hud-element`. Fix immediately.
2. **F-01**, **F-07** — CLAUDE.md is the first doc every agent reads; stale pipeline + action union.
3. **F-05** — add-panel skill actively propagates the legacy pattern the rules prohibit.
4. **F-02** — HUD "planned" language in CLAUDE.md confuses the shipped state.
5. **F-04** — "ToastShell (planned)" sends contributors hunting for a shell that won't exist.
6. **F-08** — Hook gap grows silently as more systems are added.
7. **F-12** — consistency-audit skill is currently non-functional (broken reference).
8. **F-13** — Subagents miss UI pattern rules; low risk now, higher risk as UI agents scale.
9. **F-09**, **F-10**, **F-11** — Stale status lines; archive / tick checkboxes.
10. **F-06**, **F-14** — Minor polish.
