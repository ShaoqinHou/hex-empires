# Content templates — Civ VII GDD

This file contains **two templates** for content docs:
1. **Category overview** — one per folder, at `content/<category>/_overview.md`. Detail level 3, ~500–1000 words.
2. **Content item** — one per item, at `content/<category>/<slug>.md`. Detail level 4, ~200–500 words.

Agents producing content files follow the appropriate template verbatim. No free-form sections.

---

## Template A — Category overview (`_overview.md`)

<!-- Copy the block below to content/<category>/_overview.md and fill in. -->

```markdown
# [Category Name] — Civ VII

**Slug:** `[category-slug]`
**Status:** `draft`
**Confidence:** `[high | medium | low]`
**Last verified:** `YYYY-MM-DD`
**Authoring model:** `[claude-sonnet-4.6 | ...]`
**Item count:** `[N vanilla + M DLC = T total]` <!-- from source -->

## Sources

- [URL 1] — label
- [URL 2] — label
- ...

## Purpose in the game

<!-- 2–3 sentences. What role does this category fill?
     (e.g. "Pantheons are the Antiquity-age faith belief players buy with 25 faith to gain an empire-wide bonus; they do not carry into the Exploration age.") -->

## Category-wide rules

<!-- Rules that apply to ALL items in this category, so individual items can stay short.
     Examples:
     - All Antiquity civs unlock a unique unit, unique improvement, unique civic
     - All policies are wildcard in VII (no category slots)
     - All resources are assigned to a city, not worked on a tile as in VI
     Write 3–8 bullets. -->

- [rule 1]
- [rule 2]
- [rule 3]
- ...

## Taxonomy within the category

<!-- How are items grouped? Age? Rarity? Tech-gated? -->

- By age: Antiquity (N items), Exploration (N items), Modern (N items)
- By subtype: [subtype A: N items, subtype B: N items, …]

## Complete item list

<!-- Every item in the category, with its slug and 1-line description.
     Table format preferred for scanability. -->

| Slug | Name | Age / Subtype | One-line description | File |
|---|---|---|---|---|
| `slug-1` | Name 1 | Antiquity | brief flavor / effect | [link](slug-1.md) |
| `slug-2` | Name 2 | Exploration | … | [link](slug-2.md) |
| ... | | | | |

## How this category connects to systems

<!-- Which systems/*.md docs read or consume this category?
     Usually 1–3 systems. -->

- `systems/[x].md` — [how it uses items in this category]
- `systems/[y].md` — ...

## VII-specific notes

<!-- How does this category differ from the same category in Civ VI/V?
     3–5 bullets, concrete. -->

- [diff 1]
- [diff 2]
- ...

## Open questions / uncertainty

<!-- Items or rules the agent couldn't fully resolve. -->

- [question 1]
- ...

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
```

---

## Template B — Individual content item (`<slug>.md`)

<!-- Copy the block below to content/<category>/<slug>.md and fill in.
     200-500 words. Fact-card format. No prose essays. -->

