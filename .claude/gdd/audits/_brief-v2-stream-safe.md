# Audit Agent Brief Template — v2 (stream-safe)

**Purpose.** Replacement for wave-1 brief that had 3 of 6 agents hit Anthropic's
stream-idle-timeout (~8 min silent think → API kills the stream). v2 forces agents
to stream output continuously by writing a skeleton first, then editing in each
finding one at a time, instead of composing the whole audit in memory and writing
it at the end.

**Wave-1 observed failures (2026-04-19):**
- celebrations: 7.8min / 85 tokens / stream idle timeout → no output
- commanders: 8.1min / 679 tokens / stream idle timeout → no output
- combat: 8.4min / 256 tokens / stream idle timeout → no output

**Wave-1 observed successes:**
- tile-improvements: 16.7min / 134k tokens / HEALTHY → 12 findings, 250 lines
- ages: still running (completed writing 368 lines)
- religion: still running

The successful agents naturally streamed their thinking. The failed ones composed
silently. v2 prescribes the streaming pattern.

---

## Copy-paste brief (fill in the `<...>` placeholders)

```
Audit system: <slug>
GDD doc: .claude/gdd/systems/<slug>.md
Engine files to read (from _engine-file-map.md):
  - <file 1>
  - <file 2>
  - ...
Output file: .claude/gdd/audits/<slug>.md (absolute path:
  C:/Users/housh/Documents/monoWeb/hex-empires/.claude/gdd/audits/<slug>.md)

## OUTPUT PROTOCOL — follow strictly

Stream-idle-timeout is the main failure mode. You MUST avoid >8 min of silent
thinking. The protocol below guarantees continuous stream output.

### Step 1 — Skeleton first (within first 2 min)

Immediately `Write` a skeleton to the output path:

    # <System Title> — hex-empires Audit

    **System slug:** `<slug>`
    **GDD doc:** [systems/<slug>.md](../systems/<slug>.md)
    **Audit date:** `2026-04-19`
    **Auditor:** `claude-sonnet-4.6`
    **Version target:** Firaxis patch 1.3.0 (per commitment.md)

    ---

    ## Engine files audited

    - `<file 1>`
    - `<file 2>`

    ---

    ## Summary tally

    | Status | Count |
    |---|---|
    | MATCH | 0 |
    | CLOSE | 0 |
    | DIVERGED | 0 |
    | MISSING | 0 |
    | EXTRA | 0 |

    **Total findings:** 0

    ---

    ## Detailed findings

    <!-- findings go here -->

    ---

### Step 2 — Read files

Use parallel `Read` calls for the GDD doc + all engine files in one message.
Read the whole GDD doc; skim engine files for mechanics (don't read tests).

### Step 3 — For EACH finding (minimum 5, maximum 12):

Use ONE `Edit` call per finding. Find the `<!-- findings go here -->` marker
and replace with the finding + fresh marker:

    ### F-0N: `short-title` — DIVERGED / CLOSE / MATCH / MISSING / EXTRA

    **Location:** `packages/engine/.../X.ts:NN–MM`
    **GDD reference:** `systems/<slug>.md` § "Section Name"
    **Severity:** HIGH / MED / LOW
    **Effort:** S / M / L
    **VII says:** <1 sentence from GDD>
    **Engine does:** <1 sentence from code>
    **Gap:** <the delta>
    **Recommendation:** <concrete next action>

    ---

    <!-- findings go here -->

### Step 4 — Finalize (single `Edit` call)

After all findings, run one final `Edit` to replace the whole tally block with
correct counts, and append these sections:

    ## Extras to retire

    - `<file>` — <why it's EXTRA> — <retire / repurpose action>

    ---

    ## Missing items

    - <mechanic> — <why it's required> — <implementation note>

    ---

    ## Mapping recommendation for GDD system doc

    Paste into `.claude/gdd/systems/<slug>.md` § "Mapping to hex-empires":

    ```markdown
    ## Mapping to hex-empires

    **Engine files:** <list>
    **Status tally:** N MATCH / N CLOSE / N DIVERGED / N MISSING / N EXTRA
    **Audit:** [.claude/gdd/audits/<slug>.md](../audits/<slug>.md)
    **Highest-severity finding:** F-0N — <title>
    **Convergence status:** <one sentence>
    ```

    ---

    ## Open questions

    - <ambiguity / missing-source / cross-system concern>

    ---

    ## Effort estimate

    | Bucket | Findings | Total |
    |---|---|---|
    | S | F-0X, F-0Y | Xd |
    | M | F-0A, F-0B | Xd |
    | L | F-0C | Xw |
    | **Total** | | **~Xw** |

    Recommended order: F-0X → F-0Y → ... (highest-sev/lowest-effort first)

### Step 5 — Return reply (≤300 words, mandatory fields)

- Output file path (confirm written)
- Tally (N MATCH / N CLOSE / N DIVERGED / N MISSING / N EXTRA — N total)
- Top-3 findings: title + status + severity + 1-line summary
- `runtime-model: <model>` (MUST be claude-sonnet-4.6)
- Any failed reads / skipped files / [INFERRED] fields

### RULES

- NEVER compose the full audit in memory and write at the end — trips stream-idle-timeout.
- NEVER dump file content inline in your reply — parent context budget.
- If Write fails, retry up to 3 times with increasing specificity on absolute path.
  If still blocked after 3 retries, return literal word `BLOCKED` and nothing else.
- If a finding pattern matches 3+ engine files, still write ONE finding (cite primary
  location, list others in the "Location" field).
- Minimum 5 findings. If the system has fewer than 5 real findings, flag this in
  "Open questions" — don't pad.
```

---

## Why this works

The successful wave-1 agents (tile-improvements, ages) did this pattern organically:
they wrote a skeleton early, then incrementally extended it. Each Edit call is a
tool invocation, which resets the stream-idle timer. The failed agents (combat,
commanders, celebrations) composed silently for 7-8 min before their first
meaningful Write, hitting the timeout before emitting any output.

---

## When to use

- Every wave-2 audit spawn (20 systems).
- Re-spawn of wave-1 failures (combat, commanders, celebrations).
- Any future agent writing a structured multi-section document.

---

## Related docs

- `.claude/gdd/_template-strict-agent-brief.md` — the strict BLOCKED-only contract
- `.claude/gdd/audits/_template-audit.md` — the audit output shape
- `.claude/gdd/audits/_engine-file-map.md` — which files to read per system
- `.claude/gdd/audits/audit-process.md` — the audit lifecycle
