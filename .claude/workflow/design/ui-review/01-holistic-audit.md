---
title: Holistic audit — top cross-cutting violations
purpose: Before individual surface reviews, the system-wide failure patterns that will appear again and again
created: 2026-04-17
---

# Holistic audit — what's wrong across the whole UI

Observations from the 20-shot captures of a running build at 1440×900. These are the **cross-cutting** patterns — issues that, if fixed once at the system level, resolve dozens of individual surface problems.

## H-1 (P0) — the viewport is mostly empty black

**Screenshots:** 02, 14

The main game at 1440×900 shows a tiny minimap (~280×150) in the upper-left quadrant and a huge black void everywhere else. The canvas is NOT filling the viewport. The black space reads as "the application hasn't loaded" or "there's an error". The minimap is acting as both minimap AND main view — that's not right.

This is the single most-impactful issue. Before anything else is fixed, the canvas must fill the available space below TopBar, above BottomBar, stopping at the right-side panel column when one is open. What's currently shown as a "minimap" appears to be the actual hex grid at a non-fullscreen zoom level.

**Fix** — make the canvas fill the available viewport, then add a *separately rendered* minimap as a small fixed-position chip in a corner (bottom-right is standard for strategy games). The current layout is a catastrophic orientation failure for new players.

## H-2 (P0) — chrome is uniform dark-slate cards; no hierarchy

**Screenshots:** 02, 03, 04, 19

Every panel uses the same dark-slate rounded-card aesthetic. TopBar, BottomBar, all panels, all HUD elements, all notifications — same `rgba(22, 27, 34, X)`, same border radius, same border opacity. That's what admin-dashboards look like. A game differentiates:

- **Always-visible chrome** (TopBar/BottomBar) should feel like the frame of the map — heavier, denser, maybe a gradient edge toward the map interior
- **Overlay panels** should feel like documents drawn FROM the frame — lighter, slightly warmer, with an accent gold
- **Modal moments** should feel unmistakable — a full art treatment, a material edge, an "era-appropriate" visual
- **HUD tooltips** should feel like they're floating over the world — more translucent, crisper edges, cursor-anchored

Currently everything is the same flat card. Nothing announces its importance.

## H-3 (P0) — TopBar is cryptic and non-hierarchical

**Screenshot:** 02

```
[Turn 2] ANTIQUITY  💰98  🔬0  🎭0  ⛪0  🤝0   [Tech][Civics][Diplo][Ages][⋯]  [End Turn →(4 unmoved)]
```

Issues:
1. **"Turn 2"** is in the same visual weight as the 5 resource chips — but it's a reference, not a decision. Players don't act on turn number.
2. **"ANTIQUITY"** sits orphaned between turn and resources. Should live as an era banner with visual weight.
3. **5 resource chips** all same-size emoji + bare number. 0/0/0/0 in 4 of 5 slots at game start = unreadable clutter. Needs per-turn delta indication (gold changed by +2, not just gold = 98).
4. **Action buttons** (Tech/Civics/Diplo/Ages/⋯) — colored blue/pink/purple/yellow/grey with no logic to the palette. Why is Tech blue and Civics pink? The colors should map to resource types (Science=blue, Culture=purple, Gold=gold, Faith=white, etc.) so a player learns them once. Also: Ages and `⋯` appear to open the same panel (confirmed in screenshots 06 + 07 — both show Age Transition). Dead button.
5. **End Turn** is the rightmost element and correctly the largest — but it's a pill-shaped green button that reads as "Submit" on a form. The most-pressed button in the game deserves a signature look: a bright call-out block, maybe a shield/chevron shape, a keyboard-hint badge ("⏎"), a pulse when idle units remain.

## H-4 (P1) — everything static, no motion

Every panel opens/closes with `opacity: 0 → 1` fade or no animation at all. No scaling, no slide-in from a direction, no parallax. City-founded notification simply appears. Turn-end simply updates numbers in place. **Games breathe.** Every state change needs a subtle motion cue (80-200ms). Without it, the UI reads as data refresh, not gameplay.

## H-5 (P1) — no sound cues wired

In all my clicks/hovers across 20 screenshots worth of interaction, I heard nothing. There's an `AudioSettingsPanel` implying sound exists, but the feedback loop of "I pressed End Turn and heard the clink of a coin falling" isn't there. A strategy-game loop without sound cues feels bureaucratic. Before any visual redesign, audit what audio hooks exist and what should exist.

## H-6 (P1) — typography is one size fits all

All panels use ~12-13px text. Headings are 11-14px uppercase. Numbers and labels live at the same weight. Tabular numerics are NOT enforced (resource numbers will wobble as they grow). A game's typography does heavy lifting:

