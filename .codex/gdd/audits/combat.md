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
| MATCH | 11 |
| CLOSE | 3 |
| DIVERGED | 0 |
| MISSING | 0 |
| EXTRA | 0 |

**Total findings:** 14

---

## Detailed findings

### F-01: fortify-bonus-comment-wrong --- MATCH

**Location:** packages/engine/src/systems/fortifySystem.ts:1-6
**GDD reference:** systems/combat.md section Fortification Bonus
**Severity:** HIGH  **Effort:** S
**VII says:** Fortify grants +5 CS on defense (flat additive).
**Engine does:** `fortifySystem.ts` now documents a flat +5 combat-strength defense bonus, and `combatSystem.ts` applies the same flat +5 when a fortified unit defends.
**Gap:** None. The stale Civ VI-style +50% wording has been removed.
**Recommendation:** Keep fortify documentation aligned with `combatSystem.getEffectiveDefenseStrength` if the defense formula changes.

---

### F-02: flanking-directional-vs-unit-count --- MATCH

**Location:** packages/engine/src/state/CombatAnalytics.ts:55-104; packages/engine/src/systems/combatSystem.ts:320-340,445-469; packages/engine/src/state/CombatPreview.ts:730-749,806-808
**GDD reference:** systems/combat.md section Flanking and the Battlefront System
**Severity:** HIGH  **Effort:** M
**VII says:** A melee engagement establishes a directional battlefront without manual facing; attacks from front-side, rear-side, and direct-rear vulnerable positions gain +2/+3/+5 CS once Military Training is unlocked. Source refresh 2026-05-03: Firaxis Dev Diary #5 confirms automatic battlefront facing; Fandom Combat_(Civ7) exposes the angle bonus values.
**Engine does:** `UnitState.facing` exists. Surviving melee unit combat locks attacker and defender to face each other. `calculateBattlefrontFlankingBonus` requires Military Training, a defender facing, a same-owner melee/cavalry anchor on the defender's front tile, and a melee/cavalry attacker; then applies +2/+3/+5 by attack angle. `combatSystem` and `CombatPreview` both use the shared helper.
**Gap:** None for the audited battlefront/flanking core. Commander and promotion modifiers that amplify flanking are still separate content/effect work.
**Recommendation:** Keep all live and preview flanking logic routed through `CombatAnalytics.calculateBattlefrontFlankingBonus`; do not reintroduce count-based flanking outside the standalone support bonus.

---

### F-03: health-penalty-formula-diverged --- MATCH

**Location:** packages/engine/src/state/CombatAnalytics.ts:4-27; packages/engine/src/systems/combatSystem.ts:301-331; packages/engine/src/state/CombatPreview.ts:705-743
**GDD reference:** systems/combat.md section Combat Strength (CS) -- Wounded-unit penalty
**Severity:** HIGH  **Effort:** S
**VII says:** Wounded-unit penalty is additive: `round(10 - HP / 10)`, capped at -10 CS below 10 HP. Source refresh 2026-05-03: Fandom Combat_(Civ7) exposed this formula directly.
**Engine does:** `computeEffectiveCS` now implements the rounded additive penalty and both `combatSystem` and `CombatPreview` use that helper for HP-to-CS math.
**Gap:** None for the wounded-unit formula. Broader effective-strength code is still duplicated between live combat and preview, but the HP formula and active combat-effect inclusion match.
**Recommendation:** Keep `computeEffectiveCS` as the single HP-to-CS helper. If combat modifiers continue to grow, extract a fuller shared effective-strength utility in a later cleanup.

---

### F-04: zoc-ranged-units-project-zoc --- MATCH

**Location:** packages/engine/src/systems/movementSystem.ts:234-256
**GDD reference:** systems/combat.md section Zone of Control (ZoC)
**Severity:** MED  **Effort:** S
**VII says:** Only melee and siege units project ZoC. Ranged units do NOT project ZoC.
**Engine does:** `isInEnemyZoC` only returns true for adjacent enemy units whose category is `melee` or `siege`. Movement tests cover both ranged enemies not projecting ZoC and melee enemies still stopping movement.
**Gap:** None for the current ZoC projector predicate.
**Recommendation:** Keep the ranged/non-ranged regression tests when movement rules are refactored.

---

### F-05: damage-formula-match --- MATCH

