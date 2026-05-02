import type { HexCoord, HexKey } from './HexCoord';
import type { GameConfig } from './GameConfig';
import type { PlayerId, UnitId, CityId, CivilizationId, LeaderId, TechnologyId, BuildingId, ResourceId, ImprovementId, DistrictId, GovernorId } from './Ids';
import type { YieldSet, YieldType } from './Yields';
import type { TerrainId, FeatureId } from './Terrain';
import type { DistrictSlot } from './District';
import type { Governor } from './Governor';
import type { UrbanTileV2, RuralTileV2, QuarterV2 } from './DistrictOverhaul';
import type { ReligionSlotState } from './Religion';
import type { NotificationCategory, NotificationPanelTargetHint } from './Notification';
import type { CommanderState } from './Commander';
import type { EspionageOperation, EspionageOpState } from './Espionage';
import type { ActiveTreaty } from './Treaty';

// ── Turn ──

export type TurnPhase = 'start' | 'actions' | 'end';
export type Age = 'antiquity' | 'exploration' | 'modern';

// ── Map ──

export interface HexTile {
  readonly coord: HexCoord;
  readonly terrain: TerrainId;
  readonly feature: FeatureId | null;
  readonly resource: ResourceId | null;
  readonly improvement: ImprovementId | null; // Tile improvement (farm, mine, etc.)
  readonly building: BuildingId | null; // Placed building (from city construction)
  readonly river: ReadonlyArray<number>; // edge indices (0-5) that have rivers
  readonly elevation: number; // 0-1 normalized
  readonly continent: number; // continent id
  /** True if this tile is in the Distant Lands (Exploration/Modern age map extension) */
  readonly isDistantLands?: boolean;
  /** True if this tile is adjacent to a river or lake (affects city founding bonuses) */
  readonly hasFreshWater?: boolean;
  /** True if this tile contains a natural wonder */
  readonly isNaturalWonder?: boolean;
  /** The natural wonder definition id, if isNaturalWonder is true */
  readonly naturalWonderId?: string | null;
  /** Discovery site id if an ancient discovery is present on this tile */
  readonly discoveryId?: string | null;
  /**
   * W5-02: True if this tile contains an excavatable artifact site.
   * Explorers can EXCAVATE_ARTIFACT on tiles where this is true.
   * Cleared (set to false) after excavation.
   */
  readonly hasArtifactSite?: boolean;
  /**
   * F-10: Uses remaining for bonus resource tiles.
   * Bonus resources deplete after N harvests (default 5). Decremented by 1 the
   * first time an improvement is built on this tile. When it reaches 0, the
   * resourceId is cleared (resource depleted).
   * Optional so existing HexTile construction keeps compiling unchanged.
   */
  readonly resourceUsesRemaining?: number;
}

export interface HexMap {
  readonly width: number;
  readonly height: number;
  readonly tiles: ReadonlyMap<HexKey, HexTile>;
  readonly wrapX: boolean; // cylindrical wrapping
}

// ── Units ──

export type UnitCategory = 'melee' | 'ranged' | 'siege' | 'cavalry' | 'naval' | 'civilian' | 'religious' | 'support';

export interface UnitState {
  readonly id: UnitId;
  readonly typeId: string;
  readonly owner: PlayerId;
  readonly position: HexCoord;
  readonly movementLeft: number;
  readonly health: number; // 0-100
  readonly experience: number;
  readonly promotions: ReadonlyArray<string>;
  readonly fortified: boolean;
  /**
   * The direction this unit is facing (0–5, pointy-top hex directions matching HEX_DIRECTIONS index).
   * 0 = E, 1 = NE, 2 = NW, 3 = W, 4 = SW, 5 = SE.
   * Optional for backward compatibility — units without a facing value use the legacy count-based flanking.
   */
  readonly facing?: 0 | 1 | 2 | 3 | 4 | 5;
  /**
   * W4-04: When non-null, this unit has been packed into the named commander's
   * army via ASSEMBLE_ARMY. Packed units move with the commander and cannot act
   * independently until DEPLOY_ARMY is dispatched.
   */
  readonly packedInCommanderId?: string | null;

  /**
   * F-08: Missionary spread charges remaining. Default 3 for Missionary units.
   * Each SPREAD_RELIGION action consumes one charge. When depleted the unit
   * can no longer spread religion. Optional so existing UnitState construction
   * keeps compiling unchanged.
   */
  readonly spreadsRemaining?: number;
}

// ── Cities ──

export type SettlementType = 'town' | 'city';

/**
 * F-07 (pop): Typed specialist categories matching Civ VII district model.
 * - "urban": specialists assigned to urban (production/science/culture) district tiles.
 * - "rural": specialists assigned to rural (food/growth) tiles.
 */
export type SpecialistType = 'urban' | 'rural';

export type TownSpecialization =
  | 'growing_town'    // +50% growth rate
  | 'farming_town'    // +2 food
  | 'mining_town'     // +2 production
  | 'trade_outpost'   // +3 gold
  | 'fort_town'       // +5 defense HP, +5 healing in territory
  | 'religious_site'  // +3 faith
  | 'hub_town'        // +2 gold, +1 production
  | 'urban_center'    // +1 food, +1 production, +1 gold
  | 'factory_town';   // +3 production

export type NonGrowingTownSpecialization = Exclude<TownSpecialization, 'growing_town'>;

export interface CityState {
  readonly id: CityId;
  readonly name: string;
  readonly owner: PlayerId;
  readonly position: HexCoord;
  readonly population: number;
  readonly food: number;           // accumulated food toward next pop
  /**
   * Number of food-driven growth events this settlement has completed in the
   * current age. Optional for old saves/tests; absent falls back to
   * population - 1.
   */
  readonly growthEventCount?: number;
  readonly productionQueue: ReadonlyArray<ProductionItem>;
  readonly productionProgress: number; // accumulated production on current item
  readonly buildings: ReadonlyArray<BuildingId>;
  readonly territory: ReadonlyArray<HexKey>; // owned hex keys
  readonly settlementType: SettlementType;
  readonly happiness: number;
  readonly isCapital: boolean;
  readonly defenseHP: number;      // city defense hit points (100 base, +100 with walls)
  readonly specialization: TownSpecialization | null; // towns only, requires pop >= 7
  /**
   * Civ VII town focus lock. Once a town chooses a non-Growing specialization,
   * it may toggle between that specialization and Growing Town, but it cannot
   * switch to a different non-Growing specialization until an age transition
   * resets town focus state.
   */
  readonly lockedTownSpecialization?: NonGrowingTownSpecialization | null;
  readonly specialists: number;    // population assigned as specialists (sum of per-tile counts; each: +2 sci, +2 culture, -1 happiness)
  /**
   * ── W3-02: Per-tile specialist map ──
   *
   * Maps urban tileId (HexKey) → number of specialists assigned to that tile.
   * `specialists` above is always the sum of all values in this map.
   * Optional so existing CityState construction (engine, web, tests, save files)
   * keeps compiling; systems that don't use spatial model rely on `specialists` alone.
   */
  readonly specialistsByTile?: ReadonlyMap<string, number>;
  /**
   * F-07 (pop): Per-type specialist counts — urban vs rural.
   * `specialists` is always the sum of all values in this map.
   * Updated by specialistSystem when a `type` field is provided in
   * ASSIGN_SPECIALIST / UNASSIGN_SPECIALIST. Optional so existing
   * CityState construction keeps compiling unchanged.
   */
  readonly specialistsByType?: ReadonlyMap<SpecialistType, number>;
  readonly districts: ReadonlyArray<DistrictId>; // IDs of districts this city has constructed

  /**
   * ── Districts Overhaul (Cycle B) — optional spatial state ──
   *
   * Parallel-namespace fields wired in as OPTIONAL so existing CityState
   * construction (engine, web, tests, save files) keeps compiling and
   * behaving unchanged. Cycle C will start populating these via the
   * forthcoming `PLACE_URBAN_BUILDING` action; legacy systems read the
   * pre-existing `buildings`/`districts` fields when these are absent.
   *
   * See `.codex/workflow/design/districts-overhaul.md` for the rollout plan
   * and `types/DistrictOverhaul.ts` for the V2 type definitions.
   */
  readonly urbanTiles?: ReadonlyMap<HexKey, UrbanTileV2>;
  readonly ruralAssignments?: ReadonlyMap<HexKey, RuralTileV2>;
  readonly quarters?: ReadonlyArray<QuarterV2>;

  /**
   * ── Resource Slot assignment (rulebook §13.3) — optional runtime field ──
   *
   * Populated by `resourceAssignmentSystem` when `ASSIGN_RESOURCE` /
   * `UNASSIGN_RESOURCE` actions are dispatched. Optional so existing
   * CityState construction (engine, web, tests, save files) keeps
   * compiling and behaving unchanged. The system gracefully no-ops for
   * cities where the field is absent.
   */
  readonly assignedResources?: ReadonlyArray<ResourceId>;

