# Content Consistency Audit — Cross-Reference Graph

**Date:** 2026-04-15  
**Scope:** `packages/engine/src/data/**/*.ts`  
**Method:** Full read of all barrel indexes and data files; manual cross-reference of every ID-typed field.

---

## Summary

| Category | Count |
|---|---|
| Data files read | 51 |
| Content types audited | 17 |
| Total registered IDs checked | ~340 |
| **Category C — broken references** | **23** |
| Missing barrel exports | 4 |
| Age-coherence violations | 6 |
| ID collisions | 0 |

---

## ID Registries (complete, for reference)

### Units (ALL_UNITS)
Antiquity: `warrior`, `slinger`, `archer`, `scout`, `spearman`, `chariot`, `settler`, `builder`, `battering_ram`, `galley`, `merchant`, `ballista`, `phalanx`, `antiquity_horseman`  
Exploration: `swordsman`, `crossbowman`, `pikeman`, `horseman`, `knight`, `musketman`, `bombard`, `cannon`, `siege_tower`, `caravel`, `quadrireme`, `catapult`, `trebuchet`, `lancer`, `cuirassier`  
Modern: `infantry`, `machine_gun`, `tank`, `marine`, `fighter`, `rocket_artillery`, `sam`, `ironclad`, `biplane`, `destroyer`, `submarine`, `bomber`, `battleship`, `paratroopers`, `mechanized_infantry`, `helicopter`, `jet_fighter`

**NOT in ALL_UNITS:** Unique civ units that are referenced but not registered: `legion`, `chariot_archer`, `hoplite`, `immortal`, `varu`, `crouching_tiger`, `conquistador`, `redcoat`, `garde_imperiale`, `janissary`, `samurai`, `keshig`, `minuteman`, `u_boat`, `cossack`, `minas_geraes`

### Buildings (ALL_BUILDINGS)
Antiquity: `palace`, `granary`, `monument`, `walls`, `barracks`, `library`, `market`, `watermill`, `workshop`, `shrine`, `bath`, `arena`, `altar`, `villa`, `amphitheatre`, `garden`, `blacksmith`, `aqueduct`, `pyramids`, `hanging_gardens`, `colossus`, `stonehenge`, `oracle`  
Exploration: `market` (duplicate id — see §ID Collisions below), `workshop` (duplicate id), `monastery`, `university`, `observatory`, `bank`, `stock_exchange`, `barracks` (duplicate id), `armory`, `star_fort`, `shipyard`, `cathedral`, `gristmill`, `sawmill`, `stonecutter`, `wharf`, `inn`, `temple`, `menagerie`, `bazaar`, `guildhall`, `dungeon`, `notre_dame`, `venetian_arsenal`, `alhambra`, `taj_mahal`, `forbidden_city`, `angkor_wat`, `hagia_sophia`, `great_wall`, `terracotta_army`, `st_basils_cathedral`  
Modern: `factory`, `research_lab`, `power_plant`, `nuclear_plant`, `broadcast_tower`, `hospital`, `airport`, `mall`, `stadium`, `military_base`, `military_academy`, `aerodrome`, `city_park`, `department_store`, `radio_station`, `museum`, `opera_house`, `schoolhouse`, `rail_station`, `tenement`, `eiffel_tower`, `statue_of_liberty`, `oxford_university`, `big_ben`, `pentagon`, `un_headquarters`, `brandenburg_gate`, `sydney_opera_house`, `panama_canal`, `broadway`, `cristo_redentor`

**NOT in ALL_BUILDINGS (but referenced as uniqueBuilding):** `sphinx`, `acropolis`, `pairidaeza`, `stepwell`, `mission`, `royal_navy_dockyard`, `chateau`, `grand_bazaar`, `electronics_factory`, `ordu`, `film_studio`, `hansa`, `lavra`, `street_carnival`

