# Civilization VII -- Comprehensive Mechanics Rulebook

Reference document for hex-empires engine implementation.
Compiled from the Civilization Wiki (Fandom), well-of-souls.com Analyst pages, Game8 guides, CivFanatics forums, official 2K Dev Diaries, and community data-mining.

> **Caveat**: Some numbers below are community-verified approximations from game files and player testing. Where exact values were unavailable, ranges or qualitative descriptions are given. Numbers marked with `~` are best-effort estimates.

---

## 1. Turns, Ages, and Game Flow

### 1.1 Three Ages

| Age | Historical Span | Tech/Civic Eras Covered |
|-----|----------------|------------------------|
| Antiquity | 4000 BCE onward | Ancient + Classical |
| Exploration | 400 CE onward | Medieval + Renaissance |
| Modern | 1750 CE onward | Industrial through WWII |

### 1.2 Age Length and Progress

- Age Progress is tracked as a meter from 0% to 100%.
- At **Standard speed / Standard age length**, each Age ends after reaching **200 age-progress points**. Each turn adds **1 point** (~0.5% per turn).
- Completing Legacy Path milestones grants larger age-progress boosts.
- Researching future-era techs/civics ahead of schedule accelerates age progress.
- At 100%, the Age forcibly transitions.

**Age Length Settings** (multiplied against base 200 points):

| Age Length | Multiplier |
|-----------|-----------|
| Abbreviated | 0.80x (160 points) |
| Standard | 1.00x (200 points) |
| Long | 1.20x (240 points) |

**Typical turns per age** (Standard speed, Standard length): 75-125 turns per age, varying by player performance.

### 1.3 Game Speed

Game speed affects **all costs** (production, science, culture, gold, influence) but NOT movement, combat, or healing.

| Speed | Cost Multiplier | Example (100-prod unit) |
|-------|----------------|------------------------|
| Online | 0.50x | 50 Production |
| Quick | 0.66x | 66 Production |
| Standard | 1.00x | 100 Production |
| Epic | 1.66x | 166 Production |
| Marathon | 3.00x | 300 Production |

Celebration thresholds also scale: Online=0.5x, Quick=0.66x, Standard=1x, Epic=1.5x, Marathon=3x.

### 1.4 Turn Phases

Each turn follows this sequence:
1. **Start of Turn**: Yields collected, age progress incremented, healing applied, ongoing effects tick.
2. **Action Phase**: Player takes actions (move units, manage cities, research, diplomacy).
3. **End of Turn**: Production completes, growth events resolve, victory conditions checked, celebrations evaluated.

---

## 2. Settlements: Towns and Cities

### 2.1 Town vs City

| Feature | Town | City |
|---------|------|------|
| Build queue | No (items purchased with Gold only) | Yes (Production-based) |
| Production | Converted to Gold automatically | Used for buildings, units, wonders |
| Buildings | Warehouse buildings only (purchasable) | All building types |
| Specialist slots | Yes (1 per tile) | Yes (1 per tile) |
| Growth | Sends excess Food to connected Cities (unless unspecialized) | Keeps Food for own growth |
| Conversion | Can be upgraded to a City (Gold cost scales with existing city count) | Cannot revert to Town |

### 2.2 Settlement Cap

- **Starting cap**: 4 settlements.
- Exceeding the cap: **-5 Happiness per settlement per overage** applied to **every** settlement in the empire.
- Maximum penalty: -35 Happiness (capped at 7 settlements over the limit).

**Increasing the cap**:
- Researching specific Technologies (4 techs across the tree, +1 each).
- Researching specific Civics (up to 36 civics provide +1 each).
- Advancing to the next Age.

### 2.3 Town Specialization

Towns begin with the **Growing Town** focus. At **population 7**, the player may choose a specialization (locked for the rest of the Age).

| Specialization | Bonus |
|---------------|-------|
| Growing Town (default) | +50% Growth Rate |
| Farming Town / Fishing Town | +1 Food on Farms, Pastures, Plantations, Fishing Boats |
| Mining Town | +1 Production on Camps, Woodcutters, Clay Pits, Mines, Quarries |
| Trade Outpost | +2 Happiness on Resource tiles, +5 Trade Route range |
| Fort Town | +5 Healing to Units on tiles, +25 HP to Walls |
| Religious Site | +Happiness to all Temples in empire |
| Hub Town | +Influence for every connected Settlement |
| Urban Center | +Science and Culture on Districts with 2 Buildings |
| Factory Town | +Gold towards purchasing a Factory, +1 Resource Slot |

When specializing, all accumulated Food is distributed among connected Cities.

### 2.4 Founding Rules

- Settlements are founded by Settler units.
- Settlements must be placed a minimum distance from existing settlements (typically 3-4 tiles).
- On founding, the settlement claims adjacent tiles as initial territory.

---

## 3. Population and Growth

### 3.1 Growth Formula

**Post-Patch (Update 1.2.0, April 2025) -- Quadratic Formula**:

```
Food Cost = Flat + (Scalar * X) + (Exponent * X^2)
```

Where `X` = number of growth events (current population minus starting pop).

| Age | Flat | Scalar | Exponent |
|-----|------|--------|----------|
| Antiquity | 30 | 3 | 33 |
| Exploration | 20 | 20 | 30 |
| Modern | 20 | 40 | 27 |

**Pre-Patch (Launch) formula** (cubic): `30 + (n-1) * 3 + (n-1)^3.3` -- replaced because growth was too punishing at high population.

### 3.2 Growth Rate

Growth Rate is a **percentage reduction** to the food threshold (NOT a food income multiplier):

```
TurnsToGrow = (FoodThreshold * (1 - GrowthRate)) / FoodOutput
```

Sources of Growth Rate:
- Growing Town focus: +50%
- Bath building (on river): +10%
- Wharf building: +15%
- Mass Production building: +10%

### 3.3 Population Allocation

- Each citizen is assigned to a **Rural tile** (food/production) or an **Urban tile** (becomes a Specialist).
- Rural population works improved tiles, generating yields tied to terrain and improvements.
- Urban Specialists: +2 Science, +2 Culture; cost -2 Food and -2 Happiness each.
- Specialists amplify adjacency bonuses of buildings in their tile by +50%.
- Maximum 1 Specialist per tile.

### 3.4 Quarters

When two qualifying buildings (same Age or Ageless, excluding Walls) are placed in one Urban District, it forms a **Quarter**. Quarters boost adjacency and are ideal for Specialist placement.

---

## 4. Happiness

### 4.1 Local vs Global Happiness

- **Local Happiness**: Per-settlement. Each settlement tracks its own Happiness.
- **Global Happiness**: Sum of excess Happiness across all settlements. Drives Celebrations.

### 4.2 Happiness Penalties

For each point of **negative** local Happiness, the settlement's **total yield output is reduced by 2%**, stacking up to **-100% at -50 Happiness**.

