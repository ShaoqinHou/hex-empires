---
name: consistency-audit
description: Audit game content consistency — verify all references, balance, and completeness
user_invocable: true
---

# Consistency Audit

Systematic audit of game content and architecture. Read `references/audit-layers.md` for methodology.

## Process

1. Read `references/audit-layers.md`
2. Run grep queries for each layer
3. Sample findings and verify
4. Output findings table sorted by severity
5. Recommend fixes

## Output Format

```markdown
| # | Layer | Issue | File(s) | Severity | Fix |
|---|-------|-------|---------|----------|-----|
```

Severity: **High** (broken references, runtime crash), **Medium** (balance, missing content), **Low** (cosmetic)