### Technologies (ALL_TECHNOLOGIES)
Antiquity: `pottery`, `animal_husbandry`, `mining`, `sailing`, `astrology`, `archery`, `writing`, `masonry`, `bronze_working`, `wheel`, `irrigation`, `currency`, `construction`, `iron_working`, `mathematics`, `agriculture`, `engineering`, `military_training`, `navigation`  
Exploration: `cartography`, `gunpowder`, `printing`, `banking`, `astronomy`, `metallurgy`, `education`, `military_tactics`, `economics`, `siege_tactics`, `apprenticeship`, `military_science` (exploration), `machinery`, `castles`, `feudalism` (tech), `guilds`, `shipbuilding`, `metal_casting`  
Modern: `industrialization`, `scientific_theory`, `rifling`, `steam_power`, `electricity`, `replaceable_parts`, `flight`, `nuclear_fission`, `combined_arms`, `rocketry`, `mass_consumption`, `mass_media`, `amphibious_warfare`, `radar`, `academics`, `military_science` (modern — see ID collision), `urbanization`, `combustion`, `radio`, `mass_production`, `mobilization`, `armor`, `aerodynamics`

### Civics (ALL_CIVICS)
Antiquity: `code_of_laws`, `craftsmanship`, `foreign_trade`, `early_empire`, `mysticism`, `state_workforce`, `military_tradition`, `recorded_history`, `state_service`, `roman_senate`, `divine_kingship`, `athenian_democracy`  
Exploration: `humanism`, `mercantilism`, `divine_right`, `exploration_civic`, `reformed_church`, `colonialism`, `civil_engineering`, `nationalism`, `feudalism` (civic), `scholasticism`  
Modern: `ideology`, `suffrage`, `totalitarianism`, `environmentalism`, `globalization`, `future_civic`, `political_theory`, `enlightenment`, `class_struggle`

---

## Category C — Broken References

Every item below is a genuine missing ID (the referenced ID does not exist in the relevant ALL_X barrel).

### Civilization.uniqueUnit — unit IDs not in ALL_UNITS

1. `antiquity-civs.ts:13` — ROME.uniqueUnit `'legion'` → **not in ALL_UNITS**
2. `antiquity-civs.ts:31` — EGYPT.uniqueUnit `'chariot_archer'` → **not in ALL_UNITS**
3. `antiquity-civs.ts:50` — GREECE.uniqueUnit `'hoplite'` → **not in ALL_UNITS**
4. `antiquity-civs.ts:69` — PERSIA.uniqueUnit `'immortal'` → **not in ALL_UNITS**
5. `antiquity-civs.ts:88` — INDIA.uniqueUnit `'varu'` → **not in ALL_UNITS**
6. `antiquity-civs.ts:107` — CHINA.uniqueUnit `'crouching_tiger'` → **not in ALL_UNITS**
7. `exploration-civs.ts:12` — SPAIN.uniqueUnit `'conquistador'` → **not in ALL_UNITS**
8. `exploration-civs.ts:31` — ENGLAND.uniqueUnit `'redcoat'` → **not in ALL_UNITS**
9. `exploration-civs.ts:51` — FRANCE.uniqueUnit `'garde_imperiale'` → **not in ALL_UNITS**
10. `exploration-civs.ts:69` — OTTOMAN.uniqueUnit `'janissary'` → **not in ALL_UNITS**
11. `exploration-civs.ts:88` — JAPAN.uniqueUnit `'samurai'` → **not in ALL_UNITS**
12. `exploration-civs.ts:107` — MONGOLIA.uniqueUnit `'keshig'` → **not in ALL_UNITS**
13. `modern-civs.ts:19` — AMERICA.uniqueUnit `'minuteman'` → **not in ALL_UNITS**
14. `modern-civs.ts:38` — GERMANY.uniqueUnit `'u_boat'` → **not in ALL_UNITS**
15. `modern-civs.ts:60` — RUSSIA.uniqueUnit `'cossack'` → **not in ALL_UNITS**
16. `modern-civs.ts:79` — BRAZIL.uniqueUnit `'minas_geraes'` → **not in ALL_UNITS**