If settlements remain Unhappy during a Revolts Crisis, settlements may enter **Unrest** and eventually **revolt** (lost to an independent faction).

### 4.3 Sources of Happiness

**Positive**:
- Happiness buildings (Altar, Arena, Villa, Temple, Menagerie, City Park, Department Store, Radio Station).
- Resources assigned to the settlement (Bonus/City/Empire resources).
- Fresh water access.
- Pantheons and religion.
- Leader abilities and Attributes (Diplomatic/Militaristic trees).
- Celebrations overflow.

**Negative**:
- No fresh water access.
- War Weariness.
- Settlements over the cap: -5 per overage per settlement.
- Crisis Policies.
- Specialist cost: -2 Happiness per Specialist.
- Building maintenance: Most buildings cost 2-4 Happiness (see Building section).

### 4.4 War Weariness Happiness Penalties

When you have less War Support than your opponent:
- **-3 Happiness** in settlements you founded.
- **-5 Happiness per point** of negative war weariness in conquered settlements whose original owner is NOT at war with you.
- **-7 Happiness per point** in conquered settlements whose original owner IS at war with you.

### 4.5 Celebrations

Excess global Happiness accumulates toward Celebrations. Each Celebration:
1. **Unlocks 1 additional Social Policy slot** (permanent).
2. **Provides a government-specific bonus lasting 10 turns** (pick one of two options).

Celebration thresholds increase with each subsequent Celebration. After the 7th Celebration the threshold stops increasing. Thresholds scale with game speed.

**Example Government Celebration Bonuses** (10-turn duration):

| Government | Option A | Option B |
|-----------|----------|----------|
| Classical Republic | +20% Culture | +15% Production toward Wonders |
| Despotism | +20% Science | +30% Production toward Infantry |
| Oligarchy | +20% Food | +30% Production toward Buildings |
| Feudal Monarchy | +20% Food | +30% Production toward Cavalry/Naval |
| Plutocracy | +20% Gold | +30% Production toward Overbuilding |
| Theocracy | +20% Culture | +40% Production toward Civilian/Support units |

---

## 5. Production

### 5.1 Base Mechanics

- Cities generate Production from worked tiles, buildings, and adjacency bonuses.
- Towns convert all Production into Gold automatically.
- Production is applied each turn to the current item in the build queue.

### 5.2 Production Overflow

When a project completes, excess Production carries over to the next project in the queue.

### 5.3 Rush Buying (Gold Purchase)

- Units and Buildings can be purchased with Gold instead of produced.
- Gold purchase cost is approximately **4x the Production cost** (very inefficient).
- Purchase discounts can come from: Resources (Gold resource: -20% building cost; Silver resource: -20% unit cost), Attributes, Social Policies.
- Items in Towns can ONLY be purchased with Gold (no build queue).

### 5.4 Production Bonuses

| Source | Bonus |
|--------|-------|
| Barracks / Armorer | +10% Production toward Land Units |
| Shipyard | +10% Production toward Naval Units |
| Amphitheatre / Kiln | +10% Production toward Wonders |
| Rail Station | +10% Production toward Land Buildings |

---

## 6. Combat

### 6.1 Core Stats

All military units have:
- **Combat Strength (CS)**: Melee attack and defense power.
- **Ranged Strength (RS)**: Ranged attack power (ranged units only).
- **Bombard Strength**: Bonus damage vs Fortified Districts (siege units).
- **HP**: 100 maximum.
- **Movement**: Tiles per turn (typically 2-4).

### 6.2 Damage Formula

```
Base Damage = 30 (when attacker and defender have equal strength)
```

- Each point of Strength difference changes damage by approximately **+4% (exponential)**.
- At **+30 CS advantage**: ~100 damage (one-shot kill).
- At **-30 CS disadvantage**: ~9 damage.
- Damage is applied to both attacker and defender in melee combat.
- Ranged attacks: only the target takes damage.

### 6.3 HP and Combat Strength Degradation

- For every **10 HP lost**, a unit suffers **-1 Combat Strength**.
- At 10 HP remaining: -10 CS penalty.
- **First Strike**: +5 CS bonus when the unit is at **full (100) HP**.

### 6.4 Terrain Combat Modifiers

| Terrain | Modifier (Defender) |
|---------|-------------------|
| Rough terrain (Hills, elevated) | +3 CS |
| Vegetated terrain (Woods, Rainforest, Sage Brush) | +2 CS |
| Minor River (defending ON the river) | -5 CS |
| River (attacking from or defending on) | -2 CS |

**Difficult Terrain Movement**: Wet, Vegetated, Rough, or River tiles **end a unit's movement** upon entering, regardless of remaining movement points. Roads negate this.

### 6.5 Fortification

- Units can use the **Fortify** action on defensible tiles.
- Fortification grants **+5 CS** when defending.
- Can only be performed once; lasts until the unit moves.

### 6.6 Walls and District Defense

**Walls** (one type per Age):
- Add **100 HP** to the District.
- Grant **+15 CS** to units defending on that tile.
- Walls from a previous age have their bonus **halved** (+7 CS, 50 HP).
- Walls must be destroyed with Siege units before the district can be taken.

**Fortified Districts**:
- CS equals the **strongest military unit** trained by the empire (auto-scales).
- Automatically retaliate against melee attackers.
- Units inside are protected from **all damage except siege bombardment**.

### 6.7 Flanking

- Unlocked after researching **Military Training**.
- Requires **2+ friendly units** adjacent to the target.
- Melee combat creates a **Battlefront** (front facing). Attacks from the side or rear gain flanking bonus.
- Cavalry ignores Zone of Control (ZoC) via **Swift** ability, making them ideal flankers.
- Ironclad has +50% from Flanking.

### 6.8 Zone of Control

- Military units exert ZoC on adjacent tiles.
- Enemy units must stop when entering a ZoC tile (cannot move through).
- Cavalry / Swift units **ignore** enemy ZoC.

### 6.9 Healing Rates

| Location | HP per Turn |
|----------|------------|
| Own City or Town | 20 HP |
| Friendly / Allied territory | 15 HP |
| Neutral territory | 10 HP |
| Enemy territory | 5 HP |

Boosting healing:
- Fort Town specialization: +5 HP/turn on tiles.
- God of Healing Pantheon: bonus on Rural tiles.
- Commander Logistics tree (Field Medic): bonus in non-friendly territory.
- Partisan unique unit: +10 healing.

### 6.10 Commander System

Commanders are **the only units that gain experience and promotions** (a major departure from previous Civ games).

**Command Radius**: 1 tile (base). Units within radius receive commander buffs.

**Unit Stacking**: Commanders can stack up to **4 additional units** on their tile.

**Special Abilities**:
- **Focus Fire**: Ranged units in radius attack together.
- **Coordinated Attack**: Infantry/Cavalry in radius attack together.

**Promotion Trees** (5 branches):