  /** True if this city is currently afflicted by plague (plague crisis mechanic) */
  readonly infected?: boolean;
  /** Turns remaining on a civil unrest penalty triggered by negative happiness */
  readonly civilUnrestTimer?: number;
  /** Countdown to settlement being razed (null = not being razed) */
  readonly razingCountdown?: number | null;
  /** PlayerId of the player who originally founded this city */
  readonly foundedBy?: string;
  /** PlayerId of the original owner before conquest (null = never conquered) */
  readonly originalOwner?: string;
  /**
   * AA1.2: True if this city has ever changed hands via combat (conquest).
   * Set to false when FOUND_CITY; set to true when city capture occurs in
   * combat. Provides a convenient boolean for systems that only need to
   * distinguish founded vs. conquered cities without inspecting originalOwner.
   * Optional so existing CityState construction keeps compiling unchanged.
   */
  readonly wasConquered?: boolean;
  /** True if this settlement occupies an Urban tile slot in the V2 district model */
  readonly isUrban?: boolean;

  /**
   * X1.1 (settlements): True when this city has been downgraded to a town on
   * age transition. Redundant with settlementType === town but provided as
   * a convenient boolean flag for systems that only need to check town status.
   * Optional so existing CityState construction keeps compiling unchanged.
   */
  readonly isTown?: boolean;

  /**
   * F-08: The religion currently dominant in this city (set by SPREAD_RELIGION).
   * Null / undefined when the city has no majority religion.
   * Optional so existing CityState construction keeps compiling unchanged.
   */
  readonly religionId?: string | null;

  /**
   * F-08: Count of urban district tiles converted to the player's religion
   * via Missionary spread actions. Each urban spread increments this counter.
   * Used to track per-city conversion progress (relic accumulation, city
   * majority religion threshold). Optional — absent = 0.
   */
  readonly urbanConverted?: number;

  /**
   * F-08: Count of rural (improved) tiles converted to the player's religion
   * via Missionary spread actions. Each rural spread increments this counter.
   * Used alongside urbanConverted for majority-religion threshold checks.
   * Optional — absent = 0.
   */
  readonly ruralConverted?: number;

  /**
   * F-09: Relics currently displayed in this city's Reliquary buildings.
   * Each displayed relic contributes its faithPerTurn / culturePerTurn yields.
   * Optional so existing CityState construction keeps compiling unchanged.
   */
  readonly relicsDisplayed?: ReadonlyArray<string>;

  /**
   * ── W4-03: Multi-district siege HP model ──
   *
   * Per-district tile HP tracking. Maps district tile HexKey → current HP.
   * Urban districts start at 100 HP; city_center district starts at 200 HP.
   * Attackers must destroy all non-center districts before the city capital
   * is accessible for capture.
   *
   * Optional so existing CityState construction (engine, web, tests, save files)
   * keeps compiling and behaving unchanged. When absent, falls back to the legacy
   * single `defenseHP` bar.
   *
   * @deprecated defenseHP — prefer districtHPs for multi-district siege.
   */
  readonly districtHPs?: ReadonlyMap<string, number>;
}

export interface ProductionItem {
  readonly type: 'unit' | 'building' | 'wonder' | 'district';
  readonly id: string;
  /**
   * ── Building-placement rework (Cycle 1) — optional locked tile ──
   *
   * Records the tile at which a building or wonder will materialise
   * when production completes. Civ VII commits tile-first; this field
   * is the on-queue memory of that commitment.
   *
   * - For `type: 'building'` and `type: 'wonder'`: optional for now
   *   (legacy SET_PRODUCTION dispatches without a tile remain valid);
   *   later cycles will make it required at the action layer.
   * - For `type: 'unit'` and `type: 'district'`: should remain absent.
   *
   * When present on a building/wonder queue item and still valid at
   * completion, `productionSystem` auto-places the building on that
   * tile — no separate PLACE_BUILDING action required.
   */
  readonly lockedTile?: HexCoord;
}

// ── Players ──

export interface LegacyPaths {
  readonly military: number;   // milestones completed (0-3)
  readonly economic: number;
  readonly science: number;
  readonly culture: number;
}

export interface PlayerState {
  readonly id: PlayerId;
  readonly name: string;
  readonly isHuman: boolean;
  readonly civilizationId: CivilizationId;
  readonly leaderId: LeaderId;
  readonly age: Age;
  readonly researchedTechs: ReadonlyArray<TechnologyId>;
  readonly currentResearch: TechnologyId | null;
  readonly researchProgress: number;
  readonly researchedCivics: ReadonlyArray<string>;
  readonly currentCivic: string | null;
  readonly civicProgress: number;
  readonly gold: number;
  readonly science: number;
  readonly culture: number;
  readonly faith: number;
  readonly influence: number;
  readonly ageProgress: number; // points toward next age
  readonly legacyBonuses: ReadonlyArray<ActiveEffect>;
  readonly legacyPaths: LegacyPaths;
  readonly legacyPoints: number;
  readonly totalGoldEarned: number;  // tracks cumulative gold for legacy milestones
  readonly totalKills: number;       // tracks cumulative kills for legacy milestones
  readonly visibility: ReadonlySet<HexKey>; // currently visible tiles
  readonly explored: ReadonlySet<HexKey>;   // ever-seen tiles
  // Celebration mechanic: bonus production when excess happiness crosses threshold
  readonly celebrationCount: number;      // total celebrations earned so far
  readonly celebrationBonus: number;      // current bonus percent (10 per active celebration)
  readonly celebrationTurnsLeft: number;  // turns remaining on active celebration
  readonly masteredTechs: ReadonlyArray<TechnologyId>; // techs that have been mastered (re-researched for a bonus)
  readonly currentMastery: TechnologyId | null;        // tech currently being mastered
  readonly masteryProgress: number;                    // accumulated science toward mastery
  readonly masteredCivics: ReadonlyArray<string>;      // civics that have been mastered for a culture bonus
  readonly currentCivicMastery: string | null;         // civic currently being mastered
  readonly civicMasteryProgress: number;               // accumulated culture toward civic mastery
  readonly governors: ReadonlyArray<GovernorId>;       // IDs of recruited governors

  /**
   * F-13 (civic history): Ordered log of civic ids completed by this player
   * (appended in completion order). Distinct from researchedCivics (which is
   * an unordered set used for prerequisite checks). Enables historical-tracking
   * UI without changing existing civic logic.
   * Optional so existing PlayerState construction keeps compiling unchanged.
   */
  readonly completedCivics?: ReadonlyArray<string>;

  /**
   * ── M12 Integration — optional runtime fields for Religion & Government ──
   *
   * Parallel-namespace fields wired in as OPTIONAL so existing PlayerState
   * construction (engine, web, tests, save files) keeps compiling and
   * behaving unchanged. The standalone `religionSystem` /
   * `governmentSystem` keep their graceful no-op paths for players whose
   * records have not yet opted in.
   *
   * - `pantheonId`       — null/undefined until `ADOPT_PANTHEON` is
   *   dispatched. After a successful pick, the picked pantheon id is
   *   stored here alongside the faith deduction performed by the system.
   * - `governmentId`     — null/undefined until `SET_GOVERNMENT` is
   *   dispatched. Resets per-category slots when switched.
   * - `slottedPolicies`  — category → slot-array, mirroring the
   *   GovernmentDef.policySlots shape. `null` entries are empty slots.
   *
   * Commander XP and picks live on `UnitState.experience` /
   * `UnitState.promotions` — the `commanderPromotionSystem` uses those
   * existing fields, so there is no new PlayerState bookkeeping for
   * commanders.
   */
  readonly pantheonId?: string | null;
  readonly governmentId?: string | null;
  /**
   * Flat wildcard policy slot array, length = GovernmentDef.policySlots.total.
   * Null entries are empty slots. (W2-03: was ReadonlyMap<category, array>.)
   */
  readonly slottedPolicies?: ReadonlyArray<string | null>;

  // ── Narrative Events ──
  /** Arbitrary tag strings used to gate narrative event conditions */
  readonly narrativeTags?: ReadonlyArray<string>;

  // ── Happiness / Celebrations → Social Policies ──
  /** Accumulated global empire happiness (sum of per-turn excess); checked against age-specific thresholds */
  readonly globalHappiness?: number;
  /** Number of policy card slots available from celebration bonuses */
  readonly socialPolicySlots?: number;
  /**
   * Set when a celebration threshold is crossed: player must pick one of the government's
   * two `celebrationBonuses` before END_TURN is allowed. Contains the governmentId at the
   * time of the trigger (so the bonus menu can be resolved even if government changes).
   * Null / undefined = no pending choice.
   */
  readonly pendingCelebrationChoice?: { readonly governmentId: string } | null;
  /**
   * The bonus id chosen in the most-recent PICK_CELEBRATION_BONUS action.
   * Null when no celebration is active. Used by effectSystem to apply the chosen bonus.
   */
  readonly activeCelebrationBonus?: string | null;

  // ── Civic Tree ──
  /** Civic tradition bonus ids adopted by this player */
  readonly traditions?: ReadonlyArray<string>;
  /** Modern-age ideology choice for the civic tree */
  readonly ideology?: 'democracy' | 'fascism' | 'communism' | null;
  /**
   * Y2.1: Typed policy slot counts granted by completed civic GRANT_POLICY_SLOT effects.
   * Additive on top of government slots. Optional so existing PlayerState
   * construction keeps compiling unchanged.
   */
  readonly policySlotCounts?: {
    readonly military: number;
    readonly economic: number;
    readonly diplomatic: number;
    readonly wildcard: number;
  };

