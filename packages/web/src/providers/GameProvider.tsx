import React, { createContext, useContext, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import type { GameState, GameAction, HexCoord, UnitState, CombatPreview, ValidationResult } from '@hex/engine';
import { AnimationManager } from '../canvas/AnimationManager';
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
  promotionSystem,
  diplomacySystem,
  updateDiplomacyCounters,
  fortifySystem,
  improvementSystem,
  generateAIActions,
  victorySystem,
  effectSystem,
  visibilitySystem,
  crisisSystem,
  civicSystem,
  tradeSystem,
  specialistSystem,
  serializeState,
  deserializeState,
  createGameConfig,
  ALL_UNITS,
  findPath,
  getReachable,
  getMovementCost,
} from '@hex/engine';
import type { TerrainDef, TerrainFeatureDef, UnitDef, CityState, SettlementType } from '@hex/engine';
import type { ResourceDef } from '@hex/engine';
import { ALL_RESOURCES } from '@hex/engine';

// ── Engine singleton ──

const engine = new GameEngine([
  turnSystem,
  visibilitySystem,
  effectSystem,
  movementSystem,
  citySystem,
  combatSystem,
  promotionSystem,
  fortifySystem,
  improvementSystem,
  growthSystem,
  productionSystem,
  resourceSystem,
  researchSystem,
  civicSystem,
  ageSystem,
  diplomacySystem,
  updateDiplomacyCounters,
  specialistSystem,
  tradeSystem,
  crisisSystem,
  victorySystem,
]);

// ── Unit registry ──

const unitRegistry = new Registry<UnitDef>();
for (const u of ALL_UNITS) {
  unitRegistry.register(u);
}

// ── Resource registry ──

const resourceRegistry = new Registry<ResourceDef>();
for (const r of ALL_RESOURCES) {
  resourceRegistry.register(r);
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
    researchedCivics: [] as string[],
    currentCivic: null as string | null,
    civicProgress: 0,
    gold: 100, science: 0, culture: 0, faith: 0, influence: 0,
    ageProgress: 0,
    legacyBonuses: [] as any[],
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
    tradeRoutes: new Map(),
    diplomacy: { relations: new Map() },
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    crises: [],
    victory: { winner: null, winType: null, progress: new Map() },
    log: [],
    rng: { seed: Date.now(), counter: 0 },
    config: createGameConfig(),
    lastValidation: null,
  };

  return state;
}

// ── Animation Detection Helper ──

/**
 * Detect state changes during turn processing and trigger appropriate animations.
 * This handles animations for events that occur during END_TURN processing,
 * such as city growth, production completion, etc.
 */
function detectAndTriggerTurnAnimations(
  animationManager: AnimationManager,
  prev: GameState,
  next: GameState,
  action: GameAction,
): void {
  // Check for city population growth
  for (const [cityId, city] of next.cities) {
    const prevCity = prev.cities.get(cityId);
    if (prevCity && city.population > prevCity.population) {
      // City grew
      const growthAnim = animationManager.createCityGrowthAnimation(
        cityId,
        city.position,
        prevCity.population,
        city.population,
        400
      );
      animationManager.add(growthAnim);
    }
  }

  // Check for production completion (cities that finished production)
  for (const [cityId, city] of next.cities) {
    const prevCity = prev.cities.get(cityId);
    if (prevCity && prevCity.productionProgress < 100 && city.productionProgress >= 100) {
      // Production just completed - get the item from the production queue
      const currentItem = city.productionQueue[0];
      if (!currentItem) continue;

      const itemDef = next.config.units.get(currentItem.id);
      let itemType: 'unit' | 'building' | 'wonder' = currentItem.type; // Use the type from ProductionItem

      const prodAnim = animationManager.createProductionCompleteAnimation(
        cityId,
        city.position,
        currentItem.id,
        itemType,
        800
      );
      animationManager.add(prodAnim);
    }
  }

  // Check for new cities founded during turn processing
  for (const [cityId, city] of next.cities) {
    if (!prev.cities.has(cityId)) {
      // New city founded
      const cityAnim = animationManager.createCityFoundedAnimation(
        cityId,
        city.position,
        city.owner,
        city.name,
        600
      );
      animationManager.add(cityAnim);
    }
  }

  // Check for age transitions
  if (prev.age.currentAge !== next.age.currentAge) {
    // Age transition - flash effect on all player cities
    for (const [cityId, city] of next.cities) {
      if (city.owner === next.currentPlayerId) {
        const flashAnim = animationManager.createDamageFlashAnimation(
          `age-transition-${cityId}`,
          city.position,
          true,
          400
        );
        animationManager.add(flashAnim);
      }
    }
  }
}

