---
name: audit-workflow
description: Verify that `.claude/MANIFEST.md` matches the filesystem, every file has a purpose header, and no orphans exist. TRIGGER WHEN the user asks to "audit workflow" / "check the manifest" / "find drift in .claude" / "verify workflow self-documentation", OR after a large workflow refactor, OR before a cycle where the workflow will be relied on heavily. DO NOT TRIGGER for code audits (use /consistency-audit instead).
user_invocable: true
---

# /audit-workflow — Workflow Self-Documentation Audit

Verifies the three self-documentation invariants of `.claude/`:

1. Every file in `.claude/` (except gitignored scratch/worktree) is listed in `.claude/MANIFEST.md`.
2. Every file listed in MANIFEST.md exists on disk.
3. Every `.md` and `.sh` in `.claude/` has a purpose-header (YAML front-matter `purpose:` for `.md`, top-of-file `#` comment line for `.sh`).

If any invariant is violated, the skill outputs a checklist of drift and exits non-zero.

## Running the audit

The script below can be copy-pasted into a single Bash tool call. It produces a report and either confirms clean or lists every drift.

```bash
#!/bin/bash
# /audit-workflow — verifies .claude/ self-documentation

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)" || exit 1

echo "=== .claude/ Workflow Audit — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo ""

# Collect all files in .claude/ that should be audited.
# Excludes: scratch/ (gitignored transient), worktrees/ (gitignored sandboxes),
# archive/ (historical snapshots, not actively used), .gitignore files
# (boilerplate), settings.local.json (per-user permissions).
mapfile -t FILES < <(find .claude -type f \
  \( -name '*.md' -o -name '*.sh' -o -name '*.json' \) \
  ! -path '.claude/workflow/scratch/*' \
  ! -path '.claude/worktrees/*' \
  ! -path '.claude/workflow/design/archive/*' \
  ! -name '.gitignore' \
  ! -name 'settings.local.json' \
  | sort)

echo "Files in .claude/ to audit: ${#FILES[@]}"
echo ""

DRIFT=0

# Check 1: every file is mentioned in MANIFEST.md via its relative-to-.claude/
# path (e.g. `rules/principles.md`). We normalise each file by stripping the
# leading `.claude/` and grep for that — strict enough to catch missing
# entries, loose enough to ignore which backtick-style the MANIFEST uses.
echo "== Check 1: MANIFEST coverage =="
MANIFEST=".claude/MANIFEST.md"
if [ ! -f "$MANIFEST" ]; then
  echo "  MISSING: $MANIFEST itself"
  DRIFT=1
else
  MANIFEST_CONTENT=$(cat "$MANIFEST")
  for f in "${FILES[@]}"; do
    # Strip leading `.claude/` for path matching
    REL="${f#.claude/}"
    basename=$(basename "$f")
    # Accept: full relative path in MANIFEST OR the directory/path shape used
    # by the Files section (`skills/<name>/` covers the whole skill dir).
    PARENT_DIR=$(dirname "$REL")
    if ! echo "$MANIFEST_CONTENT" | grep -qF "$REL" 2>/dev/null \
       && ! echo "$MANIFEST_CONTENT" | grep -qF "$PARENT_DIR/" 2>/dev/null \
       && ! echo "$MANIFEST_CONTENT" | grep -qF "$basename" 2>/dev/null; then
      echo "  ORPHAN (not in MANIFEST): $f"
      DRIFT=1
    fi
  done
fi
echo ""

# Check 2: every MANIFEST-listed file exists
echo "== Check 2: MANIFEST claims vs filesystem =="
if [ -f "$MANIFEST" ]; then
  CLAIMED=$(grep -oE '\`[^`]+\.(md|sh|json)\`' "$MANIFEST" | tr -d '`' | sort -u)
  while IFS= read -r cp; do
    [ -z "$cp" ] && continue
    # Paths may be written relative to .claude/ or as bare basenames.
    # Resolve: try as-is, then with .claude/ prefix.
    if [ -f "$cp" ] || [ -f ".claude/$cp" ]; then
      continue
    fi
    # A bare basename might be intentionally unqualified (e.g. SKILL.md in
    # prose); only flag if the basename doesn't exist anywhere under .claude/.
    if ! find .claude -name "$(basename "$cp")" -type f 2>/dev/null | grep -q .; then
      echo "  MISSING on disk (MANIFEST claims it): $cp"
      DRIFT=1
    fi
  done <<< "$CLAIMED"
fi
echo ""

