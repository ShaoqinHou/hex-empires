# hex-empires → Civ VII Convergence Tracker

**Purpose.** One-page master punch list of every finding from every audit. Sort by priority to decide what to implement next. Tick off as PRs land.

**Commitment:** hex-empires is a FULL CLONE of Civ VII (see [`commitment.md`](commitment.md)). Every DIVERGED/MISSING finding is a must-fix; every CLOSE is a must-tune.

**Updates:** appended to whenever a new system audit lands in `.claude/gdd/audits/`.

---

## Status legend

| Col | Meaning |
|---|---|
| Status | MATCH / CLOSE / DIVERGED / MISSING / EXTRA |
| Sev | HIGH / MED / LOW severity |
| Eff | S (half-day) / M (1–3 days) / L (week+) |
| Done | ☐ pending / ☑ merged / 🏃 in progress |

---

## Audit coverage

| System | Audit file | Completed |
|---|---|---|
| ages | `.claude/gdd/audits/ages.md` | ☐ |
| buildings-wonders | `.claude/gdd/audits/buildings-wonders.md` | ☐ |
| celebrations | `.claude/gdd/audits/celebrations.md` | ☐ |
| civic-tree | `.claude/gdd/audits/civic-tree.md` | ☐ |
| civilizations | `.claude/gdd/audits/civilizations.md` | ☐ |
| combat | `.claude/gdd/audits/combat.md` | ☐ |
| commanders | `.claude/gdd/audits/commanders.md` | ☐ |
| crises | `.claude/gdd/audits/crises.md` | ☐ |
| diplomacy-influence | `.claude/gdd/audits/diplomacy-influence.md` | ☐ |
| government-policies | `.claude/gdd/audits/government-policies.md` | ☐ |
| independent-powers | `.claude/gdd/audits/independent-powers.md` | ☐ |
| leaders | `.claude/gdd/audits/leaders.md` | ☐ |
| legacy-paths | `.claude/gdd/audits/legacy-paths.md` | ☐ |
| legends | `.claude/gdd/audits/legends.md` | ☐ |
| map-terrain | `.claude/gdd/audits/map-terrain.md` | ☐ |
| mementos | `.claude/gdd/audits/mementos.md` | ☐ |
| narrative-events | `.claude/gdd/audits/narrative-events.md` | ☐ |
| population-specialists | `.claude/gdd/audits/population-specialists.md` | ☐ |
| religion | `.claude/gdd/audits/religion.md` | ☐ |
| resources | `.claude/gdd/audits/resources.md` | ☐ |
| settlements | `.claude/gdd/audits/settlements.md` | ☐ |
| tech-tree | `.claude/gdd/audits/tech-tree.md` | ☐ |
| tile-improvements | `.claude/gdd/audits/tile-improvements.md` | ☐ |
| trade-routes | `.claude/gdd/audits/trade-routes.md` | ☐ |
| victory-paths | `.claude/gdd/audits/victory-paths.md` | ☐ |
| yields-adjacency | `.claude/gdd/audits/yields-adjacency.md` | ☐ |

**Completed:** 0 / 26

---

## Findings — by severity

Populated as audits complete. One row per finding.

### HIGH severity

| System | F-ID | Title | Status | Eff | Location | Done |
|---|---|---|---|---|---|---|
| _(no audits run yet)_ | | | | | | |

### MEDIUM severity

| System | F-ID | Title | Status | Eff | Location | Done |
|---|---|---|---|---|---|---|
| _(no audits run yet)_ | | | | | | |

### LOW severity

| System | F-ID | Title | Status | Eff | Location | Done |
|---|---|---|---|---|---|---|
| _(no audits run yet)_ | | | | | | |

---

## EXTRA items to retire

Engine mechanics that VII explicitly doesn't have — flagged for removal or repurposing.

| System | Engine element | Suggested action | Audit ref | Done |
|---|---|---|---|---|
| _(populated by audits)_ | | | | |

---

## MISSING items to implement

VII mechanics with no engine presence — flagged for greenfield implementation.

| System | Mechanic | Blocker/complexity | Audit ref | Done |
|---|---|---|---|---|
| _(populated by audits)_ | | | | |

---

## Running totals

| Status | Count |
|---|---|
| MATCH | 0 |
| CLOSE | 0 |
| DIVERGED | 0 |
| MISSING | 0 |
| EXTRA | 0 |
| **Total findings** | **0** |

Implementation progress: 0 / 0 findings resolved (0%).

---

## Next recommended action

1. Run the flagship audit: `tile-improvements` (the DIVERGED row from `gap-matrix.md`). Use `.claude/gdd/audits/_template-audit.md` as the shape. Engine file: `packages/engine/src/systems/improvementSystem.ts`.
2. Copy findings into this tracker.
3. Pick the highest-severity finding. Implement. Tick it off.
4. Repeat for next system in priority order (see `audit-process.md` → "Ordering").

**Do NOT** try to run all 26 audits at once before any implementation. The audit → implement → verify → next-audit cycle is the rhythm; batch-auditing disconnects audits from the code they describe.