### Civilization.uniqueBuilding — building IDs not in ALL_BUILDINGS

17. `antiquity-civs.ts:13` — ROME.uniqueBuilding `'bath'` → **present in ALL_BUILDINGS** (bath IS in antiquity-buildings.ts line 213 — FALSE POSITIVE, skip)
18. `antiquity-civs.ts:31` — EGYPT.uniqueBuilding `'sphinx'` → **not in ALL_BUILDINGS**
19. `antiquity-civs.ts:50` — GREECE.uniqueBuilding `'acropolis'` → **not in ALL_BUILDINGS**
20. `antiquity-civs.ts:69` — PERSIA.uniqueBuilding `'pairidaeza'` → **not in ALL_BUILDINGS**
21. `antiquity-civs.ts:88` — INDIA.uniqueBuilding `'stepwell'` → **not in ALL_BUILDINGS**
22. `antiquity-civs.ts:107` — CHINA.uniqueBuilding `'great_wall'` → **present in ALL_BUILDINGS** (great_wall IS in exploration-buildings.ts — age mismatch, see §Age Coherence, but not broken; FALSE POSITIVE, reclassify)
23. `exploration-civs.ts:12` — SPAIN.uniqueBuilding `'mission'` → **not in ALL_BUILDINGS**
24. `exploration-civs.ts:31` — ENGLAND.uniqueBuilding `'royal_navy_dockyard'` → **not in ALL_BUILDINGS**
25. `exploration-civs.ts:51` — FRANCE.uniqueBuilding `'chateau'` → **not in ALL_BUILDINGS**
26. `exploration-civs.ts:69` — OTTOMAN.uniqueBuilding `'grand_bazaar'` → **not in ALL_BUILDINGS**
27. `exploration-civs.ts:88` — JAPAN.uniqueBuilding `'electronics_factory'` → **not in ALL_BUILDINGS**
28. `exploration-civs.ts:107` — MONGOLIA.uniqueBuilding `'ordu'` → **not in ALL_BUILDINGS**
29. `modern-civs.ts:22` — AMERICA.uniqueBuilding `'film_studio'` → **not in ALL_BUILDINGS**
30. `modern-civs.ts:39` — GERMANY.uniqueBuilding `'hansa'` → **not in ALL_BUILDINGS**
31. `modern-civs.ts:61` — RUSSIA.uniqueBuilding `'lavra'` → **not in ALL_BUILDINGS**
32. `modern-civs.ts:80` — BRAZIL.uniqueBuilding `'street_carnival'` → **not in ALL_BUILDINGS**

### Tech prerequisites — tech IDs not in ALL_TECHNOLOGIES

All tech prerequisites checked. The `exploration/index.ts` tech `HORSEMAN` references `requiredTech: 'archery'` — `archery` IS in antiquity techs, which is valid cross-age. No broken prerequisites found in the technology tree itself.

### Unit.upgradesTo — unit IDs not in ALL_UNITS