  // ── Independent Powers ──
  /** IDs of city-states / independent powers this player has suzerainty over */
  readonly suzerainties?: ReadonlyArray<string>;
  /** Map from independent power id to the bonus id currently granted by suzerainty */
  readonly suzerainBonuses?: ReadonlyMap<string, string>;

  // ── Mementos ──
  /** IDs of equipped memento items (leader RPG keepsakes) */
  readonly equippedMementos?: ReadonlyArray<string>;

  // ── Victory Points ──
  /** Military ideology victory points (Civ VII military-domination axis) */
  readonly ideologyPoints?: number;
  /** Economic railroad-tycoon victory points */
  readonly railroadTycoonPoints?: number;
  /** Culture artifacts collected toward cultural victory */
  readonly artifactsCollected?: number;
  /** Science space-program milestones complete (0-3) */
  readonly spaceMilestonesComplete?: number;

  // ── Leader RPG Attributes ──
  /** Unspent attribute points for the leader RPG tree */
  readonly attributePoints?: number;
  /** Unlocked attribute node ids per attribute tree (6 trees) */
  readonly attributeTree?: Record<string, ReadonlyArray<string>>;
  /** Extra wildcard attribute points granted by Future Tech research */
  readonly wildcardAttributePoints?: number;

  // ── Score / Legacy Tracking ──
  /** Cumulative legacy points across all ages for the score-victory axis */
  readonly totalCareerLegacyPoints?: number;
  /** Typed breakdown of legacy points earned per axis */
  readonly legacyPointsByAxis?: Record<'military' | 'economic' | 'science' | 'culture', number>;
  /** Enemy units killed in the current age only (resets on TRANSITION_AGE) */
  readonly killsThisAge?: number;
  /** Which axis triggered a Golden Age this transition (at most one per transition) */
  readonly goldenAgeChosen?: 'military' | 'economic' | 'science' | 'culture' | null;
  /**
   * F-04: Pending legacy bonuses awaiting player selection at age end.
   * Max 4 entries shown to player; max 2 pickable via CHOOSE_LEGACY_BONUSES.
   * Populated during TRANSITION_AGE; cleared once player picks.
   */
  readonly pendingLegacyBonuses?: ReadonlyArray<{
    readonly bonusId: string;
    readonly axis: string;
    readonly description: string;
    readonly effect: EffectDef;
  }>;

  // ── Future Tech ──
  /** Tech id that will be boosted in the next age (from Future Tech selection) */
  readonly nextAgeTechBoost?: string | null;

  // ── Misc Flags ──
  /** True if this player has unlocked the crisis legacy bonus */
  readonly crisisLegacyUnlocked?: boolean;
  /** True if a grace-period policy swap window is currently open */
  readonly policySwapWindowOpen?: boolean;
  /** True if the player's government is locked for the current age (one-switch rule) */
  readonly governmentLockedForAge?: boolean;
  /**
   * Forced government-selection prompt opened by crisis flows.
   * While present, only governments listed in `options` may be selected.
   */
  readonly pendingGovernmentChoice?: {
    readonly reason: 'revolutions_final_stage';
    readonly options: ReadonlyArray<string>;
    readonly sourceCrisisType: 'revolution';
    readonly sourceStage: 1 | 2 | 3;
  } | null;

  // ── Crisis Phase (W2-05) ──
  /**
   * Current crisis resolution phase for this player.
   * - 'none' / undefined: no active crisis phase
   * - 'stage1' → requires crisisPolicySlots = 2 filled policies
   * - 'stage2' → requires crisisPolicySlots = 3 filled policies
   * - 'stage3' → requires crisisPolicySlots = 4 filled policies
   * - 'resolved': crisis fully resolved, gate lifted
   */
  readonly crisisPhase?: 'none' | 'stage1' | 'stage2' | 'stage3' | 'resolved';
  /**
   * Policy ids the player has committed to this crisis.
   * Max length === crisisPolicySlots.
   */
  readonly crisisPolicies?: ReadonlyArray<string>;
  /**
   * Number of crisis policy slots required for the current stage (2/3/4).
   * Gate: END_TURN is blocked until crisisPolicies.length >= crisisPolicySlots.
   */
  readonly crisisPolicySlots?: number;

  // ── Growth Choices (W2-01) ──
  /**
   * Pending growth-choice prompts for this player. Each entry represents a
   * population-growth event in one of the player's cities that is waiting for
   * the player to either PLACE_IMPROVEMENT on a city tile or
   * ASSIGN_SPECIALIST_FROM_GROWTH. Civ VII: growth → player picks tile → game
   * derives improvement type from terrain + resource (not player-chosen).
   *
   * Optional so existing PlayerState construction (engine, web, tests, save
   * files) keeps compiling unchanged.
   */
  readonly pendingGrowthChoices?: ReadonlyArray<PendingGrowthChoice>;

  // ── W4-02: Distant Lands ──
  /**
   * When true, this player has unlocked access to the Distant Lands region
   * (granted by Cartography tech or when the game enters the Exploration age).
   * Controls whether Distant Lands tiles are revealed in visibilitySystem.
   */
  readonly distantLandsReachable?: boolean;

  // ── Codex System (W3-08) ──
  /**
   * IDs of codices this player currently owns (earned by mastering techs).
   * Each codex id encodes tech + index + turn earned.
   */
  readonly ownedCodices?: ReadonlyArray<string>;
  /**
   * Codex placement assignments: which codex is displayed in which building + city.
   * Contributes +2 science per codex placed in a building with codexSlots > 0.
   */
  readonly codexPlacements?: ReadonlyArray<{ readonly codexId: string; readonly buildingId: string; readonly cityId: string }>;
  /**
   * Preserved research progress per tech id. When a player switches research
   * mid-progress, the old tech's progress is saved here. Restored when the
   * player switches back to that tech. Cleared on TRANSITION_AGE.
   */
  readonly techProgressMap?: ReadonlyMap<TechnologyId, number>;

  // ── Resource Ownership (W4-05) ──
  /**
   * IDs of resources this player currently controls (gained by settling tiles
   * with resources or via border expansion — F-07). These are the resources
   * available for assignment to cities via `ASSIGN_RESOURCE`.
   *
   * Optional so existing PlayerState construction (engine, web, tests, save
   * files) keeps compiling unchanged. Systems gracefully no-op when absent.
   */
  readonly ownedResources?: ReadonlyArray<ResourceId>;

  /**
   * F-09: Relic IDs this player has acquired (via exploration, events, or
   * religious gameplay). Used by the Cultural Legacy Path to track relic-based
   * progress and by victorySystem for cultural victory.
   * Optional so existing PlayerState construction keeps compiling unchanged.
   */
  readonly relics?: ReadonlyArray<string>;

  // ── W5-01: Modern Victory Projects ──
  /**
   * IDs of projects this player has completed via COMPLETE_PROJECT.
   * Used by victorySystem to check project-chain terminal conditions
   * (e.g. 'operation_ivy' → Military Victory, 'first_staffed_spaceflight' is
   * the 3rd space milestone → Science Victory).
   *
   * Optional so existing PlayerState construction (engine, web, tests, save
   * files) keeps compiling unchanged.
   */
  readonly completedProjects?: ReadonlyArray<string>;
  /**
   * X5.1: Operation Ivy capital-production progress (0-100).
   * Advances each turn once the player has researched a Modern ideology civic
   * (fascism, communism, or democracy) and has a capital city producing it.
   * When it reaches 100 the player may dispatch COMPLETE_PROJECT for operation_ivy.
   * Optional so existing PlayerState construction keeps compiling unchanged.
   */
  readonly operationIvyProgress?: number;
  /**
   * Number of rival capitals that still need a World Bank Office established.
   * Initialized to (number of rivals) when the first World Bank Office project
   * is completed. Decremented by each COMPLETE_PROJECT with id 'world_bank_office'.
   * When it reaches 0 → Economic Victory.
   *
   * Null/undefined = player has not started the World Bank chain yet.
   * Optional so existing PlayerState construction keeps compiling unchanged.
   */
  readonly worldBankOfficesRemaining?: number | null;

  // ── Z3.2: Dedicated milestone fields ──
  /**
   * Z3.2 (Cultural): Count of artifacts currently displayed in Museum buildings.
   * Used by Cultural Legacy Path predicates instead of the `culture` proxy.
   * Incremented when an artifact is placed in a Museum. Defaults to 0.
   * Optional so existing PlayerState construction keeps compiling unchanged.
   */
  readonly artifactsInMuseums?: number;

  /**
   * Z3.2 (Exploration): Points earned from settling or conquering Distant Lands tiles.
   * +1 each time the player founds a city on an isDistantLands hex.
   * Used by Exploration Military Legacy Path predicates.
   * Defaults to 0. Optional so existing PlayerState construction keeps compiling unchanged.
   */
  readonly distantLandPoints?: number;

  /**
   * Z3.2 (Religion): Count of relics currently displayed in Cathedral/Reliquary buildings.
   * Distinct from `relics` (which tracks acquired relics); this field tracks relics
   * actively contributing faith/culture yields via display.
   * Used by Exploration Culture Legacy Path predicates instead of the `faith` proxy.
   * Defaults to 0. Optional so existing PlayerState construction keeps compiling unchanged.
   */
  readonly relicsDisplayedCount?: number;

