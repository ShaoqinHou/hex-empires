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
}

export interface HexMap {
  readonly width: number;
  readonly height: number;
  readonly tiles: ReadonlyMap<HexKey, HexTile>;
  readonly wrapX: boolean; // cylindrical wrapping
}

// ── Units ──

export type UnitCategory = 'melee' | 'ranged' | 'siege' | 'cavalry' | 'naval' | 'civilian' | 'religious';

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
}

// ── Cities ──

export type SettlementType = 'town' | 'city';

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

export interface CityState {
  readonly id: CityId;
  readonly name: string;
  readonly owner: PlayerId;
  readonly position: HexCoord;
  readonly population: number;
  readonly food: number;           // accumulated food toward next pop
  readonly productionQueue: ReadonlyArray<ProductionItem>;
  readonly productionProgress: number; // accumulated production on current item
  readonly buildings: ReadonlyArray<BuildingId>;
  readonly territory: ReadonlyArray<HexKey>; // owned hex keys
  readonly settlementType: SettlementType;
  readonly happiness: number;
  readonly isCapital: boolean;
  readonly defenseHP: number;      // city defense hit points (100 base, +100 with walls)
  readonly specialization: TownSpecialization | null; // towns only, requires pop >= 7
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
   * See `.claude/workflow/design/districts-overhaul.md` for the rollout plan
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
  /** True if this settlement occupies an Urban tile slot in the V2 district model */
  readonly isUrban?: boolean;

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
}

/**
 * Represents a pending growth-choice prompt produced when a city's population
 * grows. The player must either place an improvement (PLACE_IMPROVEMENT) or
 * assign a specialist (ASSIGN_SPECIALIST_FROM_GROWTH) to resolve it.
 */
export interface PendingGrowthChoice {
  readonly cityId: string;
  readonly triggeredOnTurn: number;
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
}

export interface DiplomacyState {
  readonly relations: ReadonlyMap<string, DiplomacyRelation>; // key: "p1:p2"
}

// ── Effects ──

export type EffectTarget = 'city' | 'empire' | 'unit' | 'tile';

export type EffectDef =
  | { readonly type: 'MODIFY_YIELD'; readonly target: EffectTarget; readonly yield: YieldType; readonly value: number }
  | { readonly type: 'MODIFY_COMBAT'; readonly target: UnitCategory | 'all'; readonly value: number }
  | { readonly type: 'GRANT_UNIT'; readonly unitId: string; readonly count: number }
  | { readonly type: 'UNLOCK_BUILDING'; readonly buildingId: BuildingId }
  | { readonly type: 'DISCOUNT_PRODUCTION'; readonly target: string; readonly percent: number }
  | { readonly type: 'MODIFY_MOVEMENT'; readonly target: UnitCategory | 'all'; readonly value: number }
  | { readonly type: 'FREE_TECH'; readonly techId: TechnologyId }
  | { readonly type: 'CULTURE_BOMB'; readonly range: number };

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
   * Optional so pre-independent-powers saves migrate as `undefined`.
   * Populated by `independentPowerSystem` at game-init or on first
   * relevant action. Maps each independent power id to its state.
   */
  readonly independentPowers?: ReadonlyMap<string, IndependentPowerState>;

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
}

// ── Actions ──

export type DiplomacyProposal =
  | { readonly type: 'DECLARE_WAR'; readonly warType: 'formal' | 'surprise' }
  | { readonly type: 'PROPOSE_PEACE' }
  | { readonly type: 'PROPOSE_ALLIANCE' }
  | { readonly type: 'PROPOSE_FRIENDSHIP' }
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
  | { readonly type: 'PLACE_DISTRICT'; readonly cityId: CityId; readonly districtId: DistrictId; readonly tile: HexCoord }
  | { readonly type: 'SET_RESEARCH'; readonly techId: TechnologyId }
  | { readonly type: 'PROPOSE_DIPLOMACY'; readonly targetId: PlayerId; readonly proposal: DiplomacyProposal }
  | { readonly type: 'TRANSITION_AGE'; readonly newCivId: CivilizationId }
  | { readonly type: 'RESOLVE_CRISIS'; readonly crisisId: string; readonly choice: string }
  | { readonly type: 'FORTIFY_UNIT'; readonly unitId: UnitId }
  | { readonly type: 'PURCHASE_TILE'; readonly cityId: CityId; readonly tile: HexCoord }
  | { readonly type: 'PROMOTE_UNIT'; readonly unitId: UnitId; readonly promotionId: string }
  | { readonly type: 'UPGRADE_SETTLEMENT'; readonly cityId: CityId }
  | { readonly type: 'PURCHASE_ITEM'; readonly cityId: CityId; readonly itemId: string; readonly itemType: 'unit' | 'building' }
  | { readonly type: 'SET_CIVIC'; readonly civicId: string }
  | { readonly type: 'DIPLOMATIC_ENDEAVOR'; readonly targetId: PlayerId; readonly endeavorType: string }
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
    }
  | {
      readonly type: 'UNASSIGN_SPECIALIST';
      readonly cityId: CityId;
      /**
       * W3-02: target urban tile for per-tile unassignment.
       * When present, specialist count on the tile is decremented.
       */
      readonly tileId?: string;
    }
  | { readonly type: 'CREATE_TRADE_ROUTE'; readonly merchantId: UnitId; readonly targetCityId: CityId }
  | { readonly type: 'BUILD_IMPROVEMENT'; readonly unitId: UnitId; readonly tile: HexCoord; readonly improvementId: string }
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
  // ── Crisis phase (W2-05) ──
  /**
   * Append a policy to the current player's crisis policy slot list.
   * Blocked if: player has no active crisisPhase, if policyId already present,
   * or if crisisPolicies.length >= crisisPolicySlots.
   */
  | { readonly type: 'FORCE_CRISIS_POLICY'; readonly policyId: string }
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
  | { readonly type: 'DEPLOY_ARMY'; readonly commanderId: string };

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
