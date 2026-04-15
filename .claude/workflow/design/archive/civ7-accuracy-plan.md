# Civ VII Accuracy Plan — Detailed Implementation Roadmap

Based on 6 research reports covering every major Civ VII system.

## Critical Differences from Our Current Implementation

### 1. CITY SYSTEM (Major rework needed)
**Current:** Cities are the only settlement type. Housing/amenities simple numbers.
**Civ VII:** Two settlement types — Towns and Cities. Towns produce gold, Cities produce everything. Happiness replaces housing+amenities.

**Tasks:**
- [ ] Add `settlementType: 'town' | 'city'` to CityState
- [ ] Towns convert all production to gold, must purchase with gold
- [ ] Add gold-purchase action for towns
- [ ] Add town-to-city upgrade action (costs gold)
- [ ] Replace housing+amenities with single Happiness system
- [ ] Happiness: each negative point = -2% total yields, up to -50
- [ ] Specialists cost 2 food + 2 happiness each
- [ ] Settlement cap — exceeding it penalizes happiness globally
- [ ] Border expansion on population growth (DONE in latest commit)
- [ ] Max workable range = 3 tiles from city center

### 2. TECH/CIVIC SYSTEM (Major rework needed)
**Current:** Single tech tree, no civics, no tech gating per age.
**Civ VII:** Separate tech and civic trees. Tech uses science, civic uses culture. Each age has its own tree (~15 techs). Can only research current age. Masteries replace eureka.

**Tasks:**
- [ ] Add civic tree (separate from tech tree, uses culture yield)
- [ ] Create CivicDef type with similar structure to TechnologyDef
- [ ] Civic tree data for all 3 ages
- [ ] Add currentCivic, civicProgress to PlayerState
- [ ] Lock tech tree to current age only
- [ ] Add mastery system (tier-2 version of each tech/civic)
- [ ] Future Tech for end-of-age (+10 age progress)

### 3. COMBAT SYSTEM (Refinement needed)
**Current:** Basic combat strength comparison. No ZoC. No healing. No commanders.
**Civ VII:** Commander units with promotion trees. ZoC. Directional flanking. Healing rates vary by territory. City walls as fortified districts.

**Tasks:**
- [ ] Zone of Control — units in ZoC cannot move further (cavalry ignores ZoC)
- [ ] Healing per turn: friendly +15, city +20, neutral +10, enemy +5
- [ ] Terrain combat modifiers: hills +3, woods +2, river -5
- [ ] City defense: walls add +100 HP and +15 combat strength
- [ ] Fortified districts concept (simplified — walls building adds city combat)
- [ ] Melee attacker advances to defender tile on kill (DONE)

### 4. AGE SYSTEM (Rework needed)
**Current:** Simple threshold, pick new civ. Legacy bonuses as flat effects.
**Civ VII:** 4 Legacy Paths (military/economic/science/culture). Milestones earn Legacy Points. Points spent on bonuses during transition. Golden/Dark ages from completing/failing paths.

**Tasks:**
- [ ] Add 4 legacy paths with milestones
- [ ] Track milestone progress per path
- [ ] Legacy Points earned from milestones (max 3 per path)
- [ ] Age transition: spend points on carry-over bonuses
- [ ] Golden Age (complete full path) and Dark Age (no milestones)
- [ ] All players transition simultaneously when meter hits 100%

### 5. DIPLOMACY (Rework needed)
**Current:** Basic war/peace/alliance. Grievances as simple number.
**Civ VII:** Influence yield. Endeavors/Sanctions/Treaties/Espionage. War Support replaces grievances. Relationship stages.

**Tasks:**
- [ ] Add Influence as a new yield type
- [ ] Relationship stages: Helpful > Friendly > Neutral > Unfriendly > Hostile
- [ ] War Support tug-of-war mechanic replaces grievances
- [ ] Formal War vs Surprise War (surprise = war support penalty)
- [ ] Diplomatic actions cost Influence
- [ ] Trade routes via merchant units

### 6. VICTORY CONDITIONS (Rework needed)
**Current:** 5 types checkable any time.
**Civ VII:** Victories only in Modern age (except Domination). 6 types with specific project requirements.

**Tasks:**
- [ ] Lock most victories to Modern age only
- [ ] Culture: collect artifacts + build World's Fair
- [ ] Science: 3 space race projects
- [ ] Economic: 500 Railroad Points + World Bank in every capital
- [ ] Military: 20 Ideology Points + Manhattan Project
- [ ] Score: highest legacy score when Modern age meter hits 100%

### 7. UI/VISUAL (Polish needed)
**Current:** Dark theme, small hex tiles, yield dots always visible.
**Civ VII:** Realistic-stylized look. Yields hidden by default (toggle via Lens). Unit flags with type icons.

**Tasks:**
- [ ] Yield display toggle (Lens button) — hidden by default, show on toggle
- [ ] Unit flags/banners instead of raw icons (colored banner with type icon)
- [ ] City banners with name + population
- [ ] Better hex border rendering for territories
- [ ] Research progress shown in TopBar (DONE)
- [ ] End turn button bottom-right (Civ convention)

## Priority Order (Iterations)

### Iteration A: Core Gameplay Accuracy
1. Tech gating per age (can only research current age)
2. Healing system for units
3. Zone of Control
4. Yield display toggle (Lens)
5. City banners on map

### Iteration B: Town/City & Happiness
1. Settlement types (town vs city)
2. Happiness system replacing housing/amenities
3. Gold purchase for towns
4. Settlement cap

### Iteration C: Civic Tree & Legacy Paths
1. Civic tree (separate from tech)
2. Culture-driven civic research
3. Legacy paths with milestones
4. Golden/Dark age mechanics

### Iteration D: Diplomacy & Trade
1. Influence yield
2. Relationship stages
3. War Support system
4. Trade routes

### Iteration E: Victory & Polish
1. Modern-age-only victories with projects
2. Unit banners/flags
3. Improved city rendering
4. AI improvements for new systems