  /**
   * Z3.2 (Economic): Count of unique resources currently assigned to cities.
   * Incremented on ASSIGN_RESOURCE, decremented on UNASSIGN_RESOURCE.
   * Used by Economic Legacy Path predicates instead of the `totalGoldEarned` proxy.
   * Defaults to 0. Optional so existing PlayerState construction keeps compiling unchanged.
   */
  readonly resourcesAssigned?: number;

  // ── F-08: Civ unlock system ──
  /**
   * IDs of civilizations this player is allowed to pick on age transition.
   * When undefined, all civs for the target age are available (backward compat).
   * When set, only civs in this list (plus those unlocked via historicalPair)
   * can be chosen during TRANSITION_AGE.
   */
  readonly unlockedCivIds?: ReadonlyArray<string>;

  // ── F-05: Persona selection ──
  /**
   * The persona variant the player selected for their leader at game start.
   * Null when no persona was selected (base leader). Undefined for backward
   * compat with existing saves that predate the persona feature.
   */
  readonly personaId?: string | null;

  // ── F-06: Dark Age opt-in ──
  /**
   * Whether the player has opted into dark age effects on age transition.
   * - undefined: auto-apply dark ages (backward compat — current behavior)
   * - true: player explicitly chose to embrace dark age
   * - false: skip dark age effects entirely
   */
  readonly darkAgeOptIn?: boolean;

  // ── Z4: Counterespionage ──
  /**
   * Per-turn Influence drain committed to counterespionage (baseline 0).
   * Each turn this amount is deducted from the player's Influence; it reduces
   * the success probability of enemy espionage ops targeting this player.
   * Optional so existing PlayerState construction keeps compiling unchanged.
   */
  readonly counterespionageInfluence?: number;
  /**
   * Detection bonus applied to rolls against enemy espionage ops targeting this player.
   * Added to the base detection roll; higher values increase the chance that
   * an incoming op is marked detected = true. Optional for backward compat.
   */
  readonly counterespionageDetectionBonus?: number;
}

/**
 * Represents a pending growth-choice prompt produced when a city's population
 * grows. The player must either place an improvement (PLACE_IMPROVEMENT) or
 * assign a specialist (ASSIGN_SPECIALIST_FROM_GROWTH) to resolve it.
 *
 * F-12: extended with optional kind/improvementId/tileId for RESOLVE_GROWTH_CHOICE.
 */
export interface PendingGrowthChoice {
  readonly cityId: string;
  readonly triggeredOnTurn: number;
  /**
   * F-12: resolution kind chosen by the player.
   * "improvement" = build an improvement on tileId.
   * "specialist"  = assign a specialist to the city.
   * Absent on entries emitted before F-12 (backward compat).
   */
  readonly kind?: 'improvement' | 'specialist';
  /**
   * F-12: improvement to build (when kind === "improvement").
   * Derived from terrain + resource by the engine.
   */
  readonly improvementId?: string;
  /**
   * F-12: tile to build on (when kind === "improvement").
   */
  readonly tileId?: { readonly q: number; readonly r: number };
}

// ── Diplomacy ──

export type DiplomaticStatus = 'helpful' | 'friendly' | 'neutral' | 'unfriendly' | 'hostile' | 'war';

export interface DiplomaticEndeavor {
  readonly type: string;
  readonly turnsRemaining: number;
  readonly sourceId: string; // the player who initiated the endeavor (both players benefit)
}

export interface DiplomaticSanction {
  readonly type: string;
  readonly turnsRemaining: number;
  readonly targetId: string; // the player whose yields are penalized
}

/**
 * F-11: A single contributing modifier to the diplomatic relationship score.
 */
export interface OpinionModifier {
  readonly id: string;
  readonly value: number;
  readonly turnApplied: number;
  readonly turnExpires?: number;
  readonly reason: string;
}

export interface DiplomacyRelation {
  readonly status: DiplomaticStatus;
  readonly relationship: number;        // -100 to +100 drives status stage
  readonly warSupport: number;           // -100 to 100. Positive = attacker advantage, negative = defender advantage
  readonly turnsAtPeace: number;
  readonly turnsAtWar: number;
  readonly hasAlliance: boolean;         // alliance is now a modifier on top of 'helpful'
  readonly hasFriendship: boolean;       // friendship declaration
  readonly hasDenounced: boolean;        // active denouncement
  readonly warDeclarer: string | null;   // player who declared war (for surprise war tracking)
  readonly isSurpriseWar: boolean;       // true if war was declared without hostile relationship
  readonly activeEndeavors: ReadonlyArray<DiplomaticEndeavor>;
  readonly activeSanctions: ReadonlyArray<DiplomaticSanction>;
  /**
   * Y4.5 -- True when IMPOSE_EMBARGO has been dispatched by either party.
   * Blocks trade route creation regardless of relationship tier.
   * Optional so existing DiplomacyRelation construction keeps compiling.
   */
  readonly hasEmbargo?: boolean;
  /**
   * F-13: Peace cooldown — turn on which a new PROPOSE_PEACE between the
   * same pair is allowed again. Set to state.turn + 5 on REJECT_PEACE.
   * Optional so existing DiplomacyRelation construction keeps compiling.
   */
  readonly peaceCooldownUntilTurn?: number;
  /** F-11: Diplomatic Ledger. Optional so existing construction compiles. */
  readonly ledger?: ReadonlyArray<OpinionModifier>;
}

/**
 * F-13: A pending bilateral peace offer awaiting the target player's response.
 * Created by PROPOSE_PEACE; resolved by ACCEPT_PEACE or REJECT_PEACE.
 */
export interface PeaceOffer {
  readonly id: string;
  readonly proposerId: PlayerId;
  readonly targetId: PlayerId;
  readonly proposedOnTurn: number;
  /** Optional city/territory transfers included in the offer terms. */
  readonly terms?: {
    /** City ids the proposer offers to cede (if any). */
    readonly cityTransfers?: ReadonlyArray<CityId>;
  };
}

/**
 * F-04: A pending endeavor awaiting the target player's response.
 * Created by PROPOSE_ENDEAVOR; resolved by RESPOND_ENDEAVOR.
 */
export interface PendingEndeavor {
  readonly id: string;
  readonly sourceId: PlayerId;
  readonly targetId: PlayerId;
  readonly endeavorType: string;
  /** Influence cost already spent by the proposer (used for support-benefit calculation). */
  readonly influenceCost: number;
}

export interface DiplomacyState {
  readonly relations: ReadonlyMap<string, DiplomacyRelation>; // key: "p1:p2"

  /**
   * F-04: Pending endeavors awaiting target response. Optional so existing
   * DiplomacyState construction (engine, web, tests, save files) keeps
   * compiling unchanged. Systems treat absence as an empty array.
   */
  readonly pendingEndeavors?: ReadonlyArray<PendingEndeavor>;

  /**
   * ── Y5: Espionage (F-05 scaffold) ──
   *
   * All active, pending, and recently-resolved espionage operations across all
   * players. Optional so existing DiplomacyState construction (engine, web,
   * tests, save files) keeps compiling unchanged. Systems treat absence as
   * an empty array.
   */
  readonly activeEspionageOps?: ReadonlyArray<EspionageOperation>;

  /**
   * ── Y5: Treaties (F-06 scaffold) ──
   *
   * All treaty instances (pending, active, rejected, expired) across all
   * players. Optional so existing DiplomacyState construction (engine, web,
   * tests, save files) keeps compiling unchanged. Systems treat absence as
   * an empty array.
   */
  readonly activeTreaties?: ReadonlyArray<ActiveTreaty>;

  /**
   * F-13: Pending bilateral peace offers awaiting the target player's response.
   * Created by PROPOSE_PEACE; resolved by ACCEPT_PEACE or REJECT_PEACE.
   * Optional so existing DiplomacyState construction keeps compiling unchanged.
   */
  readonly pendingPeaceOffers?: ReadonlyArray<PeaceOffer>;
}

// ── Effects ──

export type EffectTarget = 'city' | 'empire' | 'unit' | 'tile';

/** Y2.1: Type of policy slot granted by a GRANT_POLICY_SLOT effect. */
export type PolicySlotType = 'military' | 'economic' | 'diplomatic' | 'wildcard';

export type EffectDef =
  | { readonly type: 'MODIFY_YIELD'; readonly target: EffectTarget; readonly yield: YieldType; readonly value: number }
  | { readonly type: 'MODIFY_COMBAT'; readonly target: UnitCategory | 'all'; readonly value: number }
  | { readonly type: 'GRANT_UNIT'; readonly unitId: string; readonly count: number }
  | { readonly type: 'UNLOCK_BUILDING'; readonly buildingId: BuildingId }
  | { readonly type: 'DISCOUNT_PRODUCTION'; readonly target: string; readonly percent: number }
  | { readonly type: 'MODIFY_MOVEMENT'; readonly target: UnitCategory | 'all'; readonly value: number }
  | { readonly type: 'FREE_TECH'; readonly techId: TechnologyId }
  | { readonly type: 'CULTURE_BOMB'; readonly range: number }
  | { readonly type: 'GRANT_POLICY_SLOT'; readonly slotType: PolicySlotType };