# Check 3: every .md file has a header (either YAML purpose: OR the Claude
# Code skill format with name: + description: counts as equivalent);
# every .sh has top-line comment after shebang.
echo "== Check 3: purpose headers =="
for f in "${FILES[@]}"; do
  case "$f" in
    *SKILL.md)
      # Skill files use YAML front-matter with name: + description:
      if ! head -15 "$f" | grep -q '^name:' \
      || ! head -15 "$f" | grep -q '^description:'; then
        echo "  MISSING HEADER: $f (expected 'name:' and 'description:' in YAML front-matter)"
        DRIFT=1
      fi
      ;;
    *.md)
      # Other .md files use YAML front-matter with purpose:
      if ! head -15 "$f" | grep -q '^purpose:'; then
        echo "  MISSING HEADER: $f (expected 'purpose:' in YAML front-matter)"
        DRIFT=1
      fi
      ;;
    *.sh)
      # Must have a '# <text>' comment on line 2 (after shebang)
      SECOND=$(sed -n '2p' "$f")
      if ! echo "$SECOND" | grep -qE '^# .+'; then
        echo "  MISSING HEADER: $f (expected '# <description>' on line 2)"
        DRIFT=1
      fi
      ;;
    *.json)
      # JSON doesn't carry a comment header; skip
      ;;
  esac
done
echo ""

# Check 4: inject-rules.sh still emits valid JSON (critical health check)
echo "== Check 4: inject-rules.sh JSON validity =="
if command -v python >/dev/null 2>&1; then
  if bash .claude/hooks/inject-rules.sh | python -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    assert 'additionalContext' in d
    bytes = len(d['additionalContext'])
    print(f'  OK — {bytes} bytes (~{bytes//4} tokens)')
except Exception as e:
    print(f'  FAIL: {e}')
    sys.exit(1)
"; then
    :
  else
    DRIFT=1
  fi
else
  echo "  SKIPPED (python not available)"
fi
echo ""

# Check 5: session-start.sh still emits valid JSON (critical health check)
echo "== Check 5: session-start.sh JSON validity =="
if command -v python >/dev/null 2>&1; then
  if bash .claude/hooks/session-start.sh | python -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    assert 'additionalContext' in d
    bytes = len(d['additionalContext'])
    has_health = 'Workspace health' in d['additionalContext']
    has_rules = 'Hex-Empires Workflow Cheat Sheet' in d['additionalContext']
    print(f'  OK — {bytes} bytes (~{bytes//4} tokens) health={has_health} rules={has_rules}')
    if not (has_health and has_rules):
        print(f'  WARN: expected both health + rules cheat sheet')
        sys.exit(0)
except Exception as e:
    print(f'  FAIL: {e}')
    sys.exit(1)
"; then
    :
  else
    DRIFT=1
  fi
else
  echo "  SKIPPED (python not available)"
fi
echo ""

if [ "$DRIFT" -eq 0 ]; then
  echo "=== AUDIT CLEAN ==="
  exit 0
else
  echo "=== DRIFT DETECTED — reconcile MANIFEST.md or filesystem ==="
  exit 1
fi
```

## How to fix drift

**Orphans (file exists but not in MANIFEST):** add a row to the appropriate section of MANIFEST.md with a 1-line description. If the file shouldn't exist, delete it instead.

**Missing on disk (MANIFEST claims it exists):** either create the file with the stated purpose, or remove its row from MANIFEST.md.

**Missing headers:** add a YAML front-matter block at the top of the `.md` file:

```yaml
---
purpose: <one-line description>
---

# Existing content...
```

For `.sh` files, ensure line 2 is a `# <description>` comment (line 1 is the shebang).

**JSON validity failure:** inject-rules.sh or session-start.sh is broken. Check git log for recent changes; the most likely cause is an unescaped quote in a doc file that broke Python's json.dumps, OR a path referenced by the hook that no longer exists. Fix and re-run the audit.

## When to run

- After any batch of changes to `.claude/` (rules/, skills/, hooks/, workflow/).
- Before spawning a batch of sub-agents (so they all start with valid injection).
- Periodically (monthly-ish) as a health check.
- When a user asks "what's our workflow" — running this first confirms MANIFEST.md is accurate.

## References

- `.claude/MANIFEST.md` — the document this audit validates
- `.claude/hooks/inject-rules.sh` + `.claude/hooks/session-start.sh` — the two hooks whose JSON output is checked
- WF-AUTO-14 commit history — the refactor that established this self-documentation invariant
