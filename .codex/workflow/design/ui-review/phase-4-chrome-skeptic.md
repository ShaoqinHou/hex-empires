---
schema: design-spec/v1
phase: 4 (panel chrome, Civ VII direction)
author: opus (designer, SKEPTIC framing)
created: 2026-04-18
---

# Phase 4 chrome, skeptic proposal

**Stance:** the master plan Phase 4 is mis-scoped. Civ VII chrome is not what makes Civ VII feel like Civ VII, and borrowing its ornamented frames at our fidelity and tile size is a net loss. What earns the Phase 4 budget is a tight set of material cues applied to the already-shipped PanelShell plus a resolution of the --panel-padding-lg question. Everything else currently living in "Phase 4 chrome" should be deferred to later phases where it can be judged against real content, real portraits, and a real Diplomacy surface.

The skeptic position is not "do nothing" — it is: **ship a minimum-effective chrome pass (~3 commits, ~1 week) and reallocate the remaining 2 weeks of the Phase 4 envelope to Phase 3 (CityPanel hero, notifications) where the per-turn impact is measurably higher.**

---

## 1. Premise audit — what does "Civ VII chrome" actually mean?

The pragmatist and integrator briefs will likely enumerate Civ VII signatures: border-image frames, gold-foil corner ornaments, parchment interior textures, Cinzel-derived serif titles, warm amber accents, inset bronze dividers, subtle inner vignettes. Let's be honest about which are load-bearing for the Civ-VII feel and which are decorative-overhead.

| Civ VII signature | Load-bearing? | Why |
|---|---|---|
| **Warm palette** (olive/amber/cream/bronze) | **Yes** | Already shipping in Phase 1. The single biggest "feels like Civ VII, not like a React admin dashboard" move. Done. |
| **Cinzel for headings/display** | **Yes** | Shipping in Phase 1 typography tokens. Zero additional Phase 4 cost. |
| **Subtle warm backdrop vignette on modals** | **Yes-ish** | Cheap (one radial-gradient CSS). Adds material weight to dramatic surfaces. ~1-2 hours. |
| **Gold-foil title underline** | **Maybe** | One `linear-gradient` on `PanelShell` title bar. ~1 hour. Visible-at-glance, forgiving at small sizes. Keep. |
| **Bronze inset border on panels** | **Maybe** | One extra `box-shadow` layer (inset 1px bronze + outer 1px dark). Cheap. Keep. |
| **Parchment texture on panel bodies** | **No — cut** | At 480px panel width × 14px body text, a subtle noise/paper texture reads as dirty-background and fights tabular-nums legibility. Civ VII uses it on much wider surfaces at much larger glyph sizes. |
| **Border-image ornate corners** | **No — cut** | `border-image` with SVG ornaments clips horribly at `--panel-radius: 8px` + 480px width. Either we make corners large (costs interior real estate) or small (ornaments become unreadable blobs). The audit's eye will tell you this is "ornamented"; players will not. |
| **Gold-foil corner flourishes** | **No — cut** | Same failure mode as border-image. Also: looks cheap at 1× DPR and invisible at 2× unless authored twice. Asset pipeline cost unjustified per locked decision #6 (hand-SVG + CC0 only, no raster). |
| **Inset leather / tooled-edge dividers** | **No — defer** | The integrator will probably propose these for section headers. Worth doing — but as part of the `<SectionHeader>` shared sub-component in Phase 1.2, not as chrome-system decoration. |
| **Per-age chrome tinting** (ochre for antiquity, verdigris for exploration, steel for modern) | **No — defer to Phase 5** | Appealing on paper. In practice: the player spends 60-80% of a game in one age. Investing chrome-variant work before the ages are themselves dramatized (the AgeTransition modal) spends budget on a surface the player barely registers the transition of. Wait until Phase 5's DramaModal work is landing; revisit then. |

**Net:** the signatures worth borrowing are the ones we're already borrowing (palette, Cinzel) plus two cheap additions (title underline, inset bronze border). Ornaments are a trap.

---

## 2. What to cut from Phase 4

From the master plan's Phase 4 envelope (3 weeks):