| Tree | Focus |
|------|-------|
| Bastion | Defense, fortification bonuses |
| Assault | Offensive power, damage bonuses |
| Logistics | Healing, supply, movement |
| Maneuver | Flanking, repositioning |
| Leadership | Command radius, stacking, morale |

Commanders **persist across Ages**, retaining all promotions and experience. They are the only unit class that does this.

---

## 7. Units

### 7.1 Antiquity Age Units

| Unit | Category | CS | RS | Mov | Range | Cost | Required Tech |
|------|----------|----|----|-----|-------|------|---------------|
| Warrior | Infantry | 20 | -- | 2 | -- | 30 | None |
| Slinger | Ranged | 5 | 15 | 2 | 2 | 30 | Animal Husbandry |
| Scout | Recon | 10 | -- | 2 | -- | 30 | None |
| Settler | Civilian | 10 | -- | 3 | -- | 50 | None |
| Archer | Ranged | 10 | 20 | 2 | 2 | 50 | Bronze Working |
| Spearman | Infantry | 25 | -- | 2 | -- | 60 | Bronze Working |
| Galley | Naval | -- | 20 | 3 | 1 | ~60 | Sailing |
| Chariot | Cavalry | ~25 | -- | ~3 | -- | ~60 | The Wheel |
| Ballista | Siege | 15 | 10 | 1 | 2 | ~60 | The Wheel |
| Phalanx | Infantry | ~30 | -- | 2 | -- | ~80 | Iron Working |
| Horseman | Cavalry | ~30 | -- | 3 | -- | ~80 | Iron Working |
| Quadrireme | Naval | ~25 | ~25 | 3 | 2 | ~80 | Navigation |

**Unique Units** (selected):
- Legion (Rome): CS 25, Mov 2, Cost 40, Req: Bronze Working
- Medjay (Egypt): CS 20
- Immortal (Persia): Req: Bronze Working
- Chu-Ko-Nu (Han): CS 15, RS 20

### 7.2 Exploration Age Units

| Unit | Category | CS | RS | Mov | Range | Required Tech |
|------|----------|----|----|-----|-------|---------------|
| Heavy Archer | Ranged | 20 | 30 | 2 | 2 | Auto-upgrade |
| Swordsman | Infantry | 35 | -- | 2 | -- | Age start |
| Courser | Cavalry | 40 | -- | 3 | -- | Age start |
| Cog | Naval | 35 | 30 | 3 | 1 | Age start |
| Catapult | Siege | 25 | 20 | 2 | 2 | Machinery |
| Man-at-Arms | Infantry | 40 | -- | 2 | -- | Heraldry |
| Crossbowman | Ranged | 25 | 35 | 2 | 2 | Castles |
| Knight | Cavalry | 45 | -- | 3 | -- | Metal Casting |
| Pikeman | Infantry | 45 | -- | 2 | -- | Metal Casting |
| Trebuchet | Siege | -- | 25 | 2 | 2 | Metallurgy |
| Bombard | Siege | -- | -- | -- | -- | Gunpowder |
| Lancer | Cavalry | ~50 | -- | 3 | -- | Metal Casting |
| Arquebusier | Ranged | -- | -- | -- | -- | Gunpowder |
| Carrack | Naval | 41 | 35 | 3 | 2 | Shipbuilding |
| Galleon | Naval | -- | -- | 3 | -- | Gunpowder |

### 7.3 Modern Age Units

| Unit | Category | CS | RS | Mov | Range | Required Tech |
|------|----------|----|----|-----|-------|---------------|
| Line Infantry | Infantry | 50 | -- | 2 | -- | Age start |
| Cuirassier | Cavalry | 55 | -- | 3 | -- | Age start (ignores ZoC) |
| Field Cannon | Ranged | 35 | 45 | 2 | 2 | Age start |
| Mortar | Siege | -- | 35 | 2 | 2 | Age start |
| Ship of the Line | Naval | 50 | 45 | 3 | 2 | Age start |
| Rifle Infantry | Infantry | 55 | -- | 2 | -- | Industrialization |
| Field Gun | Ranged | 40 | 50 | 2 | 2 | Industrialization |
| Howitzer | Siege | 45 | 40 | 2 | 3 | Industrialization |
| Landship | Tank | 60 | -- | 3 | -- | Combustion |
| Cruiser | Naval | 45 | -- | 4 | 2 | Combustion |
| Dreadnought | Naval | 55 | 50 | 3 | 2 | Combustion |
| Biplane | Aircraft | 55 | 35 | 8 | 8 | Flight |
| Trench Fighter | Aircraft | 35 | 55 | 10 | 10 | Flight |
| Infantry Company | Infantry | 60 | -- | 2 | -- | Armor |
| Tank | Tank | 65 | -- | 4 | -- | Armor |
| AT Gun | Ranged | -- | 55 | 2 | 2 | Armor |
| Fighter | Aircraft | 60 | 40 | 10 | 10 | Aerodynamics |
| Dive Bomber | Aircraft | 40 | 60 | 12 | 12 | Aerodynamics |
| Destroyer | Naval | 55 | 50 | 4 | 3 | Mobilization |
| Battleship | Naval | 60 | 55 | 3 | 3 | Mobilization |
| Submarine | Naval | 65 | -- | 3 | -- | Mobilization (Stealth) |
| Aircraft Carrier | Naval | -- | -- | 5 | -- | Mobilization |
| Partisan | Infantry | 55 | -- | 2 | -- | Escalating (special) |

**Selected Unique Modern Units**:
- Marine (USA): CS 60, Mov 2, Amphibious, reduced cost.
- Hussar (Prussia): CS 50, Mov 4, CS increases per remaining movement.
- Stuka (Prussia): RS 65, Range 8, +3 vs land.
- Zero (Japan): Increased range, bonuses vs aircraft.
- Cossack (Russia): Increased CS in friendly territory.

---

## 8. Buildings

### 8.1 Building Costs and Yields

Maintenance convention:
- **Antiquity**: 2 Gold + 2 Happiness (standard). Warehouse/Happiness/Gold buildings exempt from one.
- **Exploration**: 3 Gold + 3 Happiness (standard).
- **Modern**: 4 Gold + 4 Happiness (standard).

#### Warehouse Buildings (No maintenance, purchasable in Towns)

| Building | Age | Prod Cost | Base Yield | Tile Bonus |
|----------|-----|-----------|-----------|------------|
| Granary | Antiquity | 55 | +1 Food | +1 Food on Farms, Pastures, Plantations |
| Fishing Quay | Antiquity | 55 | +1 Food | +1 Food on Fishing Boats |
| Saw Pit | Antiquity | 55 | +1 Prod | +1 Prod on Camps, Woodcutters |
| Brickyard | Antiquity | 55 | +1 Prod | +1 Prod on Mines, Quarries, Clay Pits |
| Gristmill | Exploration | 175 | +3 Food | +Food on Farms, Pastures, Plantations |
| Stonecutter | Exploration | 175 | +3 Prod | +Prod on Mines, Quarries |
| Sawmill | Exploration | 175 | +3 Prod | +Prod on Camps, Woodcutters |
| Grocer | Modern | 500 | +4 Food | +Food on multiple food improvements |
| Ironworks | Modern | 500 | +4 Prod | +Prod on Mines, Quarries, Clay Pits, Woodcutters |