export interface ActiveEffect {
  readonly source: string; // e.g., "civ:rome", "leader:augustus"
  readonly effect: EffectDef;
}

// ── Victory ──

export type VictoryType = 'domination' | 'science' | 'culture' | 'economic' | 'military' | 'score';

export interface VictoryProgress {
  readonly type: VictoryType;
  readonly progress: number; // 0-1
  readonly achieved: boolean;
}

/**
 * Per-player Legacy Path progress, structurally compatible with
 * `LegacyProgress` exported from `state/LegacyPaths.ts`. Declared
 * structurally here (rather than imported) so that `types/` does not
 * reverse-depend on `state/` (LegacyPaths already imports GameState from
 * types/, which would otherwise create an import cycle).
 */
export interface VictoryLegacyProgressEntry {
  readonly axis: 'science' | 'culture' | 'military' | 'economic';
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly tiersCompleted: 0 | 1 | 2 | 3;
}

export interface VictoryState {
  readonly winner: PlayerId | null;
  readonly winType: VictoryType | null;
  readonly progress: ReadonlyMap<PlayerId, ReadonlyArray<VictoryProgress>>;
  /**
   * F-11: True when multiple players achieved a victory condition in the
   * same turn and the winner was resolved by tiebreak (highest
   * totalCareerLegacyPoints; insertion order on further ties).
   * Undefined / false for the common single-winner case.
   */
  readonly tied?: boolean;

  /**
   * ── M18: Legacy Path progress (optional) ──
   *
   * Populated by `victorySystem` at the end of every END_TURN tick that
   * runs victory checks (i.e. when the last player ends their turn).
   * Maps each player id to a 12-entry array (4 axes × 3 ages) describing
   * how many tiers of each legacy path that player has completed.
   *
   * Optional so pre-M18 saves migrate as `undefined` and existing
   * VictoryState construction (tests, save files, other systems) keeps
   * compiling unchanged. Consumers (UI) should treat `undefined` as
   * "no data yet — wait for the next END_TURN recomputation."
   */
  readonly legacyProgress?: ReadonlyMap<PlayerId, ReadonlyArray<VictoryLegacyProgressEntry>>;
}

// ── Trade Routes ──

export interface TradeRoute {
  readonly id: string;
  readonly from: CityId;         // home city of the route owner
  readonly to: CityId;           // foreign target city
  readonly owner: PlayerId;      // player who created the route
  /** Resources copied from the destination city to the origin owner each turn */
  readonly resources: ReadonlyArray<ResourceId>;
  /** True if this is a sea trade route (Trade Ship caravan); sea routes pay 2× gold */
  readonly isSea: boolean;
  /** UnitId of the stationary caravan/trade-ship unit at the destination */
  readonly caravanUnitId: string;
}

// ── Crisis ──

export interface CrisisState {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly turn: number; // turn it was triggered
  readonly choices: ReadonlyArray<CrisisChoice>;
  readonly resolvedBy: PlayerId | null;
  readonly choiceMade: string | null;

  // ── X5.2: 3-stage persistent crisis fields ──
  /**
   * Current stage of the crisis (1 = first warning at ~33% age progress,
   * 2 = escalation at ~66%, 3 = final at ~100%). Optional so existing
   * CrisisState construction keeps compiling unchanged.
   */
  readonly stage?: 1 | 2 | 3;
  /**
   * The turn on which the current stage started.
   * Optional so existing CrisisState construction keeps compiling unchanged.
   */
  readonly stageStartedTurn?: number;
  /**
   * Per-player crisis policy slots. Maps playerId → array of PolicyIds slotted
   * for this crisis. Optional so existing CrisisState construction keeps
   * compiling unchanged.
   */
  readonly slottedPolicies?: ReadonlyMap<string, ReadonlyArray<string>>;
  /**
   * When true, at least one player has not yet slotted their crisis policies.
   * END_TURN is blocked for the current player while pendingResolution is true
   * AND the player has not slotted policies. Optional so existing CrisisState
   * construction keeps compiling unchanged.
   */
  readonly pendingResolution?: boolean;
}

export interface CrisisChoice {
  readonly id: string;
  readonly text: string;
  readonly effects: ReadonlyArray<EffectDef>;
}

// ── Age ──

export interface AgeState {
  readonly currentAge: Age;
  readonly ageThresholds: { readonly exploration: number; readonly modern: number };
  /**
   * The crisis type selected for the current age via seeded RNG at age init.
   * Null until the first age init or TRANSITION_AGE has run.
   */
  readonly activeCrisisType?: string | null;
}

// ── RNG ──

export interface RngState {
  readonly seed: number;
  readonly counter: number;
}

// ── Codex ──

/**
 * AA5.1 / tech-tree F-08: A single cultural codex artifact produced when a
 * tech is researched while the player has a 'library' or 'museum' building in
 * any of their cities. Codices are stored globally in GameState.codices and
 * also tracked per-player via PlayerState.ownedCodices (existing field).
 */
export interface CodexState {
  /** Unique codex identifier (e.g. "codex-<techId>-<playerId>-<turn>") */
  readonly id: string;
  /** The player who earned this codex */
  readonly playerId: string;
  /** City housing the building that generated this codex */
  readonly cityId: string;
  /** The building that hosted the codex event ('library' or 'museum') */
  readonly buildingId: string;
  /** Turn on which the tech was researched and codex was generated */
  readonly addedTurn: number;
  /**
   * BB5.1: City id where this codex is currently displayed (placed in a building
   * with codexSlots). Undefined when the codex is unplaced (in the player's
   * collection but not yet assigned to a slot).
   */
  readonly placedInCityId?: string;
  /**
   * BB5.1: Building id where this codex is currently displayed.
   * Undefined when unplaced. Set together with placedInCityId by PLACE_CODEX.
   */
  readonly placedInBuildingId?: string;
}

// ── Independent Powers ──

/**
 * State for a single independent power (city-state / mercantile republic /
 * military outpost). Managed by `independentPowerSystem`.
 */
export interface IndependentPowerState {
  readonly id: string;
  readonly type: 'militaristic' | 'cultural' | 'scientific' | 'economic' | 'diplomatic' | 'expansionist';
  readonly attitude: 'neutral' | 'friendly' | 'hostile';
  readonly position: HexCoord;
  readonly befriendProgress: number;
  readonly suzerainPlayerId: string | null;
  readonly isIncorporated: boolean;
  readonly isCityState: boolean;
  readonly bonusPool: ReadonlyArray<string>;
}

// ── Full GameState ──

export interface GameState {
  readonly turn: number;
  readonly currentPlayerId: PlayerId;
  readonly phase: TurnPhase;
  readonly players: ReadonlyMap<PlayerId, PlayerState>;
  readonly map: HexMap;
  readonly units: ReadonlyMap<UnitId, UnitState>;
  readonly cities: ReadonlyMap<CityId, CityState>;
  readonly districts: ReadonlyMap<DistrictId, DistrictSlot>; // All placed districts on the map
  readonly governors: ReadonlyMap<GovernorId, Governor>; // All recruited governors
  readonly tradeRoutes: ReadonlyMap<string, TradeRoute>;
  readonly diplomacy: DiplomacyState;
  readonly age: AgeState;
  readonly builtWonders: ReadonlyArray<BuildingId>; // Global tracking of constructed world wonders
  readonly crises: ReadonlyArray<CrisisState>;
  readonly victory: VictoryState;
  readonly log: ReadonlyArray<GameEvent>;
  readonly rng: RngState;
  readonly config: GameConfig;
  readonly lastValidation: ValidationResult | null;

  /**
   * Per-player achievement unlock log. Optional so pre-achievement saves
   * and test helpers that don't populate it continue to compile; treat
   * absence as an empty map (no achievements unlocked yet).
   */
  readonly unlockedAchievements?: ReadonlyMap<PlayerId, ReadonlyArray<string>>;

  /**
   * ── Religion cycle E — optional runtime slot ──
   *
   * Optional so pre-religion saves migrate as `undefined` and existing
   * GameState construction (engine, web, tests, save files) keeps
   * compiling unchanged. The religionSystem lazily initializes this on
   * the first successful FOUND_RELIGION (or pantheon claim), so the
   * slot appears only once a player actually uses the mechanic.
   */
  readonly religion?: ReligionSlotState;

  /**
   * ── Independent Powers (city-states, outposts) ──
   *
   * Required with empty-Map default in createInitialState. Maps each
   * independent power id to its state.
   */
  readonly independentPowers: ReadonlyMap<string, IndependentPowerState>;

  /**
   * ── Narrative Events ──
   *
   * Optional dedup store and queue for the narrative-events system.
   * `firedNarrativeEvents` prevents the same event firing twice.
   * `pendingNarrativeEvents` is the ordered queue waiting to surface to UI.
   */
  readonly firedNarrativeEvents?: ReadonlyArray<string>;
  readonly pendingNarrativeEvents?: ReadonlyArray<string>;

  /**
   * ── Global Age Progress Meter ──
   *
   * A single shared counter tracking aggregate age-advance activity across
   * ALL players. Distinct from per-player `PlayerState.ageProgress`.
   * Used by the global age-transition UI bar.
   */
  readonly ageProgressMeter?: number;