- **Display** for era banners, victory moments, city names: 24-40px, letter-spaced, serif or slab
- **Heading** for panel titles: 16-18px bold
- **Body** for descriptions, tooltips: 13-14px regular
- **Label** for field names: 11px uppercase, letter-spaced, muted
- **Numeric** for all quantities: tabular-nums, weight-balanced, possibly a separate monospace or numeric-optimized font

Currently the hierarchy is flat. Panels could shrink 15-20% and still feel clearer if typography did its job.

## H-7 (P1) — content-first layout, not moment-first

Panels are bags of sections. CityPanel (shot 19) has: HAPPINESS, YIELDS, GROWTH, PRODUCTION, BUILDINGS, BUILD, each rendered equally. But when I open a city, 80% of the time I'm there to:
- Change what it's producing (dominant action)
- Check if it's in trouble (happiness low, production stalled)

Those should be hero-level. The rest should be a reference sub-panel. Current layout puts equally-weighted sections in vertical stack — the "spreadsheet" pattern from principle P8.

## H-8 (P1) — tooltips and panels compete at the same anchor

**Screenshot:** 19

When a city was founded and I clicked the city hex, I got simultaneously:
- The CityPanel (right-anchored)
- A "Grassland + Forest" tile tooltip (floating middle-of-canvas)
- A "City 2 founded at (-3, 6)" notification toast (below the CityPanel)

Three overlapping overlays all shouting for attention. The tile tooltip shouldn't render when the city panel is open — it's redundant. The notification should fade or auto-dismiss when the relevant panel is opened. Overlay coordination is broken.

## H-9 (P1) — iconography is emoji throughout

💰 🔬 🎭 ⛪ 🤝 🏛️ ⚔️ 🏹 — the game uses OS emoji for everything. That renders inconsistently per platform (on Windows: flat, on Mac: colored, on Linux: ???). It also anchors the game in "I emailed someone an emoji" register, not "ancient empire" register. A proper icon set (SVG sprite, hand-illustrated) would cost 1-2 weeks of art but transform the look immediately.

Short-term: even standardizing on a consistent emoji rendering library (Twemoji), or using Lucide/Phosphor icons for UI and reserving emoji only for game-content icons, would improve things.

## H-10 (P1) — density is inconsistent

Some panels are generously padded (City panel has visible gaps between sections). Others are cramped (TechTree cards nearly touching). There's no system. Set per-panel-type density tokens (e.g., strategic panels dense, moment panels spacious) and apply consistently.

## H-11 (P2) — no persistent game-world feel

The map has some color and texture; the surrounding chrome has NONE. A grass hex at the map edge meets a flat dark-slate panel border. There's no transition, no "frame of the world". Traditional strategy UI either frames the map (Civ VI has a faux-papyrus TopBar that looks like a document edge) or lets chrome fully dissolve into the map (no background, just floating elements). Pick one. Current state — slate cards floating over dark void over hex map — reads as three unrelated layers.

## H-12 (P2) — ESC and keyboard are inconsistent

Panels have a close button (×) in the corner AND ESC-to-dismiss AND (for some) click-outside-to-dismiss. Per `panels.md` this is supposed to be centralized via PanelManager + ESC-in-capture-phase. But the hint line at bottom says only `Esc: deselect` — not `Esc: close panel`. Either the hint is incomplete or there's actual inconsistency between how panels dismiss. Worth auditing.

## H-13 (P2) — no sense of time/date

You don't know what year it is in-world. Civ VII/VI show a year/BC-AD tick. Hex-empires shows Turn 2 and "ANTIQUITY" — so a player can never say "my civ reached iron age in 800 BC". Game-world time anchors players emotionally; turn numbers are for spreadsheet tracking.

## H-14 (P0) — interaction economics: clicks-per-turn, precision, repetition

Added after initial audit. Every UI decision has a **cost** — measured in the click count, the precision required, and the repetition burden across a typical 200-turn game.

A strategy game is played over thousands of turns (20-60 hours). Every extra click per turn gets multiplied by 200+. Every extra millimeter of precision required becomes wrist strain. Every piece of chrome that demands dismissal (close, confirm, acknowledge) becomes tedious. Rules of thumb:

### Rule 1 — High-frequency actions must be one-click + big-target

