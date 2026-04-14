# Rulebook §14 Expansion (Draft)

**Status:** DRAFT — not yet merged into `civ7-rulebook.md`.
**Merge target:** `civ7-rulebook.md` §14 (Governments and Social
Policies). The rulebook's current §14 is the short "thin" version
flagged in `rulebook-gaps.md`; this draft replaces §14.1 through
§14.3 verbatim and adds §14.4–§14.6.
**Paired plan:** `government-system.md`.
**Do not edit `civ7-rulebook.md` until the implementing cycles (B–E)
of `government-system.md` are accepted.** Merging this draft into the
rulebook commits us to these numbers.

---

## 14. Governments and Social Policies

### 14.1 Government Selection

- Each Age, the player chooses exactly one **Government** on the
  first turn of that Age. Governments are locked for the duration of
  the Age and cleared on age transition.
- Each Age offers three Government options, gated by civic
  prerequisites. Governments from earlier Ages cannot be re-selected
  in a later Age.
- Each Government provides:
  - A base Policy slot layout (see §14.2 for category semantics).
  - Two Celebration bonus options — 10-turn buffs picked at each
    Celebration (see §4.5).
  - A passive **Legacy Effect** that applies while the Government is
    active. On age transition the effect is lost (unlike civilization
    legacy bonuses which persist).

#### 14.1.1 Antiquity Governments

| Government | Unlock Civic | Slots | Legacy Effect |
|---|---|---|---|
| Classical Republic | Code of Laws | 1 economic, 1 wildcard | +1 Culture per City |
| Despotism | Mysticism | 2 military | +10% Production toward Land Units |
| Oligarchy | State Service | 1 economic, 1 diplomatic | +1 Gold per Specialist |

#### 14.1.2 Exploration Governments

| Government | Unlock Civic | Slots | Legacy Effect |
|---|---|---|---|
| Feudal Monarchy | Feudalism | 2 military, 1 economic | +2 Food per City-Center |
| Plutocracy | Mercantilism | 2 economic, 1 wildcard | −20% Gold cost of Rush Buying |
| Theocracy | Scholasticism | 1 military, 1 diplomatic, 1 wildcard | +2 Faith per Temple |

#### 14.1.3 Modern Governments

| Government | Unlock Civic | Slots | Legacy Effect |
|---|---|---|---|
| Democracy | Enlightenment | 1 military, 2 economic, 1 diplomatic | +25% Trade Route yields |
| Fascism | Totalitarianism | 3 military, 1 economic | +20% Combat Strength while defending home territory |
| Communism | Class Struggle | 2 military, 2 economic | +15% Production in every City |

All nine governments above are mutually exclusive choices within their
Age; players pick exactly one at the first turn of that Age.

### 14.2 Social Policies

- Policies are placed in the Policy slots provided by the current
  Government. Any Policy may be slotted into any slot whose category
  matches the Policy's category (or `wildcard`, which accepts any
  category).
- **Base slots:** provided by the Government (see §14.1.1–14.1.3).
- **Additional slots:** each Celebration (§4.5) grants +1 wildcard
  slot (permanent, carries across ages). Leader Attribute
  _Diplomatic — Tier 3_ grants +1 additional wildcard slot. Some
  Civics and Techs add specific slot types (see Civic tree notes).
- **Swap cost:** Policies may be swapped freely between turns at no
  cost. A slot cannot hold the same Policy that is already slotted in
  another slot by the same player.
- Policies unlock via Civic research (most), Tech research (a few), or
  Leader Attribute pickups (rare). A Policy remains unlocked
  permanently once earned.

#### 14.2.1 Policy Categories

| Category | Theme | Typical Effects |
|---|---|---|
| Military | Combat, war support, standing armies | +CS, +Production toward units, War Support gain |
| Economic | Gold, production, growth | +Gold, +Production, +Food, rush-buy discounts |
| Diplomatic | Influence, treaties, trade | +Influence, treaty cost reduction, trade-route yields |
| Wildcard | Any category qualifies | Any effect; wildcard slots accept policies of any category |

#### 14.2.2 Policy Roster (minimum shipping set)

Each Age ships with 5–8 policies; players unlock 3–5 over an Age.

**Antiquity policies:**
- `legion-tradition` (Military) — +2 Combat Strength to Melee units.
- `conscription` (Military) — +15% Production toward Land Units.
- `survey` (Economic) — +1 Production per Mine.
- `caravansary` (Economic) — +2 Gold per Trade Route.
- `emissaries` (Diplomatic) — +2 Influence per turn.
- `tribute` (Diplomatic) — +10% Gold from City-States.
- `ancestor-worship` (Wildcard) — +1 Happiness per Temple.

