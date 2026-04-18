# Crises — Civ VII

**Slug:** `crises`
**Bucket:** `ages`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

Every factual claim in the sections below MUST trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/ages/ — Firaxis Dev Diary #1: Ages
- https://game8.co/games/Civ-7/archives/497227 — Game8: Civ 7 Crisis Explained
- https://www.thegamer.com/civilization-7-vii-all-crisis-crises-guide/ — The Gamer: Every Type of Crisis Explained
- https://www.thegamer.com/civilization-7-policy-card-guide/ — The Gamer: Policy and Crisis Cards Guide
- https://gameranx.com/features/id/531278/article/civilization-7-all-crisis-events/ — Gameranx: All Crisis Events
- https://gamerant.com/civ-7-gameplay-crisis-system-explained/ — Game Rant: Crisis System Explained
- https://screenrant.com/civ-7-crisis-mechanic-real-world-events/ — Screen Rant: Crisis Mechanic Details

**Source conflicts noted:** Slot progression has minor variation across sources. The three-stage model (2 slots / 3 slots / 4 slots at 70/80/90%) has the most corroboration and is used here. The exact threshold for the fourth slot addition is unverified.

---

## Purpose

Crises are a mandatory late-age adversity system that activates near the end of the Antiquity and Exploration ages. They serve two design purposes: first, to prevent late-age play from becoming a formality by maintaining tension all the way to the age transition; second, to create historically-themed dramatic beats — the collapse and transformation that precedes each age of renewal. Firaxis describes the design inspiration as the historical pattern of "creation, growth, crisis, and rebirth." Crises also gate the age transition: a player cannot advance to the next age without engaging with the crisis policy system, ensuring every age ends under pressure rather than by passive milestone accumulation.

---

## Entities

- `GameState.crisisPhase` — (RW) — tracks which crisis stage is active (`none | stage1 | stage2 | stage3`)
- `GameState.crisisType` — (RW) — which crisis was randomly selected for this age (`plague | revolt | invasion` for Antiquity; `plague | revolution | warsOfReligion` for Exploration)
- `GameState.ageProgress` — (R) — percentage of age completion (0.0–1.0); crisis trigger thresholds evaluated against this
- `PlayerState.crisisPolicies` — (RW) — array of crisis policies the player has slotted (max 4 entries at final stage)
- `PlayerState.crisisPolicySlots` — (RW) — count of required crisis policy slots that must be filled before END_TURN is accepted
- `CityState.happiness` — (RW) — read and modified by Revolt / Revolution crisis effects; happiness at or below −1 triggers building damage
- `CityState.infected` — (RW) — set by Plague crisis; causes productivity loss in affected urban/rural district tiles
- `CityState.religion` — (R) — read by Wars of Religion crisis to determine which policy branches are available
- `UnitState.maintenanceCost` — (RW) — increased by Invasion crisis policies [INFERRED]
- `IndependentPower.hostility` — (RW) — Invasion crisis spawns and escalates hostile independent powers each stage
- `PlayerState.crisisLegacyUnlocked` — (RW) — set true when player reaches age transition having survived the crisis; unlocks a special crisis legacy bonus

---

## Triggers

- **On END_TURN, when `ageProgress` crosses 70%:** crisis activates; `crisisPhase` = `stage1`; `crisisPolicySlots` = 2. Player cannot end turns with unfilled slots.
- **On END_TURN, when `ageProgress` crosses 80%:** `crisisPhase` = `stage2`; `crisisPolicySlots` = 3. Third slot must be filled.
- **On END_TURN, when `ageProgress` crosses 90%:** `crisisPhase` = `stage3`; `crisisPolicySlots` = 4. Final maximum pressure. [INFERRED: exact threshold for 4th slot may be 90% or slightly beyond; 70/80/90 three-stage pattern is most consistently cited]
- **On END_TURN with unfilled crisis slots:** turn is blocked. UI indicates how many slots remain unfilled.
- **On age transition completion:** `crisisPhase` resets to `none`; all crisis policy slots clear; `crisisLegacyUnlocked` is evaluated and carried into the transition screen.
- **Modern age exception:** crises do NOT occur in the Modern age. The Modern age ends the game via victory condition; no further transition follows, so no crisis gate applies.