// ── Context ──

interface GameContextValue {
  state: GameState;
  dispatch: (action: GameAction) => void;
  terrainRegistry: Registry<TerrainDef>;
  featureRegistry: Registry<TerrainFeatureDef>;
  unitRegistry: Registry<UnitDef>;
  resourceRegistry: Registry<ResourceDef>;
  // Selection state (managed here so canvas and UI can share)
  selectedUnit: UnitState | null;
  setSelectedUnit: (unit: UnitState | null) => void;
  selectedHex: HexCoord | null;
  setSelectedHex: (hex: HexCoord | null) => void;
  hoveredHex: HexCoord | null;
  setHoveredHex: (hex: HexCoord | null) => void;
  isAltPressed: boolean;
  // Combat preview state
  combatPreview: CombatPreview | null;
  setCombatPreview: (preview: CombatPreview | null) => void;
  combatPreviewPosition: { x: number; y: number } | null;
  setCombatPreviewPosition: (pos: { x: number; y: number } | null) => void;
  reachableHexes: ReadonlyMap<string, number> | null;
  saveGame: () => void;
  loadGame: () => void;
  animationManager: AnimationManager | null;
  lastValidation: ValidationResult | null;
  clearValidation: () => void;
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
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [combatPreview, setCombatPreview] = useState<CombatPreview | null>(null);
  const [combatPreviewPosition, setCombatPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(state.lastValidation ?? null);

  // Create and maintain AnimationManager instance
  const animationManagerRef = useRef<AnimationManager | null>(null);
  if (!animationManagerRef.current) {
    animationManagerRef.current = new AnimationManager();
  }

  // Track previous action and state for sound effects
  const previousActionRef = useRef<GameAction | null>(null);
  const previousStateRef = useRef<GameState | null>(null);

  // Alt key tracking for tooltips
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Derive selectedUnit from state — always fresh reference
  const selectedUnit = selectedUnitId ? state.units.get(selectedUnitId) ?? null : null;
  const setSelectedUnit = useCallback((unit: UnitState | null) => {
    setSelectedUnitId(unit?.id ?? null);
  }, []);

  const clearValidation = useCallback(() => {
    setLastValidation(null);
  }, []);

  const dispatch = useCallback((action: GameAction) => {
    const animationManager = animationManagerRef.current;
    if (!animationManager) {
      // Fallback if animation manager not initialized
      setState(prev => {
        let next = engine.applyAction(prev, action);

        // Track validation result for feedback
        if (next.lastValidation) {
          setLastValidation(next.lastValidation);
        } else {
          setLastValidation(null);
        }

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
      return;
    }

    setState(prev => {
      // Track previous state for sound effects
      previousStateRef.current = prev;
      previousActionRef.current = action;

      let next = engine.applyAction(prev, action);

      // Track validation result for feedback
      if (next.lastValidation) {
        setLastValidation(next.lastValidation);
      } else {
        setLastValidation(null);
      }

      // Trigger animations based on action type
      // Note: We trigger animations AFTER the state update, using 'prev' to get the old state
      // and 'next' to get the new state. Animations are purely visual and don't affect game logic.

      switch (action.type) {
        case 'MOVE_UNIT': {
          const unit = next.units.get(action.unitId);
          if (unit && action.path.length > 0) {
            // Create movement animation from old position along the path
            const moveAnim = animationManager.createUnitMoveAnimation(
              action.unitId,
              unit.owner,
              unit.typeId,
              action.path,
              400
            );
            animationManager.add(moveAnim);
          }
          break;
        }

        case 'ATTACK_UNIT': {
          const attacker = next.units.get(action.attackerId);
          const target = prev.units.get(action.targetId); // Target might be dead in 'next'

          if (attacker && target) {
            const attackerDef = unitRegistry.get(attacker.typeId);
            const isRanged = attackerDef?.category === 'ranged' || attackerDef?.category === 'siege';

            if (isRanged) {
              // Ranged attack animation
              const rangedAnim = animationManager.createRangedAttackAnimation(
                action.attackerId,
                attacker.typeId,
                attacker.owner,
                action.targetId,
                target.typeId,
                target.owner,
                attacker.position,
                target.position,
                '#ff5722',
                500
              );
              animationManager.add(rangedAnim);
            } else {
              // Melee attack animation
              const meleeAnim = animationManager.createMeleeAttackAnimation(
                action.attackerId,
                attacker.typeId,
                attacker.owner,
                action.targetId,
                target.typeId,
                target.owner,
                attacker.position,
                target.position,
                300
              );
              animationManager.add(meleeAnim);
            }

            // Damage flash on target
            const flashAnim = animationManager.createDamageFlashAnimation(
              action.targetId,
              target.position,
              false,
              200
            );
            animationManager.add(flashAnim);
          }

          // Check if target unit died
          if (!next.units.has(action.targetId) && prev.units.has(action.targetId)) {
            const deadUnit = prev.units.get(action.targetId);
            if (deadUnit) {
              const deathAnim = animationManager.createUnitDeathAnimation(
                action.targetId,
                deadUnit.position,
                deadUnit.owner,
                deadUnit.typeId,
                600
              );
              animationManager.add(deathAnim);
            }
          }
          break;
        }

        case 'ATTACK_CITY': {
          const attacker = next.units.get(action.attackerId);
          const city = next.cities.get(action.cityId);

          if (attacker && city) {
            // City attack animation
            const cityAnim = animationManager.createDamageFlashAnimation(
              action.cityId,
              city.position,
              true,
              300
            );
            animationManager.add(cityAnim);
          }
          break;
        }

        case 'FOUND_CITY': {
          // City founded animation - find the newly created city
          const newCity = Array.from(next.cities.values()).find(c =>
            !prev.cities.has(c.id) && c.name === action.name
          );
          if (newCity) {
            const cityAnim = animationManager.createCityFoundedAnimation(
              newCity.id,
              newCity.position,
              newCity.owner,
              action.name,
              800
            );
            animationManager.add(cityAnim);
          }
          break;
        }

        case 'SET_PRODUCTION': {
          // Check if production completes immediately (rare case)
          const city = next.cities.get(action.cityId);
          if (city && city.productionProgress >= 100) {
            // Production complete animation - use the item type from action
            const prodAnim = animationManager.createProductionCompleteAnimation(
              action.cityId,
              city.position,
              action.itemId,
              action.itemType,
              800
            );
            animationManager.add(prodAnim);
          }
          break;
        }
      }

      // Detect and trigger animations for state changes during turn processing
      // (City growth, production completion, etc.)
      detectAndTriggerTurnAnimations(animationManager, prev, next, action);

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
  }, [unitRegistry]);

  const saveGame = useCallback(() => {
    const json = serializeState(state);
    localStorage.setItem('hex-empires-save', json);
  }, [state]);

  const loadGame = useCallback(() => {
    const json = localStorage.getItem('hex-empires-save');
    if (json) {
      const loaded = deserializeState(json);
      // Reconstruct config from current data definitions (config is static, not serialized)
      setState({ ...loaded, config: createGameConfig(), lastValidation: null });
      setSelectedUnit(null);
      setSelectedHex(null);
      setLastValidation(null);
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
    resourceRegistry,
    selectedUnit,
    setSelectedUnit,
    selectedHex,
    setSelectedHex,
    hoveredHex,
    setHoveredHex,
    isAltPressed,
    combatPreview,
    setCombatPreview,
    combatPreviewPosition,
    setCombatPreviewPosition,
    reachableHexes,
    saveGame,
    loadGame,
    animationManager: animationManagerRef.current,
    lastValidation,
    clearValidation,
  }), [state, dispatch, registries, selectedUnit, selectedHex, hoveredHex, isAltPressed, combatPreview, combatPreviewPosition, reachableHexes, saveGame, loadGame, lastValidation, clearValidation]);

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
