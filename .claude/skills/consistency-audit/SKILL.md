---
name: consistency-audit
description: Audit game content consistency — verify all references, balance, and completeness
user_invocable: true
---

# Consistency Audit

Systematic audit of game content and architecture.

Methodology is defined in `references/audit-layers.md` (located at
`.claude/skills/consistency-audit/references/audit-layers.md`). Read it
before running queries — it specifies the 6 audit layers, grep patterns,
and anti-pattern definitions.

## Process

1. Read `references/audit-layers.md` for the full 6-layer methodology
2. Run the grep queries listed there for each layer
3. Sample findings and verify against source files
4. Output findings table sorted by severity
5. Recommend fixes

## Output Format

```markdown
| # | Layer | Issue | File(s) | Severity | Fix |
|---|-------|-------|---------|----------|-----|
```

Severity: **High** (broken references, runtime crash), **Medium** (balance, missing content), **Low** (cosmetic)
