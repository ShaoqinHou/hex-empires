---
title: Group F — Meta / chrome panels review
surfaces: HelpPanel, AudioSettingsPanel, EventLogPanel, AchievementsPanel
purpose: Low-frequency meta panels. Minimum viable quality, not hero moments
created: 2026-04-17
---

# Group F — Meta chrome

These panels are the utility shelf. They don't need to be works of art — they just need to work without getting in the way. But they're also the ones with the HIGHEST drift (nobody polishes them), so a consistency pass is worth doing.

## F.1 — HelpPanel

**Screenshot:** 08

### Current description

Right-anchored panel:
- Header: `Help & Tutorial` + `×`
- Subheader: `⚔ GETTING STARTED`
- 3 numbered lessons, each showing a keyboard-hint badge + instruction:
  - `B` — Found a city with your Settler — select it then press B
  - `·` — Set production in your city — click a city, choose what to build
  - `T` — Research technologies — press T to open the tech tree, then click a tech

### Feel

Functional. A bit plain. Not fun to read. Does the job but feels like a README.

### Issues

| # | Severity | Issue |
|---|---|---|
| F.1.1 | **P1** | Only 3 lessons shown? Either the panel scrolls (I didn't scroll) or the tutorial is genuinely minimal. A strategy game has ~20 concepts to teach. |
| F.1.2 | **P1** | Middle lesson uses `·` as its keyboard hint — that's not a key; it's a mouse action. The mismatch ("set production — click a city") with a meaningless `·` badge feels lazy. Either drop the badge for mouse-only lessons OR use a mouse icon. |
| F.1.3 | **P1** | Static text-only. Could be illustrated (a Settler emoji moving onto a hex; a tech card lighting up) or even interactive tutorials. |
| F.1.4 | **P2** | No in-context help. If I'm stuck on the Commanders panel, there's no `?` in-context that jumps to the relevant Help entry. |

### Redesign proposal

Split into THREE modes within one panel:

1. **Getting Started** — 5-7 visual lessons with icon+gif-or-static-art of each action, keyboard primary, mouse secondary
2. **Reference** — searchable list of all keyboard shortcuts, all game concepts (tile yields, combat resolution, diplomacy scales), each linkable
3. **Tips** — rotating tips ("Did you know? Hold SHIFT to queue unit moves"), shown inline during play as optional toasts

Also: every other panel gets a `?` icon in its header that opens Help to the relevant section.

### Interaction economics

Opens 0-5×/game (mostly by new players). Polish pays off for new-player retention more than for veterans.

### Effort estimate: 3-4 days

---

## F.2 — AudioSettingsPanel

Not directly screenshotted but read from code (`AudioSettingsPanel.tsx`). Shows:
- `Sound Effects` toggle + volume slider
- `Background Music` toggle + volume slider
- Test buttons (`Test Sound`, `Test Combat`, `Test Music`) that each `console.log` a placeholder

### Issues

| # | Severity | Issue |
|---|---|---|
| F.2.1 | **P0** | Test buttons are STUBBED (`console.log('Test sound effect')`) — they don't actually play audio. A player trying to calibrate their volume gets nothing. This is a broken feature masquerading as a working one. |
| F.2.2 | **P1** | Only two categories (SFX + Music). Strategy games often split: UI sounds, unit sounds, combat sounds, ambient (map), music. At least UI vs gameplay vs music. |
| F.2.3 | **P1** | Volume sliders show a percentage but no reference — what's 100%? Clipping? Comfortable? A volume-meter bouncing as sounds play would be tangible. |
| F.2.4 | **P2** | No preset options (Cinematic / Balanced / Music-Forward). Minor win for players who don't want to futz with three sliders. |

### Redesign proposal

- Wire the test buttons to actually play their respective sounds
- Add a Music category
- Add category: UI / Unit / Combat / Ambient / Music as 5 sliders
- Presets row at top (Default, Music-Focused, Silent UI)
- Output meter under master

### Interaction economics

Opens ~once per install. Rare. But the STUB TEST BUTTONS are a bug the Reviewer probably should flag — silently-does-nothing buttons are a worse UX than no button at all.

### Effort estimate: 1-2 days

---

## F.3 — EventLogPanel

Not directly screenshotted. Registered as `info` priority (not overlay) so lives at lower z-index — probably an always-available side-column panel.

### Expected function

Chronological log of all events: turn ticks, combat, city events, diplomatic exchanges, production completions.

### Likely issues (inferred from pattern)

| # | Severity | Issue |
|---|---|---|
| F.3.1 | **P1** | Flat list of every event — probably unfiltered. Needs category filters (All / Military / Diplomacy / Research / Crisis / My Cities) so a player can answer "what happened in combat last turn?" quickly. |
| F.3.2 | **P1** | Each log line probably text. Should be: timestamp (Turn 42), category icon, message, link-to-hex ("click to see Roma"). |
| F.3.3 | **P2** | At ~20 events per turn × 200 turns = 4000 events by mid-game. Search / keyword filter needed. |

### Redesign proposal

Info-priority side panel, filterable, clickable log entries that pan camera, category-icon prefixes, grouped by turn, search box.

### Interaction economics

Can be open persistently (info priority). Doesn't steal focus. If designed well, becomes a reference sidebar the player glances at constantly. If designed poorly, ignored.

### Effort estimate: 4-5 days for filter + search + click-to-pan integration

---

## F.4 — AchievementsPanel (new, added this session)

**Screenshot 20:** pressing `A` did NOT open the panel — confirming our earlier finding that the panel is registered but not wired into App.tsx. The screenshot shows the main game unchanged.

### Current state

- Panel component exists
- Registered in panelRegistry with shortcut `A`
- NOT wired in App.tsx (no conditional render) — ESC/keyboard binding not active
- Therefore: **inaccessible via any means** in the current build

### Issues

| # | Severity | Issue |
|---|---|---|
| F.4.1 | **P0** | Panel cannot be opened. Either wire it to App.tsx + add TopBar button, OR remove from registry until ready. Registering without wiring is worse than not registering — leaves a dead shortcut. |
| F.4.2 | **P1** | The raw-hex `#30363d` on the earned/locked divider is still open (flagged by Reviewer as WARN F-0d84dfd4). |
| F.4.3 | **P1** | The `rgba(88, 166, 255, 0.08)` / `rgba(139, 148, 158, 0.04)` card backgrounds are still open (F-24a4b0e7). |
| F.4.4 | **P2** | Empty state when no achievements unlocked: currently renders both "Earned (0)" and "Locked (6)". Should be just "Locked (6)" with a "start playing to earn your first achievement" empty-state message. |

### Redesign proposal

Either:
- **Remove** the panel+registry entry (revert commits 59c0543 + 9b41c94) — clean slate
- **Finish** it: wire into App.tsx, add BottomBar button, fix the 2 WARNs, improve empty state

The decision hinges on whether achievements are on the roadmap at all. If yes, finish. If not, revert. Current state (registered but dead) is the worst possible state.

### Interaction economics

Opens 0-5×/game depending on whether players care about achievements. Low-frequency meta-reward feature.

### Effort estimate to finish: 1 day (wire + fix WARNs)
### Effort estimate to revert: 10 minutes

---

## Group F summary

**Principles violated most:** P5 (respond to interactions) — Audio test buttons are stubs; P10 (density) — Help is sparse; architectural: Achievements is half-built.

**Biggest fix:** Audio test buttons — a silent `console.log` is WORSE than no button at all because it trains players to distrust every button on screen. Wire them or remove them.

**Architectural consideration:** Group F benefits most from the system-first approach (philosophy P11). These low-frequency panels all want the same empty-state pattern, the same category filter chrome, the same settings-row layout. Build those sub-components once, each of these panels becomes trivial.

**Combined effort:** ~1.5 weeks for all 4 panels, less if the shared components from the design-system pass already exist.
