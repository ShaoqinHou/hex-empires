import type { GameState, HexCoord, ActiveEffect } from '../types';
import { coordToKey, neighbors, generateMap, createTerrainRegistries } from '../hex';
import { ALL_BASE_TERRAINS, ALL_FEATURES } from '../data/terrains';
import { createGameConfig } from './GameConfigFactory';
import type { AccountState } from '../types/AccountState';
import { foundationMementoSlots } from '../types/AccountState';
import { applyEquippedMementos, filterValidMementos } from './MementoApply';

export interface GameSetupConfig {
  civId: string;
  leaderId: string;
  mapWidth: number;
  mapHeight: number;
  numAI: number;
  /** Memento IDs to equip for this game run (validated against account). */
  equippedMementos?: ReadonlyArray<string>;
}

// AI civilization/leader pool (different from player defaults)
const AI_CIVS = ['greece', 'egypt', 'persia', 'india', 'china', 'rome'];
const AI_LEADERS = ['pericles', 'cleopatra', 'cyrus', 'gandhi', 'qin_shi_huang', 'alexander', 'hatshepsut', 'genghis_khan', 'augustus'];

export function createInitialState(config: GameSetupConfig, seed?: number, account?: AccountState): GameState {
  const gameSeed = seed ?? Date.now();
  const { terrainRegistry } = createTerrainRegistries(ALL_BASE_TERRAINS, ALL_FEATURES);

  const { mapWidth, mapHeight, civId, leaderId, numAI } = config;
  const rowMargin = Math.floor(mapHeight * 0.13);

  const map = generateMap(
    terrainRegistry,
    createTerrainRegistries(ALL_BASE_TERRAINS, ALL_FEATURES).featureRegistry,
    { width: mapWidth, height: mapHeight, seed: gameSeed, waterRatio: 0.35, wrapX: false },
  );

  const playerId = 'player1';

  // Find land tiles away from edges for start positions
  const landTiles = [...map.tiles.values()].filter(tile => {
    const t = terrainRegistry.get(tile.terrain);
    return t && !t.isWater && tile.feature !== 'mountains' && tile.feature !== 'marsh'
      && tile.coord.r > rowMargin && tile.coord.r < mapHeight - rowMargin;
  });

  const startCoord = landTiles[0]?.coord ?? { q: Math.floor(mapWidth * 0.25), r: Math.floor(mapHeight * 0.5) };

  const makePlayer = (id: string, name: string, isHuman: boolean, pCivId: string, pLeaderId: string) => ({
    id, name, isHuman, civilizationId: pCivId, leaderId: pLeaderId,
    age: 'antiquity' as const,
    researchedTechs: [] as string[],
    currentResearch: null,
    researchProgress: 0,
    researchedCivics: [] as string[],
    currentCivic: null as string | null,
    civicProgress: 0,
    // Starting Influence pool lets a fresh civ execute opening diplomacy
    // (endeavors, sanctions, or a surprise war) — M28's action costs
    // (100/200 for formal/surprise war) would otherwise block every
    // turn-1 action. 200 covers one surprise war or two formal actions.
    gold: 100, science: 0, culture: 0, faith: 0, influence: 200,
    ageProgress: 0,
    legacyBonuses: [] as ActiveEffect[],
    legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
    legacyPoints: 0,
    totalKills: 0,
    totalGoldEarned: 0,
    visibility: new Set<string>(),
    explored: new Set<string>(),
    celebrationCount: 0,
    celebrationBonus: 0,
    celebrationTurnsLeft: 0,
    masteredTechs: [] as string[],
    currentMastery: null as string | null,
    masteryProgress: 0,
    masteredCivics: [] as string[],
    currentCivicMastery: null as string | null,
    civicMasteryProgress: 0,
    governors: [] as string[],
    // W1-A: new PlayerState fields — safe defaults
    narrativeTags: [] as string[],
    globalHappiness: 0,
    socialPolicySlots: 0,
    traditions: [] as string[],
    ideology: null as null,
    suzerainties: [] as string[],
    suzerainBonuses: new Map<string, string>(),
    equippedMementos: [] as string[],
    ideologyPoints: 0,
    railroadTycoonPoints: 0,
    artifactsCollected: 0,
    spaceMilestonesComplete: 0,
    attributePoints: 0,
    attributeTree: {} as Record<string, string[]>,
    wildcardAttributePoints: 0,
    totalCareerLegacyPoints: 0,
    legacyPointsByAxis: { military: 0, economic: 0, science: 0, culture: 0 } as Record<'military' | 'economic' | 'science' | 'culture', number>,
    nextAgeTechBoost: null as string | null,
    crisisLegacyUnlocked: false,
    policySwapWindowOpen: false,
    governmentLockedForAge: false,
  });

  const makeUnit = (id: string, typeId: string, owner: string, pos: HexCoord, movement: number) => ({
    id, typeId, owner, position: pos,
    movementLeft: movement, health: 100, experience: 0,
    promotions: [] as string[], fortified: false,
  });

  // Find valid adjacent tiles for placing starting units near a position
  const findNearbyLandTiles = (center: HexCoord, count: number): HexCoord[] => {
    const result: HexCoord[] = [];
    const adjacentHexes = neighbors(center);
    for (const hex of adjacentHexes) {
      const key = coordToKey(hex);
      const tile = map.tiles.get(key);
      if (tile) {
        const t = terrainRegistry.get(tile.terrain);
        if (t && !t.isWater && tile.feature !== 'mountains') {
          result.push(hex);
          if (result.length >= count) break;
        }
      }
    }
    return result;
  };

  // Build players map — human + N AI
  const playersArr: [string, ReturnType<typeof makePlayer>][] = [
    [playerId, makePlayer(playerId, 'Player 1', true, civId, leaderId)],
  ];

  // AI players get spread positions and distinct civs/leaders
  const aiCount = Math.min(numAI, 3);
  for (let i = 0; i < aiCount; i++) {
    const aiId = `ai${i + 1}`;
    // Pick civ/leader that isn't the player's (cycle through pool)
    const aiCivPool = AI_CIVS.filter(c => c !== civId);
    const aiLeaderPool = AI_LEADERS.filter(l => l !== leaderId);
    const aiCiv = aiCivPool[i % aiCivPool.length];
    const aiLeader = aiLeaderPool[i % aiLeaderPool.length];
    playersArr.push([aiId, makePlayer(aiId, `AI Empire ${i + 1}`, false, aiCiv, aiLeader)]);
  }

  // Spread AI start positions evenly across remaining land tiles
  const nearbyPlayer = findNearbyLandTiles(startCoord, 3);
  const unitsEntries: [string, ReturnType<typeof makeUnit>][] = [
    ['settler1', makeUnit('settler1', 'settler', playerId, startCoord, 2)],
    ['builder1', makeUnit('builder1', 'builder', playerId, nearbyPlayer[0] ?? startCoord, 2)],
    ['warrior1', makeUnit('warrior1', 'warrior', playerId, nearbyPlayer[1] ?? startCoord, 2)],
    ['scout1', makeUnit('scout1', 'scout', playerId, nearbyPlayer[2] ?? startCoord, 3)],
  ];

  for (let i = 0; i < aiCount; i++) {
    const aiId = `ai${i + 1}`;
    const fraction = (i + 1) / (aiCount + 1);
    const aiStart = landTiles[Math.min(landTiles.length - 1, Math.floor(landTiles.length * (0.4 + fraction * 0.5)))]?.coord
      ?? { q: Math.floor(mapWidth * fraction), r: Math.floor(mapHeight * 0.5) };
    const nearbyAI = findNearbyLandTiles(aiStart, 2);
    unitsEntries.push(
      [`ai${i + 1}_settler1`, makeUnit(`ai${i + 1}_settler1`, 'settler', aiId, aiStart, 2)],
      [`ai${i + 1}_builder1`, makeUnit(`ai${i + 1}_builder1`, 'builder', aiId, nearbyAI[0] ?? aiStart, 2)],
      [`ai${i + 1}_warrior1`, makeUnit(`ai${i + 1}_warrior1`, 'warrior', aiId, nearbyAI[1] ?? aiStart, 2)],
    );
  }

  const state: GameState = {
    turn: 1,
    currentPlayerId: playerId,
    phase: 'actions',
    players: new Map(playersArr),
    map,
    units: new Map(unitsEntries),
    cities: new Map(),
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    diplomacy: { relations: new Map() },
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    builtWonders: [],
    crises: [],
    victory: { winner: null, winType: null, progress: new Map() },
    log: [],
    rng: { seed: gameSeed, counter: 0 },
    config: createGameConfig(),
    lastValidation: null,
    unlockedAchievements: new Map(),
    // W1-A: new GameState fields — safe defaults
    independentPowers: new Map(),
    firedNarrativeEvents: [],
    pendingNarrativeEvents: [],
    ageProgressMeter: 0,
    // W4-04: Commander state — empty Map at game start (commanders spawned
    // by production system or cheat commands register themselves here).
    commanders: new Map(),
  };

  // ── W3-06: Apply equipped mementos at game start ──
  if (account && config.equippedMementos && config.equippedMementos.length > 0) {
    const maxSlots = foundationMementoSlots(account.foundationLevel);
    const equipped = config.equippedMementos.slice(0, maxSlots);
    const validEquipped = filterValidMementos(equipped, account, state.config.mementos ?? new Map());
    if (validEquipped.length > 0) {
      return applyEquippedMementos(state, playerId, validEquipped);
    }
  }

  return state;
}
