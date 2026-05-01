# Combat — hex-empires Audit

**System slug:** `combat`
**GDD doc:** [systems/combat.md](../systems/combat.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0 (per commitment.md)

---

## Engine files audited

- `packages/engine/src/systems/combatSystem.ts`
- `packages/engine/src/systems/fortifySystem.ts`
- `packages/engine/src/systems/movementSystem.ts`
- `packages/engine/src/systems/promotionSystem.ts`
- `packages/engine/src/state/CombatAnalytics.ts`
- `packages/engine/src/state/CombatPreview.ts`
- `packages/engine/src/state/PromotionUtils.ts`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 4 |
| CLOSE | 2 |
| DIVERGED | 4 |
| MISSING | 3 |
| EXTRA | 1 |

**Total findings:** 14

---

## Detailed findings

### F-01: fortify-bonus-comment-wrong --- DIVERGED

**Location:** packages/engine/src/systems/fortifySystem.ts:1-6
**GDD reference:** systems/combat.md section Fortification Bonus
**Severity:** HIGH  **Effort:** S
**VII says:** Fortify grants +5 CS on defense (flat additive).
**Engine does:** The JSDoc comment says Fortified units get +50% defense bonus but combatSystem.ts:249-253 applies strength += 5 (flat +5). Code is correct; comment contradicts the GDD.
**Gap:** Stale +50% comment in fortifySystem.ts header is a Civ-VI-ism. Civ VI used multiplicative 50%; Civ VII and engine use flat +5.
**Recommendation:** Fix header comment to +5 CS flat defense bonus (additive). One-line fix, zero behavior change.

---

### F-02: flanking-directional-vs-unit-count --- DIVERGED

**Location:** packages/engine/src/systems/combatSystem.ts:288-323
**GDD reference:** systems/combat.md section Flanking and the Battlefront System
**Severity:** HIGH  **Effort:** M
**VII says:** A directional battlefront is established on first melee hit; defending unit faces attacker; subsequent attacks from flank (90 deg) or rear (180 deg) gain CS bonuses based on direction.
**Engine does:** No facing/battlefront system. calculateFlankingBonus counts friendly military units adjacent to the defender -- +2 CS per flanker, capped at +6 (3 flankers), military_training required and 2+ flankers minimum.
**Gap:** Engine has a unit-count flanking model (Civ VI-ish), not a directional battlefront. No UnitState.facing field. VII directional bonuses (+3 flank / +6 rear) are absent.
**Recommendation:** Add facing?: HexDirection to UnitState; set on first melee engagement; calculate bonus from attack angle vs facing. Current count-based bonus can be repurposed as the separate support bonus (F-07).

---

### F-03: health-penalty-formula-diverged --- DIVERGED

**Location:** packages/engine/src/systems/combatSystem.ts:182-197 vs CombatPreview.ts:708-719
**GDD reference:** systems/combat.md section Combat Strength (CS) -- Wounded-unit penalty
**Severity:** HIGH  **Effort:** S
**VII says:** Penalty is linear: -1 CS per 10 HP lost, max -10 CS at or below 10 HP.
**Engine does:** combatSystem.ts: Math.floor((100 - unit.health) / 10) subtracted (correct flat). CombatPreview.ts:709: healthModifier = Math.floor(unit.health / 10) / 10 (a multiplier 0.0-1.0). At 50 HP on CS 30: engine=25, preview=15.
**Gap:** Two divergent health-penalty formulas. Preview shown to player is systematically wrong at non-full health. CombatPreview also omits civ/leader effect bonus (getCombatBonus).
**Recommendation:** Extract computeEffectiveCS(state, unit, context) into PromotionUtils.ts or new CombatUtils.ts. Import in both combatSystem.ts and CombatPreview.ts. Flat-subtraction formula in combatSystem.ts is correct per GDD.

---

### F-04: zoc-ranged-units-project-zoc --- DIVERGED

**Location:** packages/engine/src/systems/movementSystem.ts:234-256
**GDD reference:** systems/combat.md section Zone of Control (ZoC)
**Severity:** MED  **Effort:** S
**VII says:** Only melee and siege units project ZoC. Ranged units do NOT project ZoC.
**Engine does:** isInEnemyZoC stops movement when any adjacent enemy has category !== civilian. Ranged units (category ranged) therefore project ZoC, contradicting VII rules.
**Gap:** Ranged units wrongly project ZoC. Predicate should be category === melee || category === siege.
**Recommendation:** Change the ZoC predicate in movementSystem.ts:250 from category !== civilian to category === melee || category === siege. Low effort; ranged units no longer lock down adjacent enemy movement.

---

### F-05: damage-formula-match --- MATCH

**Location:** packages/engine/src/systems/combatSystem.ts:68-75
**GDD reference:** systems/combat.md section Damage Calculation
**Severity:** LOW  **Effort:** S
**VII says:** Damage = 30 * e^(StrengthDiff / 25) * Random(0.75, 1.25). Melee is simultaneous; ranged is one-sided.
**Engine does:** Exactly matches: 30 * Math.exp(strengthDiff / 25) * modifier for attacker; 30 * Math.exp(-strengthDiff / 25) * modifier for defender; ranged units give 0 return damage.
**Gap:** None. Formula and ranged one-sidedness both match the GDD.
**Recommendation:** No change needed.

---

### F-06: healing-rates-match --- MATCH

**Location:** packages/engine/src/systems/turnSystem.ts:117-172
**GDD reference:** systems/combat.md section Healing
**Severity:** LOW  **Effort:** S
**VII says:** In city: ~20 HP/turn; own territory: ~15 HP; neutral: ~10 HP; enemy territory: 5-10 HP.
**Engine does:** getHealAmount returns 20 (city), 15 (own territory), 10 (neutral), 5 (enemy territory). Healing skipped when movementLeft === 0.
**Gap:** Enemy territory rate is 5 HP (lower bound of GDD source conflict). GDD edge case 6 (fortified in enemy territory heals at higher rate) is not implemented.
**Recommendation:** Minor -- if unit.fortified and base === 5, upgrade base to 10 HP/turn per GDD edge case 6. Core rates are correct.

---

### F-07: support-bonus-missing-standalone --- CLOSE

**Location:** packages/engine/src/systems/combatSystem.ts:326-337
**GDD reference:** systems/combat.md section Support Bonus
**Severity:** MED  **Effort:** S
**VII says:** +2 CS per adjacent friendly unit. Any adjacent friendly provides it; no minimum count.
**Engine does:** checkAdjacentAlly returns a boolean. The flanking count bonus (+2 per flanker, min 2) conflates flanking with support. No standalone flat +2 per adjacent friendly is applied in base strength.
**Gap:** GDD distinguishes flanking (directional, tech-gated) from support (unit-count, always available). Engine merges them with a min-2 threshold more resembling flanking than support.
**Recommendation:** Implement support as separate calculateSupportBonus: count all adjacent friendlies, multiply by 2, no minimum. Apply to both attacker and defender independently.

---

### F-08: war-support-penalty-match --- MATCH

**Location:** packages/engine/src/systems/combatSystem.ts:200-232
**GDD reference:** systems/combat.md section War Support
**Severity:** LOW  **Effort:** S
**VII says:** Each point of negative War Support grants the opposing player +1 CS in all combat.
**Engine does:** calculateWarSupportPenalty penalizes player at disadvantage (-1 CS per negative war support point), capped at 10 CS.
**Gap:** Cap is 10 (engine) vs inferred floor (GDD). The cap of 10 is within the GDD estimated range.
**Recommendation:** No change needed.

---

### F-09: siege-district-hp-model-missing --- MISSING

**Location:** packages/engine/src/systems/combatSystem.ts:340-496
**GDD reference:** systems/combat.md section Siege Mechanics
**Severity:** HIGH  **Effort:** L
**VII says:** Settlements have multiple district tiles each with independent HP (100 base, 200 with walls). All districts must fall before the City Center tile can be captured. Siege units split damage between district HP and unit inside.
**Engine does:** Cities have a single defenseHP bar (100 or 200 with walls). No individual district tiles. ATTACK_CITY targets the full city HP pool.
**Gap:** Multi-district siege model is entirely absent. Engine uses simplified single-HP city model (Civ VI-ish). No DistrictState, no per-district HP, no sequential district destruction, no split-damage Siege ability.
**Recommendation:** L-effort architectural change. Requires: DistrictState with independent HP, ATTACK_DISTRICT action, capture logic requiring all districts destroyed first. Defer to city/district system redesign milestone.

---

### F-10: unit-xp-magic-numbers --- CLOSE

**Location:** packages/engine/src/systems/combatSystem.ts:99-105, 147-149
**GDD reference:** systems/combat.md Formulas section (inferred)
**Severity:** LOW  **Effort:** S
**VII says:** XP curve not explicitly documented; promotion thresholds drive tier gating.
**Engine does:** Attacker gains +5 XP per combat; defender gains +3 XP. Hardcoded in-line in combatSystem.ts.
**Gap:** XP award values are magic numbers not driven by data/config.
**Recommendation:** Move XP award values to state.config or a constants file for tuning.

---

### F-11: civilian-capture-missing --- MISSING

**Location:** packages/engine/src/systems/combatSystem.ts (entire file)
**GDD reference:** systems/combat.md section Retreat -- Capture vs kill subsection
**Severity:** MED  **Effort:** M
**VII says:** Civilian units (Settlers, Builders, Scouts) are captured not killed when a military unit enters their tile. Military units at 0 HP are always eliminated.
**Engine does:** All units at 0 HP are deleted from the map. No distinction between military elimination and civilian capture exists.
**Gap:** Civilian capture is entirely absent. Settlers/builders are deleted instead of changing ownership, removing a core Civ VII strategic interaction.
**Recommendation:** After defender HP reaches 0: if defender category is civilian and attacker is military, transfer ownership to attacker instead of deleting. Medium effort.

---

### F-12: promotion-system-match --- MATCH

**Location:** packages/engine/src/systems/promotionSystem.ts:1-68
**GDD reference:** systems/combat.md (cross-ref to promotions system)
**Severity:** LOW  **Effort:** S
**VII says:** Promotions are per-unit-category; units earn XP through combat; promotion tier gates which promotions are available; some promotions heal on award.
**Engine does:** promotionSystem checks category match, XP threshold via PROMOTION_THRESHOLDS[tier], deducts XP on promotion, applies HEAL_ON_PROMOTE effect. Config-driven via state.config.promotions.
**Gap:** None significant. Promotion system is well-aligned with VII concepts and avoids ALL_X globals.
**Recommendation:** No change needed.

---

### F-13: combat-preview-formula-divergence --- DIVERGED

**Location:** packages/engine/src/state/CombatPreview.ts:701-719 vs combatSystem.ts:182-197
**GDD reference:** systems/combat.md sections Damage Calculation and Combat Strength (CS)
**Severity:** HIGH  **Effort:** S
**VII says:** Effective CS must be calculated consistently in all contexts -- preview must match actual resolution.
**Engine does:** CombatPreview.ts has its own copy of getEffectiveCombatStrength using a multiplicative health scalar (Math.floor(unit.health / 10) / 10) and omitting getCombatBonus. combatSystem.ts uses flat subtraction and includes the effect bonus. Two divergent formulas in the same codebase.
**Gap:** Player sees incorrect preview odds. At 50 HP on CS 30 unit: preview shows 15 effective CS, engine resolves at 25 effective CS. Preview also omits civ/leader combat effect bonuses entirely.
**Recommendation:** Extract computeEffectiveCS(state, unit, context) into PromotionUtils.ts or new CombatUtils.ts. Import in both combatSystem.ts and CombatPreview.ts. S-effort refactor with high player-experience impact.

---

### F-14: first-strike-bonus-extra --- EXTRA

**Location:** packages/engine/src/systems/combatSystem.ts:187-191
**GDD reference:** systems/combat.md (not mentioned anywhere)
**Severity:** MED  **Effort:** S
**VII says:** No First Strike bonus for attacking at full HP is mentioned in the GDD or any sourced Civ VII material.
**Engine does:** Applies +5 CS when attacking at full HP (firstStrikeBonus = isAttacking && unit.health === 100 ? 5 : 0). No VII basis.
**Gap:** Custom mechanic not present in Civ VII. Distorts strategic balance by incentivizing attacking before healing.
**Recommendation:** Remove firstStrikeBonus from base combat calculation. If desired as custom hex-empires mechanic, move to a named FIRST_STRIKE promotion effect so it is explicit and data-driven.

---

## Extras to retire

- combatSystem.ts:187-191 -- firstStrikeBonus (+5 CS at full HP) has no VII basis; retire or move to a named promotion.
- fortifySystem.ts:4-6 -- Header comment +50% defense bonus is a Civ-VI-ism; fix the comment.

---

## Missing items (not yet implemented)

- **Directional battlefront / facing** (UnitState.facing) -- required for VII flanking model; absent entirely.
- **Multi-district siege model** -- VII requires per-district HP pools and sequential destruction; engine has single city HP bar.
- **Civilian unit capture** -- settlers/builders should be captured not killed; currently all 0-HP units are deleted.
- **bombardStrength separation** -- GDD defines a separate bombardStrength for siege units vs fortified districts/naval; engine uses single rangedCombat field.

---

## Mapping recommendation for GDD system doc

Paste into .codex/gdd/systems/combat.md section Mapping to hex-empires:

Status: 4 MATCH / 2 CLOSE / 4 DIVERGED / 3 MISSING / 1 EXTRA (audit: .codex/gdd/audits/combat.md)
Highest-severity: F-03/F-13 -- CombatPreview uses multiplicative health scalar; combatSystem uses flat subtraction. Fix: extract shared computeEffectiveCS utility.

---

## Open questions

1. Should bombardStrength (vs fortifications/naval) be a separate UnitDef field from rangedStrength? GDD models them separately; engine conflates into rangedCombat.
2. What is the canonical XP value for attack and defense awards? Engine uses hardcoded +5/+3; no VII source confirms these.
3. Should the First Strike bonus be retained as a custom hex-empires mechanic or retired for VII purity?
4. ZoC fix (F-04) will change AI behavior since ranged units currently pin enemies -- verify AI tactics still work after the fix.

---

## Effort estimate

| Bucket | Findings | Estimated total effort |
|---|---|---|
| S (half-day) | F-01, F-03, F-04, F-06, F-10, F-12, F-13, F-14 | ~4h |
| M (1-3 days) | F-02, F-07, F-11 | ~6d |
| L (week+) | F-09 | ~2w |
| **Total** | 14 findings | **~3w** |

Recommended order: F-13 then F-03 (unify preview/combat formula -- highest player-experience impact, S effort) -> F-04 (ZoC ranged fix) -> F-14 (retire First Strike) -> F-01 (comment fix) -> F-07 (support bonus) -> F-02 (directional flanking) -> F-11 (civilian capture) -> F-09 (district siege model).

---
