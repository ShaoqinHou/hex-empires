# Sikhism — Civ VII

**Slug:** `sikhism`
**Category:** `religion`
**Age:** `exploration`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

## Sources

- https://game8.co/games/Civ-7/archives/499399 — Game8: How to Found Religion and List of Beliefs
- https://www.thegamer.com/civilization-7-civ-religious-beliefs-tier-list-ranked/ — TheGamer: Religious Beliefs Ranked
- https://civilization.fandom.com/wiki/Category:Religion_icons_(Civ7) — Fandom icon category (403; confirmed via web search snippet that Sikhism icon is in vanilla set)

## Identity

- Historical period: Founded in the Punjab region of the Indian subcontinent in the 15th century CE by Guru Nanak Dev Ji — making it one of the younger world religions and one whose founding date falls squarely within the Civ VII Exploration Age timeframe (c. 1400–1700 CE equivalent).
- Flavor: Sikhism is one of the pre-defined historical religion options available as a cosmetic selection at religion founding. Its icon (Khanda) is included in the vanilla Civ VII religion icon set. Of all the vanilla religions, Sikhism has the most direct temporal alignment with the Exploration Age as a faith that originated within that era.
- **Key design note:** In Civ VII, the religion name and icon chosen at founding are purely cosmetic. All gameplay mechanics derive from the Reliquary, Founder, and Enhancer Beliefs selected — not from the religion name itself.

## Stats / numeric attributes

- Effect: Cosmetic only — no unique gameplay effect tied to the name "Sikhism." All effects come from chosen beliefs.
- Unlock condition: Found during Exploration Age by researching the Piety Civic and constructing a Temple (first Temple for the player).
- Stacking: One religion per player; cosmetic name is chosen once and locked.

### Design notes on historical fit

Sikhism emerged in the Punjab in the early 16th century, contemporaneously with the European Reformation and the beginning of global maritime exploration — placing its founding squarely in the Exploration Age window that Civ VII models. This makes Sikhism an ideal Exploration-age religion choice for roleplayers following historical accuracy.

Sikhism emphasizes community service (seva), equality, and the concept of Ik Onkar (One God). The `Lay Followers` reliquary belief (+1 Relic per conversion of settlements with 10+ Rural Population) aligns loosely with Sikhism's rural Punjab origins and emphasis on agricultural community.

### Available Beliefs (shared pool — not Sikhism-specific)

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

Sikhism is the most recently founded of the vanilla Civ VII religions and the one with the best temporal fit for the Exploration Age. The `Defenders of the Faith` enhancer belief resonates with Sikh martial traditions (the Khalsa warrior tradition). [LLM-KNOWLEDGE-ONLY] for historical period details. Confirmed as a vanilla icon per web search snippets from the Fandom icon category page.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