  /**
   * ── F-01: Global age transition coordination ──
   *
   * Tracks simultaneous age transitions across all players.
   * - "none": no transition in progress
   * - "pending": one or more players have transitioned, waiting for all
   * - "in-progress": all players ready, transitions executing
   * - "complete": transitions done, clearing imminent
   *
   * Optional so pre-F-01 saves and test helpers keep compiling unchanged.
   */
  readonly transitionPhase?: 'none' | 'pending' | 'in-progress' | 'complete';

  /**
   * ── F-01: Player IDs that have completed their age transition this cycle ──
   *
   * Cleared (set to empty array) when all players have transitioned.
   * Optional so pre-F-01 saves and test helpers keep compiling unchanged.
   */
  readonly playersReadyToTransition?: ReadonlyArray<string>;

  /**
   * ── W4-04: Commander runtime state ──
   *
   * Maps commander UnitId → CommanderState. A unit is "a commander" iff
   * its id appears in this map. The decorator pattern avoids widening
   * UnitState for all units during the transition cycles.
   *
   * Optional so pre-W4-04 saves, test helpers, and GameInitializer
   * continue to compile. Systems treat absence as an empty Map (no
   * commanders registered yet). Age transitions intentionally preserve
   * this map — commanders persist across ages (F-08).
   */
  readonly commanders?: ReadonlyMap<string, CommanderState>;

  /**
   * ── Z4: Active espionage operations (F-05 state machine) ──
   *
   * Maps op id → EspionageOpState for all active (not-yet-resolved) operations.
   * Optional so existing GameState construction (tests, save files) compiles unchanged.
   * Systems treat absence as an empty Map (no active ops). The espionageSystem
   * manages create/tick/resolve/remove.
   */
  readonly espionageOps?: ReadonlyMap<string, EspionageOpState>;

  /**
   * ── AA5.1 / tech-tree F-08: Global codex registry ──
   *
   * Maps codex id → CodexState. Populated by researchSystem when a tech is
   * completed and the player has a city with a 'library' or 'museum' building.
   * Each entry represents the cultural artifact of a discovery.
   *
   * Optional so existing GameState construction (tests, save files) keeps
   * compiling unchanged. Systems treat absence as an empty Map.
   */
  readonly codices?: ReadonlyMap<string, CodexState>;
}

// ── Actions ──

export type DiplomacyProposal =
  | { readonly type: 'DECLARE_WAR'; readonly warType: 'formal' | 'surprise' }
  | { readonly type: 'PROPOSE_PEACE' }
  | { readonly type: 'PROPOSE_ALLIANCE' }
  | { readonly type: 'DENOUNCE' };

