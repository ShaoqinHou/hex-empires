# Phase 5 — Notification System Redesign

Status: Design spec, ready to implement.
Author: Designer (Opus).
Scope: Replace the ad-hoc 8s blanket auto-dismiss + message-sniff type detection in packages/web/src/ui/components/Notifications.tsx with a category-driven model whose timing, sound, navigation target, and chrome treatment are all declarative and per-category.

Per the Phase 4 skeptic doc section 7: this is a per-turn impact phase. Every turn currently throws 3-12 toasts at the player with identical timing and no click-through; fixing that changes the feel of every turn more than any chrome polish can. Ship it.

## 1. Notification taxonomy

Today the notification type is guessed from message substring (for example `msg.includes(" produced ")`, `msg.includes("researched ")`) at the render layer. That is fragile and engine-unaware. Phase 5 introduces `NotificationCategory` as a first-class engine field, populated at the site where the log event is emitted.

Seven categories, each with locked-in visual + audio + navigation behavior:

| Category | Example event | Accent token | Sound | Dismiss | Panel on click | requiresAction |
|---|---|---|---|---|---|---|
| `production` | Rome produced Warrior / Athens built Granary | `--hud-notification-production` | `building_complete` | 6s | `city` (with cityId) | no |
| `research` | Researched Bronze Working | `--hud-notification-research` | `tech_complete` | 6s | `tech` | no |
| `civic` | Adopted Code of Laws | `--hud-notification-civic` | `confirm` | 6s | `civics` | no |
| `diplomatic` | Egypt declared war / Treaty signed with Greece | `--hud-notification-warning` (hostile), `--hud-notification-info` (friendly) | `error` (hostile), `confirm` (friendly) | 10s | `diplomacy` | hostile=yes, friendly=no |
| `crisis` | Plague begins, Barbarian horde approaches | `--hud-notification-warning` | `error` | never | `crisis` | yes |
| `age` | You may advance to the Exploration Age | `--hud-tooltip-heading-strong` (gold) | `victory` | never | `age` | yes |
| `info` | Save complete, Audio enabled | `--hud-notification-info` | none | 4s | none | no |

Category `info` is the sink for anything that does not fit the other six - short-lived, silent, non-clickable acknowledgements. Every production log event that currently flows into Notifications.tsx must map cleanly to one of the first six; the `info` escape hatch is for UI-originated toasts (save/load acknowledgements, audio state change hints), not for engine events.

Rationale for seven (not more): the current production / research / civic / info / warning / critical split conflates content domain with urgency. The new split is content-domain only; urgency comes from `requiresAction` + per-category dismiss timing. Adding more categories later (trade-route, wonder-complete) is additive and cheap - register the category metadata in one place (see section 7 file list) and the renderer picks it up.

## 2. Auto-dismiss policy

Timing is per-category, not global. Specific ms values:

- `info` - 4000 ms (fast; player has no action to take)
- `production`, `research`, `civic` - 6000 ms (default; long enough to glance, short enough to clear the stack before next turn)
- `diplomatic` (friendly) - 10000 ms (player wants to read the terms)
- `diplomatic` (hostile) - `requiresAction` (see below)
- `crisis`, `age` - `requiresAction`

`requiresAction: true` opts out of auto-dismiss entirely. It is cleared only by one of:

1. Right-clicking the toast (allowed only for `diplomatic`; blocked for `crisis` and `age` which must be resolved via their panel - the existing Phase 0.1 `requiresAction` scaffold already enforces this path).
2. The engine clearing the underlying state (crisis resolved, age transitioned, war acknowledged via diplomacy panel).
3. A `DISMISS_EVENT` action dispatched by the resolving panel.

Timer lifecycle is per-notification, not per-batch. Today the code shares one 8s `setTimeout` across all non-critical toasts appended in a single effect tick, so the third toast in a burst gets nearly no visible time. Phase 5 gives each notification its own timer, started when the toast mounts, cleared on dismiss or unmount.

## 3. Sound hooks

Reuse the existing `AudioManager` from `packages/web/src/audio/AudioManager.ts`. Each notification category maps to one `SoundEffect` from the existing enum - no new sound IDs needed for Phase 5. The mapping lives in the category registry (section 7); the renderer calls `getAudioManager().playSound(category.sound)` once per toast at mount.

Discipline:

- **Respect the global audio state.** `AudioManager.playSound` already early-returns when `config.soundEnabled === false`, and that config loads from `localStorage.audioSettings` which defaults to `true` in code but is set to `false` in the first-run defaults (Phase 0.6). Renderer MUST NOT bypass this check.
- **De-duplicate within a turn.** If ten cities finish a building in the same turn-end pipeline, play the `building_complete` tone once, not ten times. Strategy: the renderer maintains a `playedThisTurn: Set<SoundEffect>` keyed on `state.turn`; it clears when `state.turn` changes. A category sound plays on the first toast of that category in a turn and is suppressed for the rest.
- **Crisis and age play even if muted elsewhere.** Exception to the de-dupe rule - `crisis` and `age` are rare + consequential; they always play when a toast first mounts, irrespective of same-turn prior plays (but still respect the global mute).
- **No new WebAudio code in Phase 5.** The Phase 0.6 synth path (`SoundGenerator`) already covers every sound ID in the table. If a category wants a tone that does not exist, promote it in Phase 6, not here.

