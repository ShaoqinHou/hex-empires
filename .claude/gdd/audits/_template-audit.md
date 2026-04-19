# [System Name] — hex-empires Audit

<!--
TEMPLATE — one audit per GDD system. Agents or parent fills this in.
Audit scope: compare `.claude/gdd/systems/<slug>.md` + `.claude/gdd/content/<cat>/`
against `packages/engine/src/systems/<System>System.ts` + related.
-->

**System slug:** `<slug>`
**GDD doc:** [systems/<slug>.md](../systems/<slug>.md)
**Audit date:** `YYYY-MM-DD`
**Auditor:** `<parent | claude-sonnet-4.6 | claude-opus-4.7>`
**Version target:** Firaxis patch 1.3.0 (per commitment.md)

---

## Engine files audited

- `packages/engine/src/systems/<X>System.ts` (lines 1–N)
- `packages/engine/src/state/<Y>.ts`
- `packages/engine/src/data/<Z>/*.ts`
- `packages/web/src/ui/panels/<Z>Panel.tsx` (if UI-relevant)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH — code does what VII does | N |
| CLOSE — right shape, wrong specifics | N |
| DIVERGED — fundamentally different (Civ-VI-ism or custom) | N |
| MISSING — GDD describes, engine lacks | N |
| EXTRA — engine has, VII/GDD doesn't | N |

**Total findings:** N

---

## Detailed findings

### F-01: `<short-title>` — DIVERGED / CLOSE / MISSING / EXTRA

**Location:** `packages/engine/src/systems/X.ts:42–80`
**GDD reference:** `systems/<slug>.md` § "Mechanics" → sub-section name
**Severity:** HIGH / MED / LOW
**Effort:** S / M / L (half-day / 1-3 days / week+)
**VII says:** <1 sentence from GDD>
**Engine does:** <1 sentence from code>
**Gap:** <the delta>
**Recommendation:** <concrete fix direction — refactor/add/remove/verify>

### F-02: <next finding>
...

---

## Extras to retire

Engine mechanics that VII explicitly doesn't have. Retire unless repurposable.

- `<file>` — VII removed X; can retire or repurpose as Y

---

## Missing items (not yet implemented)

Engine has no trace of these VII mechanics.

- `<item>` — required for clone per commitment; deferred because <reason>

---

## Mapping recommendation for GDD system doc

Paste this back into `.claude/gdd/systems/<slug>.md` § "Mapping to hex-empires":

```markdown
## Mapping to hex-empires

**Engine files:**
- `packages/engine/src/systems/XSystem.ts`
- `packages/engine/src/state/Y.ts`

**Status:** N MATCH / N CLOSE / N DIVERGED / N MISSING / N EXTRA (see `.claude/gdd/audits/<slug>.md` for details)

**Highest-severity finding:** F-01 — <title>
```

---

## Open questions for the audit

- Numeric constants from VII not published; use community estimate (source?) or leave TODO?
- Engine files touching adjacent systems blur audit boundary — noted as "cross-system" findings.

---

## Effort estimate

| Bucket | Findings | Estimated total effort |
|---|---|---|
| S (half-day) | N | Nh |
| M (1–3 days) | N | Nd |
| L (week+) | N | Nw |
| **Total** | | **~Nw** |

This audit recommends the findings be tackled in order: `<F-0x, F-0y, F-0z>` — highest severity/lowest effort first.

---

<!-- END OF AUDIT TEMPLATE -->