export type GameAction =
  | { readonly type: 'START_TURN' }
  | { readonly type: 'END_TURN' }
  | { readonly type: 'MOVE_UNIT'; readonly unitId: UnitId; readonly path: ReadonlyArray<HexCoord> }
  | { readonly type: 'ATTACK_UNIT'; readonly attackerId: UnitId; readonly targetId: UnitId }
  | { readonly type: 'ATTACK_CITY'; readonly attackerId: UnitId; readonly cityId: CityId }
  | {
      readonly type: 'ATTACK_DISTRICT';
      readonly attackerId: UnitId;
      readonly cityId: CityId;
      /** HexKey of the specific district tile being targeted (must be in city.districtHPs) */
      readonly districtTile: string;
    }
  | {
      readonly type: 'FOUND_CITY';
      readonly unitId: UnitId;
      readonly name: string;
      /**
       * Explicit founding type discriminant (F-01 VII-parity).
       * - 'founder': one-time use; creates a capital (city tier). Used when the player has no cities yet.
       * - 'settler': all subsequent settlements (always creates towns).
       * Optional for backward compatibility — if absent, the system falls back to
       * the existing isFirstCity detection (playerHasCity check).
       */
      readonly foundingType?: 'founder' | 'settler';
    }
  | { readonly type: 'SET_PRODUCTION'; readonly cityId: CityId; readonly itemId: string; readonly itemType: ProductionItem['type']; readonly tile?: HexCoord }
  | { readonly type: 'CANCEL_BUILDING_PLACEMENT'; readonly cityId: CityId }
  | { readonly type: 'PLACE_BUILDING'; readonly cityId: CityId; readonly buildingId: BuildingId; readonly tile: HexCoord }
  | { readonly type: 'SET_RESEARCH'; readonly techId: TechnologyId }
  | { readonly type: 'PROPOSE_DIPLOMACY'; readonly targetId: PlayerId; readonly proposal: DiplomacyProposal }
  // ── F-13: Bilateral peace resolution ──
  /** Accept a pending peace offer. Ends war and optionally applies city transfer terms. */
  | { readonly type: 'ACCEPT_PEACE'; readonly offerId: string }
  /** Reject a pending peace offer. Preserves war and starts a 5-turn peace cooldown. */
  | { readonly type: 'REJECT_PEACE'; readonly offerId: string }
  | { readonly type: 'TRANSITION_AGE'; readonly newCivId: CivilizationId }
  | { readonly type: 'RESOLVE_CRISIS'; readonly crisisId: string; readonly choice: string }
  | { readonly type: 'FORTIFY_UNIT'; readonly unitId: UnitId }
  | { readonly type: 'PURCHASE_TILE'; readonly cityId: CityId; readonly tile: HexCoord }
  | { readonly type: 'PROMOTE_UNIT'; readonly unitId: UnitId; readonly promotionId: string }
  | { readonly type: 'UPGRADE_SETTLEMENT'; readonly cityId: CityId }
  | { readonly type: 'PURCHASE_ITEM'; readonly cityId: CityId; readonly itemId: string; readonly itemType: 'unit' | 'building' }
  | { readonly type: 'REPAIR_BUILDING'; readonly cityId: CityId; readonly buildingId: BuildingId }
  | { readonly type: 'SET_CIVIC'; readonly civicId: string }
  | { readonly type: 'PROPOSE_ENDEAVOR'; readonly targetId: PlayerId; readonly endeavorType: string }
  | { readonly type: 'RESPOND_ENDEAVOR'; readonly endeavorId: string; readonly response: 'support' | 'accept' | 'reject' }
  | { readonly type: 'DIPLOMATIC_SANCTION'; readonly targetId: PlayerId; readonly sanctionType: string }
  | { readonly type: 'SET_MASTERY'; readonly techId: TechnologyId }
  | { readonly type: 'SET_CIVIC_MASTERY'; readonly civicId: string }
  | { readonly type: 'SET_SPECIALIZATION'; readonly cityId: CityId; readonly specialization: TownSpecialization }
  | {
      readonly type: 'ASSIGN_SPECIALIST';
      readonly cityId: CityId;
      /**
       * W3-02: target urban tile for per-tile spatial assignment.
       * When present, specialist is assigned to this specific tile and
       * specialistsByTile is updated. When absent, city-level increment only
       * (backward-compat path for legacy callers).
       */
      readonly tileId?: string;
      /**
       * F-07 (pop): typed specialist category for specialistsByType tracking.
       * When present, specialistsByType[specialistType] is incremented.
       * Optional so existing callers keep compiling unchanged.
       */
      readonly specialistType?: SpecialistType;
    }
  | {
      readonly type: 'UNASSIGN_SPECIALIST';
      readonly cityId: CityId;
      /**
       * W3-02: target urban tile for per-tile unassignment.
       * When present, specialist count on the tile is decremented.
       */
      readonly tileId?: string;
      /**
       * F-07 (pop): typed specialist category for specialistsByType tracking.
       * When present, specialistsByType[specialistType] is decremented.
       * Optional so existing callers keep compiling unchanged.
       */
      readonly specialistType?: SpecialistType;
    }
  | { readonly type: 'CREATE_TRADE_ROUTE'; readonly merchantId: UnitId; readonly targetCityId: CityId }
  | { readonly type: 'UPGRADE_DISTRICT'; readonly districtId: DistrictId }
  | { readonly type: 'RECRUIT_GOVERNOR'; readonly governorId: GovernorId }
  | { readonly type: 'ASSIGN_GOVERNOR'; readonly governorId: GovernorId; readonly cityId: CityId }
  | { readonly type: 'UNASSIGN_GOVERNOR'; readonly governorId: GovernorId }
  | { readonly type: 'PROMOTE_GOVERNOR'; readonly governorId: GovernorId; readonly abilityId: string }
  | { readonly type: 'SKIP_UNIT'; readonly unitId: UnitId }
  | { readonly type: 'DELETE_UNIT'; readonly unitId: UnitId }
  | { readonly type: 'UPGRADE_UNIT'; readonly unitId: UnitId }
  // ── M12 Integration: religion / government / urban building / commander ──
  | { readonly type: 'ADOPT_PANTHEON'; readonly playerId: PlayerId; readonly pantheonId: string }
  | {
      readonly type: 'FOUND_RELIGION';
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly religionName: string;
      readonly founderBelief: string;
      readonly followerBelief: string;
    }
  | { readonly type: 'SET_GOVERNMENT'; readonly playerId: PlayerId; readonly governmentId: string }
  /** Slot a policy into a flat wildcard slot by index (VII §14.2 — no per-category slots). */
  | { readonly type: 'SLOT_POLICY'; readonly playerId: PlayerId; readonly slotIndex: number; readonly policyId: string }
  /** Clear a flat wildcard slot by index (VII §14.2 — no per-category slots). */
  | { readonly type: 'UNSLOT_POLICY'; readonly playerId: PlayerId; readonly slotIndex: number }
  /** Select an ideology branch for the Modern age (requires political_theory civic). */
  | { readonly type: 'SELECT_IDEOLOGY'; readonly playerId: PlayerId; readonly ideology: 'democracy' | 'fascism' | 'communism' }
  | { readonly type: 'PLACE_URBAN_BUILDING'; readonly cityId: CityId; readonly tile: HexCoord; readonly buildingId: string }
  | { readonly type: 'GAIN_COMMANDER_XP'; readonly commanderId: UnitId; readonly amount: number }
  | { readonly type: 'PROMOTE_COMMANDER'; readonly commanderId: UnitId; readonly promotionId: string }
  // ── Resource Slot assignment (rulebook §13.3) ──
  | { readonly type: 'ASSIGN_RESOURCE'; readonly resourceId: ResourceId; readonly cityId: CityId; readonly playerId: PlayerId }
  | { readonly type: 'UNASSIGN_RESOURCE'; readonly resourceId: ResourceId; readonly cityId: CityId; readonly playerId: PlayerId }
  // ── Notification / event dismissal ──
  /** Marks a specific log event as dismissed so blocksTurn events no longer block END_TURN. */
  | { readonly type: 'DISMISS_EVENT'; readonly eventMessage: string; readonly eventTurn: number }
  // ── Trade route lifecycle ──
  | { readonly type: 'PLUNDER_TRADE_ROUTE'; readonly caravanUnitId: UnitId; readonly plundererId: UnitId }
  // ── Growth choice resolution (W2-01) ──
  /**
   * Player picks a tile in the named city; game derives improvement type from
   * terrain + resource combination (Civ VII: player picks tile, game picks type).
   * Clears the pendingGrowthChoice for the city.
   */
  | { readonly type: 'PLACE_IMPROVEMENT'; readonly cityId: string; readonly tile: HexCoord }
  /**
   * Player resolves a growth event by assigning a specialist instead of placing
   * an improvement. Increments city.specialists and clears the pending choice.
   * Full per-tile spatial model deferred to W3-02; for now city-level.
   */
  | { readonly type: 'ASSIGN_SPECIALIST_FROM_GROWTH'; readonly cityId: string }
  /**
   * F-12: Combined growth-choice resolution action.
   * - kind === "improvement": builds improvementId (or derives it) on tileId.
   * - kind === "specialist": assigns a specialist to the city (city-level).
   * Clears the pending growth choice for cityId on success.
   */
  | {
      readonly type: 'RESOLVE_GROWTH_CHOICE';
      readonly cityId: string;
      readonly kind: 'improvement' | 'specialist';
      readonly improvementId?: string;
      readonly tileId?: HexCoord;
    }
  // ── Crisis phase (W2-05 / X5.2) ──
  /**
   * Append a policy to the current player's crisis policy slot list.
   * Blocked if: player has no active crisisPhase, if policyId already present,
   * or if crisisPolicies.length >= crisisPolicySlots.
   */
  | { readonly type: 'FORCE_CRISIS_POLICY'; readonly policyId: string }
  /**
   * X5.2: Slot a policy for the named 3-stage crisis.
   * Records the policy under state.crises[i].slottedPolicies[playerId].
   * Clears pendingResolution for this player once their required count is met.
   */
  | { readonly type: 'SLOT_CRISIS_POLICY'; readonly playerId: PlayerId; readonly crisisId: string; readonly policyId: string }
  // ── Independent Powers (W3-04) ──
  /** Spend influence to make progress toward suzerainty over an IP. */
  | { readonly type: 'BEFRIEND_INDEPENDENT'; readonly ipId: string; readonly influenceSpent: number }
  /** Add additional befriend acceleration (e.g. policy bonus). */
  | { readonly type: 'ADD_SUPPORT'; readonly ipId: string; readonly influenceSpent: number }
  /** Direct a hostile/neutral IP to raid a rival player for 1 turn (costs 30 Influence). */
  | { readonly type: 'INCITE_RAID'; readonly targetIpId: string; readonly againstPlayerId: string; readonly influenceSpent: number }
  /** Suzerain only: spend influence to reinforce an IP's military. */
  | { readonly type: 'BOLSTER_MILITARY'; readonly ipId: string; readonly influenceSpent: number }
  /** Suzerain only: spend influence to grow an IP's economy. */
  | { readonly type: 'PROMOTE_GROWTH'; readonly ipId: string; readonly influenceSpent: number }
  /** Suzerain only: conscript a unit from an IP (removes from IP pool). */
  | { readonly type: 'LEVY_UNIT'; readonly ipId: string }
  /** Convert an IP to a player-owned town (costs 240/480/720 influence by age). */
  | { readonly type: 'INCORPORATE'; readonly ipId: string; readonly influenceSpent: number }
  /** Permanently disband an IP without incorporating it. */
  | { readonly type: 'DISPERSE'; readonly ipId: string; readonly influenceSpent: number }
  /** Player selects a suzerain bonus from the IP bonus pool after gaining suzerainty. */
  | { readonly type: 'SUZERAIN_BONUS_SELECTED'; readonly ipId: string; readonly bonusId: string }
  // ── Legends / cross-session meta-progression (W3-06) ──
  /**
   * Internal action emitted by the web layer when a Foundation or Leader
   * challenge is completed. NOT dispatched through the engine pipeline —
   * the engine pipeline passes it through unchanged. Used by the web layer
   * to update AccountState after legendsSystem evaluation.
   */
  | {
      readonly type: 'CHALLENGE_COMPLETED';
      readonly challengeId: string;
      readonly playerId: string;
      readonly xpGained: number;
      /** 'foundation' = Foundation Challenge; a leaderId = Leader Challenge */
      readonly challengeKind: 'foundation' | string;
    }
  // ── Narrative Events (W3-05) ──
  /**
   * Resolve a pending narrative event by choosing one of its options.
   * eventId: the NarrativeEventDef id from pendingNarrativeEvents queue.
   * choiceIndex: 0-based index into NarrativeEventDef.choices.
   */
  | { readonly type: 'RESOLVE_NARRATIVE_EVENT'; readonly eventId: string; readonly choiceIndex: number }
  // ── Leader Attribute Tree (W3-07) ──
  /**
   * Award an attribute point to a player.
   * When isWildcard is true, awards a wildcard attribute point instead.
   * Attribute points (and spent node unlocks) persist across age transitions.
   */
  | { readonly type: 'EARN_ATTRIBUTE_POINT'; readonly playerId: PlayerId; readonly isWildcard: boolean }
  /**
   * Spend attribute point(s) to unlock a node in a leader's attribute tree.
   * Validates: node exists in config, player has sufficient points, all
   * prerequisites are unlocked. Prefers spending non-wildcard points first.
   * On success, the node effect is appended to player.legacyBonuses.
   */
  | { readonly type: 'SPEND_ATTRIBUTE_POINT'; readonly playerId: PlayerId; readonly nodeId: string }
  // ── W7: Relic earn path ──
  /**
   * Award a relic to a player. Validates:
   * - relicId exists in state.config.relics
   * - player does not already own this relic (no duplicates)
   * On success: appends relicId to player.relics.
   * Triggered by FOUND_RELIGION (starting relic) and future missionary defeat (W8).
   */
  | { readonly type: 'EARN_RELIC'; readonly playerId: string; readonly relicId: string }
  // ── Celebrations (W3-03) ──
  /**
   * Player resolves a pending celebration choice by picking one of the two
   * bonus options from their current government. Blocked if the player has no
   * pendingCelebrationChoice. Unblocks END_TURN once applied.
   */
  | { readonly type: 'PICK_CELEBRATION_BONUS'; readonly playerId: PlayerId; readonly bonusId: string }
  // ── Codex System (W3-08) ──
  /**
   * Display a codex in a building's codex slot. Contributes +2 science per
   * turn. Blocked if: building has no codexSlots, city doesn't own building,
   * or slot count is already full.
   */
  | { readonly type: 'PLACE_CODEX'; readonly codexId: string; readonly buildingId: BuildingId; readonly cityId: CityId }
  // ── W4-04: Commander army pack/unpack ──
  /**
   * Pack up to 6 units adjacent to the commander into the army stack.
   * Validates: commander exists, all unitIds are adjacent, all are owned by
   * the same player, and total ≤ 6. Sets packedInCommanderId on each unit.
   */
  | { readonly type: 'ASSEMBLE_ARMY'; readonly commanderId: string; readonly unitIds: ReadonlyArray<string> }
  /**
   * Unpack the commander's army: place each packed unit on an adjacent tile.
   * Clears packedInCommanderId on each unit.
   */
  | { readonly type: 'DEPLOY_ARMY'; readonly commanderId: string }
  // ── X4.1: Commander PACK/UNPACK (remove-from-map semantics, cap 6) ──
  /**
   * Pack up to 6 units adjacent to the commander into the army stack.
   * Unlike ASSEMBLE_ARMY (which marks units with packedInCommanderId),
   * PACK_ARMY physically removes the units from state.units and stores
   * their IDs in CommanderState.attachedUnits.
   * Validates: commander exists, all unitIds adjacent, all owned by same player,
   * count ≤ 6, none already packed in a different commander.
   */
  | { readonly type: 'PACK_ARMY'; readonly commanderId: UnitId; readonly unitsToPack: ReadonlyArray<UnitId> }
  /**
   * Unpack the commander's army: restore packed units from CommanderState.attachedUnits
   * back into state.units at the commander's hex or adjacent tiles.
   * Validates: commander exists, is packed, at least one adjacent or own hex has room.
   */
  | { readonly type: 'UNPACK_ARMY'; readonly commanderId: UnitId }
  // ── W5-01: Modern Victory Projects ──
  /**
   * Complete a project in a city (or, for 0-cost projects like World Bank Office,
   * dispatch directly). Validates:
   * - projectId exists in config.projects
   * - player has researched requiredTech (if any)
   * - player.completedProjects includes requiredProject (if any)
   * - city has requiredBuilding (if any; for production-based projects)
   * - player.ideologyPoints >= requiredIdeologyPoints
   *
   * On success: appends projectId to player.completedProjects, awards effects,
   * increments spaceMilestonesComplete when isSpaceMilestone, and decrements
   * worldBankOfficesRemaining when id === 'world_bank_office'.
   */
  | { readonly type: 'COMPLETE_PROJECT'; readonly playerId: string; readonly projectId: string; readonly cityId?: string }
  // ── Y5: Espionage (F-05 scaffold) ──
  /**
   * Initiate a covert espionage operation against another player.
   * Validates: target exists, actionId is known, player has sufficient influence.
   * On success: creates an EspionageOperation appended to diplomacy.activeEspionageOps.
   */
  | { readonly type: 'INITIATE_ESPIONAGE'; readonly targetPlayerId: PlayerId; readonly actionId: string; readonly influenceSpent: number }
  /**
   * Target player spends influence to counter an in-progress operation.
   * Validates: opId exists and targets the current player, player has sufficient influence.
   * On success: increases counterInfluence on the operation, raising effective detection chance.
   */
  | { readonly type: 'COUNTER_ESPIONAGE'; readonly opId: string; readonly counterInfluence: number }
  /**
   * Z4: Cancel an in-progress espionage operation dispatched by the current player.
   * Validates: opId exists in state.espionageOps, attackerPlayerId === currentPlayerId.
   * On success: removes the op from state.espionageOps.
   */
  | { readonly type: 'CANCEL_ESPIONAGE'; readonly opId: string }
  // ── Y5: Treaties (F-06 scaffold) ──
  /**
   * Propose a treaty to another player.
   * Validates: treatyId is known, target exists, player has sufficient influence.
   * On success: creates an ActiveTreaty with status 'pending' in diplomacy.activeTreaties.
   */
  | { readonly type: 'PROPOSE_TREATY'; readonly targetPlayerId: PlayerId; readonly treatyId: string; readonly influenceSpent: number }
  /**
   * Accept a pending treaty proposed to the current player.
   * Validates: treatyId exists and targets the current player.
   * On success: status transitions to 'active', activeSinceTurn is set.
   */
  | { readonly type: 'ACCEPT_TREATY'; readonly treatyId: string }
  /**
   * Reject a pending treaty proposed to the current player.
   * Validates: treatyId exists and targets the current player.
   * On success: status transitions to 'rejected'.
   */
  | { readonly type: 'REJECT_TREATY'; readonly treatyId: string }
  // ── W5-02: Explorer Artifact Excavation ──
  /**
   * Explorer unit excavates an artifact site on an adjacent or occupied tile.
   * Validates:
   * - unitId exists and is an Explorer (typeId === 'explorer')
   * - unit owner is the current player
   * - tile at the given coord has hasArtifactSite === true
   * - unit has movementLeft > 0 (costs 1 movement / ends turn)
   *
   * On success:
   * - player.artifactsCollected incremented by 1
   * - tile.hasArtifactSite cleared (set to false)
   * - unit movement consumed (movementLeft = 0)
   */
  | { readonly type: 'EXCAVATE_ARTIFACT'; readonly unitId: UnitId; readonly tile: HexCoord }
  // ── F-04: Legacy bonus selection ──
  /**
   * Player picks legacy bonuses from pendingLegacyBonuses (max 2).
   * `picks` contains bonusIds from pending entries.
   * On success: chosen effects appended to legacyBonuses, pendingLegacyBonuses cleared.
   */
  | { readonly type: 'CHOOSE_LEGACY_BONUSES'; readonly picks: readonly string[] }
  // ── F-08: Missionary spread religion ──
  /**
   * Missionary unit spreads the owner's founded religion to a target city.
   * Validates: unit exists and has spread_religion ability, target city exists
   * and is within spread range (distance <= 1), owner has founded a religion,
   * unit has spreadsRemaining > 0.
   * On success: city.religionId = owner's religion id, unit.spreadsRemaining decremented.
   */
  | { readonly type: 'SPREAD_RELIGION'; readonly unitId: UnitId; readonly targetCityId: CityId }
  // ── F-06: Dark Age opt-in ──
  | { readonly type: 'CHOOSE_DARK_AGE'; readonly optIn: boolean }
  // ── legacy-paths F-05: explicit Golden Age axis selection (1 per transition) ──
  /**
   * Player explicitly selects which legacy axis triggers their Golden Age bonus
   * at the upcoming age transition. Must be dispatched before TRANSITION_AGE.
   *
   * Validates:
   * - Player's legacyPaths[axis] === 3 (only tier-3 axes qualify).
   * - goldenAgeChosen is null for this player (no duplicate selection).
   * On success: sets player.goldenAgeChosen = axis.
   * Rejected silently (state unchanged) if already chosen or axis not at tier 3.
   */
  | { readonly type: 'CHOOSE_GOLDEN_AGE_AXIS'; readonly axis: 'military' | 'economic' | 'science' | 'culture' }
  // ── EE5.2: Discovery tile mechanic ──
  /**
   * A unit explicitly explores a discovery tile, applying its reward immediately
   * and clearing the tile so it cannot be re-explored.
   *
   * Validates:
   * - unitId exists and is owned by the current player
   * - tile at (tileQ, tileR) has a discoveryId
   * - the discoveryId maps to a DiscoveryDef in state.config.discoveries
   * - the DiscoveryDef has a reward field
   *
   * On success:
   * - reward is applied to the current player (gold/science/culture incremented,
   *   or a unit is spawned at the tile for reward.type === 'unit')
   * - tile.discoveryId is cleared (set to null)
   */
  | {
      readonly type: 'EXPLORE_DISCOVERY';
      readonly unitId: UnitId;
      readonly tileQ: number;
      readonly tileR: number;
    }
  // ── Y4: Influence-cost diplomatic actions ──
  /**
   * Y4.5 -- Denounce a player: costs 5 Influence, relationship -20.
   */
  | { readonly type: 'DENOUNCE_PLAYER'; readonly targetPlayerId: PlayerId }
  /**
   * Y4.5 -- Declare friendship: costs 5 Influence, relationship +10.
   */
  | { readonly type: 'DECLARE_FRIENDSHIP'; readonly targetPlayerId: PlayerId }
  /**
   * Y4.5 -- Impose embargo: costs 10 Influence, blocks trade routes.
   */
  | { readonly type: 'IMPOSE_EMBARGO'; readonly targetPlayerId: PlayerId };