---

## Mechanics

### Crisis selection and theming

At age initialization, one crisis type is randomly selected from the pool for that age:

- **Antiquity age pool (3 options, 1 selected):** Plague, Revolt, Invasion
- **Exploration age pool (3 options, 1 selected):** Plague, Revolution, Wars of Religion
- **Modern age:** No crisis

Selection is independent per age. The same crisis type (Plague) can appear in both Antiquity and Exploration in the same game. Each age crisis resolves independently; Antiquity Plague does not carry into Exploration.

The selected crisis is thematically consistent for the entire age. Crisis policies available to the player are drawn exclusively from the pool for the active crisis type.

### Crisis stages and progressive pressure

A crisis runs in three escalating stages tied to age progress thresholds:

1. **Stage 1 (ageProgress >= 70%):** Two crisis policy slots open. Player must fill both before END_TURN.
2. **Stage 2 (ageProgress >= 80%):** Third slot opens. Player must fill all three.
3. **Stage 3 (ageProgress >= 90%):** Fourth (maximum) slot opens. Player must fill all four.

Policies selected at each stage are **cumulative**: all slotted policies remain active and their penalties stack for the entire remainder of the age. Policies do not expire when the next stage unlocks. The crisis ends only at the age transition; all policy slots clear after transition.

### Crisis Policy mechanics

Crisis Policies are a distinct mandatory Social Policy category occupying dedicated slots separate from standard Social Policy slots.

**Key properties:**

- **Mandatory.** No unfilled crisis slot can persist past END_TURN. The player cannot opt out mid-game. (Crises can be disabled via Advanced Options before game start, but not once in progress.)
- **Negative-leaning with conditional trade-offs.** Most crisis policies impose penalties. Some offer offsetting benefits for specific situations — e.g., a Plague crisis policy might raise unit maintenance costs but grant bonus Science to infected Science buildings, rewarding heavy Science investment.
- **Empire-size scaling.** Crisis policy severity scales with empire size. Larger empires face harsher penalties, inverting the usual advantage of a wide empire.
- **Thematic.** Available policy pool is specific to the active crisis type. A Plague crisis draws from plague-response policies; an Invasion crisis draws from military/defense policies.
- **No activation cost.** There is no resource expenditure (Gold, Production) to slot a crisis policy. The ongoing effect of the slotted policy is itself the cost.
- **Cumulative.** All staged policies stack and remain active for the rest of the age.

### Plague crisis (Antiquity and Exploration)

Plague infects settlement tiles, degrading productivity:

- **Infected tiles:** urban and rural district tiles lose yields (production loss and general yield suppression) while infected.
- **Spread:** plague spreads to neighboring settlements; unchecked spread can affect multiple cities.
- **Unit risk:** units stationed in infected settlements risk damage or death each turn.
- **Antiquity variant:** considered the hardest Antiquity crisis; minimal medical tools exist in this era. Recommended responses: relocate units from infected settlements; boost happiness to prevent revolt cascades; use crisis policies that slow spread or reduce damage.
- **Exploration variant:** faster spread rate, but mitigated by the **Physician unit** — a civilian unit exclusive to the Exploration age when Plague is the active crisis. Physicians can be produced, moved to infected settlements, and used to clear the infection. Approximate production cost: 400–500 Gold [INFERRED: one secondary source; exact value unverified]. The tech or civic prerequisite for unlocking Physicians is not confirmed in available sources.

### Revolt crisis (Antiquity)

Revolt drives settlement happiness into negative territory empire-wide:

- **Revolt threshold:** any settlement at Happiness <= −1 immediately enters Revolt state.
- **Damage tick:** each turn a settlement is in Revolt, one Building or Improvement is damaged.
- **Secession risk:** sustained Revolt (multiple turns unresolved) causes the settlement to defect to a neighboring civilization.
- **Empire-size pressure:** an empire with many settlements is harder to keep above the happiness floor simultaneously, making Revolt disproportionately punishing for the dominant player.
- **Recommended responses:** maximize Happiness via improvements, trade routes, and happiness-boosting policies; direct crisis policies toward less critical settlement types.