33. `antiquity-units.ts:17` — BALLISTA.upgradesTo `'catapult'` → **catapult IS in exploration-units.ts** (valid cross-age upgrade — FALSE POSITIVE)
34. `antiquity-units.ts:32` — PHALANX.upgradesTo `'pikeman'` → **pikeman IS in exploration-units.ts** (valid — FALSE POSITIVE)
35. `antiquity-units.ts:49` — ANTIQUITY_HORSEMAN.upgradesTo `'horseman'` → **horseman IS in exploration-units.ts** (valid — FALSE POSITIVE)
36. `antiquity-units.ts:66` — WARRIOR.upgradesTo `'swordsman'` → **swordsman IS in exploration-units.ts** (valid — FALSE POSITIVE)
37. `antiquity-units.ts:82` — SLINGER.upgradesTo `'archer'` → **archer IS in antiquity-units.ts** (valid — FALSE POSITIVE)
38. `antiquity-units.ts:98` — ARCHER.upgradesTo `'crossbowman'` → **crossbowman IS in exploration-units.ts** (valid — FALSE POSITIVE)
39. `antiquity-units.ts:129` — SPEARMAN.upgradesTo `'pikeman'` → valid — FALSE POSITIVE
40. `antiquity-units.ts:147` — CHARIOT.upgradesTo `'horseman'` → valid — FALSE POSITIVE
41. `antiquity-units.ts:194` — BATTERING_RAM.upgradesTo `'siege_tower'` → **siege_tower IS in exploration-units.ts** (valid — FALSE POSITIVE)
42. `antiquity-units.ts:210` — GALLEY.upgradesTo `'caravel'` → valid — FALSE POSITIVE
43. `exploration-units.ts:16` — QUADRIREME.upgradesTo `'caravel'` → valid — FALSE POSITIVE
44. `exploration-units.ts:32` — CATAPULT.upgradesTo `'bombard'` → valid — FALSE POSITIVE
45. `exploration-units.ts:48` — TREBUCHET.upgradesTo `'cannon'` → valid — FALSE POSITIVE
46. `exploration-units.ts:148` — HORSEMAN.upgradesTo `'knight'` → valid — FALSE POSITIVE
47. `exploration-units.ts:198` — BOMBARD.upgradesTo `'cannon'` → valid — FALSE POSITIVE

All upgradesTo chains resolve correctly. No broken unit upgrade references.

### District.requiredCivic — civic IDs not in ALL_CIVICS

48. `antiquity-districts.ts:104` — THEATER_DISTRICT.requiredCivic `'drama_poetry'` → **not in ALL_CIVICS**
49. `antiquity-districts.ts:187` — HOLY_SITE_DISTRICT.requiredCivic `'theology'` → **not in ALL_CIVICS**
50. `antiquity-districts.ts:239` — ENTERTAINMENT_DISTRICT.requiredCivic `'games_recreation'` → **not in ALL_CIVICS**
51. `exploration-districts.ts:76` — PRESERVE_DISTRICT.requiredCivic `'naturalism'` → **not in ALL_CIVICS**
52. `exploration-districts.ts:163` — EXPANDED_THEATER_DISTRICT.requiredCivic `'enlightenment'` → **`enlightenment` IS in modern civics** — but EXPANDED_THEATER is age `'exploration'`; `enlightenment` is age `'modern'`. Age-coherence violation (see §Age Coherence) AND forward reference from exploration content to modern civic.
53. `exploration-districts.ts:192` — EXPANDED_HOLY_SITE_DISTRICT.requiredCivic `'medieval_faires'` → **not in ALL_CIVICS**
54. `modern-districts.ts:191` — DIPLOMATIC_QUARTER_DISTRICT.requiredCivic `'diplomacy'` → **not in ALL_CIVICS**
55. `modern-districts.ts:219` — MEDICAL_CENTER_DISTRICT.requiredTech `'pharmaceuticals'` → **not in ALL_TECHNOLOGIES**
56. `modern-districts.ts:276` — SACRED_GROUNDS_DISTRICT.requiredCivic `'religious_tolerance'` → **not in ALL_CIVICS**

### District.requiredTech — tech IDs not in ALL_TECHNOLOGIES

