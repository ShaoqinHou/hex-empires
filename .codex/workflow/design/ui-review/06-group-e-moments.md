---
title: Group E — Moment-of-drama modals review
surfaces: SetupScreen, AgeTransition (modal trigger), Crisis, TurnSummary, Victory
purpose: Modal interruptions that MUST earn their interruption. Low frequency, high weight per appearance
created: 2026-04-17
---

# Group E — Moment-of-drama modals

Per P9: a modal must justify its interruption with drama, art, anchoring copy, meaningful choice. A modal that is just a text list with a Close button is a website interruption — infuriating in a game.

## E.1 — SetupScreen

**Screenshot:** 01

### Current description

Full-viewport overlay shown at game start. Top→bottom:

1. `HEX EMPIRES` in large yellow bold (~48-60px)
2. Subtitle `A NEW AGE AWAITS`
3. `CHOOSE YOUR LEADER` section with 9 leaders (Augustus, Cleopatra, Pericles, Cyrus, Gandhi, Qin Shi Huang, Alexander, Hatshepsut, Genghis Khan) each as a card with a **letter-in-colored-circle** (A for Augustus on blue, C for Cleopatra on grey, etc.) + name + ability tagline underneath (`Pax Romana: +5 combat strength when defending. Cities grow 10% faster.`)
4. `CHOOSE YOUR CIVILIZATION` section with 7 civs in similar letter-circle cards (R for Rome red, E for Egypt yellow, G for Greece green, ...)
5. `MAP SIZE`: 3 buttons (Small/Medium/Large)
6. `AI OPPONENTS`: 3 buttons (1/2/3 opponents)
7. `RESUME GAME` button (if save exists)
8. `START GAME (NEW RUN · OVERWRITES SAVE)` button

### Look

Dark background, yellow title. The leader/civ cards with **colored circles + single letters** are the most distinctive and WORST design decision in the app: they read as avatar placeholders. No art. No portrait. No sense that Augustus is a Roman emperor and Gandhi is a 20th-century Indian pacifist. A stranger picks "the blue A" not "Augustus".

### Feel

Onboarding for a tech startup that forgot to upload user photos. Or a default placeholder for a CMS that never got populated with art.

### Issues

| # | Severity | Issue |
|---|---|---|
| E.1.1 | **P0** | **Leader "portraits" are colored circles with letters.** This is the #1 visual regression in the entire product. At minimum: use bust silhouettes, era-appropriate typography, a faux-marble or faux-painting texture. With any art: actual leader illustrations. |
| E.1.2 | **P0** | **Civ "icons" are colored circles with letters.** Same. Rome should have an eagle, Egypt an ankh/pyramid, Greece a column, China a dragon, Vikings a longship — even as simple glyphs. |
| E.1.3 | **P0** | Ability tagline is a two-line sentence under the grid (only one visible at a time — shows for the currently-hovered or selected leader). Good pattern — but the text is small and static. Should be a larger "chosen leader" card on the side when you select one, showing full flavor copy. |
| E.1.4 | **P1** | Map size + AI opponents as separate button rows reads mechanical. Should be a single "Game setup" row: difficulty, size, opponents, settings, all chosen inline. |
| E.1.5 | **P1** | No map preview. `Small 40x30` — how does that compare to Large 80x50? Show tiny thumbnail maps or proportional rectangles. |
| E.1.6 | **P1** | The `RESUME GAME` button has the game metadata in the button label: `Turn 2 · Rome · Autosave · T2 · Apr 16, 2026`. Too much text. Should be a secondary "Resume" pill at top-right OR a separate "Saves" slot with save-card details. |
| E.1.7 | **P1** | `START GAME (NEW RUN · OVERWRITES SAVE)` — the warning `OVERWRITES SAVE` is in the button. Good intent (prevent accidental overwrite), bad execution (buries the warning). Should be a confirmation modal with one clear path to cancel. |
| E.1.8 | **P2** | Title `HEX EMPIRES` is centered over the setup content — fine, but NO background scene. Every setup screen in the genre has a background: a painting of an ancient vista, a globe, a scribbling-map motif. Even a tiled parchment pattern would elevate this. |
| E.1.9 | **P2** | Selected leader's highlight is a BLUE border. That's a web "selected state" convention. In a game, selection could be: a warm gold glow, a subtle animation of the portrait, a scroll unfurling below the card. |