| Action | Frequency | Current cost | Should be |
|---|---|---|---|
| End Turn | once/turn (200+) | 1 click on pill button | 1 click on signature button OR press Enter |
| Cycle idle units | 0-4×/turn | precise click OR "(4 unmoved)" read-only | Space/Tab keyboard primary |
| Dismiss notification | 1-5×/turn | **precise click on small `×` or `[Dismiss]`** | auto-dismiss after 3-5s OR press any key |
| Hover tile for info | 50-200×/turn | free (hover) | ✓ already correct |
| Open a panel (e.g. Tech) | 0-3×/turn | click or keystroke | ✓ already reasonable |

**The "dismiss notification" pattern is the canonical example** the user flagged. If 3 things happen in a turn and each requires an `×` click to dismiss, that's 3 precision clicks on small targets every turn. Over 200 turns that's 600 precision clicks to clear UI noise. **Solution: auto-dismiss ephemeral notifications (city founded, turn summary entries) after 4-5s; keep persistent for warnings (unhappiness high, idle units); in all cases press-any-key-to-dismiss all.**

### Rule 2 — Repeated actions need hotkey AND mouse, not just one

- Opening Tech tree: has `T` — good
- Opening Civics: button says `Civics`, keyboard is `Y` (not obvious)
- Cycling units: `Space` — good
- Ending turn: `Enter` — good (but button doesn't advertise this prominently)
- Cancelling selection: `Esc` — good

**Dismissing notifications has no keyboard.** Adding a global "press any key" dismiss on the topmost toast saves 1-5 precision clicks per turn.

### Rule 3 — Click target size matches frequency

| Target | Pixel area | Frequency | Verdict |
|---|---|---|---|
| End Turn button | ~200×40 | every turn | OK but shape says "form submit" (see A.1.6) |
| Resource chip (TopBar) | ~60×40 | hover only | OK |
| Notification `×` | ~16×16 | 1-5×/turn | **TOO SMALL** — 16px is the Fitts-Law floor, not a design target |
| Panel close `×` | ~24×24 | 1-3×/turn | OK-ish, could be larger |
| Tech-card click (TechTree) | ~200×100 | 0-2×/turn | OK |
| Unit portrait (selected) | ~64×64 | 0-50×/turn | marginal |

### Rule 4 — Modal interruptions have a budget

Each modal interrupts the player and costs ~0.5-2 seconds of re-orientation. A game can "spend" this cost maybe 3-5 times per turn before it feels annoying. Currently Age Transition / Crisis / TurnSummary all modal, and notifications sit at overlay-level but BEHAVE like modals (require click dismissal). Budget is easily exceeded in crisis turns. Audit which interrupts earn their interruption.

### Rule 5 — Precision-click chains should be keyboardable

Example — "research a tech": click Tech button → scroll down in list → click a tech card → confirm. That's 3 clicks + scroll. Could be: `T` → arrow keys → Enter. Or even better: `T` opens, the DEFAULT highlighted tech is the recommended one, Enter picks it — 2 keys.

### Rule 6 — Don't make the player READ to act

The idle-units toast currently renders `(4 unmoved)` as text inside the End Turn button. The player reads, parses, decides. Better: auto-pan camera to the idle unit with a gentle ping — the player SEES it and acts. Show-don't-tell.

### Interaction-economics addendum to each surface review

Below (groups A-F) each surface now gets an **"Interaction economics"** subsection with:
- **Clicks/turn (expected)** — how many actions on average
- **Precision required** — small target / large target / keyboardable
- **Repetition pain** — scale of 1-5, multiplied by frequency
- **Keyboard coverage** — yes / partial / no

Surfaces scoring poorly here are priority fixes even if their LOOK is fine. Interaction pain compounds; look fatigue is one-time.

---

## Summary of how these violations cluster

| Cluster | Count | Most-impactful fix |
|---|---|---|
| **Visual identity** (H-2, H-6, H-9, H-11) | 4 | System-wide design token overhaul + icon set |
| **Layout / viewport** (H-1, H-7) | 2 | Canvas-fills-viewport + panel-information-hierarchy |
| **Juice / feel** (H-4, H-5) | 2 | Animation system + sound hooks |
| **Chrome / TopBar** (H-3) | 1 | TopBar redesign (highest leverage single fix) |
| **HUD coordination** (H-8, H-12) | 2 | Overlay conflict audit + ESC/close consistency |
| **Typography** (H-6 again) | 1 | Type scale + tabular numerics |
| **World anchoring** (H-11, H-13) | 2 | Map-chrome relationship + in-world time |

**If I could fix only three things,** they'd be:
1. Canvas fills the viewport (H-1) — makes the game actually feel like a game
2. TopBar redesign (H-3) — anchor every player's attention to the right things
3. System design tokens + typography + iconography (H-2 + H-6 + H-9) — one overhaul that rewrites how everything looks

Those three land, the remaining violations become easier and smaller.
