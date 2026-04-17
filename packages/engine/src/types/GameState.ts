import type { HexCoord, HexKey } from './HexCoord';
import type { GameConfig } from './GameConfig';
import type { PlayerId, UnitId, CityId, CivilizationId, LeaderId, TechnologyId, BuildingId, ResourceId, ImprovementId, DistrictId, GovernorId } from './Ids';
import type { YieldSet, YieldType } from './Yields';
import type { TerrainId, FeatureId } from './Terrain';
import type { DistrictSlot } from './District';
import type { Governor } from './Governor';
import type { UrbanTileV2, RuralTileV2, QuarterV2 } from './DistrictOverhaul';
import type { ReligionSlotState } from './Religion';

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
  readonly specialists: number;    // population assigned as specialists (each: +2 sci, +2 culture, -1 happiness)
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
  readonly slottedPolicies?: ReadonlyMap<string, ReadonlyArray<string | null>>;
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

export type VictoryType = 'domination' | 'science' | 'culture' | 'diplomacy' | 'economic' | 'military' | 'score';

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
  readonly turnsRemaining: number;
  readonly goldPerTurn: number;
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
}

// ── RNG ──

export interface RngState {
  readonly seed: number;
  readonly counter: number;
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
  | { readonly type: 'FOUND_CITY'; readonly unitId: UnitId; readonly name: string }
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
  | { readonly type: 'ASSIGN_SPECIALIST'; readonly cityId: CityId }
  | { readonly type: 'UNASSIGN_SPECIALIST'; readonly cityId: CityId }
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
  | { readonly type: 'SLOT_POLICY'; readonly playerId: PlayerId; readonly category: 'military' | 'economic' | 'diplomatic' | 'wildcard'; readonly slotIndex: number; readonly policyId: string }
  | { readonly type: 'UNSLOT_POLICY'; readonly playerId: PlayerId; readonly category: 'military' | 'economic' | 'diplomatic' | 'wildcard'; readonly slotIndex: number }
  | { readonly type: 'PLACE_URBAN_BUILDING'; readonly cityId: CityId; readonly tile: HexCoord; readonly buildingId: string }
  | { readonly type: 'GAIN_COMMANDER_XP'; readonly commanderId: UnitId; readonly amount: number }
  | { readonly type: 'PROMOTE_COMMANDER'; readonly commanderId: UnitId; readonly promotionId: string }
  // ── Resource Slot assignment (rulebook §13.3) ──
  | { readonly type: 'ASSIGN_RESOURCE'; readonly resourceId: ResourceId; readonly cityId: CityId; readonly playerId: PlayerId }
  | { readonly type: 'UNASSIGN_RESOURCE'; readonly resourceId: ResourceId; readonly cityId: CityId; readonly playerId: PlayerId }
  // ── Notification / event dismissal ──
  /** Marks a specific log event as dismissed so blocksTurn events no longer block END_TURN. */
  | { readonly type: 'DISMISS_EVENT'; readonly eventMessage: string; readonly eventTurn: number };

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
}

// ── Validation ──

export type ValidationErrorCategory = 'movement' | 'combat' | 'production' | 'general';

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: string; readonly category: ValidationErrorCategory };

// ── System type ──

export type System = (state: GameState, action: GameAction) => GameState;