### Redesign proposal

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│     HEX EMPIRES                                            [background: faded   │
│     A NEW AGE AWAITS                                        world map or        │
│                                                             watercolor of       │
│                                                             ancient ruins]      │
│                                                                                  │
│  ┌────────────────────────────┐                                                 │
│  │ YOUR LEADER                │                                                  │
│  │                            │                                                  │
│  │ [Augustus portrait, 180×240]                                                  │
│  │                            │                                                  │
│  │ AUGUSTUS OF ROME           │                                                  │
│  │ "I found a Rome of brick   │                                                  │
│  │  and left it of marble."   │                                                  │
│  │                            │                                                  │
│  │ Pax Romana                 │                                                  │
│  │ +5 combat str defending    │                                                  │
│  │ Cities grow 10% faster     │                                                  │
│  │                            │                                                  │
│  │ [Choose a different leader▾]                                                  │
│  └────────────────────────────┘                                                  │
│                                                                                  │
│  CIVILIZATION:  Rome ▾  (✓ default pairing with Augustus)                       │
│                                                                                  │
│  WORLD:  🗺  Medium (60×40)  ▾                                                   │
│  OPPONENTS:  👥  2                     ▾                                         │
│  DIFFICULTY:  ⚔  Prince                ▾                                         │
│                                                                                  │
│                                             [RESUME previous run] [BEGIN NEW RUN]│
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Hero: selected-leader portrait + quote + abilities, not a grid of placeholder circles
- Everything else as dropdowns (faster, less visual noise)
- Resume + Begin New are equal-weight primary actions

### Interaction economics

Opens **once per game session**. Low frequency. Must feel WORTH a high production investment because it's the first impression.

### Effort estimate: 1-2 weeks (including leader portraits — this is art-budget-heavy)

---

## E.2 — AgeTransition modal