**Location:** packages/engine/src/state/CombatAnalytics.ts:40-58; packages/engine/src/systems/combatSystem.ts:99-112,602-614,811-825; packages/engine/src/state/CombatPreview.ts:257-264,594-601
**GDD reference:** systems/combat.md section Damage Calculation
**Severity:** LOW  **Effort:** S
**VII says:** Damage = `30 * e^((ln(100/30)/30) * StrengthDiff) * Random(0.70, 1.30)`. Melee is simultaneous; ranged is one-sided. Source refresh 2026-05-03: Fandom Combat_(Civ7) exposes the exact formula.
**Engine does:** `computeCombatDamageFromRoll` implements the sourced formula and is used for unit, city, and district combat. `CombatPreview` uses the same helper constants for min/max damage ranges. Ranged unit attacks still give 0 return damage.
**Gap:** None for the sourced damage formula and range.
**Recommendation:** Keep all damage calculations routed through `CombatAnalytics` helpers.

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

### F-07: support-bonus-standalone --- MATCH

**Location:** packages/engine/src/systems/combatSystem.ts:326-337
**GDD reference:** systems/combat.md section Support Bonus
**Severity:** MED  **Effort:** S
**VII says:** +2 CS per adjacent friendly unit. Any adjacent friendly provides it; no minimum count.
**Engine does:** `combatSystem` and `CombatPreview` now apply a standalone support bonus of +2 CS per adjacent friendly unit, independently for attacker and defender. The bonus is not limited to a `support` unit category and has no minimum count.
**Gap:** None for standalone support. Directional battlefront flanking is handled separately in F-02.
**Recommendation:** Keep preview and live resolution helpers aligned whenever flanking/support math changes.

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

### F-09: siege-district-hp-model-partial --- CLOSE

**Location:** packages/engine/src/state/DistrictSiege.ts:1-34; packages/engine/src/systems/combatSystem.ts:500-837; packages/engine/src/state/CombatPreview.ts:430-709
**GDD reference:** systems/combat.md section Siege Mechanics
**Severity:** HIGH  **Effort:** L
**VII says:** Fortified districts have independent HP and must be destroyed/captured before a settlement can fall. The City Center is always a fortified district. Units stationed in fortified districts are protected from damage except siege bombardment. Source refresh 2026-05-03: Firaxis Dev Diary #5 confirms district-by-district siege; Fandom District_(Civ7) documents 100 HP fortified districts, 200 HP walled City Center, per-district capture, and siege-only garrison damage.
**Engine does:** `CityState.districtHPs` tracks per-district HP. `ATTACK_DISTRICT` targets one district tile, lazily initializes city-center 200 HP plus outer urban tiles at 100 HP, blocks district attacks on the center while outer districts stand, and writes HP back. `ATTACK_CITY`, `calculateCityCombatPreview`, and `getAttackableCities` now block the legacy city-center path while standing outer district HP exists.
**Gap:** Partial scaffold only. Destroying an outer district does not transfer district ownership/control, occupy/flip a district tile, deprive yields, or drive unrest. Siege damage is not split to a garrisoned unit inside the district. Per-tile wall state, wall age obsolescence/regeneration, naval district capture, UI targeting of non-center districts, and AI use of `ATTACK_DISTRICT` remain missing. Legacy `defenseHP` still exists for city-center/back-compat combat once outer districts are down.
**Recommendation:** Keep this CLOSE until the district capture/control model lands. Next safe slices: wire UI/AI to choose `ATTACK_DISTRICT`; add garrison protection plus siege split damage; then model district control and settlement capture side effects.

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

### F-11: civilian-capture-missing --- MATCH

**Location:** packages/engine/src/systems/movementSystem.ts:362-431; packages/engine/src/systems/__tests__/movementSystem.test.ts:588
**GDD reference:** systems/combat.md section Retreat -- Capture vs kill subsection
**Severity:** MED  **Effort:** M
**VII says:** Civilian units (Settlers, Builders, Scouts) are captured not killed when a military unit enters their tile. Military units at 0 HP are always eliminated.
**Engine does:** `movementSystem` resolves civilian/religious capture after movement: eligible combat units transfer ownership of enemy settler, explorer, merchant, or missionary units on the destination tile and zero the captured unit's movement. Tests cover settler, explorer, merchant, and missionary capture.
**Gap:** None for movement-entry capture. `ATTACK_UNIT` still deletes units at 0 HP, but civilian capture is modeled through the movement path that enters the civilian's hex.
**Recommendation:** Keep capture behavior in movement unless the action model gains an explicit civilian attack/capture command.

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

