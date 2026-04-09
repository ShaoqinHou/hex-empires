import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';
import type { GameState, GameAction, HexCoord, UnitState } from '@hex/engine';
import {
  createTerrainRegistries,
  ALL_BASE_TERRAINS,
  ALL_FEATURES,
  generateMap,
  coordToKey,
  Registry,
  GameEngine,
  turnSystem,
  movementSystem,
  citySystem,
  growthSystem,
  productionSystem,
  resourceSystem,
  researchSystem,
  ageSystem,
  combatSystem,
  diplomacySystem,
  updateDiplomacyCounters,
  fortifySystem,
  generateAIActions,
  victorySystem,
  effectSystem,
  serializeState,
  deserializeState,
  ALL_UNITS,
  findPath,
  getReachable,
  getMovementCost,
} from '@hex/engine';
import type { TerrainDef, TerrainFeatureDef, UnitDef, CityState } from '@hex/engine';

// ── Engine singleton ──

const engine = new GameEngine([
  turnSystem,
  effectSystem,
  movementSystem,
  citySystem,
  combatSystem,
  fortifySystem,
  growthSystem,
  productionSystem,
  resourceSystem,
  researchSystem,
  ageSystem,
  diplomacySystem,
  updateDiplomacyCounters,
  victorySystem,
]);

// ── Unit registry ──

const unitRegistry = new Registry<UnitDef>();
for (const u of ALL_UNITS) {
  unitRegistry.register(u);
}

// ── Initial state factory ──

function createInitialState(): GameState {
  const { terrainRegistry } = createTerrainRegistries(ALL_BASE_TERRAINS, ALL_FEATURES);

  const map = generateMap(
    terrainRegistry,
    createTerrainRegistries(ALL_BASE_TERRAINS, ALL_FEATURES).featureRegistry,
    { width: 60, height: 40, seed: Date.now(), waterRatio: 0.35, wrapX: false },
  );

  const playerId = 'player1';
  const aiPlayerId = 'ai1';

  // Find starting positions on flat land, spread apart
  const landTiles = [...map.tiles.values()].filter(tile => {
    const t = terrainRegistry.get(tile.terrain);
    return t && !t.isWater && tile.feature !== 'mountains' && tile.feature !== 'marsh'
      && tile.coord.r > 5 && tile.coord.r < 35;
  });

  const startCoord = landTiles[0]?.coord ?? { q: 15, r: 10 };
  // AI starts far away from player
  const aiStartCoord = landTiles[Math.min(landTiles.length - 1, Math.floor(landTiles.length * 0.7))]?.coord
    ?? { q: 40, r: 25 };

  const makePlayer = (id: string, name: string, isHuman: boolean, civId: string, leaderId: string) => ({
    id, name, isHuman, civilizationId: civId, leaderId,
    age: 'antiquity' as const,
    researchedTechs: [] as string[],
    currentResearch: null,
    researchProgress: 0,
    gold: 100, science: 0, culture: 0, faith: 0,
    ageProgress: 0,
    legacyBonuses: [] as any[],
    visibility: new Set<string>(),
    explored: new Set<string>(),
  });

  const makeUnit = (id: string, typeId: string, owner: string, pos: HexCoord, movement: number) => ({
    id, typeId, owner, position: pos,
    movementLeft: movement, health: 100, experience: 0,
    promotions: [] as string[], fortified: false,
  });

  const state: GameState = {
    turn: 1,
    currentPlayerId: playerId,
    phase: 'actions',
    players: new Map([
      [playerId, makePlayer(playerId, 'Player 1', true, 'rome', 'augustus')],
      [aiPlayerId, makePlayer(aiPlayerId, 'AI Empire', false, 'greece', 'pericles')],
    ]),
    map,
    units: new Map([
      ['settler1', makeUnit('settler1', 'settler', playerId, startCoord, 2)],
      ['warrior1', makeUnit('warrior1', 'warrior', playerId, { q: startCoord.q + 1, r: startCoord.r }, 2)],
      ['scout1', makeUnit('scout1', 'scout', playerId, { q: startCoord.q - 1, r: startCoord.r + 1 }, 3)],
      ['ai_settler1', makeUnit('ai_settler1', 'settler', aiPlayerId, aiStartCoord, 2)],
      ['ai_warrior1', makeUnit('ai_warrior1', 'warrior', aiPlayerId, { q: aiStartCoord.q + 1, r: aiStartCoord.r }, 2)],
    ]),
    cities: new Map(),
    diplomacy: { relations: new Map() },
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    crises: [],
    victory: { winner: null, winType: null, progress: new Map() },
    log: [],
    rng: { seed: Date.now(), counter: 0 },
  };

  return state;
}