**Screenshot:** 06 (but this is actually the DASHBOARD view; the real transition moment — triggered automatically — wasn't captured)

### Current description (dashboard view)

Shown as E.1 above — flow header, progress bar, list of future civs.

The AgeTransition **modal moment** (when a player actually crosses into a new age) is more ceremonial — I'd need to screenshot it at the threshold. Inferring from `AgeTransitionPanel.tsx` in the codebase and the dashboard view: at age-up the player picks their new-era civilization from the unlocked roster, inheriting the previous civ's legacy bonus.

### Issues (inferred)

| # | Severity | Issue |
|---|---|---|
| E.2.1 | **P0** | Age transitions are THE SIGNATURE moment of Civ VII's system. They deserve a full ceremonial presentation: darkened map, era-themed background art, the legacy bonuses solidifying with animation, the new civ choice as a 3-card reveal. Current implementation appears dashboard-like, not ceremonial. |
| E.2.2 | **P0** | Legacy bonus accumulation isn't visualized. On age 1→2 transition, the player should see "Your Antiquity legacy: +X bonus carries forward" with animation. On 2→3, both legacies visible. Tells the story. |
| E.2.3 | **P1** | Choice of new-age civ is a permanent decision. It deserves a full-screen choice stage with the 6 candidates as hero cards, not a compact list. |

### Redesign proposal

Full-screen modal (breaks PanelShell's overlay pattern — this earns a `<DramaModal>` override):

```
[dim world map, era transition animation, 
 sun rising over horizon,
 ambient "age of exploration" score plays]

                    THE EXPLORATION AGE
                         ──── ✧ ────

      Your Antiquity legacy — Pax Romana — carries forward

               Choose your civilization for the new age:

  ┌────────────┐  ┌────────────┐  ┌────────────┐
  │ [Spain art]│  │[England art│  │ [France art│
  │            │  │            │  │            │
  │  SPAIN     │  │  ENGLAND   │  │  FRANCE    │
  │            │  │            │  │            │
  │  Treasure  │  │  Sea Dogs  │  │  Grand     │
  │  Fleet:    │  │  +1 naval  │  │  Tour:     │
  │  trade     │  │  movement  │  │  +2 culture│
  │  routes +3 │  │            │  │  per wonder│
  │  gold      │  │            │  │            │
  │            │  │            │  │            │
  │  [Choose]  │  │  [Choose]  │  │  [Choose]  │
  └────────────┘  └────────────┘  └────────────┘
             (6 cards; scrollable)
```

With sound, ambient animation, era-themed typography.

### Interaction economics

Occurs 2× per game (3 ages). Rare, dramatic. Afford the full treatment.

### Effort estimate: 1-2 weeks (art + animation + audio + logic for full modal)

---

## E.3 — CrisisPanel

Not directly screenshotted but referenced in registry as modal priority. Probably triggered when the engine fires a `CrisisEvent`.

### Expected structure

From `packages/engine/src/data/crises/`: plague, barbarian invasion, golden age, trade opportunity, natural disaster. Each probably offers the player 2-3 choices with different outcomes.

### Likely issues (inferred)

| # | Severity | Issue |
|---|---|---|
| E.3.1 | **P0** | Crises are THE dramatic-interrupt par excellence. They need scene-setting: a painting/illustration of the crisis, a headline ("THE PLAGUE STRIKES ROMA"), a flavor paragraph, the choices as serious cards not buttons. |
| E.3.2 | **P0** | Choice consequences should be visible upfront — "if you choose quarantine: -2 happiness for 5 turns · +50% plague reduction". Players shouldn't choose blind. |
| E.3.3 | **P1** | Different crisis categories need different visual treatments (plague = sickly green chrome; invasion = blood-red; golden age = warm gold). Currently probably all same slate. |

### Redesign proposal

Same `<DramaModal>` wrapper as AgeTransition + category-specific chrome. Painting or illustration at top, title, flavor text, 2-3 choice cards with visible consequences, sound cue matching severity.

### Effort estimate: 1 week (once `<DramaModal>` exists; 5-7 crisis arts)

---

## E.4 — TurnSummaryPanel

Not directly screenshotted. Triggered at end-of-turn per some condition (probably when significant events happen).

### Expected function

Summarizes the last turn: cities grew, techs completed, combat outcomes, diplomacy events, resources gained.

### Likely issues (inferred)

| # | Severity | Issue |
|---|---|---|
| E.4.1 | **P0** | If it's modal every turn, it's in the way. Should be modal ONLY for turns with significant events; otherwise the EventLog captures the info. |
| E.4.2 | **P1** | Even when modal, the player wants to dismiss quickly. Keyboard shortcut (Enter / Space) to dismiss must work. |

### Redesign proposal

Make it a **dockable side panel** (not modal) that slides in briefly at turn-start and can be pinned open or auto-dismissed. Categories of events grouped (growth, military, research, diplomacy). Each line is a link that pans the camera to the relevant hex on click.

### Interaction economics

If shown every turn: 200× per game. MUST be single-keystroke dismissable or auto-dismissing.

### Effort estimate: 3-4 days

---

## E.5 — VictoryPanel

Not directly screenshotted. Triggered at game end.

### Expected function

Announces game end (victory or defeat), summarizes stats, offers replay / return-to-menu / continue-after.

### Likely issues (inferred)

| # | Severity | Issue |
|---|---|---|
| E.5.1 | **P0** | Game end is the single most important moment in the whole play session. It deserves MASSIVE ceremony: fireworks/fanfare, the winning civ's banner, scoring breakdown, photo-op stats screen worth screenshotting. |
| E.5.2 | **P0** | Defeat is often deflating. A good Victory screen celebrates both winners and runners-up ("You came in second with 2847 score — stronger than your last Rome run"). |
| E.5.3 | **P1** | Replay-value: "most memorable moments of this game" timeline (first city founded turn 3, first combat turn 8, declared war on Greece turn 22, ...). Good for sharing. |

### Redesign proposal

Full-screen ceremonial modal with:
- Hero: winning-civ banner, leader portrait, victory type proclaimed
- Middle: scoring breakdown per civ (table ranked)
- Timeline: key events per civ
- Footer: Replay / Return to Menu / Continue Playing (for after-victory sandbox)
- Background: celebratory or somber based on your position

### Interaction economics

Occurs once per game. Rare, high ceremony. Budget it.

### Effort estimate: 1 week

---

## Group E summary

**Principles violated most:** P9 (modals earn interruption) — these modals currently mostly DON'T earn; P3 (chrome has texture) — all same flat slate for dramatic moments.

**Biggest architectural need:** a `<DramaModal>` component/shell distinct from the regular PanelShell. It has:
- Full-screen (or near-full-screen) dimmed overlay
- Scene-setting background art slot
- Headline typography
- Scrollable body with choice cards
- Sound-cue hooks
- Animation hooks (enter / exit with style)

Once `<DramaModal>` exists, ~4 panels (AgeTransition, Crisis, Victory, and any major crossroads moments) share its chrome.

**Interaction economics note:** Group E panels are LOW frequency but HIGH weight per appearance. Invest in art + sound + motion. A player will see the VictoryPanel ONCE but screenshot it / share it / remember it — unlike any single turn of TopBar.

**Combined effort:** ~4-6 weeks for full Group E polish (most is art / audio / animation time). The logic is largely already there.