#### Science Buildings

| Building | Age | Prod Cost | Base Yield | Adjacency | Special |
|----------|-----|-----------|-----------|-----------|---------|
| Library | Antiquity | 90 | +2 Science | +1 Sci/Resource, Wonder | 2 Codex slots |
| Academy | Antiquity | 195 | +4 Science | +1 Sci/Resource, Wonder | 3 Codex slots |
| Observatory | Exploration | 200 | +4 Science | +1 Sci/Resource, Wonder | -- |
| University | Exploration | 200 | +5 Science | +1 Sci/Resource, Wonder | Golden Age yield retention |
| Schoolhouse | Modern | 550 | +5 Science | +1 Sci/Resource, Wonder | -- |
| Laboratory | Modern | 650 | +6 Science | +1 Sci/Resource, Wonder | -- |

#### Culture Buildings

| Building | Age | Prod Cost | Base Yield | Adjacency | Special |
|----------|-----|-----------|-----------|-----------|---------|
| Monument | Antiquity | 90 | +2 Culture | +1 Cult/Wonder, Natural Wonder, Mountain | +1 Influence |
| Amphitheatre | Antiquity | 195 | +4 Culture | +1 Cult/Mountain, Wonder, Natural Wonder | +10% Prod toward Wonders |
| Kiln | Exploration | 200 | +4 Culture | +1 Cult/Wonder | +10% Prod toward Wonders |
| Pavilion | Exploration | 250 | +5 Culture | -- | -- |
| Museum | Modern | 550 | +5 Culture | -- | 3 Artifact slots |
| Opera House | Modern | 600 | +6 Culture | -- | +3 Influence |

#### Gold Buildings (No Gold maintenance)

| Building | Age | Prod Cost | Base Yield | Adjacency | Special |
|----------|-----|-----------|-----------|-----------|---------|
| Market | Antiquity | 90 | +5 Gold | +1 Gold/Coastal, Lake, River, Wonder | +1 Resource Slot |
| Lighthouse | Antiquity | 130 | +5 Gold | -- | +2 Resource Slots |
| Ancient Bridge | Antiquity | 100 | +5 Gold | -- | River Crossing |
| Bazaar | Exploration | 175 | +3 Gold | -- | +1 Resource Slot |
| Guildhall | Exploration | 200 | +4 Gold | -- | +2 Influence |
| Bank | Exploration | 250 | +5 Gold | -- | -- |
| Port | Modern | 550 | +5 Gold | -- | +1 Resource Slot |
| Stock Exchange | Modern | 650 | +6 Gold | -- | -- |
| Rail Station | Modern | 650 | +8 Gold | -- | +10% Prod toward Land Buildings |

#### Happiness Buildings (No Happiness maintenance)

| Building | Age | Prod Cost | Base Yield | Special |
|----------|-----|-----------|-----------|---------|
| Altar | Antiquity | 90 | +2 Happiness | Pantheon bonuses |
| Villa | Antiquity | 120 | +3 Happiness | +2 Influence |
| Arena | Antiquity | 195 | +6 Happiness | -- |
| Temple | Exploration | 200 | +4 Happiness | 1 Relic Slot, Missionaries |
| Menagerie | Exploration | 250 | +5 Happiness | +1 Happiness on Camps/Pastures |
| City Park | Modern | 500 | +4 Happiness | +1 Happiness on Vegetation tiles |
| Department Store | Modern | 600 | +5 Happiness | +1 Resource Slot |
| Radio Station | Modern | 700 | +6 Happiness | +4 Influence |

#### Food Buildings

| Building | Age | Prod Cost | Base Yield | Adjacency | Special |
|----------|-----|-----------|-----------|-----------|---------|
| Garden | Antiquity | 90 | +3 Food | +1 Food/Coastal, Lake, River, Wonder | +1 Settlement Limit |
| Bath | Antiquity | 130 | +4 Food | +1 Food/Coastal, Lake, River, Wonder | +10% Growth Rate (river) |
| Wharf | Exploration | 175 | +4 Food | -- | +15% Growth Rate |
| Inn | Exploration | 200 | +3 Food | -- | +2 Happiness |
| Hospital | Exploration | 250 | +5 Food | -- | +2 Resource Slots |
| Mass Prod. | Modern | 600 | +5 Food | -- | +10% Growth Rate |
| Tenement | Modern | 650 | +6 Food | -- | +1 Adjacency |

#### Military/Production Buildings

| Building | Age | Prod Cost | Base Yield | Special |
|----------|-----|-----------|-----------|---------|
| Barracks | Antiquity | 90 | +2 Prod | +10% Prod toward Land Units, unit spawn |
| Engineering | Antiquity | 130 | +3 Prod | -- |
| Blacksmith | Antiquity | ~130 | +3 Prod | -- |
| Armorer | Exploration | 200 | +4 Prod | +10% Prod toward Land Units |
| Shipyard | Exploration | 200 | +5 Prod | +10% Prod toward Naval Units |
| Dungeon | Exploration | 200 | +5 Prod | +2 Influence |
| Military Academy | Modern | 550 | +5 Prod | Free Commander Level |
| Aerodrome | Modern | 700 | +8 Prod | Air Unit Training |
| Factory | Modern | 600 | +12 Prod | 1 Factory Resource Slot |

---

## 9. Technology and Civics

### 9.1 Tech Tree Structure

- Three separate tech trees: Antiquity, Exploration, Modern.
- Techs are organized by **Tree Depth** (tier). Deeper techs require researching a number of earlier techs.
- Starting Antiquity techs (pick one): **Animal Husbandry**, **Pottery**, **Sailing**.

### 9.2 Technology Costs (Approximate)

| Age | Range | Examples |
|-----|-------|---------|
| Antiquity (early) | ~50-120 Science | Starting techs ~50-80 |
| Antiquity (mid) | ~120-300 Science | Bronze Working, Writing |
| Antiquity (late) | ~430-738 Science | Iron Working, Mathematics |
| Exploration | ~200-2000 Science | Varies by depth |
| Modern (late) | ~5000-10000 Science | Rocketry ~10,000 |

**Mastery**: After researching a tech, a **Mastery** version becomes available. Cost = ~80% of the base tech. Masteries unlock additional buildings, Codices, and bonuses.

### 9.3 Civic Tree

- Separate from the Tech tree, uses **Culture** instead of Science.
- Same three-age structure with Masteries.
- Civics unlock: Social Policies, Governments, Wonders, diplomatic options.
- Mastery cost = ~80% of base Civic cost.

### 9.4 Antiquity Technologies

