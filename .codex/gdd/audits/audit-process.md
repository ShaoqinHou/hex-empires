# GDD → Codebase Audit Process

**Purpose.** A repeatable process for comparing each GDD system doc against its corresponding engine code. Output is a structured audit report that feeds the convergence tracker and populates the `Mapping to hex-empires` section of the system's GDD doc.

**Why this exists.** The GDD defines what Civ VII does. The engine is what hex-empires does. The gap between them is everything we need to fix (per `commitment.md` — we're a full clone; every divergence is a bug). This process makes the gap visible, prioritized, and actionable.

---

## Scope per audit

One audit covers exactly one GDD system:

**Input:**
- `.codex/gdd/systems/<slug>.md` — the mechanics doc (what VII does)
- `.codex/gdd/content/<category>/` — relevant fact cards (values, rules)
- `packages/engine/src/systems/<System>System.ts` — primary engine file
- `packages/engine/src/state/<related>.ts` — state utilities the system reads/writes
- `packages/engine/src/data/<category>/` — data files (civs, units, etc.)
- `packages/web/src/ui/panels/<X>Panel.tsx` — UI panel (when user-facing)

**Output:**
- `.codex/gdd/audits/<slug>.md` — the audit report (from `_template-audit.md`)
- Updated `Mapping to hex-empires` section in `.codex/gdd/systems/<slug>.md`
- New rows appended to `.codex/gdd/convergence-tracker.md`

---

## Finding classification

Every finding is exactly one of these five categories:

| Status | Meaning | Example |
|---|---|---|
| **MATCH** | Engine does essentially what VII does | City produces food each turn based on tile yields |
| **CLOSE** | Right shape, wrong specifics (numbers, edge cases) | Food threshold for growth: engine uses X, VII uses Y |
| **DIVERGED** | Engine does something fundamentally different (often a Civ-VI-ism) | Engine builds farms via worker unit; VII auto-places on pop growth |
| **MISSING** | GDD describes, engine lacks | Celebrations system not implemented |
| **EXTRA** | Engine has, VII doesn't | governorSystem (Civ VI concept, removed in VII) |

---

## Finding metadata

Every finding carries:

| Field | Format | Purpose |
|---|---|---|
| ID | `F-NN` (per system) | Stable reference for cross-linking |
| Title | Short phrase | Grep-friendly |
| Heading | `### F-NN: <title> -- STATUS` or `### F-NN: <title> -- STATUS (<note>)` | Parsed by `aggregate-audits.py`; only MATCH / CLOSE / DIVERGED / MISSING / EXTRA is counted |
| Location | `file.ts:lineStart–lineEnd` | So the next person can open it |
| GDD reference | `systems/<slug>.md` § section | Traceable claim |
| Severity | HIGH / MED / LOW | Under clone commitment, HIGH = "violates fidelity"; MED = "numeric drift"; LOW = "edge case" |
| Effort | S / M / L | S = half-day; M = 1–3 days; L = week+ |
| VII says | 1 sentence | From GDD |
| Engine does | 1 sentence | From code |
| Gap | The delta | Computed field |
| Recommendation | Concrete action | refactor / add / remove / verify |

---

## Running an audit

### Option A — Agent-run (recommended for parallel batch)

Spawn a Sonnet agent per system. Agent reads GDD + engine, writes audit to disk. Template the brief using `_template-strict-agent-brief.md` (strict no-inline-dump rules).

**Brief format (key fields):**
```
Audit system: <slug>
GDD doc: .codex/gdd/systems/<slug>.md
Engine files: <list from script or manual discovery>
Output: .codex/gdd/audits/<slug>.md
Template: .codex/gdd/audits/_template-audit.md
Strict rules: see _template-strict-agent-brief.md — write the audit file
  directly; if Write fails, return BLOCKED only.
```

**Why this works well as agent work:**
- Primarily READ operations (safe even with write-permission issues)
- Single-file WRITE output (the audit report)
- Well-scoped per system — no cross-system state
- Agent context is just 1 GDD doc + 1–3 engine files (not the whole codebase)

### Option B — Parent-run (recommended for the first 2–3 audits to calibrate)

Parent walks through the process manually to establish the baseline. Good for:
- First audit (tile-improvements, since it's the DIVERGED flagship)
- Verifying the template shape works before fanning out
- Any audit that needs cross-system context

### Option C — Hybrid

Parent drafts the audit outline. Agent fills in per-finding details via a second pass.

---

## Ordering

Not all 26 audits need to happen now. Suggested order:

1. **DIVERGED rows first** — `tile-improvements` (and any others the gap matrix flagged DIVERGED)
2. **HIGH-priority rows per gap matrix** — `settlements`, `diplomacy-influence`
3. **High-impact CLOSE rows** — `ages`, `combat`, `civilizations`, `commanders`
4. **MISSING rows** — audit confirms they're missing and scopes implementation
5. **LEGACY retirement audits** — `governorSystem`, worker-builds-farm
6. **The rest** — systematic sweep once flagship systems are converged

---

## Feeding the convergence tracker

After each audit, append its findings to `.codex/gdd/convergence-tracker.md`. One row per finding. Columns:

| System | F-ID | Title | Status | Severity | Effort | Location | Implemented? |
|---|---|---|---|---|---|---|---|
| tile-improvements | F-01 | Workers build farms (Civ-VI-ism) | DIVERGED | HIGH | M | improvementSystem.ts:1–150 | ☐ |
| ... | | | | | | | |

Sort the tracker by priority for the active work view. Tick off findings as implementation PRs merge them.

---

## Populating the `Mapping to hex-empires` section

After the audit, edit `.codex/gdd/systems/<slug>.md` and replace the empty `Mapping to hex-empires` section with:

```markdown
## Mapping to hex-empires

**Engine files:** list
**Status tally:** N MATCH / N CLOSE / N DIVERGED / N MISSING / N EXTRA
**Audit:** [.codex/gdd/audits/<slug>.md](../audits/<slug>.md)
**Highest-severity finding:** F-0N — <title>
**Convergence status:** <brief: "flagship DIVERGED; work in progress" / "all CLOSE; awaiting tuning pass" / "fully MATCH" />
```

The full finding detail stays in the audit doc. The GDD mapping section is a summary + link.

---

## Anti-patterns to avoid

- **Auditing without the GDD claim.** Every finding needs a GDD pointer (§ section). "I think this feels wrong" is not a finding.
- **Writing recommendations that reference code that doesn't exist yet.** Recommendations are for things that ARE in the codebase; missing-item fixes get their own scope.
- **Marking everything HIGH.** Under the clone commitment, LOW still matters, but HIGH should be reserved for divergences that actively block the VII feel. Flanking-bonus numeric drift is MED; worker-builds-farm is HIGH.
- **Skipping the "EXTRA" review.** Legacy engine systems (governors, etc.) are as much a divergence as missing mechanics. Flag them.
- **Over-scoping audits.** One audit = one system. Cross-system concerns are documented as links, not embedded.

---

## Relationship to gap-matrix.md

`gap-matrix.md` was a one-page estimate based on filesystem survey + knowledge-at-a-distance. The per-system audits are the detailed follow-up. After audits:

- Gap matrix status column updates from guesses to verified findings
- Audit files become the authoritative detail
- Convergence tracker is the day-to-day work list

---

## When an audit is "done"

- All findings in the audit template, one row per actual divergence
- Status tally matches per-finding count
- `Mapping to hex-empires` section of GDD populated
- Findings appended to convergence tracker
- Effort estimate present

An audit does NOT fix the findings. It documents them. Implementation is a separate step.
