import type { HexCoord, HexKey } from './HexCoord';
import type { GameConfig } from './GameConfig';
import type { PlayerId, UnitId, CityId, CivilizationId, LeaderId, TechnologyId, BuildingId, ResourceId } from './Ids';
import type { YieldSet, YieldType } from './Yields';
import type { TerrainId, FeatureId } from './Terrain';

// ── Turn ──

export type TurnPhase = 'start' | 'actions' | 'end';
export type Age = 'antiquity' | 'exploration' | 'modern';

// ── Map ──

export interface HexTile {
  readonly coord: HexCoord;
  readonly terrain: TerrainId;
  readonly feature: FeatureId | null;
  readonly resource: ResourceId | null;
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
}

export interface ProductionItem {
  readonly type: 'unit' | 'building' | 'wonder';
  readonly id: string;
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

export interface VictoryState {
  readonly winner: PlayerId | null;
  readonly winType: VictoryType | null;
  readonly progress: ReadonlyMap<PlayerId, ReadonlyArray<VictoryProgress>>;
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
  readonly diplomacy: DiplomacyState;
  readonly age: AgeState;
  readonly crises: ReadonlyArray<CrisisState>;
  readonly victory: VictoryState;
  readonly log: ReadonlyArray<GameEvent>;
  readonly rng: RngState;
  readonly config: GameConfig;
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
  | { readonly type: 'SET_PRODUCTION'; readonly cityId: CityId; readonly itemId: string; readonly itemType: ProductionItem['type'] }
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
  | { readonly type: 'DIPLOMATIC_SANCTION'; readonly targetId: PlayerId; readonly sanctionType: string };

// ── Events ──

export interface GameEvent {
  readonly turn: number;
  readonly playerId: PlayerId;
  readonly message: string;
  readonly type: 'move' | 'combat' | 'city' | 'research' | 'civic' | 'diplomacy' | 'age' | 'crisis' | 'victory' | 'production' | 'legacy';
}

// ── System type ──

export type System = (state: GameState, action: GameAction) => GameState;