**Exploration policies:**
- `retinues` (Military) — +1 Commander aura radius.
- `naval-tradition` (Military) — +10% Production toward Naval Units
  and +1 sight to Naval.
- `guilds` (Economic) — +15% Production toward Buildings.
- `merchant-confederacy` (Economic) — +2 Gold per Trade Route.
- `diplomatic-corps` (Diplomatic) — −20% cost of Endeavors.
- `crusading-zeal` (Diplomatic) — +2 Faith per Specialist when at war.
- `cloister` (Wildcard) — +1 Science per Temple.

**Modern policies:**
- `standing-army` (Military) — +10% Combat Strength to all units.
- `total-war` (Military) — +20% Production toward Military Units;
  +50% War Weariness.
- `industrialisation` (Economic) — +2 Production per Factory.
- `free-market` (Economic) — +15% Trade Route yields.
- `think-tank` (Diplomatic) — +15% Science; −2 Influence per turn.
- `propaganda` (Diplomatic) — +1 Happiness per City; +10% Culture.
- `planned-economy` (Wildcard) — +10% all yields; policies cost 1
  turn to swap (special restriction).

### 14.3 Codex System

- Codices are placed in buildings that expose **Codex slots**:

| Building | Age | Codex slots |
|---|---|---|
| Library | Antiquity | 2 |
| Academy | Antiquity | 3 |
| Palace | Ageless | 4 |
| University | Exploration | 3 |
| Research Lab | Modern | 4 |

- Each placed Codex yields **+1 Science per turn** to the hosting
  city. Codex yields stack additively with other Science sources.
- Codices are earned through **Tech Masteries** and **Civic
  Masteries**. Completing one mastery grants exactly one Codex,
  named for the mastered tech or civic (e.g., "Codex of Writing").
- Earned Codices go into the player's Codex Reservoir. A Codex in
  the Reservoir yields nothing; it must be slotted to activate.
- Codices may be moved between slots freely between turns (same
  cadence as Policies — see §14.2).
- Codices persist across Age transitions: a Codex earned in Antiquity
  remains slotted (or in the Reservoir) in Exploration and Modern.

### 14.4 Celebration Government Bonuses (cross-reference §4.5)

Each Celebration grants the player a choice between two **10-turn**
bonuses tied to the **current** Government. The bonus is locked in at
grant time — changing Government (via Age transition) does not cancel
it. The bonus expires at the end of the 10th turn after grant.

The nine Governments defined in §14.1 each expose a 2-option
Celebration bonus pair. The six options given in §4.5's examples map
to the six Antiquity/Exploration Governments. The Modern-era
Governments add:

| Government | Option A | Option B |
|---|---|---|
| Democracy | +25% Culture | +20% Trade Route yield |
| Fascism | +30% Production toward Units | +15% Combat Strength |
| Communism | +20% Production in every City | +15% Science |

### 14.5 Government Change Rules

- On Age transition, the previous Government's Legacy Effect is
  removed. Slotted Policies clear. Celebration bonus in progress
  continues to expire (§14.4). Earned Codices remain in the
  Reservoir or their slots.
- The player must select a new Government on the first turn of the
  new Age. Until a selection is made, the player has **zero Policy
  slots** and no Government Legacy Effect.
- Governments unlocked in earlier Ages become unavailable once the
  Age advances past them (civic-tree-gated).
- There is no anarchy or cooldown cost for the forced Government
  change at Age transition.

### 14.6 Summary of Slot Maths

| Source | Slot count | Slot type |
|---|---|---|
| Government base | 1–4 (see §14.1) | per-category |
| Celebration | +1 per Celebration (permanent) | wildcard |
| Leader Attribute — Diplomatic Tier 3 | +1 | wildcard |
| Civic: _Divine Right_ (Exploration) | +1 | diplomatic |
| Civic: _Nationalism_ (Modern) | +1 | military |
| Tech: _Printing Press_ (Exploration) | +1 | wildcard |

The above minimum set ensures a Modern-era player who has completed
the full civic tree, earned multiple Celebrations, and picked
Diplomatic Tier 3 should end up with approximately 6–8 Policy slots
— enough variety to meaningfully customize but not so many that
slotting becomes a trivial "check all boxes" exercise.

---

_End of §14 expansion._
