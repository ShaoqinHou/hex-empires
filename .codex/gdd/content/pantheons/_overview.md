# Pantheons — Civ VII

**Slug:** `pantheons`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** parent-written (subagent Write blocked; data from research subagent)
**Item count:** 16 vanilla

## Sources

- TheGamer ranked pantheons list
- Screen Rant pantheon guide
- Game8 Civ 7 pantheon list
- CivFanatics forum discussion
- Cross-referenced with `systems/religion.md`
- https://civilization.fandom.com/wiki/Pantheon_(Civ7) — returned 403 during research

## Purpose in the game

Pantheons are the **Antiquity-age** faith belief system. A player adopts one pantheon (one time, per game) by spending 25 Faith, gaining a single empire-wide passive bonus for the rest of Antiquity. Pantheons do **NOT** persist into the Exploration age and do **NOT** lead to religion founding as in Civ VI — Exploration-age Religion is a separate system (see `systems/religion.md`).

## Category-wide rules

- One pantheon per player, selected via the Religion panel once 25 Faith is accumulated
- Most pantheons are **mutually exclusive** — first-come-first-served across all players in a game
- **Non-unique pantheons** (Trickster God, God of Revelry) can be adopted by multiple players in the same game
- Effect applies immediately upon adoption and persists until end of Antiquity
- Pantheon is discarded at Antiquity → Exploration age transition; faith pool resets
- No upgrade path — pantheons do NOT evolve into religions (VII departure from VI)
- Adopting a pantheon costs exactly 25 Faith; price does not scale with game progression

## Taxonomy within the category

All pantheons are Antiquity-age only. Subtypes by effect category:
- **Production / Wonder**: Monument to the Gods, God of the Forge
- **Growth / Population**: Oral Tradition, Fertility Rites
- **Yield-on-tile**: God of the Sun, God of the Forest, Earth Goddess, Sacred Waters
- **Yield-on-building**: God of Wisdom, City Patron Goddess, Goddess of Festivals
- **Improvement buff**: Goddess of the Harvest, God of the Sea, Stone Circles
- **Military**: God of War
- **Healing / Support**: God of Healing
- **Non-unique**: Trickster God, God of Revelry

## Complete item list

| Slug | Name | Effect | File |
|---|---|---|---|
| `monument-to-the-gods` | Monument to the Gods | +10% Production toward Wonders | [link](monument-to-the-gods.md) |
| `oral-tradition` | Oral Tradition | +10% Production toward Settlers | [link](oral-tradition.md) |
| `god-of-the-sun` | God of the Sun | +1 to all yields on Altar buildings | [link](god-of-the-sun.md) |
| `god-of-the-forge` | God of the Forge | +10% Production toward buildings | [link](god-of-the-forge.md) |
| `fertility-rites` | Fertility Rites | +10% Growth Rate (all settlements) | [link](fertility-rites.md) |
| `god-of-the-forest` | God of the Forest | +1 Gold on Camps and Woodcutters | [link](god-of-the-forest.md) |
| `god-of-healing` | God of Healing | +5 healing for units on rural tiles | [link](god-of-healing.md) |
| `city-patron-goddess` | City Patron Goddess | +3 Influence on Altar buildings | [link](city-patron-goddess.md) |
| `god-of-war` | God of War | +15% Production toward Military Units | [link](god-of-war.md) |
| `god-of-wisdom` | God of Wisdom | +1 Science on Quarters | [link](god-of-wisdom.md) |
| `goddess-of-the-harvest` | Goddess of the Harvest | +1 Food on Farms, Pastures, Plantations | [link](goddess-of-the-harvest.md) |
| `god-of-the-sea` | God of the Sea | +1 Production on Fishing Boats | [link](god-of-the-sea.md) |
| `stone-circles` | Stone Circles | +1 Production on Clay Pits, Mines, Quarries | [link](stone-circles.md) |
| `earth-goddess` | Earth Goddess | +1 Happiness adjacency to Mountains / Natural Wonders | [link](earth-goddess.md) |
| `sacred-waters` | Sacred Waters | +1 Happiness adjacency to Coasts / Lakes / Rivers | [link](sacred-waters.md) |
| `goddess-of-festivals` | Goddess of Festivals | +1 Culture on Quarters | [link](goddess-of-festivals.md) |
| `trickster-god` | Trickster God (non-unique) | +25% Influence toward Endeavors / Sanctions | [link](trickster-god.md) |
| `god-of-revelry` | God of Revelry (non-unique) | +1 Happiness on Resources | [link](god-of-revelry.md) |

Total: 18 entries (16 unique + 2 non-unique multi-player pantheons).

## How this category connects to systems

- `systems/religion.md` — pantheon adoption is the primary Antiquity religious action; this is the "Faith → pantheon" mechanic described there
- `systems/yields-adjacency.md` — pantheon effects modify yield calculations on their target tiles/buildings
- `systems/combat.md` — God of War modifies military unit production; God of Healing modifies unit healing rates

## VII-specific notes

- **No pantheon-to-religion pipeline** — VI's defining pantheon mechanic was that pantheons seeded religion founding. VII severs this entirely; pantheon is strictly Antiquity-era, and founding a religion in Exploration requires fresh Faith investment.
- **Pantheon does NOT persist** across age transition. Effect ends at Antiquity → Exploration.
- **Non-unique pantheons are a new concept.** Trickster God and God of Revelry can be picked by multiple civs in the same game, reducing first-come-first-served pressure on those effects.
- **Cost fixed at 25 Faith** (vs VI scaling with player count).

## Open questions / uncertainty

- Whether the two "non-unique" pantheons exist as additional entries beyond 16 or are substitutions within the 16 — Fandom wiki (403) would resolve. Current count assumes 18 total.
- Whether any pantheon has a hidden "legacy effect" when transitioning to Exploration (e.g., founder belief selection bias).
- Exact behavior of pantheon effects on captured cities (empire-wide means empire-wide, but does "occupied" count?).
- Full numeric formulas for Growth Rate / Production bonuses (source describes "+10%" but doesn't specify base).

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