| Tech | Depth | Key Unlocks |
|------|-------|-------------|
| Agriculture | 1 | Granary, Farms |
| Animal Husbandry | 1 | Slinger, Saw Pit, Pastures |
| Pottery | 1 | Brickyard, Clay Pits |
| Sailing | 1 | Galley, Fishing Quay |
| Writing | 3 | Library (2 Codex slots) |
| Irrigation | 3 | Garden (+1 Settlement Limit) |
| Masonry | 3 | Monument |
| Currency | 4 | Market, Bath |
| Bronze Working | 4 | Barracks, Archer, Spearman |
| The Wheel | 4 | Villa, Chariot, Ballista |
| Navigation | 5 | Lighthouse, Quadrireme |
| Engineering | 5 | Amphitheatre, Engineering building, Ancient Bridge |
| Military Training | 5 | Arena (unlocks Flanking) |
| Mathematics | 6 | Academy (3 Codex slots) |
| Iron Working | 6 | Phalanx, Horseman |

### 9.5 Exploration Technologies (Selected)

| Tech | Key Unlocks |
|------|-------------|
| Machinery | Catapult, Gristmill, Sawmill |
| Astronomy | Observatory, Fleet Commander |
| Cartography | Wharf |
| Castles | Crossbowman, Dungeon |
| Heraldry | Man-at-Arms |
| Feudalism | Inn, Medieval Bridge |
| Guilds | Kiln, Guildhall |
| Metallurgy | Armorer, Trebuchet |
| Shipbuilding | Shipyard, Carrack |
| Education | University |
| Metal Casting | Knight, Pikeman, Lancer |
| Architecture | Pavilion |
| Gunpowder | Bombard, Arquebusier, Galleon |
| Urban Planning | Bank, Hospital |

### 9.6 Modern Technologies (Selected)

| Tech | Key Unlocks |
|------|-------------|
| Academics | Schoolhouse |
| Steam Engine | Port, Ironclad, Ironworks |
| Military Science | Military Academy |
| Electricity | Laboratory, Stock Exchange |
| Urbanization | Opera House, Museum, Department Store |
| Combustion | Landship, Cruiser, Dreadnought |
| Industrialization | Rifle Infantry, Field Gun, Howitzer, Rail Station |
| Radio | Radio Station, Tenement |
| Flight | Aerodrome, Biplane, Trench Fighter |
| Mass Production | Factory, Grocer, Mass Prod building |
| Mobilization | Destroyer, Battleship, Submarine, Aircraft Carrier |
| Armor | Infantry Company, Tank, AT Gun |
| Aerodynamics | Fighter, Dive Bomber, Heavy Bomber |
| Rocketry | Launch Pad (Science Victory) |

---

## 10. Research and Science

### 10.1 Science Generation

- **Buildings**: Primary source. Science buildings provide base yield + adjacency.
  - Library: +2 base, +1 per adjacent Resource/Wonder.
  - Academy: +4 base, +1 per adjacent Resource/Wonder.
- **Specialists**: +2 Science each (in addition to Culture).
- **Codices**: Each Codex placed in a Library/Academy slot provides bonus Science per turn.
- **Resources**: Some empire/city resources provide Science bonuses.

### 10.2 Research Flow

- Each turn, accumulated Science is invested in the currently researched Technology.
- **Overflow**: Excess Science carries over to the next Technology.
- Only one Technology can be researched at a time.
- After completion, Mastery becomes available for the same tech (costs ~80% of base).

---

## 11. Diplomacy

### 11.1 Influence (Diplomacy Currency)

- **Base generation**: 10 Influence per turn (Standard speed).
- Sources: Monuments (+1), Guildhalls (+2), Opera Houses (+3), Radio Stations (+4), Villa (+2), Hub Towns, Diplomatic Attributes.
- Influence is spent on all diplomatic actions.

### 11.2 Relationship Levels

| Level | Description | Actions Allowed |
|-------|-------------|----------------|
| Hostile | At war or near-war | Formal War declaration |
| Unfriendly | Tense relations | Sanctions available |
| Neutral | Default starting state | Basic endeavors |
| Friendly | Positive relations | Trade, Open Borders |
| Helpful | Strong alliance | Military Alliance |

### 11.3 Diplomatic Actions

**Endeavors** (mutually beneficial, 7-turn duration):

| Endeavor | Duration | Accepted | Supported | Relationship |
|----------|----------|----------|-----------|-------------|
| Research Collaboration | 7 turns | +12 Science (you), +6 (them) | +18 each | +5 / +12 |
| Military Aid | 7 turns | +2 CS (you), +2 Gold (them) | +3 each | +5 / +12 |
| Cultural Exchange | 7 turns | +12 Culture (you), +6 (them) | +18 each | +5 / +12 |
| Local Festival | 7 turns | +6 Happiness (you), +6 Influence (them) | +9 Culture each | +5 / +12 |
| Open Markets | 15 turns | +4 Gold (you), +2 (them) | +6 each | +5 / +12 |

**Reconciliation** (repair relations):
- Duration: 6 turns.
- Accepted: +30 relationship. Supported: +60 relationship.

**Sanctions** (negative, -15 relationship):

| Sanction | Duration | Effect |
|----------|----------|--------|
| Hinder Finances | 10 turns | Target loses 10% Gold per turn |
| Hinder Public Morale | 5 turns | Target loses 10% Happiness per turn |
| Denounce | 5 turns | Reputation damage |

**Espionage** (high-risk, high-reward):
- Upfront cost: ~480 Influence.
- Ongoing cost: ~24 Influence per turn.
- Steal Technology/Civics: 9-15 turns execution.
- Military Infiltration: 11-17 turns execution, 3-turn duration.

**Influence Scaling**: Base costs are multiplied by the current Age number (x1 Antiquity, x2 Exploration, x3 Modern).

### 11.4 War and War Support

- **Formal War**: Requires Hostile relationship. No War Support advantage to either side.
- **Surprise War**: Can be declared at any relationship. Gives opponent a War Support advantage.

**War Support Effects**:
- Party with lower War Support suffers War Weariness.
- **-1 CS per point** of negative War Support for all military units.
- Happiness penalties (see Section 4.4).

**Boosting War Support**: Spend **180 Influence** to increase your War Support (cost increases with each use).

### 11.5 Conquest Penalties

- Keeping a conquered settlement: **-4 Influence per turn** for the rest of the Age.
- Razing a conquered settlement: **-8 Influence per turn** for the rest of the Age.

### 11.6 City-State Diplomacy

- Befriending a City-State: **170 Influence** cost.

---

## 12. Victory Conditions

### 12.1 Legacy Path System

Victory in Civ VII is driven by **Legacy Paths**. Each age has 4 paths (Cultural, Economic, Military, Scientific). Completing milestones earns Legacy Points spent on Legacies at age transitions. The player who fully completes a Legacy Path's final condition in the **Modern Age** first wins.

### 12.2 Antiquity Age Legacy Paths