```markdown
# [Item Name] — Civ VII

**Slug:** `[slug]` <!-- must match filename -->
**Category:** `[civilization | leader | unit | building | wonder | technology | civic | pantheon | religion | government | policy | resource | crisis-card | narrative-event | independent-power | terrain-feature | memento | tile-improvement]`
**Age:** `[antiquity | exploration | modern | ageless]` <!-- 'ageless' for items with no age gate -->
**Status:** `draft`
**Confidence:** `[high | medium | low]`
**Last verified:** `YYYY-MM-DD`
**Authoring model:** `[claude-sonnet-4.6 | ...]`

## Sources

- [URL 1] — label
- [URL 2] — label (optional secondary)

## Identity

<!-- 2–4 sentences. Historical period or thematic frame.
     Cite where the real-world identity comes from if known. -->

- Historical period: [e.g. "3100-30 BCE Nile kingdom"]
- Flavor: [short designer-intent description from Firaxis if known]

## Stats / numeric attributes

<!-- Category-specific. Fill the fields that apply; delete the rest.
     Numbers sourced from fandom wiki (Firaxis doesn't publish raw numbers). -->

For civilizations:
- Civ bonus: [name + effect]
- Unique unit: [unit name] (age: X) — [effect]
- Unique civic: [civic name] — [effect]
- Unique improvement: [improvement name] — [effect]
- Unique quarter: [quarter name] — [effect if applicable]
- Legacy path unlock: [how to unlock next-age civ choices]

For units:
- Combat strength: [N]
- Ranged strength: [N or N/A]
- Movement: [M tiles]
- Cost: [production / faith / other]
- Requires: [tech / civic / resource]
- Replaces: [parent unit, if unique]
- Abilities: [bulleted list]

For buildings:
- Cost: [production]
- Maintenance: [gold/turn]
- Yield(s): [+N food, +N production, etc.]
- Adjacency bonus: [rule, if any]
- Requires: [tech / civic / resource / age]
- Slot: [urban / rural / quarter / ageless]

For technologies / civics:
- Cost: [base science / culture]
- Prerequisite(s): [list]
- Unlocks: [buildings / units / improvements granted]
- Mastery (if applicable): [separate mastery effect + cost]

For pantheons / religions / governments / policies:
- Effect: [single sentence]
- Unlock condition: [faith threshold, civic prereq, etc.]
- Stacking: [does it stack with others? mutually exclusive?]

For resources:
- Type: [bonus | luxury | strategic]
- Appears in age: [antiquity/exploration/modern]
- Found on: [terrain types]
- Yield: [+N food/prod/gold/etc.]
- Special use: [e.g. strategic needed to build certain units]

For wonders:
- Cost: [production]
- Effect: [single sentence]
- Prerequisite: [tech/civic/age]
- Obsoletes: [yes / no, at age]

For crisis cards:
- Age: [antiquity / exploration]
- Trigger window: [e.g. "turns 8–15 before age end"]
- Player choice text: [option A / option B]
- Effects per option: [A: ..., B: ...]

For narrative events:
- Trigger condition: [leader attribute X, civ Y, tile Z, etc.]
- Player options: [list with effects]
- Tags: [for callbacks later]

For terrains / features:
- Base yield: [+N food, +N prod, …]
- Movement cost: [N]
- Defense modifier: [+N%]
- Combat rules: [e.g. naval units cannot enter mountains]
- Can build: [improvement types allowed]

For leaders:
- Attributes: [N per category: Economic / Militaristic / Diplomatic / Expansionist / Cultural / Scientific]
- Agenda(s): [historical agenda name + effect]
- Unique ability: [name + effect]
- Preferred civs: [list with bonus]

For mementos:
- Unlock condition: [how the leader earns this memento]
- Effect: [single sentence bonus]
- Stacking / exclusivity: [rules]

## Unique effects (structured — for later code mapping)

<!-- Break the effects into composable pieces mirroring hex-empires'
     engine/src/effects/EffectDef.ts shape. Lets later agents mechanically
     translate to data files. Only applicable where the item has in-engine
     effects. -->

```yaml
effects:
  - type: MODIFY_YIELD
    target: [tile-type | building | all-cities | this-city]
    yield: [food | production | science | culture | gold | faith | happiness]
    value: [+N | -N | +N%]
  - type: GRANT_UNIT
    unit: [slug]
    count: [N]
  - type: MODIFY_COMBAT
    target: [unit-category | all]
    value: [+N]
```

If effects are narrative-only and don't translate to engine effects:
`effects: narrative-only — see "Flavor" above.`

## Notes / uncertainty

<!-- Free-form, 1–4 sentences. Use for caveats, patch-change notes,
     or "fandom wiki didn't have the number; used [INFERRED]". -->

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
```

---

## Rules common to both templates

1. **Slug consistency.** Filename slug, `Slug:` field, and all references to this item elsewhere in the GDD must match exactly. Kebab-case, no underscores.
2. **Confidence tag honesty.** `high` = every factual claim has a cited URL. `medium` = most do, some inferred. `low` = significant `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.
3. **No hex-empires references.** The `Mapping to hex-empires` section stays empty in the drafting phase. It's not the agent's job to translate.
4. **No invented numbers.** Tag with `[INFERRED]` or `[LLM-KNOWLEDGE-ONLY]` when the wiki is silent.
5. **Age-gating discipline.** Items that unlock in Antiquity don't mysteriously reappear in Modern unless the source says so.

---

<!-- END OF TEMPLATES -->
