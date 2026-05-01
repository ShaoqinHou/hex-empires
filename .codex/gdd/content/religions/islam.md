# Islam — Civ VII

**Slug:** `islam`
**Category:** `religion`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://game8.co/games/Civ-7/archives/499399 — Game8: How to Found Religion and List of Beliefs
- https://www.thegamer.com/civilization-7-civ-religious-beliefs-tier-list-ranked/ — TheGamer: Religious Beliefs Ranked
- https://civilization.fandom.com/wiki/Category:Religion_icons_(Civ7) — Fandom icon category (403; confirmed via web search snippet that Islam icon is in vanilla set)

## Identity

- Historical period: Founded in 7th century CE in the Arabian Peninsula by Muhammad; spread rapidly across the Middle East, North Africa, Central Asia, and maritime Southeast Asia during the Exploration Age equivalent, making it one of the most expansion-aligned faiths for this game period.
- Flavor: Islam is one of the pre-defined historical religion options available as a cosmetic selection at religion founding. Its icon (crescent and star) is included in the vanilla Civ VII religion icon set. The `Dawah` enhancer belief (trade route conversion) takes its name directly from the Islamic concept of invitation/proselytization, creating a direct named connection.
- **Key design note:** In Civ VII, the religion name and icon chosen at founding are purely cosmetic. All gameplay mechanics derive from the Reliquary, Founder, and Enhancer Beliefs selected — not from the religion name itself.

## Stats / numeric attributes

- Effect: Cosmetic only — no unique gameplay effect tied to the name "Islam." All effects come from chosen beliefs.
- Unlock condition: Found during Exploration Age by researching the Piety Civic and constructing a Temple (first Temple for the player).
- Stacking: One religion per player; cosmetic name is chosen once and locked.

### Belief name connections

The `Dawah` enhancer belief ("When a trade route is established in a settlement, it is instantly converted") directly borrows from Islamic proselytization terminology. Historically, Islam spread heavily along trade routes — the Silk Road, Indian Ocean trade network, and trans-Saharan routes — making this one of the most thematically accurate belief-name pairings in the system.

The `Desert Faith` founder belief (+2 Gold per Desert tile in following settlements) also has thematic resonance with the Arabian Peninsula origins of Islam, though it is available to any religion.

### Available Beliefs (shared pool — not Islam-specific)

**Reliquary Beliefs** (choose 1 at founding):
- Icons — +2 Relics per first-time conversion of a City-State
- Brahmanism — +2 Relics per first-time conversion of another Civ's capital
- Reliquaries — +1 Relic per first-time conversion of a settlement with Temple or Altar
- Apostolism — +2 Relics per first-time conversion of a settlement with a Wonder
- Evangelism — +1 Relic per first-time conversion in Distant Lands
- Charoen — +2 Relics per first-time conversion of a Treasure Fleet-producing settlement
- Lay Followers — +1 Relic per first-time conversion of a settlement with 10+ Rural Population
- Ecclesiasticism — +2 Relics per first-time conversion of a settlement with 10+ Urban Population

**Founder Beliefs** (choose up to 2; second slot unlocks via gameplay):
- Interfaith Dialogue — +4 Science per foreign settlement following your religion
- Tithe — +4 Gold per foreign settlement following your religion
- Holy Ecumene — +4 Culture per foreign settlement following your religion
- Vipassana — +4 Happiness per foreign settlement following your religion
- Stewardship — +8 Gold/Culture/Science per Natural Wonder tile in following settlements
- Shrines of the Kami — +4 Culture/Gold/Science per Wonder in following settlements
- Sky Gods — +1 Culture per Plains tile in following settlements
- Sacred Herbs — +1 Science per Grassland tile in following settlements
- Reincarnation — +2 Science per Tropical tile in following settlements
- Shamanism — +2 Culture per Tundra tile in following settlements
- Desert Faith — +2 Gold per Desert tile in following settlements
- Holy Waters — +1 Happiness per Marine tile in following settlements

**Enhancer Beliefs** (choose 1 after Theology Civic):
- Conversion — New Distant Lands towns start with your religion
- Stella Maris — +2 movement for Missionaries when Embarked; naval/Embarked units +1 movement
- Defenders of the Faith — Units +5 combat strength in friendly settlements following this religion
- Dawah — Trade route establishment instantly converts the target settlement
- Zeal — Missionaries receive +1 charge
- Millenarianism — Conquered settlements are converted
- Scripture — +10% Production toward Missionaries per Relic
- Sanctum — +1 Relic Slot in Temples in Cities

## Unique effects (structured — for later code mapping)

```yaml
effects: narrative-only — religion name is cosmetic; see belief pool above for engine effects.
```

## Notes / uncertainty

Islam has the strongest named-belief connections of any religion in the pool: `Dawah` (trade route conversion) uses the Arabic term for Islamic outreach, and `Desert Faith` resonates with Arabian origins. Despite this, all beliefs remain available to any religion — the names are flavor only. The Exploration Age timing aligns well with the period of Islamic maritime expansion into Southeast Asia and sub-Saharan Africa. [LLM-KNOWLEDGE-ONLY] for historical period details.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