| Path | Name | Final Milestone |
|------|------|----------------|
| Cultural | Wonders of the Ancient World | Build 7 Wonders |
| Economic | Silk Roads | Assign 20+ Resources |
| Military | Pax Imperatoria | Control 12 Settlements (conquered count double) |
| Scientific | Great Library | Display 10 Codices |

### 12.3 Exploration Age Legacy Paths

| Path | Name | Final Milestone |
|------|------|----------------|
| Cultural | Toshakhana | Display 12 Relics |
| Economic | Treasure Fleets | Return 30 points of Distant Land Treasures |
| Military | Non Sufficit Orbis | Gain 12 points from Distant Lands (own=1, convert CS=1, conquer=2, religious conquer=4) |
| Scientific | Enlightenment | Have 5 Districts with 40+ Yield each |

### 12.4 Modern Age Victory Conditions

#### Science Victory
1. Research **Flight** -> Build an **Aerodrome** -> Complete **Trans-Oceanic Flight** project.
2. Research **Aerodynamics** -> Complete **Break the Sound Barrier** project.
3. Research **Rocketry** -> Build a **Launch Pad** -> Complete **Launch Satellite** project.
4. Complete **First Staffed Space Flight** (final victory project).

Legacy Points earned earlier provide production discounts to these projects.

#### Culture Victory
1. Collect **15 Artifacts** (via Explorers excavating sites).
2. Complete the **World's Fair** Wonder.

#### Military Victory
1. Adopt an **Ideology** (requires Political Theory Civic).
2. Gain **20 Ideology Points** from conquering settlements:
   - Pre-Ideology: 1 point per conquest.
   - Post-Ideology: 2 points per conquest.
   - Against different Ideology: 3 points per conquest.
3. Research Combustion + Flight.
4. Complete the **Manhattan Project** -> **Operation Ivy** project.

#### Economic Victory
1. Earn **500 Railroad Tycoon Points** (from Factories, Rail Stations, Factory Resources).
2. A **Great Banker** unit spawns at 150, 300, and 500 points (milestones).
3. Send the Great Banker to **every rival civilization's capital**, paying Gold + Influence (increasing cost per visit).

### 12.5 Alternative Victories

- **Domination**: Eliminate all rival civilizations (any age).
- **Score Victory**: If the Modern Age reaches 100% progress without any other victory, the player with the most total **Legacy Points** across all three ages wins.

---

## 13. Resources

### 13.1 Resource Categories

| Category | Assignment | Scope | Example |
|----------|-----------|-------|---------|
| Bonus | Any Settlement | Flat yields to assigned settlement | Cotton, Cattle |
| City | Cities only | % or flat bonus to assigned city | Silk, Spices |
| Empire | Auto (no assignment) | Passive bonus to entire empire | Horses, Iron, Gold, Silver, Ivory |
| Treasure | Coastal settlement | Spawns Treasure Convoys (Exploration Age) | Distant Land treasures |
| Factory | Factory building | Requires Factory slot | Coal, Oil, Rubber (Modern Age) |

### 13.2 Key Resource Effects

**Empire Resources**:

| Resource | Effect |
|----------|--------|
| Horses | +1 CS to Cavalry, +1 CS vs Infantry. Becomes Bonus in Modern. |
| Iron | +1 CS to Infantry. Obsoletes in Modern. |
| Gold (resource) | +20% Gold toward purchasing Buildings |
| Silver | +20% Gold toward purchasing Units |
| Ivory | +10% Production toward Wonders on Tropical/Plains/Desert |

**Bonus Resources** (examples):

| Resource | Effect |
|----------|--------|
| Cotton | +2 Food, +2 Production |
| Cattle | +Food bonus |
| Fish | +Food bonus |

**City Resources** (examples):

| Resource | Effect |
|----------|--------|
| Silk | +10% Culture |
| Spices | +Happiness bonus |

### 13.3 Resource Slots

- Settlements have limited Resource Slots.
- Markets add +1 Resource Slot.
- Lighthouses add +2 Resource Slots.
- Some buildings (Hospital, Department Store, Port, Factory) add slots.
- Town specializations (Factory Town) add +1 slot.

### 13.4 Age Transitions and Resources

Resources change effects between Ages. For example:
- Horses: Empire resource in Antiquity/Exploration -> Bonus resource in Modern.
- Iron: Active in Antiquity/Exploration -> Obsolete in Modern.
- Silk: % bonus in Antiquity/Exploration -> Flat bonus in Modern.

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

## 15. Leader Attributes

Four attribute trees (earn points from Legacy Paths and other achievements):

| Attribute | Focus |
|-----------|-------|
| Scientific | Research bonuses, Codex efficiency |
| Expansionist | Settlement growth, territory, resource yields |
| Militaristic | Combat bonuses, Commander improvements, War Support |
| Diplomatic | Influence generation, Policy slots, relationship bonuses |

Leaders persist across all three Ages, accumulating attribute points throughout the game.

---

## 16. Age Transitions

### 16.1 What Happens

1. Age Progress hits 100%.
2. Player picks a new **Civilization** from the next Age's roster.
3. **Leader** stays the same (with all attributes and promotions).
4. Legacy Points are spent on **Legacies** (permanent bonuses).
5. Previous civilization's **Legacy Bonus** becomes a permanent active effect.
6. Legacy bonuses stack (Modern player has Antiquity + Exploration bonuses).
7. Settlement cap may increase.
8. Existing buildings/units may become obsolete or auto-upgrade.
9. Tech/Civic trees reset to the new Age's tree.

### 16.2 Legacy Costs

- **Leader Attributes**: 1 point each (cheap, bulk-purchasable).
- **Standard Legacies**: Vary in cost (1-3 points).
- **Golden Age Legacies**: Expensive, require completing the full Legacy Path in the previous Age.

---

## 17. Crises

- Data-driven events that trigger based on conditions (turn count, tech researched, war declared, happiness threshold).
- Present narrative text and player **choices**.
- Each choice has gameplay effects (positive and negative).
- **Crisis Policies**: Sometimes forced policy changes that reduce Happiness.
- **Revolts Crisis**: Unhappy settlements may revolt if unaddressed.

---

## 18. Religion and Pantheons

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

## 19. Wonders

### 19.1 Overview

**Wonders** are unique, world-first buildings representing humanity's great achievements.
Each wonder can be constructed by **only one civilization per game**: once a rival finishes
it first, every other player's queue entry is invalidated. Wonders sit inside the urban
footprint of a city (they occupy an urban tile like any other building) but are treated
as a separate category for cost, visibility, and scoring purposes.

Key properties:

- **Uniqueness** — first-to-build wins; the wonder is permanently owned by that city.
- **Urban placement** — wonders consume an urban tile slot; they cannot be placed on
  rural/improved tiles. Some wonders have stricter adjacency/terrain requirements
  (see §19.2).