// ── Events ──

export type GameEventSeverity = 'info' | 'warning' | 'critical';

export interface GameEvent {
  readonly turn: number;
  readonly playerId: PlayerId;
  readonly message: string;
  readonly type: 'move' | 'combat' | 'city' | 'research' | 'civic' | 'diplomacy' | 'age' | 'crisis' | 'victory' | 'production' | 'legacy';
  /**
   * Severity level for notification filtering.
   * - 'info': routine events, shown briefly and de-duped
   * - 'warning': notable events worth attention (tech complete, wonder built by rival, ally offer)
   * - 'critical': player-action required (surprise war, city capture, crisis, unit death, barbarian near capital)
   * Defaults to 'info' when omitted.
   */
  readonly severity?: GameEventSeverity;
  /**
   * When true, the turn system refuses END_TURN until this event is dismissed.
   * Used for critical events that require acknowledgement before proceeding.
   */
  readonly blocksTurn?: boolean;
  /**
   * Set to true when the player has acknowledged this event (via DISMISS_EVENT action).
   * The turn blocker clears once all blocksTurn events on the current turn are dismissed.
   */
  readonly dismissed?: boolean;
  /**
   * Phase 5: content-domain category for structured notification rendering.
   * When absent the web layer falls back to the `info` category sink.
   * Populated at the site where the log event is emitted (in each system).
   */
  readonly category?: NotificationCategory;
  /**
   * Phase 5: hint to the web layer about which panel to open when this
   * notification is clicked. Uses `NotificationPanelTargetHint` (not `PanelId`)
   * to keep the engine DOM-free. The web layer narrows this to `PanelId`.
   */
  readonly panelTarget?: NotificationPanelTargetHint;
}

// ── Validation ──

export type ValidationErrorCategory = 'movement' | 'combat' | 'production' | 'general';

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string; readonly category: ValidationErrorCategory };

// ── System type ──

export type System = (state: GameState, action: GameAction) => GameState;