### F-13: combat-preview-formula-divergence --- MATCH

**Location:** packages/engine/src/state/CombatPreview.ts:705-743; packages/engine/src/systems/combatSystem.ts:301-331; packages/engine/src/state/CombatAnalytics.ts:4-27
**GDD reference:** systems/combat.md sections Damage Calculation and Combat Strength (CS)
**Severity:** HIGH  **Effort:** S
**VII says:** Effective CS must be calculated consistently in all contexts -- preview must match actual resolution.
**Engine does:** `combatSystem` and `CombatPreview` both call `computeEffectiveCS` for wounded CS, both include civ/leader `MODIFY_COMBAT` effects, resource combat bonuses, commander aura, support, war-support penalty, river penalty, and ability-gated First Strike in their attack-strength paths. Focused preview parity tests cover the shared HP formula and damage preview/resolution agreement.
**Gap:** None for the audited preview/live divergence. The two files still duplicate modifier assembly, so future combat changes should keep adding paired tests.
**Recommendation:** Keep preview parity tests near every combat-strength change. Consider extracting the full effective-strength helper if modifier assembly continues to grow.

---

### F-14: first-strike-ability-support --- CLOSE

**Location:** packages/engine/src/state/CombatAnalytics.ts:20-46; packages/engine/src/state/CommanderAura.ts:51-102; packages/engine/src/systems/combatSystem.ts:301-331; packages/engine/src/state/CombatPreview.ts:281-299, 614-632, 705-743
**GDD reference:** systems/combat.md section Combat Strength (CS)
**Severity:** MED  **Effort:** S
**VII says:** First Strike is a unit ability that provides +5 CS when the unit is at full HP. Source refresh 2026-05-03: Fandom Unit_(Civ7) lists First Strike as a passive unit ability, and Fandom List_of_promotions_in_Civ7 lists Army Commander Assault IV Advancement as granting First Strike to Infantry and Cavalry units in Command Radius.
**Engine does:** First Strike is ability-gated in live combat and preview. Native UnitDef `first_strike` still works, and Commander Aura now supports `AURA_GRANT_ABILITY`; `assault_advancement` grants `first_strike` to melee/cavalry attackers in radius when the commander has that promotion on either CommanderState or UnitState. Focused analytics, preview, and live-combat tests cover the commander-granted path.
**Gap:** Army Commander Advancement is represented, but the broader commander promotion tree is still not canonically shaped; Fleet Commander `Fusillade`, air/packed-fighter ability grants, and any unit-native First Strike content still need source-by-source audit.
**Recommendation:** Keep First Strike mechanics here; resolve remaining source-specific ability grants through commanders F-03 and unit-content audit rather than making First Strike universal.

---

## Extras to retire

None currently tracked for combat.

---

## Missing items (not yet implemented)

- **bombardStrength separation** -- GDD defines a separate bombardStrength for siege units vs fortified districts/naval; engine uses single rangedCombat field.

---

## Mapping recommendation for GDD system doc

Paste into .codex/gdd/systems/combat.md section Mapping to hex-empires:

Status: 11 MATCH / 3 CLOSE / 0 DIVERGED / 0 MISSING / 0 EXTRA (audit: .codex/gdd/audits/combat.md)
Highest-severity: F-09 -- Multi-district siege model remains partial.

---

## Open questions

1. Should bombardStrength (vs fortifications/naval) be a separate UnitDef field from rangedStrength? GDD models them separately; engine conflates into rangedCombat.
2. What is the canonical XP value for attack and defense awards? Engine uses hardcoded +5/+3; no VII source confirms these.
3. Which canonical unit definitions should receive the `first_strike` ability?
4. Are current AI tactics still calibrated after ranged units stopped projecting ZoC?

---

## Effort estimate

| Bucket | Findings | Estimated total effort |
|---|---|---|
| S (half-day) | F-10, F-14 content assignment | ~1h |
| L (week+) | F-09 | ~2w |
| **Total** | 3 open findings | **~2w** |

Recommended order: F-14 content assignment (unit data only, after unit source audit) -> F-09 (district siege model).

---