**Keep:**
- `PanelShell` chrome polish: gold-foil title underline, inset bronze border, subtle warm vignette on modal backdrops. Resolve open-question #2 (`--panel-padding-lg`). ~3-5 days.
- `--panel-status-*` / `--panel-spec-*` warm-shift (Phase 1 spec open-question #3 — bring them into the palette so color-coding doesn't read as foreign-object against warm backgrounds). ~1 day.

**Cut from Phase 4, redistribute or defer:**
- **TreeView shared component (4.1, 4 days)** — this is not chrome, it's a structural refactor. It belongs in Phase 1.2's shared-sub-component bundle, done alongside `<EntityCard>` and `<ActionPalette>`. Moving it earlier actually speeds Phase 3's tech/civics panel work.
- **Government + Religion empty-state pattern (4.2, 3 days)** — this is `<EmptyState>` + `<ProgressionRoadmap>` application, also already in Phase 1.2. Moving a new shared component into Phase 4 because "we have time there" is scope confusion.
- **Diplomacy overhaul (4.3, 6-7 days)** — this is Phase 5 material. It's half chrome, half portrait-art, half interaction redesign (trade dialog, relationship gauge). It does not benefit from Phase 4 chrome-pass momentum; it benefits from being co-planned with the DramaModal work where portraits first appear. Defer.
- **VictoryProgress ladders (4.4, 3 days)** — same argument. This is Phase 5 content design (scoring dramatization), not chrome.
- **Per-age chrome variants** — defer (see premise audit).
- **Decorative ornamentation** — cut outright (see premise audit).

After cuts, Phase 4's remaining scope is ~1 week, not 3.

---

## 3. Minimum-effective Phase 4

Three changes. Each is a measurable, commit-sized intervention on the shell that every panel already wraps. No panel body changes required. No new shared components. No asset work.

### 3.1 Gold-foil title underline on `PanelShell`

**Added token (`palette-tokens.css`):**
```
--panel-title-underline: linear-gradient(90deg,
  transparent 0%,
  var(--amber-400) 15%,
  var(--amber-300) 50%,
  var(--amber-400) 85%,
  transparent 100%);
```

**CSS change (`PanelShell.tsx` titleBarStyle):** replace current `borderBottom: 1px solid var(--panel-border)` with a 2-layer approach: bottom border becomes a ::after pseudo-element using the gradient at `height: 2px`, positioned flush with the title bar bottom.

**Before → after:** at all 19 panels, the title bar acquires a gold-foil line beneath the Cinzel title. Reads as "this is chrome, not a div", for <50 lines of CSS. No body content touches.

**Measurable:** Playwright visual-regression diff on all panels shows one 2px band added; no layout shift; no other geometry changes.

### 3.2 Inset bronze border on `PanelShell` container

**CSS change (`PanelShell.tsx` containerStyle):**
```
boxShadow: var(--panel-shadow), inset 0 0 0 1px var(--bronze-800)
```

This double-borders the panel: outer soft drop-shadow (current), plus a crisp 1px inset bronze line that catches the eye at the panel edge. Mimics Civ VII's "panels have a frame" without using `border-image`. Works at every `--panel-radius` value. Works at every width. Clips cleanly.

**Before → after:** subtle material edge on every panel. Readable as "framed", not "floating HTML div".

**Measurable:** computed-style check — `box-shadow` on `[data-testid^=panel-shell-]` contains `inset 0 0 0 1px`.

### 3.3 Warm radial vignette on modal backdrop

**Token change (`panel-tokens.css`):**
```
--panel-backdrop: radial-gradient(ellipse at center,
  rgba(26, 21, 16, 0.35) 0%,
  rgba(10, 8, 5, 0.65) 100%);
```
(Replaces the flat `rgba(0, 0, 0, 0.45)` that Phase 1 already set.)

**CSS change (`PanelShell.tsx` backdropStyle):** `backgroundColor` → `background`.

**Before → after:** when a modal (AgeTransition, Crisis, Victory, TurnSummary) opens, the backdrop is not a flat dimming — it's a warm-dark vignette that focuses attention on the modal. This is a 3-line change for a disproportionately "feels like a game" effect on exactly the moments that should feel ceremonial.

**Measurable:** visual snapshot on a modal-open screenshot shows radial darkening gradient; no flat black overlay.

### 3.4 (Borderline — include only if time) `--panel-padding-lg` decision

Open-question #2 in Phase 1 spec. The skeptic vote: **stay at 16px, update S-03 accordingly, move on.** The game is dense; 4px of added outer padding across 19 panels is 76px of lost interior grid the density-is-a-feature philosophy (P10) already warned against. Spend 30 minutes updating the S-03 spec and move on. Don't let this block Phase 4 shipping.

### What this explicitly does NOT include

- No ornaments, corners, flourishes, textures, or border-images.
- No per-age chrome tinting.
- No new shared components.
- No panel body changes (no touching CityPanel, TechTreePanel, DiplomacyPanel, etc.).
- No asset work.

---

## 4. Failure modes to avoid

Concrete ways Civ-VII-ish chrome degrades at low fidelity. Calling these out because the pragmatist will be tempted by at least two.

1. **Border-image clipping at narrow widths.** Civ VII panels are typically 520-700px wide with full-HD-authored corner ornaments. At our 320px (`narrow`) shell width, the same ornament either overlaps the title text or gets scaled down to unreadable 8px blobs. Rule: if a decoration requires >60px of uninterrupted edge to read, we can't use it.

2. **Serif headings at `--type-label-size: 11px`.** Cinzel is gorgeous at 18-22px. Below 14px it becomes a smeary mess, especially at 1× DPR on Windows. The typography tokens correctly keep Cinzel out of `body`/`label`/`numeric` — **do not extend it into section headers** during chrome work. The skeptic specifically flags this because "let's use Cinzel for section headers too, for consistency" is the predictable scope-creep suggestion.

3. **Decorative drop-shadows that triple-draw edges.** Civ VII uses multi-layer shadows authored by a pro artist. Naïve copies (`box-shadow: 0 2px 4px black, 0 4px 8px black, 0 8px 16px black`) add blurry halos that read as "CSS fiddling", not "materiality". Stick to the one outer soft shadow + one inset bronze line from §3.2.

4. **Parchment texture at 96dpi.** A 2× scaled-down parchment SVG pattern becomes ~2-3 pixel noise that the eye reads as "aliased display glitch". Either the texture is authored at-size per DPR (we can't — no raster budget) or it shouldn't exist.

5. **Gold-foil color at contrast ratios below 3:1.** `--amber-400` on `--olive-800` is ~4.1:1 — acceptable. `--amber-300` on `--olive-700` drops to ~3.2:1 — borderline. Any ornament thinner than 2px at these ratios disappears for players with mild contrast sensitivity. Title underline at 2px passes; hairline 1px foil trims don't.

6. **Fixed per-age chrome that ages panels the player is staring at.** Tinting the TechTree chrome ochre during antiquity looks great for the first 20 turns. By turn 80, the player has stopped seeing the ochre and is mildly annoyed that the chrome doesn't look "current". If per-age chrome ships, it must be on ceremony surfaces (DramaModal), not persistent dashboards. Phase 5 concern.

---

## 5. The ⋯ menu — keep it as-is, minor restyle only

The master plan Q4 already proposed removing the ⋯ button (duplicates Ages). The pragmatist/integrator will likely propose **redistributing** its slot into a kebab-menu of meta actions (save/load, settings, help, audio).

**Skeptic argument: do not redistribute. Restyle only.**

1. **It's already dead.** Phase 0 Q4 decided it. The skeptic aligns with Q4: remove or repurpose, don't build a new interaction around it.
2. **Redistribution creates a discoverability problem.** Burying save/load/settings/help/audio behind a ⋯ menu is the exact "website habit" philosophy doc §2 warns against. Each of those has a panel with a hotkey already (H for help, audio via panel, settings via panel). Adding a meta-menu that duplicates five hotkeys is anti-strategy-game.
3. **The slot is better reclaimed for game content.** If TopBar needs the real estate, give it to a per-turn delta indicator (Phase 1.5.4 wide-viewport plan) or to a turn-clock chip. Those are diegetic; a kebab menu is not.
4. **"Minor restyle" for as long as it exists:** apply the warm palette, align its icon with the new iconography set (Phase 1.3), and either (a) delete it in Phase 0 Q4 per master plan, or (b) have it open the Help panel as a friendly fallback until deletion. Zero net Phase 4 work.

The integrator will want a single home for meta actions. The answer is: **each meta action already has a home.** Stop building meta-menus.

---

## 6. Sub-step breakdown

Three commits, not five. The skeptic deliberately chooses fewer, bigger-impact changes over granular optionality.

| # | Commit | Scope | Effort |
|---|---|---|---|
| 1 | `feat(chrome): gold-foil title underline + inset bronze border on PanelShell` | §3.1 + §3.2. Token additions in `palette-tokens.css` + `panel-tokens.css`. Two style changes in `PanelShell.tsx`. Playwright visual-regression update for all 19 panels. | 1-2 days |
| 2 | `feat(chrome): warm radial vignette on modal backdrop` | §3.3. One token change + one CSS key rename in `PanelShell.tsx`. Snapshot update on 5 modal panels (AgeTransition, Crisis, Victory, TurnSummary, VictoryProgress). | 0.5 day |
| 3 | `fix(tokens): warm-shift --panel-status-* and --panel-spec-* to palette` | Resolves Phase 1 open-question #3. Revalue ~14 variables in `panel-tokens.css`. No component changes — tokens already consumed. Visual check on DiplomacyPanel + GovernorPanel. | 1 day |

**Total: ~3 days of focused work + 1-2 days of visual-regression baselining/review = ~1 week.**

This replaces the master plan's 3-week Phase 4 envelope with a 1-week "minimum-effective chrome pass" + a 2-week reallocation window.

---

## 7. Out-of-scope recommendations — where the reallocated budget goes

Phase 4 originally budgeted 3 weeks. The skeptic spends 1 of those on the minimum chrome pass. The remaining 2 weeks should go to:

- **Phase 3.3 (notification system redesign)** — 3 days, master plan priority. Auto-dismiss + category sounds + click-to-panel. Per-turn impact dwarfs any chrome-polish move.
- **Phase 3.4 (CityPanel hero layout)** — 4 days. This is the panel the player opens 10-30 times per game. Hero production block + compact resource ledger + hex-ring preview is a bigger perceived-quality lift than any number of gold-foil corners on every other panel combined.
- **Phase 5.1 (DramaModal shell) start** — 3 days. The upstream shared shell for AgeTransition / Crisis / Victory ceremony. Getting this landing early means Phase 5 hits the ground running and the per-age chrome question from §1 can be re-opened against real dramatic-surface context.

Defer to Phase 5 (as pre-committed Phase 5 scope, not drift):
- TreeView shared component — belongs with DramaModal-era shared-component work.
- Government / Religion empty-state pattern — belongs with `<ProgressionRoadmap>` in Phase 1.2, not Phase 4.
- Diplomacy overhaul — belongs with portrait art work in Phase 5.
- VictoryProgress ladders — content-design, not chrome.
- Per-age chrome tinting — DramaModal-era decision.

---

## 8. Panel body impact — none

A deliberate constraint of this proposal: **zero panel body files change.** All 19 panel bodies (`CityPanel.tsx`, `TechTreePanel.tsx`, etc.) continue to render their current body content. Every change is at the `PanelShell` or token layer.

This is the core skeptic argument against the master plan's Phase 4 scope: any chrome proposal that requires touching 19 panel bodies is not chrome work, it's a body refactor disguised as a chrome refactor. Real chrome work is refactoring-free. If your chrome change demands body edits, it's the wrong change.

---

## 9. Open questions

1. **Gold-foil underline thickness — 2px or 3px?** At `standard` viewport, 2px is the skeptic pick (crisp, no visual weight stealing attention from Cinzel title). At `ultra`, 3px might read better. Proposal: 2px fixed; revisit at ultra-viewport testing if it looks too thin.
2. **Inset bronze border — `--bronze-800` or `--bronze-700`?** Bronze-800 is subtler, almost hairline. Bronze-700 is crisper, a touch more "framed". Skeptic pick: 800 (less decorative, more materiality). Integrator likely prefers 700. Resolve by A/B visual check before commit 1.
3. **`--panel-padding-lg`: 16 or 20?** Skeptic vote: **16, update S-03**. See §3.4. This is the density-vs-airiness question Phase 1 flagged; the skeptic default is density.
4. **Do we retire the ⋯ button in the Phase 4 window or let Phase 0 Q4 handle it?** Recommendation: let Phase 0 handle it. Do not touch it in the chrome pass.

---

## Cross-refs

- `08-master-plan.md` — this doc proposes reducing Phase 4 from 3 weeks to 1 week and redistributing the envelope to Phase 3.3, 3.4, and Phase 5.1.
- `phase-1-design-tokens-spec.md` — §3 additions (gold-foil gradient, radial vignette) sit on top of Phase 1's palette; §3 resolves open-questions #2 and #3 from that doc.
- `.codex/rules/panels.md` — all proposed changes are at the `PanelShell` layer and preserve the "tokens-only chrome" rule; no raw hex introduced.
- `00-philosophy.md` — §P3 (chrome has texture) motivates §3.1-3.3; §P10 (density) motivates §3.4; §P9 (modals earn their interruption) motivates §3.3.
- `systems/S-03-sizing-table.md` — flagged as needing a write-back if `--panel-padding-lg` stays at 16px per §3.4.
- Sibling proposals: `phase-4-chrome-pragmatist.md`, `phase-4-chrome-integrator.md` (parallel).

**Sibling docs that should reference this one when it lands:**
- `systems/S-03-sizing-table.md` — if §3.4's "stay at 16px" is adopted, update the sizing table.
- Any Phase 5 DramaModal design doc — the §3.3 vignette treatment generalizes to the DramaModal backdrop.