- **Expensive** — wonder Production cost is materially higher than a standard age-tier
  building (typically 2–4x an age-equivalent specialist building).
- **No gold purchase** — wonders can only be completed by Production. Gold rush-buying
  is disabled on wonder queue entries.
- **Permanent** — a completed wonder is not destroyed by city conquest; ownership
  transfers to whoever holds the city. It persists across ages (unlike many
  age-specific buildings, wonders are never "overbuilt" in later ages).
- **Score / legacy** — wonders count toward the **Wonders of the Ancient World**
  Cultural Legacy path in Antiquity (§12) and toward the overall Score victory.
- **Age restriction** — each wonder has an `age` field. A wonder whose age has passed
  generally cannot be started in a later age (design rule; *needs research* on whether
  Civ VII allows carry-over for unfinished antique wonders).

Adjacency bonus: many standard buildings (Library, Academy, Monument, Amphitheatre,
Kiln, Market, Garden, Bath — see §8) gain **+1 to their main yield per adjacent Wonder**,
making wonder placement a meaningful urban-planning lever.

### 19.2 Placement Rules

Every wonder has, at minimum, the standard **urban tile** requirement (flat or
mildly-sloped, non-water, within city territory, not occupied by another building or
district). Beyond that baseline, many wonders impose a **terrain- or adjacency-specific**
constraint that can force interesting city-placement decisions.

Categories of constraints seen in Civ VII:

| Constraint type | Example wonders | Description |
|-----------------|-----------------|-------------|
| Adjacent resource | Stonehenge (Stone), Colossus (Coast + harbor) | Must be adjacent to a specific resource tile |
| Terrain type | Pyramids (flat Desert), Machu Picchu (Mountain adj.) | Must be built on (or next to) a specific terrain |
| River / Coast | Hanging Gardens (River), Great Bath (River) | Must be on River, Coast, or Lake |
| Adjacent feature | Mausoleum (Coast), Temple of Artemis (Woods/Forest) | Must neighbor a natural feature |
| Building prereq | Oracle (Altar in city), Taj Mahal (Temple) | City must already contain a specific building |
| Civic / Tech prereq | Notre Dame (Gothic Architecture), Eiffel Tower (Steel) | Unlock requires researching a civic or tech |
| No additional restriction | Pyramids of the Sun, Broadway | Standard urban tile only |

Notes:

- If a wonder requires an adjacent resource, the resource tile does **not** need to be
  improved — raw presence of the resource in an adjacent hex is sufficient.
- Coastal wonders require an **ocean- or coast-adjacent urban tile** (not merely a
  lake, unless the wonder text specifies Lake).
- Placement validity is **re-evaluated every turn**: if the triggering tile is
  pillaged or its feature removed, production halts (*needs research* — exact rule
  for mid-build invalidation).

### 19.3 Costs and Production

**Production scaling by age** (representative figures — see §8.1 for the
building-cost baseline each wonder is compared against):

| Age | Typical wonder cost | Equivalent standard building |
|-----|--------------------|-------------------------------|
| Antiquity | ~400 Production | ~90–195 (specialist), ~55 (warehouse) |
| Exploration | ~900 Production | ~175–250 |
| Modern | ~1,800 Production | ~500–700 |

Exact per-wonder numbers are not all documented — *needs research* on final values
from 2K's patch notes.

Production rules specific to wonders:

- **No gold purchase.** The standard `PURCHASE_ITEM` path (§5) is blocked for items
  whose `category === 'wonder'`. Wonders must be completed entirely through
  Production output.