## 4. Click-to-panel navigation

Every category except `info` and `crisis` has a `panelTarget: PanelId`. Clicking a toast:

1. Calls `usePanelManager().openPanel(category.panelTarget)`.
2. Optionally passes a focus payload (only `production` does this today - `cityId` -> the City panel opens focused on that city; reuse the existing `onCityClick` pathway during migration and generalise in a follow-up).
3. Dismisses the toast (even if `requiresAction`, provided the target panel is the one that resolves the underlying state - that is, the click IS the acknowledgement).

`crisis` does not need click-to-navigate because the crisis panel auto-opens from a `useEffect` on `state.crisis.active`. The toast is informational only; clicking it is a no-op but the toast auto-dismisses when the panel closes (when `state.crisis.active` flips back to null).

`age` similarly auto-opens via `state.age.transitionPending`, but clicking the toast still calls `openPanel("age")` defensively - belt-and-suspenders because age transitions are the single highest-stakes UI moment.

Keyboard accessibility: the toast container gets `role="button"` and `tabindex="0"` when clickable; `Enter` triggers the same openPanel path. Non-clickable toasts (`info`, resolved `crisis`) stay `role="status"` as they are today.

## 5. Toast stack chrome

Visual treatment using Phase 4 chrome tokens - reuse `--hud-bg`, `--hud-border`, `--hud-shadow`, and `--hud-radius` from `hud-tokens.css`. Per-category accent is the 4px left border (same idiom as today); the accent token comes from the category registry (section 1 table).

Layout:

- **Anchor:** top-right, offset by `--hud-padding-lg` from the top and right edges, below the TopBar (z-index `--hud-z-toast` = 65, above the map, below tooltips).
- **Stack direction:** newest at top, older below; fade + slide-down on dismiss (reuse existing `animate-slide-in` for enter, add `animate-slide-out` sibling).
- **Max visible:** 4 toasts. The 5th and beyond collapse into a single +N more badge at the bottom of the stack. Clicking the badge opens the Event Log panel (`openPanel("log")`). The badge itself is styled as a `--hud-cycle-indicator-pill` (reuse existing token).
- **Width:** 320px (matches `PanelShell` `width: "narrow"`). Wraps on word boundary; no horizontal scroll.
- **Title rule:** for `diplomatic`, `crisis`, and `age` - the high-consequence categories - render a 1px gold rule under the title using `--hud-tooltip-heading-strong`. This is the gold-for-drama rule from Phase 4 carried consistently into HUD chrome. Low-consequence categories (`production`, `research`, `civic`, `info`) do NOT get the gold rule - the accent bar carries their identity and gold-everywhere dilutes drama.
- **Bronze bevel:** skip for now. Toasts are transient; the bevel reads as weight and fights the slide-in animation. Re-evaluate in Phase 6 if the stack feels flat.

## 6. requiresAction rendering

Three distinguishing cues, in decreasing subtlety:

1. **Amber border override.** The left accent bar stays the category color; the outer border of the toast switches from `--hud-border` to `rgba(251, 191, 36, 0.55)` (derived from `--hud-tooltip-heading-strong`). Add a new token `--hud-notification-requires-action-border` in `hud-tokens.css` rather than inlining the rgba.
2. **Pulsing chrome.** A 2.4s `@keyframes` pulse on the border opacity (0.55 -> 0.85 -> 0.55). `prefers-reduced-motion` disables the pulse; the static amber border still conveys the state.
3. **Acknowledgement pill.** The existing `[requires acknowledgement]` label in the title row stays; retokenise its color to `--hud-notification-requires-action-border` so it matches the outer border.

Auto-dismiss ignores `requiresAction` toasts entirely - no timer is ever scheduled for them. Right-click dismissal is allowed only for `diplomatic` (acknowledge the war declaration); `crisis` and `age` block right-click and surface the existing `title` hint (Resolve in the related panel to clear this).

## 7. Migration plan - files that change

Engine:

- `packages/engine/src/types/GameState.ts` - extend `GameEvent` (the existing log entry type) with two optional fields: `category?: NotificationCategory` and `panelTarget?: NotificationPanelTargetHint`. Both live in a new `packages/engine/src/types/Notification.ts` file, exported via the barrel. `PanelId` cannot live engine-side (UI concern); instead, export a string literal union `NotificationPanelTargetHint = "city" | "tech" | "civics" | "diplomacy" | "crisis" | "age"` from the same file and let the web layer narrow it to `PanelId`. This keeps the engine DOM-free and the import boundary clean.
- `packages/engine/src/systems/productionSystem.ts`, `researchSystem.ts`, `civicSystem.ts`, `diplomacySystem.ts`, `crisisSystem.ts`, `ageSystem.ts` - every `state.log` append (done via `[...state.log, event]` spread per `engine-patterns.md` section 1) sets `category` + `panelTarget` on the event. No fallback; if a system emits an event without a category, the renderer routes it to `info`.
- Tests in `packages/engine/src/systems/__tests__/` - assert category + panelTarget on at least one event per system.

