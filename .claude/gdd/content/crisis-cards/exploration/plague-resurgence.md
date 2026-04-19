# Plague Resurgence (Exploration) — Civ VII

**Slug:** `plague-resurgence`
**Category:** `crisis-card`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://gamerant.com/civilization-vii-civ-7-how-cure-plague/ — primary; full policy card list
- https://xboxplay.games/civilization-7/how-to-cure-the-plague-in-civilization-7-62060
- https://www.thegamer.com/civilization-7-vii-all-crisis-crises-guide/

## Identity

- Historical period: Black Death, bubonic plague resurgences of 14th–17th centuries
- In-game crisis title: "The Death Ship"
- Same disease vector as Antiquity Plague; spreads faster; introduces crisis-exclusive Physician unit.

## Stats / numeric attributes

- Age: exploration
- Trigger window: ≥ 70% (Stage 1), ≥ 80% (Stage 2), ≥ 90% (Stage 3)
- Required policy slots: 2 / 3 / 4

**Stage 1 (70%) — pick 1 of 2 (Divine Path choice):**

| Card | Benefit |
|------|---------|
| Divine Punishment | +5 Happiness in infected settlements following your religion; those settlements gain a Migrant when infected |
| Divine Mercy | Districts/Buildings/Improvements in religion-following settlements not damaged by Minor Outbreaks |

**Stage 2 (80%) — pick 1 of 2:**

| Card | Benefit |
|------|---------|
| Plague Cults | Gain Culture when Physicians Treat the Sick on a tile with a Temple |
| Humoralism | Gain Science when Physicians Treat the Sick on a tile with a Hospital |

**Stage 3 (90%) — pick 1 of 2:**

| Card | Effect |
|------|--------|
| Lazarettos | Coastal Settlements with a Dungeon: Buildings/Improvements/Districts not damaged by Major Outbreaks |
| Cordon Sanitaire | Settlements with a Commander Stationed: not damaged by Major Outbreaks |

## Crisis-exclusive unit: Physician

- **Type:** Civilian (non-combat)
- **Availability:** Exploration Age, only during Plague Resurgence crisis
- **Cost:** ~400–500 Gold `[INFERRED]`
- **Action:** "Treat the Sick" — moves to infected settlement, clears infection
- **Policy interaction:** Plague Cults + Humoralism trigger on Physician Treat action on Temple/Hospital tiles

## Escalation and core effects

- Faster spread than Antiquity variant
- Same base infection mechanics (tile yield loss, unit damage)
- Physician provides active mitigation (Antiquity had none)
- Religion interaction: Stage 1 path requires religion spread

## Survival strategy

Produce Physicians immediately; pre-position near vulnerable settlements. Divine Mercy at Stage 1 if religion widely spread. Plague Cults if Temple-heavy; Humoralism if Hospital-focused. Cordon Sanitaire (Stage 3) pairs with active Physician + Commander positioning.

## Crisis legacy bonus

Surviving unlocks: **Hospitals convert to Plague Hospitals in Modern Age.** (Only confirmed crisis legacy bonus from public sources.)

## Unique effects (structured)

```yaml
effects:
  - type: GRANT_UNIT
    unit: physician
    count: 1
  - type: MODIFY_YIELD
    target: infected-settlements-following-religion
    yield: happiness
    value: +5  # Divine Punishment
  - type: BUILDING_DAMAGE_IMMUNITY
    target: religion-following-settlements
    condition: minor-outbreak  # Divine Mercy
```

## Notes / uncertainty

Exploration Plague cards lack listed direct penalties (unlike Antiquity). May represent conditional benefits only, or carry hidden maintenance costs. Physician cost approximate.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