- **No overflow carry between ages.** If a wonder is being built at the moment an
  age transition fires (§16), any accumulated Production on that wonder is forfeit
  if the wonder's age is the age that just ended. Production invested in a
  current-age wonder that carries forward is preserved (*needs research* on the
  exact rule — Civ VII's "age reset" clears many queues).
- **Lost-race refund.** If a rival civilization completes a wonder while you are
  mid-build, **half of your invested Production is refunded** to that city's
  treasury-of-Production (typically redirected to the next queue item). The queue
  entry itself is removed.
- **Production bonuses stack.** The following multipliers apply to wonder
  production (see §5, §8.1):
  - Amphitheatre / Kiln: **+10% Production toward Wonders**.
  - Classical Republic government: **+15% Production toward Wonders** (§14).
  - Ivory resource: **+10% Production toward Wonders on Tropical/Plains/Desert**
    (§13).
  - Certain civ/leader abilities (see §15, §17 registries) grant additional
    `DISCOUNT_PRODUCTION` effects targeted at wonders.
- **Only one wonder per city at a time.** A city can hold no more than **one**
  active wonder queue entry. (You can still queue non-wonder items alongside.)

### 19.4 Antiquity Age Wonders

Representative Antiquity wonders. All cost ~400 Production (see §19.3).

| Name | Cost | Placement | Ability |
|------|------|-----------|---------|
| Pyramids | 400 | Flat Desert tile inside city | +2 Science per adjacent Desert; +1 Culture on all Wonders |
| Hanging Gardens | 400 | Adjacent to River | +15% Growth Rate in this city; +2 Food on adjacent tiles |
| Oracle | 400 | Requires Altar in city; Hills preferred | +1 of each yield on Altars empire-wide; reveals one free Pantheon belief |
| Colossus | 400 | Coastal urban tile adjacent to Harbor | +3 Gold on the city; +1 Trade Route capacity |
| Stonehenge | 400 | Adjacent to Stone resource | Instant Pantheon founding; +2 Faith on the tile |
| Great Bath | 400 | Adjacent to River | +4 Happiness city-wide; triggers a Celebration at founding |
| Mausoleum of Halicarnassus | 400 | Coastal urban tile | +2 Culture, +2 Gold; leader of this civ gains +1 Attribute point |
| Pyramid of the Sun | 400 | Standard urban tile | +3 Production on the city; +1 Production on all districts *needs research* |

Notes:

- Antiquity lists are the most stable slice; Exploration/Modern lists were
  expanded across DLC and may differ by edition.
- Machu Picchu is listed in Exploration below (Inca-associated wonder), though
  some sources place it in Antiquity — *needs research* on the canonical age
  assignment post-DLC.

### 19.5 Exploration Age Wonders

Representative Exploration wonders. All cost ~900 Production.

| Name | Cost | Placement | Ability |
|------|------|-----------|---------|
| Notre Dame | 900 | Requires Temple in city; urban tile | +4 Faith, +4 Culture on the city; adjacent Quarter buildings +1 Culture |
| Angkor Wat | 900 | Adjacent to River | +3 Faith; +1 Food on all Farms in this city |
| Taj Mahal | 900 | Requires Temple in city | Grants a free Golden Age on completion; +3 Happiness city-wide |
| Temple of Artemis | 900 | Adjacent to Woods / Forest | +4 Culture; +1 Food on every Woods tile in this city |
| Forbidden City | 900 | Urban tile in a City (not Town) | +5 Influence per turn; -1 Happiness cost on all buildings |
| Hagia Sophia | 900 | Requires Temple + founded Religion | Missionaries gain +2 spread charges; religion spreads +50% faster from this city |
| Great Wall | 900 | Urban tile bordering map edge or Frontier | +6 Defense on this city; each segment tile blocks enemy movement *needs research* |
| Terracotta Army | 900 | Requires Barracks in city | Grants one free unit of each current-age land unit type |
| Machu Picchu | 900 | Urban tile adjacent to Mountain | +1 Culture, +1 Gold on all Mountains in this city |
| St Basil's Cathedral | 900 | Urban tile, cold/temperate biome | +3 Culture, +3 Faith; Tundra/Snow tiles yield +1 Production *needs research* |

Notes:

- Civ VII's Exploration age places heavy emphasis on religion and distant-lands
  trade — several wonders interact with those systems directly.
- Exact placement constraints for Great Wall (how "segments" work on hex grid vs
  square grid) and St Basil's biome rule are under-documented — *needs research*.

### 19.6 Modern Age Wonders

Representative Modern wonders. All cost ~1,800 Production.

| Name | Cost | Placement | Ability |
|------|------|-----------|---------|
| Eiffel Tower | 1,800 | Urban tile in capital | +3 Happiness to every city; +10 Influence per turn |
| Statue of Liberty | 1,800 | Coastal urban tile | Immigrants: +1 specialist slot in every city on the continent |
| Brandenburg Gate | 1,800 | Urban tile; requires Military Academy | All land units +5 Combat Strength when fighting in friendly territory |
| Sydney Opera House | 1,800 | Coastal urban tile | +8 Culture; +1 Culture on every Coast tile in city |
| Panama Canal | 1,800 | Isthmus tile (land tile with ocean on both sides, within city) | Allows naval units to cross between oceans; +4 Gold per Trade Route |
| Hollywood | 1,800 | Urban tile in a City; requires Broadcast Tower *needs research* | +10 Culture; broadcasts Tourism to all met civs |
| Broadway | 1,800 | Urban tile; requires Opera House in city | +8 Culture; Theatre-type buildings +2 Culture empire-wide |
| Cristo Redentor | 1,800 | Mountain-adjacent urban tile | +4 Faith, +4 Happiness; all Trade Routes +1 Religion spread |
| Big Ben | 1,800 | Urban tile in capital; requires Bank in city | +50% Gold stockpile increase; +4 Gold on every Bank empire-wide |

Notes:

- Modern-age wonder abilities frequently grant **empire-wide** (not city-local)
  effects, reflecting their endgame weight.
- The Panama Canal's hex-grid adaptation (what counts as an "isthmus" tile)
  is a game-specific rule adaptation — *needs research*.

### 19.7 Natural Wonders

**Natural wonders** are distinct from player-built wonders: they are pre-placed
on the map at world-generation time and cannot be constructed, destroyed, or
relocated. They are impassable to all land units and naval units (unless an
ability explicitly grants pass-through), and they grant bonuses to the player
whose territory contains them.

Key differences from built wonders:

- Placed during map generation (seeded RNG — §MapGenerator).
- Discovery: revealed when a unit enters visibility range.
- Territory bonus: the natural wonder's yields apply to the city whose territory
  contains its tile. Territory can be acquired via normal city growth,
  tile-purchase, or Culture Bomb.
- Adjacency bonus: standard buildings that key off "Natural Wonder" adjacency
  (Monument, Amphitheatre — §8) gain their full bonus per adjacent Natural
  Wonder tile.
- Do **not** count toward the Wonders of the Ancient World legacy path.

Representative natural wonders:

| Name | Terrain | Yields (per tile) | Notes |
|------|---------|-------------------|-------|
| Grand Canyon | Desert / Canyon | +3 Gold, +2 Culture | Impassable; visible at long range |
| Mount Everest | Mountain | +3 Faith, +2 Science | Impassable; adjacent tiles +1 Culture |
| Great Barrier Reef | Coast | +2 Food, +2 Science | Naval passage allowed *needs research* |
| Galápagos Islands | Coast | +2 Science, +2 Food | Unique biome — adjacent tiles +1 Food |
| Uluru | Desert | +3 Culture, +1 Faith | Impassable |

Exact Civ VII natural-wonder roster varies by DLC — the above are stable across
base-game editions. *Needs research* on full list and exact numerical yields.

### 19.8 Wonder Visibility

Wonder visibility rules are deliberately **global**, because the race to build
each wonder is a core driver of player decision-making.

Completion notification:

- When **any** civilization completes a wonder, **every** player receives a game
  notification naming the wonder and the builder civilization.
- The notification fires the same turn as the completion.
- Any civilization currently building the same wonder sees their queue entry
  replaced with the lost-race refund event (§19.3).

Map visibility:

- Once a wonder is completed, its 3D model renders on the map for all players,
  **regardless of fog of war**. This includes players who have never scouted
  the owning civ's territory.
- The wonder tile itself is still fog-of-war'd (terrain, units, and adjacent
  tiles remain hidden if unexplored) — only the wonder's geometry/icon is
  revealed.
- Natural wonders, by contrast, are **only** revealed when a unit enters their
  sight range (§fog-of-war). They do not broadcast globally.

Under-construction visibility:

- Work in progress on a wonder is **not** visible to rivals. The race is
  information-asymmetric: you learn someone else is building the wonder only
  by scouting their city, via espionage (*needs research* on whether Civ VII
  supports a "wonder progress" intel action), or when they finish it.

Consequence for AI:

- The AI treats global wonder notifications as planning inputs for its next
  production pick, and the `enemy activity summary` panel (§web UI) surfaces
  wonder completions as a headline event for the human player's end-of-turn
  review.

---

## Sources

- [Civilization Wiki - Fandom](https://civilization.fandom.com/wiki/Civilization_VII)
- [Civilization VII Analyst (well-of-souls.com)](https://well-of-souls.com/civ/civ7_overview.html)
- [Game8 Civ 7 Guides](https://game8.co/games/Civ-7/archives/495102)
- [CivFanatics Forums](https://forums.civfanatics.com/)
- [Official 2K Dev Diaries](https://civilization.2k.com/civ-vii/game-guide/dev-diary/)
- [PlayerAuctions Building Guide](https://blog.playerauctions.com/others/ultimate-civilization-7-buildings-table-guide-unlock-cost-and-functions/)
- [FextraLife Civ 7 Wiki](https://civ7.wiki.fextralife.com/)
- [PC Gamer Civ 7 Guides](https://www.pcgamer.com/games/strategy/civilization-7-victory-legacy-paths-win-conditions-guide/)
- [GameSpot](https://www.gamespot.com/articles/how-long-is-civilization-7-turns-to-win-and-playthrough-estimates/1100-6529210/)
- [Screen Rant Legacy Path Guides](https://screenrant.com/how-to-complete-all-legacy-paths-in-civ-7s-antiquity-age/)
