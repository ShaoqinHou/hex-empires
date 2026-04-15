---
name: consistency-audit
description: Audit game content consistency — verify all references, balance, and completeness
user_invocable: true
---

# Consistency Audit

Systematic audit of game content and architecture.

Two complementary reference docs:
- `references/audit-layers.md` — 6-layer methodology (this skill's how-to)
- `.claude/workflow/design/standards.md` — 41 named standards with grep-ready detection recipes (machine-actionable; commit-review agent's primary input)

Read both before running. Layer methodology tells you what to check in what order; standards.md gives you exact grep patterns keyed to rule IDs.

## Process

1. Read `references/audit-layers.md` for the full 6-layer methodology
2. Read `.claude/workflow/design/standards.md` for detection recipes
3. Run the grep queries from standards.md per layer
4. Sample findings and verify against source files
5. Output findings table sorted by severity
6. Recommend fixes

## Output Format

```markdown
| # | Layer | Issue | File(s) | Severity | Fix |
|---|-------|-------|---------|----------|-----|
```

Severity: **High** (broken references, runtime crash), **Medium** (balance, missing content), **Low** (cosmetic)
