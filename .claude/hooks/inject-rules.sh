#!/bin/bash
# SubagentStart AND SessionStart hook — injects the canonical rules bundle
# into agent context. Single source of truth: both entry points emit the
# same additionalContext JSON.
#
# Design (WF-AUTO-14):
#   - Short curated cheat sheet PLUS full contents of three high-leverage
#     docs (principles, engine-patterns, coordination). Other rule docs
#     referenced by path — agent reads them on demand via Read tool.
#   - Token budget: aim for ~6k tokens (~24 KB). Skeptic agent warned that
#     >8 KB starts degrading Sonnet's rule-adherence at context-window
#     boundaries.
#   - Uses Python's json.dumps for escaping safety. Validates by re-parsing.
#   - Fallback path if Python fails: static minimal bundle + log to
#     issues.md.

set -uo pipefail

# High-leverage docs to include in full (after YAML front-matter strip).
FULL_DOCS=(
  .claude/rules/principles.md
  .claude/rules/engine-patterns.md
  .claude/rules/coordination.md
)

if command -v python >/dev/null 2>&1; then
  OUTPUT=$(python - "${FULL_DOCS[@]}" <<'PY'
import sys, json, os, re

CHEAT_SHEET = """## Hex-Empires Workflow Cheat Sheet (WF-AUTO-14)

You have the three highest-leverage rule docs appended in full below: principles.md
(named principles + trap registry), engine-patterns.md (state mutation, state.config,
seeded RNG, age transitions), and coordination.md (sub-agent dispatch + synthesis).

Other rule docs are at these paths — read them on demand with the Read tool when
you are working in their area:

- `.claude/rules/architecture.md` — engine/renderer separation, system pipeline shape
- `.claude/rules/import-boundaries.md` — import direction constraints (mechanical)
- `.claude/rules/data-driven.md` — registry pattern, data-file rules
- `.claude/rules/panels.md` — PanelShell / PanelManager protocol (spec)
- `.claude/rules/ui-overlays.md` — TooltipShell / HUDManager protocol (spec)
- `.claude/rules/tech-conventions.md` — TypeScript idioms, ports, platform notes
- `.claude/rules/testing.md` — L1/L2/L3/L4 test depth framework, concrete assertions
- `.claude/workflow/CLAUDE.md` — TDD workflow + continuation directive

Skills (invocable with the Skill tool):

- `/add-panel`, `/add-hud-element`, `/add-content` — step-by-step procedures for
  the three recurring add-X shapes. Each skill has explicit TRIGGER conditions
  in its description — invoke by name when those conditions match.
- `/verify` — E2E browser verification via chrome-devtools MCP
- `/build`, `/test` — command references
- `/consistency-audit` — on-demand content-tree sweep
- `/commit-review` — manual trigger for the three-agent review loop
- `/spawn-worktree` — isolated worktree for parallel agents
- `/audit-workflow` — verify .claude/ consistency + MANIFEST.md accuracy

Invariants — catches all three below at write time avoid 80%+ of Reviewer findings:

1. **Engine is DOM-free.** No react, no document, no canvas, no Math.random().
2. **Immutable state.** Systems return new objects; never `.set()` on state.X.
   See engine-patterns.md § Immutable state updates.
3. **Token-only chrome.** Raw hex (#xxxxxx) in panel/HUD chrome is a BLOCK.
   Use var(--panel-*) / var(--hud-*). See principles.md trap registry.

When reviewing a commit, cite trap names from the trap registry when applicable.
When writing code, self-review against the 3 invariants before `git commit`.

---

"""

parts = [CHEAT_SHEET]
for path in sys.argv[1:]:
    if not os.path.isfile(path):
        parts.append(f"### [missing: {path}]\n\n")
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    # Strip YAML front-matter block (--- ... ---) if present at top.
    content = re.sub(r'^---\n.*?\n---\n', '', content, count=1, flags=re.DOTALL)
    parts.append(f"## Source: {path}\n\n{content}\n\n---\n\n")

full = ''.join(parts)
payload = {"additionalContext": full}

print(json.dumps(payload))
PY
  )
  EXIT=$?
else
  OUTPUT=""
  EXIT=1
fi

if [ "$EXIT" -eq 0 ] && [ -n "$OUTPUT" ]; then
  VALID=$(printf '%s' "$OUTPUT" | python -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    assert 'additionalContext' in d
    print('OK')
except Exception as e:
    print('FAIL:' + str(e))
" 2>/dev/null || echo "FAIL:python")
else
  VALID="FAIL:no-output"
fi

if [ "${VALID%%:*}" = "OK" ]; then
  printf '%s\n' "$OUTPUT"
  exit 0
fi

# Fallback: hand-crafted minimal bundle. Log the failure.
ISSUES=".claude/workflow/issues.md"
if [ -f "$ISSUES" ]; then
  TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "- [$TS] [inject-rules-fallback] $VALID" >> "$ISSUES"
fi

cat <<'EOF'
{"additionalContext": "## Injected Rules (FALLBACK — see .claude/workflow/issues.md)\n\nThe full rules bundle failed to build. Consult .claude/rules/ directly. Key invariants:\n- Engine: zero DOM deps. Web: React 19 + Canvas. Pure functions.\n- No raw hex in chrome; use var(--panel-*) / var(--hud-*) tokens.\n- Systems pure (state, action) => newState. Never mutate.\n- ReadonlyMap/Array. No Math.random() — use state.rng. No `any`.\n- Panels wrap PanelShell; HUD overlays wrap TooltipShell; both register in their manager.\n- BLOCK-severity findings only for Fixer. Reviewer cites trap names from principles.md registry.\n- Continuation: if user says 'full auto' / 'keep going', do NOT stop between phases."}
EOF
