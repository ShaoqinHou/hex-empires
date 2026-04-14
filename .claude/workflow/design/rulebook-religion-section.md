# Rulebook §18 Draft — Religion & Pantheons

**Status:** DRAFT. To be merged into `civ7-rulebook.md` as a new
`## 18. Religion & Pantheons` section in a later cycle (not this one).
**Source:** distilled from Civ VII documentation plus standard 4X
conventions where the official source is thin. Items tagged
[UNCONFIRMED] are open research questions — see
`religion-system.md §9`.

**Why a separate section?** The current rulebook references religion
piecemeal (§2.3 "Religious Site" specialization, §6.9 "God of Healing
Pantheon", §8 Altar/Temple) but has no system-level rules for how
Faith, Pantheons, or Religions actually work. `rulebook-gaps.md` §M2
and §6 flag this as "missing entirely."

---

## 18. Religion & Pantheons

Religion layers on top of the core economy via the `Faith` yield.
Every player accrues Faith from Shrines, Temples, certain wonders and
natural features; the pool is spent on three mutually-reinforcing
tiers: a **Pantheon** (passive empire bonus), a **Religion** (founded
faith with beliefs), and **Religious Units** (Missionaries and
Apostles that spread the religion abroad).

### 18.1 The Faith yield

- `Faith` is one of the base yields listed in §5.1.
- Sources: Shrine, Temple, Holy Site districts, Religious Site town
  specialization (§2.3), certain natural wonders, Legacy bonuses, and
  several civ/leader abilities.
- Faith accumulates in a per-player pool. Unlike Gold it is not spent
  on production queue buys — only on religion-specific choices.

### 18.2 Pantheons (Antiquity tier)

- First time a player's Faith pool crosses the pantheon threshold
  (default **25 Faith** [UNCONFIRMED — may scale by game speed]), the
  player opens the Pantheon Pick panel.
- The player picks exactly one `PantheonDef` from the unpicked pool.
  The Faith threshold cost is deducted.
- The pantheon's `bonus` (a single `EffectDef`) applies empire-wide
  for the rest of the game — including through age transitions.
- **One pantheon per player**, permanent, non-transferable.
- **First-come, first-served:** once a pantheon is picked it is no
  longer available to other players. The global registry of picks
  lives on `ReligionState.pantheons`.
- **Default list (10 pantheons):** named examples include
  *God of Healing*, *Goddess of the Harvest*, *God of the Forge*,
  *God of War*, *Religious Settlements*, *God of the Open Sky*,
  *Stone Circles*, *Goddess of Festivals*, *God of Craftsmen*,
  *Fertility Rites*. Concrete numbers are deferred to content cycle.

### 18.3 Founding a Religion (Antiquity / Exploration boundary)

- A player who has adopted a pantheon and built a **Holy Site** or a
  **Temple** may found a religion by spending **200 Faith**
  [UNCONFIRMED] at the city containing their first Holy Site.
- Founding requires:
  1. An unclaimed religion slot (see §18.8 "Religion slot count").
  2. The founding city to contain a Temple or Holy Site district.
  3. The player to hold a pantheon.
- The founding player chooses:
  - A display name (free text, e.g. "Buddhism", "Zoroastrianism").
  - One **founder belief** (affects only the founder, empire-wide).
  - One **follower belief** (affects every city that follows the
    religion, regardless of who owns it).
- The city becomes the religion's **Holy City**. The holy city
  receives passive pressure bonuses and cannot be changed.
- The founded religion persists through age transitions and civ
  swaps — it is keyed to the founding civ, not the active civ.

### 18.4 Enhancing a Religion (Exploration tier)

- Once the religion has spread to some minimum number of cities
  [UNCONFIRMED — Civ VI used 5; likely similar], the founder may spend
  **400 Faith** [UNCONFIRMED] to enhance it.
- Enhancement picks two more beliefs:
  - One **enhancer belief** (another founder-only bonus).
  - One **worship belief** (unlocks a unique "worship building" the
    founder can construct in every city that follows the religion).
- Enhanced religions have four beliefs total
  (founder / follower / enhancer / worship). This is the `MAX_RELIGION_BELIEFS`
  constant in code.

### 18.5 Religious Units

Two religious unit archetypes are trained by spending Faith at a city
with the appropriate building:

- **Missionary** — Exploration age. Spreads the religion once per
  target city; consumed on use. Cannot engage in theological combat.
  Each Missionary carries **3 spread charges** [UNCONFIRMED].
- **Apostle** — Exploration / Modern age. Stronger spread (+2 pressure
  per spread); can promote by spending charges; can initiate
  **theological combat** against enemy Apostles in an adjacent hex.

Religious units ignore terrain movement costs [UNCONFIRMED — Civ VI
convention, verify for VII] and cannot be targeted by normal combat
units. They are destroyed only by theological combat or when their
charges run out.

### 18.6 Religious spread — pressure

Each turn, every city emits **religious pressure** for its dominant
religion to neighboring cities. Pressure spreads via three channels:

1. **Proximity.** Every city within **10 hexes** of a city with a
   dominant religion receives passive pressure per turn, scaled by
   distance (linear falloff). Range is `RELIGIOUS_PRESSURE_RADIUS`.
2. **Trade routes.** A trade route whose endpoint has a dominant
   religion delivers pressure to the other endpoint regardless of
   distance.
3. **Religious units.** A Missionary or Apostle on a city tile adds a
   large one-shot pressure spike for the unit's religion.

Pressure accumulates on `CityReligiousState.pressure`. At end of turn
the religion with highest pressure in a city promotes one citizen to
its follower count (`followers`). When a religion passes
50% + 1 of a city's pop it becomes `dominant` for that city.

### 18.7 Theological combat

Two enemy Apostles on adjacent hexes may initiate **theological
combat** (an `INITIATE_THEOLOGICAL_COMBAT` action). Resolution is
independent of normal combat:

- Strength is the Apostle's religious strength, modified by nearby
  Holy Sites, relevant promotions, and belief bonuses.
- Damage is applied as **charge loss**, not HP. An Apostle at 0
  charges is removed from the game.
- Winning theological combat spreads some of the winner's religion
  pressure to adjacent enemy cities [UNCONFIRMED].

### 18.8 Religion slot count

- The number of religion slots per game is bounded. Convention:
  **(player count − 1)** religions may exist in Antiquity; may grow
  by +1 on Exploration transition [UNCONFIRMED].
- `ReligionState.availableReligionSlots` tracks the remaining pool.
- Players who cannot afford the founding cost before slots run out
  are locked out of religion-tier play; their Pantheon persists.

### 18.9 Capture of a Holy City

- If a Holy City is captured in war, the religion's `founderId` does
  **not** change — the religion remains keyed to its original civ.
- The captor receives the city's normal yields but does not gain the
  founder's founder/enhancer beliefs.
- If the captor follows a different religion, the captured city
  becomes a pressure battleground: the captured city emits the
  founder's religion at a dampened rate and receives full pressure
  from the captor's neighbors.

### 18.10 Interactions with age transitions

- **Pantheons persist across ages.** The pantheon bonus remains
  active in Exploration and Modern regardless of civ swap.
- **Religions persist across ages.** Founder-keyed bonuses remain
  with the founding civ even after that civ has transitioned out.
- **Religious Legacy Path [UNCONFIRMED]:** Civ VII may include a
  Religious Legacy Path in Exploration with milestones tied to
  number of converted cities and theological combats won. Schema
  TBD.

### 18.11 Summary table

| Tier | Unlock gate | Faith cost | Slots | Effects |
|------|-------------|-----------|-------|---------|
| Pantheon | Faith ≥ 25 | 25 | 1 per player | 1 empire-wide bonus |
| Religion founding | Pantheon + Holy Site | 200 | player count − 1 | founder + follower belief |
| Religion enhancement | Spread to 5 cities | 400 | once per religion | enhancer + worship belief |
| Missionary | Exploration + Temple | Faith buy | per training | 3 spread charges |
| Apostle | Exploration + Temple | Faith buy | per training | spread + combat |

---

*End of draft §18.* The Pantheon list, Belief list, and exact faith
costs are content-layer concerns and live in
`packages/engine/src/data/religion/` once the content cycle lands.
