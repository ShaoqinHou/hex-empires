# [System Name] — Civ VII

<!--
TEMPLATE — agents producing systems/*.md files follow this structure EXACTLY.
Replace everything in [square brackets] and between <!-- tag --> hints.
Do NOT change section order, heading levels, or add free-form sections.
Target: 1500–3000 words total.
-->

**Slug:** `[kebab-case-id]` <!-- must match a path in README.md systems list -->
**Bucket:** `[one of: ages | leaders-civs | empire-mgmt | narrative | combat | diplomacy | legends | victory]` <!-- matches Firaxis's 8 dev-diary buckets -->
**Status:** `draft`
**Confidence:** `[high | medium | low]` <!-- low = mostly [INFERRED], high = every claim cited -->
**Last verified:** `YYYY-MM-DD`
**Authoring model:** `[claude-sonnet-4.6 | claude-opus-4 | ...]` <!-- the agent that drafted this -->

---

## Sources

Every factual claim in the sections below MUST trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- [URL 1] — short label (e.g. "Fandom: Religion (Civ7)")
- [URL 2] — short label (e.g. "Firaxis Dev Diary #5: Combat")
- [URL 3] — ...

**Source conflicts noted:** `[none | list any spots where sources disagree]`

---

## Purpose

<!-- 1 short paragraph. What problem does this system solve in the game loop?
     Why did Firaxis include it? What does it replace vs predecessors? -->

[2–4 sentences.]

---

## Entities

<!-- Which game-state fields does this system read or write?
     Format: bullet list, one per entity, with R / W / RW tag. -->

- `PlayerState.<field>` — (R/W/RW) — brief purpose
- `CityState.<field>` — (R/W/RW) — brief purpose
- `Tile.<field>` — (R/W/RW) — brief purpose
- `GameState.<field>` — (R/W/RW) — brief purpose

---

## Triggers

<!-- When does this system activate? Enumerate explicit triggers. -->

- On **END_TURN** (every turn, all players) — [what happens]
- On action **[ACTION_NAME]** — [when player/AI dispatches]
- On condition **[condition description]** — [what evaluates it]
- On **age transition** — [before / during / after?]

---

## Mechanics

<!-- The meat of the doc. Step-by-step, implementation-ready.
     Break into sub-sections per distinct mechanic.
     Use numbered lists or pseudocode for procedures.
     Name every constant; state units (food per turn, percent, etc.). -->

### [Sub-mechanic 1 name]

<!-- 3–6 sentences + a numbered procedure. -->

1. Step …
2. Step …
3. Step …

### [Sub-mechanic 2 name]

…

### [Sub-mechanic N name]

…

---

## Formulas

<!-- Explicit math. Every constant named. No magic numbers. -->

```
<formula 1>
<formula 2>
```

Where:
- `constant_a` = [value if known, else "tuned per balance, typical range X-Y"]
- `constant_b` = …

If no numeric formulas apply, write: `No numeric formulas — this system is rule-based only.`

---

## Interactions

<!-- How does this system couple to other systems?
     Link other GDD files by relative path. -->

- `systems/[other-system].md` — [how they couple: "this reads the output of X" or "X fires on transition produced by this"]
- `systems/[another-system].md` — …

If none: `This system is standalone; no cross-system coupling.` (Rare.)

---

## Content flowing through this system

<!-- List content categories this system operates on.
     Link to the relevant content/ folder. -->

- [`content/[category]/`](../content/[category]/) — [what items]
- [`content/[category]/`](../content/[category]/) — …

If none: `No content categories — this system is pure mechanic.`

---

## VII-specific (how this differs from VI/V)

<!-- 3–8 bullets. Short. Each bullet is one concrete divergence.
     Skip generic observations ("VII is more streamlined"). -->

- [concrete difference 1]
- [concrete difference 2]
- …

---

## UI requirements

<!-- What does the player see and interact with for this system?
     Used later to check that hex-empires has the right panels/HUD. -->

- Panel / screen: [name and what it shows]
- HUD element: [name and when it appears]
- Notification trigger: [what causes a notification]
- Keyboard shortcut / button location: [if known]

---

## Edge cases

<!-- Concrete scenarios that the straightforward reading doesn't cover.
     Write 4–10 of these. They're the anti-amnesia layer for implementation. -->

- What if `[X]` is null / empty / zero?
- What if `[A]` and `[B]` fire on the same turn?
- What if player is eliminated mid-[phase]?
- What if a resource the system depends on is deleted by another system?
- …

---

## Open questions

<!-- Things the agent could not resolve from sources.
     Include source URLs examined + what was unclear.
     Parent uses this list to re-dispatch targeted research. -->

- [question 1] — checked [url], [source], but [what was unclear]
- [question 2] — …

If none: `None — all mechanics sourced.`

---

## Mapping to hex-empires

<!-- LEAVE THIS SECTION EMPTY IN DRAFT.
     Populated later during implementation work comparing this doc to code.
     Template for that later pass:
       - Engine file: packages/engine/src/systems/[systemName].ts
       - State fields in game: [which PlayerState/CityState fields map to this]
       - Status: [match | close | diverged | missing]
       - Delta notes: [concrete differences]
-->

_Populated during implementation, not GDD authoring._

---

## Author notes (optional)

<!-- Free-form. Use for "I reached for X source but couldn't access it",
     "this section is thin because the wiki page is a stub", etc.
     Helps the parent understand quality of this draft. -->

---

<!-- END OF TEMPLATE — do not add sections after this line. -->
