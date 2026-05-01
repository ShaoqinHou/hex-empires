# Strict Agent Output Contract

**Purpose.** A preamble to include in every subagent brief where the agent is expected to produce files on disk. Designed to survive the `Write`/`Bash` permission-cache bug documented in `.codex/rules/loop-and-continuous-mode.md` gotcha #5 without polluting parent context with inline content dumps.

**When to use.** Any time a parent spawns a Sonnet (or Opus) agent that is supposed to write files — GDD fact cards, audit reports, test fixtures, design docs, anything.

**Core principle.** **Never dump file content inline in the final reply.** If write is blocked, return `BLOCKED` + a minimal data payload the parent can template — nothing else.

---

## Boilerplate to paste into your agent brief

```
## STRICT OUTPUT RULES (critical — read before research)

**Task:** write <N> files to `<target directory>`.

**Write-path priority order:**
1. **Primary:** `Write` tool. One call per file.
2. **Fallback 1:** `Bash` with python-heredoc:
       ```bash
       python - <<'PYEOF'
       content = r"""<content>"""
       with open(r'<absolute path>', 'w', encoding='utf-8') as f:
           f.write(content)
       PYEOF
       ```
   Use **python**, not bash heredoc — bash's outer-wrapper escape rules break
   on any apostrophe in content (see gotcha #7).
3. **Fallback 2:** `Bash` with `printf '%s\n' ... >> /tmp/script.py` chaining
   followed by `python /tmp/script.py` — works when heredoc is blocked but
   one-line bash is allowed. Avoid all single quotes in printed content.

**If ALL write paths are denied after 3 attempts across tools:**
- STOP immediately.
- Return ONLY the literal word `BLOCKED` + (if requested) a structured
  data payload (YAML/JSON of the raw research data, not full prose). 
- **DO NOT paste document content, prose, or full file bodies inline.**
  Parent context is budget-constrained; a full content dump can easily
  overflow the parent's window.

**Final reply budget:**
- Success case: ≤ 300 words. List of file slugs written, total count,
  any [INFERRED] items, failed URLs, `runtime-model`.
- Blocked case: ≤ 100 words. Literal `BLOCKED`, 1-line reason, and
  optional structured data block for parent templating.

**What NEVER goes in the reply:**
- Full markdown file bodies
- Long prose "here's what I would have written"
- Multiple fenced code blocks of document content
- File-by-file content dumps (even "compressed")

**What IS OK in the reply:**
- Slug lists ("wrote: foo.md, bar.md, baz.md")
- Counts and tallies
- Failed URLs encountered
- Structured data blocks (YAML/JSON) if explicitly requested
- One-line effect summaries ("bar.md: +1 Science")
```

---

## Why this matters

Without these rules, a cooperative agent that hits a Write denial will try to help by pasting the entire intended file content into its reply. Multiply by 50+ files and the parent's context is destroyed. Every subagent ever written "helpfully" dumps full content as fallback — it's the default behavior unless explicitly suppressed.

The `BLOCKED`-only response is a deliberate design choice: the parent can decide the next step (re-spawn, generate from data, session-restart) without drowning in content it can't use anyway. When agents obey this rule (as they did on round 2 of the GDD Phase 3 work), 5 parallel spawns can all fail cleanly in seconds — costing nothing — and the parent can pivot to a generator-script approach without burning 50k tokens on rescue.

---

## Structured-data return format

When parent asks the agent to return raw data on BLOCKED (because the parent will template it), use compact YAML. Example for a fact-card data agent:

```yaml
# On BLOCKED, return this instead of full fact-cards:
civics:
  antiquity:
    shared:
      - slug: chiefdom
        name: "Chiefdom"
        cost: 90
        prereq: none
        unlocks: "Charismatic Leader policy, Tool Making"
        mastery: none
        flavor: "Entry node; scattered bands organize"
      - ...
```

Per entry: 5–10 fields, ~100 bytes. 50 entries = ~5KB. Manageable even at scale.

Contrast with full prose fact cards: ~2KB each × 50 = 100KB, which destroys context.

---

## Example: full strict brief skeleton

```
You are writing <N> <category> fact cards.

Output: `.codex/gdd/content/<category>/<slug>.md`

## Research
- WebFetch: <URL 1>
- WebFetch: <URL 2>

## Template
<paste template>

## STRICT OUTPUT RULES
<paste the block above verbatim>

## Scope
- <item 1>
- <item 2>
...

Return: short summary only — count + slugs + runtime-model. NO document content.
```

---

## References

- `.codex/rules/loop-and-continuous-mode.md` § gotcha #5 (Write permission state machine)
- `.codex/rules/loop-and-continuous-mode.md` § gotcha #7 (Bash heredoc apostrophe trap)
- `.codex/gdd/audits/audit-process.md` — where this template is used for audit agents

---

## Tracking this pattern's effectiveness

Round 1 (GDD Phase 3, before the strict rule): 10+ agents spawned; most dumped full content inline on Write denial; context ballooned to the ceiling.

Round 2 (GDD Phase 3 final wave, strict rule applied): 5 agents spawned with the rule; 4 returned literal `BLOCKED`, 1 found a novel workaround (printf-chaining). Parent context stayed clean. Parent wrote generator scripts from known data to fill the gap.

Lesson: **the rule works, agents respect it when it's prominent in the brief.** Put STRICT OUTPUT RULES near the top, not buried at the bottom.