### Invasion crisis (Antiquity)

Invasion manifests as an external military threat spawned by the crisis system:

- **Hostile independent powers:** new hostile independent powers appear in unclaimed spaces between player territories and actively attack units and cities.
- **Escalation per stage:** the same independent powers return and grow stronger at each crisis stage. Neglecting Stage 1 invaders makes Stage 3 significantly harder.
- **Unit maintenance pressure:** [INFERRED] crisis policies tied to Invasion impose higher unit maintenance costs, representing wartime mobilization strain.
- **Assessment:** generally considered the most manageable Antiquity crisis for militaristic players; rewards existing military investment.

### Revolution crisis (Exploration)

Revolution is a multi-yield degradation crisis, distinct from the Antiquity Revolt:

- **Multi-yield degradation:** unlike Revolt (happiness-targeted), Revolution reduces multiple yield types simultaneously. Any yield category may be affected.
- **Foreign religion accelerant:** settlements with Happiness <= −1 AND a foreign religion skip the Unrest intermediate state and immediately enter full Revolt, accelerating the threat.
- **Secession risk:** same mechanics as Revolt; sustained negative conditions lead to settlement loss.
- **Broader policy options:** Revolution offers a wider variety of crisis policy responses than Revolt, enabling more strategic differentiation.

### Wars of Religion crisis (Exploration)

Wars of Religion activates the age religious mechanics as an adversarial conflict:

- **Aggressive religion spread:** all civilizations spread their religions aggressively; settlements with foreign religions face pressure.
- **Dualistic response structure:**
  - *Convert-and-consolidate path:* players who have spread their own religion to many cities gain bonuses from those conversions.
  - *Tolerance path:* players who embraced multiple religions within their borders can select policies that leverage that diversity for benefits.
  - *No-religion penalty:* players who ignored religion infrastructure have no viable offsetting path.
- **Policy alignment:** available crisis policies align with one of the two strategic branches. The player commits to an approach and fills their slots accordingly.

### Crisis legacy bonuses

Reaching the age transition with the empire intact after the crisis unlocks a **Crisis Legacy Bonus** at the transition screen:

- A special bonus category distinct from the four standard Legacy Path categories.
- Costs 2 legacy points to claim (same as standard legacy bonuses).
- Thematically reflects the crisis survived and how the civilization adapted.
- Confirmed example: surviving the Exploration Plague unlocks the ability to convert Hospitals into Plague Hospitals in the new age.
- [INFERRED: the complete set of crisis legacy bonuses per crisis type is not documented in available sources. The Plague/Plague Hospital example is the only sourced concrete case.]

---

## Formulas

```
crisisStage:
  ageProgress < 0.70  -> none
  ageProgress >= 0.70 -> stage1
  ageProgress >= 0.80 -> stage2
  ageProgress >= 0.90 -> stage3

requiredPolicySlots:
  none   -> 0
  stage1 -> 2
  stage2 -> 3
  stage3 -> 4

revoltThreshold    = -1   // happiness; settlement enters Revolt when happiness <= revoltThreshold
buildingDamageRate =  1   // buildings/improvements damaged per turn while in Revolt state

physicianCost_gold = ~450 // [INFERRED: sourced as 400-500 Gold; exact value unverified]

crisisPenalty = basePenalty * empireScalingFactor(settlementsOwned)
  // empireScalingFactor > 1.0 for larger empires [INFERRED: formula not published]
```

Where:
- `ageProgress` = age completion fraction (0.0–1.0), driven by legacy milestones and Future Tech/Civic research
- `revoltThreshold` = −1 Happiness, confirmed from multiple community sources
- `buildingDamageRate` = 1 per turn, confirmed
- `physicianCost_gold` = approximately 400–500 Gold [INFERRED]
- `empireScalingFactor` = scales with settlement count or total empire yield; exact formula not published by Firaxis

Crisis policy base penalties are content-defined per policy card and not published as a global table.

---