// ── Context ──

interface GameContextValue {
  state: GameState;
  dispatch: (action: GameAction) => void;
  terrainRegistry: Registry<TerrainDef>;
  featureRegistry: Registry<TerrainFeatureDef>;
  unitRegistry: Registry<UnitDef>;
  // Selection state (managed here so canvas and UI can share)
  selectedUnit: UnitState | null;
  setSelectedUnit: (unit: UnitState | null) => void;
  selectedHex: HexCoord | null;
  setSelectedHex: (hex: HexCoord | null) => void;
  reachableHexes: ReadonlyMap<string, number> | null;
  saveGame: () => void;
  loadGame: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const registries = useMemo(
    () => createTerrainRegistries(ALL_BASE_TERRAINS, ALL_FEATURES),
    [],
  );

  const [state, setState] = useState<GameState>(createInitialState);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedHex, setSelectedHex] = useState<HexCoord | null>(null);

  // Derive selectedUnit from state — always fresh reference
  const selectedUnit = selectedUnitId ? state.units.get(selectedUnitId) ?? null : null;
  const setSelectedUnit = useCallback((unit: UnitState | null) => {
    setSelectedUnitId(unit?.id ?? null);
  }, []);

  const dispatch = useCallback((action: GameAction) => {
    setState(prev => {
      let next = engine.applyAction(prev, action);

      // After END_TURN, process AI players, then start human turn
      if (action.type === 'END_TURN') {
        // Loop: start next player's turn, if AI then play and end
        let safety = 0;
        while (next.phase === 'start' && safety < 20) {
          safety++;
          next = engine.applyAction(next, { type: 'START_TURN' });
          const currentPlayer = next.players.get(next.currentPlayerId);
          if (currentPlayer && !currentPlayer.isHuman) {
            // AI turn: generate and apply actions
            const aiActions = generateAIActions(next);
            for (const aiAction of aiActions) {
              next = engine.applyAction(next, aiAction);
            }
            // If AI didn't end turn, force it
            if (next.currentPlayerId === currentPlayer.id && next.phase === 'actions') {
              next = engine.applyAction(next, { type: 'END_TURN' });
            }
          } else {
            break; // human player — stop and let them play
          }
        }
      }

      return next;
    });
  }, []);

  const saveGame = useCallback(() => {
    const json = serializeState(state);
    localStorage.setItem('hex-empires-save', json);
  }, [state]);

  const loadGame = useCallback(() => {
    const json = localStorage.getItem('hex-empires-save');
    if (json) {
      setState(deserializeState(json));
      setSelectedUnit(null);
      setSelectedHex(null);
    }
  }, []);

  // Calculate reachable hexes for selected unit
  const reachableHexes = useMemo(() => {
    if (!selectedUnit || selectedUnit.movementLeft <= 0) return null;
    const costFn = (from: HexCoord, to: HexCoord) => {
      const tile = state.map.tiles.get(coordToKey(to));
      if (!tile) return null;
      return getMovementCost(tile);
    };
    return getReachable(selectedUnit.position, selectedUnit.movementLeft, costFn);
  }, [selectedUnit, state.map]);

  const value = useMemo(() => ({
    state,
    dispatch,
    terrainRegistry: registries.terrainRegistry,
    featureRegistry: registries.featureRegistry,
    unitRegistry,
    selectedUnit,
    setSelectedUnit,
    selectedHex,
    setSelectedHex,
    reachableHexes,
    saveGame,
    loadGame,
  }), [state, dispatch, registries, selectedUnit, selectedHex, reachableHexes, saveGame, loadGame]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