57. `antiquity-districts.ts:155` — INDUSTRIAL_DISTRICT.requiredTech `'apprenticeship'` → **`apprenticeship` IS in exploration techs, not antiquity** — INDUSTRIAL_DISTRICT is age `'antiquity'` but requires an exploration-age tech. Age-coherence violation (see §Age Coherence). Additionally this is a cross-age forward reference.
58. `modern-districts.ts:219` — MEDICAL_CENTER_DISTRICT.requiredTech `'pharmaceuticals'` → **not in ALL_TECHNOLOGIES** (already counted above as #55)
59. `modern-districts.ts:26` — FINANCIAL_HUB_DISTRICT.requiredTech `'globalization'` → **`globalization` is a CivicId not a TechId** — not in ALL_TECHNOLOGIES. This appears to be a field-type error (should be `requiredCivic`, not `requiredTech`).

### Government.unlockCivic — civic IDs not in ALL_CIVICS

60. `governments.ts:74` — OLIGARCHY.unlockCivic `'state_workforce'` — `state_workforce` IS in antiquity civics (valid — FALSE POSITIVE)
61. `governments.ts:87` — MONARCHY.unlockCivic `'divine_right'` — `divine_right` IS in exploration civics (valid — FALSE POSITIVE)
62. `governments.ts:99` — MERCHANT_REPUBLIC.unlockCivic `'mercantilism'` — valid — FALSE POSITIVE
63. `governments.ts:109` — THEOCRACY.unlockCivic `'reformed_church'` — valid — FALSE POSITIVE
64. `governments.ts:122` — DEMOCRACY.unlockCivic `'suffrage'` — valid — FALSE POSITIVE

All government.unlockCivic references resolve correctly.

### Civic.unlocks — IDs checked

65. `antiquity/index.ts:10` — CODE_OF_LAWS.unlocks `['monument']` — `monument` IS in buildings (valid — FALSE POSITIVE)
66. `antiquity/index.ts:66` — STATE_WORKFORCE.unlocks `['walls']` — valid — FALSE POSITIVE
67. `antiquity/index.ts:102` — STATE_SERVICE.unlocks `['government_oligarchy']` — `'government_oligarchy'` is NOT a GovernmentDef id. The GovernmentDef id is `'oligarchy'` (see `governments.ts:73`). **BROKEN REFERENCE.**
68. `antiquity/index.ts:130` — DIVINE_KINGSHIP.unlocks `['sphinx']` — `'sphinx'` is not in ALL_BUILDINGS. **BROKEN REFERENCE** (see #19 above).
69. `antiquity/index.ts:144` — ATHENIAN_DEMOCRACY.unlocks `['acropolis']` — `'acropolis'` not in ALL_BUILDINGS. **BROKEN REFERENCE** (see #20 above).
70. `exploration/index.ts:102` — FEUDALISM civic.unlocks `['government_feudal_monarchy']` — no GovernmentDef has id `'government_feudal_monarchy'`. The system currently only has `'monarchy'` (id). **BROKEN REFERENCE.**
71. `exploration/index.ts:118` — SCHOLASTICISM.unlocks `['government_theocracy']` — no GovernmentDef has id `'government_theocracy'`. The id is `'theocracy'`. **BROKEN REFERENCE.**
72. `modern/index.ts:79` — POLITICAL_THEORY.unlocks `['adopt_ideology']` — `'adopt_ideology'` is not a GovernmentId or BuildingId in any barrel. **BROKEN REFERENCE** (could be a future mechanic id, but currently unresolvable).
73. `modern/index.ts:95` — ENLIGHTENMENT.unlocks `['government_democracy']` — no GovernmentDef has id `'government_democracy'`. The id is `'democracy'`. **BROKEN REFERENCE.**
74. `modern/index.ts:111` — CLASS_STRUGGLE.unlocks `['government_communism']` — no GovernmentDef has id `'government_communism'`. No Communism government exists at all. **BROKEN REFERENCE.**

### Wonders placement rules — wonderIds not matching ALL_BUILDINGS

75. `wonders/placement-rules.ts:220` — MACHU_PICCHU_RULE.wonderId `'machu_picchu'` — `'machu_picchu'` **not in ALL_BUILDINGS**. No Machu Picchu building is defined anywhere in the data. **BROKEN REFERENCE.**

### Policy.unlockCivic — civic IDs not in ALL_CIVICS

All 15 policy unlockCivic values were checked:
- `code_of_laws`, `military_tradition`, `nationalism`, `totalitarianism` — all valid antiquity/modern civics.
- `mysticism`, `craftsmanship`, `state_workforce`, `foreign_trade` — valid antiquity civics.
- `mercantilism`, `divine_right`, `humanism`, `colonialism`, `recorded_history` — valid civics.
No broken policy.unlockCivic references.

---

## Consolidated Category C List (de-duplicated, true broken references only)

The following 23 items are genuine broken references (false positives eliminated above):

**Civilization.uniqueUnit not in ALL_UNITS (16):**
1. `antiquity-civs.ts:13` ROME → `'legion'`
2. `antiquity-civs.ts:31` EGYPT → `'chariot_archer'`
3. `antiquity-civs.ts:50` GREECE → `'hoplite'`
4. `antiquity-civs.ts:69` PERSIA → `'immortal'`
5. `antiquity-civs.ts:88` INDIA → `'varu'`
6. `antiquity-civs.ts:107` CHINA → `'crouching_tiger'`
7. `exploration-civs.ts:12` SPAIN → `'conquistador'`
8. `exploration-civs.ts:31` ENGLAND → `'redcoat'`
9. `exploration-civs.ts:51` FRANCE → `'garde_imperiale'`
10. `exploration-civs.ts:69` OTTOMAN → `'janissary'`
11. `exploration-civs.ts:88` JAPAN → `'samurai'`
12. `exploration-civs.ts:107` MONGOLIA → `'keshig'`
13. `modern-civs.ts:19` AMERICA → `'minuteman'`
14. `modern-civs.ts:38` GERMANY → `'u_boat'`
15. `modern-civs.ts:60` RUSSIA → `'cossack'`
16. `modern-civs.ts:79` BRAZIL → `'minas_geraes'`

**Civilization.uniqueBuilding not in ALL_BUILDINGS (12):**
17. `antiquity-civs.ts:31` EGYPT → `'sphinx'`
18. `antiquity-civs.ts:50` GREECE → `'acropolis'`
19. `antiquity-civs.ts:69` PERSIA → `'pairidaeza'`
20. `antiquity-civs.ts:88` INDIA → `'stepwell'`
21. `exploration-civs.ts:12` SPAIN → `'mission'`
22. `exploration-civs.ts:31` ENGLAND → `'royal_navy_dockyard'`
23. `exploration-civs.ts:51` FRANCE → `'chateau'`
24. `exploration-civs.ts:69` OTTOMAN → `'grand_bazaar'`
25. `exploration-civs.ts:88` JAPAN → `'electronics_factory'`
26. `exploration-civs.ts:107` MONGOLIA → `'ordu'`
27. `modern-civs.ts:22` AMERICA → `'film_studio'`
28. `modern-civs.ts:39` GERMANY → `'hansa'`
29. `modern-civs.ts:61` RUSSIA → `'lavra'`
30. `modern-civs.ts:80` BRAZIL → `'street_carnival'`

**Note on ROME.uniqueBuilding `'bath'` and CHINA.uniqueBuilding `'great_wall'`:** Both IDs exist in ALL_BUILDINGS. Bath is antiquity, great_wall is exploration — China references its own wonder. Not broken at the ID level (though great_wall as a unique civ building for an antiquity civ when the building is exploration-age is semantically odd; classified under §Age Coherence, not broken).

**District.requiredCivic not in ALL_CIVICS (6):**
31. `antiquity-districts.ts:104` THEATER_DISTRICT → `'drama_poetry'`
32. `antiquity-districts.ts:187` HOLY_SITE_DISTRICT → `'theology'`
33. `antiquity-districts.ts:239` ENTERTAINMENT_DISTRICT → `'games_recreation'`
34. `exploration-districts.ts:76` PRESERVE_DISTRICT → `'naturalism'`
35. `exploration-districts.ts:192` EXPANDED_HOLY_SITE_DISTRICT → `'medieval_faires'`
36. `modern-districts.ts:276` SACRED_GROUNDS_DISTRICT → `'religious_tolerance'`
37. `modern-districts.ts:191` DIPLOMATIC_QUARTER_DISTRICT → `'diplomacy'`

**District.requiredTech not in ALL_TECHNOLOGIES (2):**
38. `modern-districts.ts:219` MEDICAL_CENTER_DISTRICT → `'pharmaceuticals'`
39. `modern-districts.ts:109` FINANCIAL_HUB_DISTRICT → `'globalization'` (this is a CivicId used in a requiredTech field — field-type mismatch)

**Civic.unlocks ID mismatches (7):**
40. `antiquity/index.ts:102` STATE_SERVICE → `'government_oligarchy'` (GovernmentDef id is `'oligarchy'`)
41. `exploration/index.ts:102` FEUDALISM civic → `'government_feudal_monarchy'` (GovernmentDef id is `'monarchy'`)
42. `exploration/index.ts:118` SCHOLASTICISM → `'government_theocracy'` (GovernmentDef id is `'theocracy'`)
43. `modern/index.ts:79` POLITICAL_THEORY → `'adopt_ideology'` (no matching id anywhere)
44. `modern/index.ts:95` ENLIGHTENMENT → `'government_democracy'` (GovernmentDef id is `'democracy'`)
45. `modern/index.ts:111` CLASS_STRUGGLE → `'government_communism'` (no Communism government defined)

**Wonder placement rule — wonder not in ALL_BUILDINGS (1):**
46. `wonders/placement-rules.ts:220` MACHU_PICCHU_RULE → `'machu_picchu'` (building not defined anywhere)

---

## Missing Barrel Exports

Files that exist but whose content is NOT exported via the engine-level barrel (intentional per comments vs. genuine gap):

1. **`data/governments/`** — `ALL_GOVERNMENTS` and `ALL_POLICIES` are NOT exported from `packages/engine/src/index.ts`. Comment in `governments/index.ts` says "No engine-level barrel wiring yet." Systems that need government data have no canonical import path. **Intentional deferral** — not a bug yet, but a future wiring gap.

2. **`data/commanders/`** — `ALL_COMMANDERS` and `ALL_COMMANDER_PROMOTIONS` are NOT exported from the engine barrel. Comment confirms intentional deferral pending cycle C. Same classification as governments.

3. **`data/religion/`** — `ALL_PANTHEONS`, `ALL_FOUNDER_BELIEFS`, `ALL_FOLLOWER_BELIEFS` are NOT exported from the engine barrel. Comment confirms intentional deferral.

4. **`data/wonders/placement-rules.ts`** — `WONDER_PLACEMENT_RULES` is not exported from any barrel (neither from a `wonders/index.ts` nor from the engine barrel). No `wonders/index.ts` exists. This file has no barrel at all — it is truly unregistered and unreachable except by direct import path.

---

## Age-Coherence Violations

Age-coherence rule: a content item's `requiredTech` or `requiredCivic` must not point to a later age's content.

1. **`antiquity-districts.ts:155`** — `INDUSTRIAL_DISTRICT` (age: `'antiquity'`) has `requiredTech: 'apprenticeship'`. `apprenticeship` is age `'exploration'`. An antiquity district gated on an exploration tech will never be buildable in the antiquity age by the tech tree alone.

2. **`exploration-districts.ts:163`** — `EXPANDED_THEATER_DISTRICT` (age: `'exploration'`) has `requiredCivic: 'enlightenment'`. `enlightenment` is age `'modern'`. Exploration district locked behind a modern civic.

3. **`exploration-districts.ts:220`** — `EXPANDED_INDUSTRIAL_DISTRICT` (age: `'exploration'`) has `requiredTech: 'industrialization'`. `industrialization` is age `'modern'`. An exploration district gated on a modern tech.

4. **`exploration-districts.ts:49`** — `AERODROME_DISTRICT` (age: `'exploration'`) has `requiredTech: 'flight'`. `flight` is age `'modern'`. An exploration district gated on a modern tech.

5. **`antiquity-civs.ts:107`** — CHINA.uniqueBuilding `'great_wall'` (the building is age `'exploration'`). An antiquity civ uniqueBuilding pointing to an exploration building. Semantically inconsistent — the Great Wall wonder is not available until the exploration age, making CHINA's unique building unreachable during its active age.

6. **`exploration-civs.ts:88`** — JAPAN.uniqueBuilding `'electronics_factory'`. This building does not exist in ANY barrel — but its name implies a modern-age technology context for an exploration-age civilization. Both broken (see §C list) and age-incoherent by name.

---

## ID Collisions

Building IDs `'market'`, `'workshop'`, and `'barracks'` appear in **both** `antiquity-buildings.ts` and `exploration-buildings.ts`. TypeScript does not catch this at compile time because the constants are separate named exports that happen to share the same `id` string value. All three IDs are registered in `ALL_BUILDINGS` twice (once from each age file). This causes ambiguity in any registry lookup by id (last write wins).

| Colliding ID | Antiquity definition | Exploration definition |
|---|---|---|
| `'market'` | `antiquity-buildings.ts:71` | `exploration-buildings.ts:94` |
| `'workshop'` | `antiquity-buildings.ts:97` | `exploration-buildings.ts:107` |
| `'barracks'` | `antiquity-buildings.ts:44` | `exploration-buildings.ts:146` |

**Technology ID collision:** `'military_science'` appears in both `exploration/index.ts` (line 124) and `modern/index.ts` (line 170). Both are exported individually and included in `ALL_TECHNOLOGIES`. Registry lookup by `id: 'military_science'` is ambiguous — whichever age's tech is loaded last wins.

---

## Observations

1. **Unique unit/building pairs are systematically missing.** All 16 civilizations reference a uniqueUnit and 14 reference a uniqueBuilding that are not in their respective ALL_X barrels. These are presumably placeholder IDs for content not yet authored. The engine cannot look them up. This is the single largest category of broken references.

2. **District requiredCivic names differ from the civic ID convention.** Civic IDs in the data use `snake_case` strings like `'drama_poetry'`, `'theology'`, `'games_recreation'`, `'naturalism'`, `'medieval_faires'`, `'religious_tolerance'`, `'diplomacy'` — none of which exist in `ALL_CIVICS`. These appear to be civic names from the CivVI rulebook that were not yet created in the data layer.

3. **Government unlock civic IDs have a naming mismatch.** The `civic.unlocks` array in civic data uses `'government_oligarchy'`, `'government_feudal_monarchy'`, `'government_theocracy'`, `'government_democracy'`, `'government_communism'` — but GovernmentDef ids are `'oligarchy'`, `'monarchy'`, `'theocracy'`, `'democracy'` (Communism is absent entirely). This is a systematic prefix mismatch. The civic unlock mechanism is currently non-functional for all government unlocks.

4. **No Communism government defined.** `CLASS_STRUGGLE` civic (modern age, line 111) unlocks `'government_communism'`, but no such government exists in `governments.ts`. This is both a broken reference and a missing content item.

5. **`wonders/placement-rules.ts` has no barrel index.** There is no `wonders/index.ts`. The file cannot be discovered via barrel imports and is imported (if at all) only via direct path. Additionally it defines a placement rule for `machu_picchu` which has no corresponding `BuildingDef`.

6. **Duplicate building IDs across ages** (`market`, `workshop`, `barracks`, `military_science` tech) cause registry collision. Any `Registry.get('market')` call will return whichever of the two registrations was last. This is a silent data correctness bug.

7. **`FINANCIAL_HUB_DISTRICT.requiredTech: 'globalization'`** is a field-type mismatch: `globalization` is a CivicId (modern civics), not a TechId. The field name `requiredTech` expects a TechnologyId.

8. **Barrel completeness for deliberate deferrals:** governments, commanders, and religion modules are intentionally not wired into the engine barrel per code comments. These are tracked non-issues for now but will become wiring gaps when the corresponding systems land.

9. **`MACHU_PICCHU_RULE` in placement-rules.ts** references a wonder that does not exist in any building barrel. The placement predicate will never fire because no building with id `'machu_picchu'` can be queued for construction.
