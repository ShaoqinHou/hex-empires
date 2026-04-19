# hex-empires — Civ VII Fidelity Commitment

**Decision date:** 2026-04-19
**Decided by:** project owner
**Position:** **FULL CLONE** of Sid Meier's Civilization VII.

---

## The commitment

hex-empires is a **clone** of Civ VII, not "inspired by" it. The target is mechanical fidelity to Firaxis's game, not a novel interpretation.

Every mechanical divergence from Civ VII is a **bug**, not a feature. Every `[INFERRED]` tag in the GDD is a **TODO** to verify against the real game, not an acceptable approximation.

This commitment rewrites the gap matrix priorities:

- **DIVERGED** rows → must-fix (no "but we decided to keep it different")
- **CLOSE** rows → must-fix (numeric parity required, not just architectural shape)
- **MISSING** rows → must-implement (no "low priority" downgrade available)
- **LEGACY** rows → must-retire (VII removed it → hex-empires removes it)

There are no "locked divergences."

---

## What this commitment does NOT claim

Realistic scope limits that are NOT divergences (they're resource constraints):

1. **Art / audio fidelity** — we use hand-SVG + Game-icons.net + procedural sound. We are cloning the RULES, not the audiovisual presentation. This was locked in the original project decisions (parent CLAUDE.md, "art budget", "sound budget").
2. **DLC content** — base Civ VII launched with 30 civs + 40-ish leaders. DLC adds more. We target the **base-game roster** as the definition of "full roster." DLC civs/leaders are out of scope unless explicitly added later.
3. **Narrative event volume** — Firaxis shipped 1000+ narrative events. We will implement the narrative-event **system** (tag-based, cross-age callbacks, 2-3 choice options) with fidelity, and author a smaller initial library. The system is cloned; the specific event count is pragmatic.
4. **Firaxis's continuous patches** — we snapshot against a specific VII version (see "Version target" below). We don't chase every patch in real time.
5. **Multiplayer** — if base VII has multiplayer and we don't implement it, that's a missing-feature, not a rule-divergence. Out of scope unless explicitly added.

None of these are "acceptable rule divergences." They're scope constraints on the clone target.

---

## Version target

**Firaxis patch 1.3.0 (November 4, 2025)** — the most recent patch referenced in GDD sources.

Future patches may change balance numbers. When hex-empires observably lags a later patch, re-verify `[INFERRED]` constants against the newer in-game data, but otherwise maintain the 1.3.0 snapshot as the spec unless explicitly re-versioned.

---

## Implications for day-to-day development

### Every design decision is a research question, not a judgment call

"Should this mechanic work this way?" becomes "how does Civ VII do this?" — a factual question with a verifiable answer, not a subjective design debate. When the GDD is silent (`[INFERRED]` tag), the answer is "verify in-game," not "whatever we think is best."

### Pull requests change meaning

Previously: "we implemented X which seems better for our game."
Now: "we implemented X which is how Civ VII does it, per [GDD path, sources]."

A PR that implements something VII doesn't do is a bug introduction, not a feature.

### Gap matrix re-prioritized

All rows are now HIGH/MED priority (no LOW). Retention is decided by complexity/cost, not by "would it be nice." The matrix ordering still matters as sequencing, but every row is a must-fix.

### `[INFERRED]` is technical debt

Every `[INFERRED]` or `[LLM-KNOWLEDGE-ONLY]` tag in the GDD is a TODO to resolve. A convergence PR touching a system should aim to eliminate inference tags in that system's doc as part of the work.

### Civ-VI-isms are the worst class of bug

Because the original engine draws from Civ VI intuitions, the highest-alert bug class is "works like VI, not like VII." The tile-improvements worker issue is the flagship example. During any touch of an existing system, actively look for VI-isms and flag them even if they're not the ticket's focus.

---

## Consequences for the gap matrix

The existing gap matrix (`.claude/gdd/gap-matrix.md`) was written before this commitment. Under "clone" semantics, its priority column should be re-read as follows:

| Original label | Means under CLONE commitment |
|---|---|
| HIGH | Fix first — architectural divergence |
| MED | Fix — numeric/behavioral alignment needed |
| LOW | **NO LONGER LOW** — deferred only by complexity/cost, not importance |

Specifically, the 5 MISSING systems (mementos, celebrations, narrative-events, legends, independent-powers-dedicated) are no longer "nice to have" — they're required. Their sequencing may come later, but their existence is mandatory.

Similarly, the 2 LEGACY systems (governorSystem, achievementSystem if retained) are flagged for **removal**, not "keep as-is."

---

## What counts as "done" for the clone

The clone is DONE when:

1. Every GDD system doc's `Mapping to hex-empires` section is filled with non-trivial content (engine file + delta = "none" or equivalent)
2. Every `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]` tag in the GDD is resolved (either confirmed from a primary source or verified in-game)
3. The gap matrix shows no DIVERGED rows (all converted to MATCH) and no MISSING rows (all implemented)
4. Legacy systems (governors, pre-workers improvement model) are retired from the engine
5. Per-category content rosters match Civ VII base game exactly (full civ list, leader list, memento list, tech trees, civic trees, policies, resources, etc.)
6. A human plays a game of hex-empires and can't point at a mechanic and say "that's not how VII does it"

This is a multi-year target. The commitment isn't "get there by next month" — it's "every PR moves toward it, not away from it."

---

## References

- `.claude/gdd/README.md` — the full GDD taxonomy + source list
- `.claude/gdd/gap-matrix.md` — the one-page convergence plan
- Parent CLAUDE.md — original art/sound/game-feel scope commitments
- Firaxis patch notes (1.3.0) — version target