Web:

- `packages/web/src/ui/components/Notifications.tsx` - replace the `extractCityId` + message-sniffing branches with a direct read of `event.category`. Extract the per-category config into a sibling `notificationCategoryRegistry.ts` pure-data file (mirror of `panelRegistry.ts`). Render loop reads from the registry; `getNotificationColor` / `getNotificationTitle` become registry lookups, not switch statements.
- `packages/web/src/ui/components/notificationCategoryRegistry.ts` - NEW. `ReadonlyMap<NotificationCategory, NotificationCategoryEntry>` with accent token, sound, dismiss ms, panelTarget, requiresAction, titleLabel.
- `packages/web/src/styles/hud-tokens.css` - ADD `--hud-notification-requires-action-border: rgba(251, 191, 36, 0.55)`. No other token additions - everything else reuses Phase 4 tokens.
- `packages/web/src/ui/components/__tests__/Notifications.test.tsx` - add tests for per-category dismiss timing, de-duped sound-per-turn, click-to-openPanel dispatch, `requiresAction` ignoring the timer, max-4-visible with overflow badge.

## 8. Implementer brief (4 commits)

1. **Engine - add NotificationCategory + panelTarget fields.** New type file; barrel export; extend `GameEvent` (name may differ - follow engine convention). No system changes yet - fields are optional. Tests compile, no behavior change.
2. **Engine - populate fields from systems.** Add `category` + `panelTarget` to every `state.log` event emitted by production / research / civic / diplomacy / crisis / age systems. One commit per two systems if the diff is large; otherwise one commit. Adjust system unit tests to assert the new fields. ALL_X-in-systems check still passes (the new fields are data, not content).
3. **Web - category registry + renderer rewrite.** Add `notificationCategoryRegistry.ts`; rewrite `Notifications.tsx` to be a pure registry consumer. Per-notification timers; per-turn sound de-dupe; click-to-openPanel; overflow badge -> Event Log. requires-action-border token added. Unit tests and component tests updated.
4. **Web - polish + Playwright.** Amber pulse + `prefers-reduced-motion` guard; gold title rule for diplomatic/crisis/age; Playwright spec covering: click production toast -> city panel opens; click research toast -> tech panel opens; fire 6 toasts in one turn -> exactly 4 visible + badge +2 more; right-click hostile-diplomatic -> dismisses; right-click crisis -> does not dismiss.

Per-commit acceptance gate: `npm test` green; `/verify` for commits 3-4 (UI-visible).

## 9. Out of scope (flag, do not implement)

- Rich hero-image toasts (portrait of the foreign leader for diplomatic events). Phase 6+ - requires asset registry work.
- Per-civ notification personality (different tone per leader). Phase 6+.
- AI voice lines on notifications. Out of scope entirely for the current master plan.
- Notification history / pinning. The Event Log panel already serves this role; do not duplicate.
- Rate limiting per minute across turns. The per-turn sound de-dupe covers ~95% of the noise; a cross-turn rate limit is a Phase 6+ ergonomics tune.

## 10. Open questions for the user

1. **Hostile diplomacy requiresAction - block right-click or allow it?** The table says allow. Alternative: treat war declarations like a crisis and force the Diplomacy panel open. Locking to allow right-click keeps the player in control but risks dismissed-and-forgotten war declarations. Please confirm.
2. **age category accent - gold (`--hud-tooltip-heading-strong`) or a new dedicated token?** Gold already carries drama per Phase 4; a dedicated age token would let the bronze -> warm-gold progression extend into notifications. I propose gold for now; raise if the warm-gold is already speced elsewhere.
3. **Overflow badge threshold - 4 visible or 3?** 4 matches most strategy UIs; 3 is more aggressive and better on small viewports. Defaulting to 4; confirm if you want 3.

## References

- `.codex/workflow/design/ui-review/08-master-plan.md` section 3.3
- `.codex/workflow/design/ui-review/phase-4-chrome-skeptic.md` section 7 (per-turn impact argument)
- `.codex/rules/ui-overlays.md` - HUD manager + TooltipShell rules; notifications are HUD
- `.codex/rules/engine-patterns.md` section 1 - immutable append to `state.log`
- `.codex/rules/panels.md` - `PanelId` union + `openPanel` contract
- `packages/web/src/ui/components/Notifications.tsx` - current implementation
- `packages/web/src/audio/AudioManager.ts` - existing sound dispatcher (reuse, do not extend)
- `packages/web/src/styles/hud-tokens.css` - accent tokens (add one new for requiresAction border)
- `packages/web/src/ui/panels/panelRegistry.ts` - panel id enum that panelTarget narrows into
- `packages/engine/src/types/GameState.ts` - `GameEvent` shape to extend; `DISMISS_EVENT` action already shipped in Phase 0.1