## Interactions

- `systems/ages.md` — age transition cannot fire while any crisis policy slot is unfilled; crisis stage thresholds are evaluated against age progress maintained by the ages system.
- `systems/legacy-paths.md` — legacy milestone completion drives age progress, which advances crisis stages; aggressive sprint strategies trigger the crisis sooner.
- `systems/religion.md` — Wars of Religion crisis reads religious spread state to determine available policy branches; religion infrastructure built during Exploration directly shapes crisis strategy.
- `systems/victory-paths.md` — aggressive legacy milestone completion accelerates age progress and therefore crisis onset.
- `systems/government-policies.md` — crisis policies occupy a dedicated slot category in the policy UI; the policy-slotting infrastructure is shared.
- `systems/independent-powers.md` — Invasion crisis spawns hostile independent powers and escalates their hostility using the independent powers system.
- `systems/narrative-events.md` — [INFERRED] some crisis scenarios may integrate with narrative event tags; Firaxis describes crises as historically-inspired themed scenarios suggesting narrative event tie-ins.

---

## Content flowing through this system

- [`content/crisis-cards/antiquity/`](../content/crisis-cards/antiquity/) — Plague, Revolt, Invasion crisis definitions and their policy pools
- [`content/crisis-cards/exploration/`](../content/crisis-cards/exploration/) — Plague, Revolution, Wars of Religion crisis definitions and their policy pools
- [`content/policies/`](../content/policies/) — Crisis Policy cards (tagged as crisis type within this folder)
- [`content/units/exploration/`](../content/units/exploration/) — Physician unit (Exploration Plague-exclusive civilian)

---

## VII-specific (how this differs from VI/V)

- **Mandatory transition gate** — Civ VI dark-age / golden-age was a passive era score consequence; no active policy engagement was required to advance. In VII, unfilled crisis slots block END_TURN entirely.
- **Progressive slot escalation** — VI selected dark-age policies in one batch at dark-age entry. VII stages the crisis across three thresholds (70/80/90%), adding one mandatory slot per stage and sustaining tension across 30% of the age.
- **Age-specific crisis pools** — each Civ VII age has its own thematically distinct crisis types. VI had no per-era crisis type differentiation.
- **Crisis legacy bonuses** — surviving a crisis unlocks a special legacy category at transition. No equivalent in VI.
- **Empire-size scaling** — larger empires face proportionally harder crisis penalties, inverting the normal advantage of width. VI dark-age penalties were not empire-size-scaled.
- **No crisis in the final age** — the Modern age has no crisis phase; it ends the game via victory condition. VI had no equivalent three-act final-age structure.
- **Crisis-exclusive unit (Physician)** — the Exploration Plague introduces a civilian unit tied to crisis resolution. First instance of a crisis-exclusive unit type in the main series.
- **Optional opt-out (pre-game only)** — crises can be disabled in Advanced Options before game start. No equivalent opt-out existed for VI dark-age mechanics.

---

## UI requirements

- **Crisis Policy panel:** activates at 70% age progress. Shows: active crisis name and type, current stage (1/2/3), required slot count, available policy cards with effects, currently slotted policies. All slots must be filled before END_TURN is accepted.
- **Crisis stage notification:** prominent notification when crisis first activates (70%) and when each new stage triggers (80%, 90%). Communicates new slot count and available policy options.
- **Age progress indicator (TopBar):** the crisis zone (70–100%) should be visually distinct in the age progress meter — e.g. a colored danger zone.
- **END_TURN blocked indicator:** when crisis slots are unfilled, END_TURN button is visually blocked with tooltip: "Fill all Crisis Policy slots to end your turn."
- **Crisis legacy panel (at age transition):** the unlocked crisis legacy bonus appears as a distinct selectable row at the transition screen alongside standard legacy bonuses; costs 2 legacy points to claim.
- **Physician unit actions (Exploration Plague only):** civilian unit action button for Treat Settlement ability; map tile overlay indicating currently infected settlements.
- **Revolt indicator (city/town HUD):** settlements in Revolt display a warning overlay; tooltip shows turns until potential secession.

---