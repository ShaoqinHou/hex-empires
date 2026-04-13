import React, { createContext, useContext, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import type { GameState, GameAction, HexCoord, UnitState, CombatPreview, ValidationResult } from '@hex/engine';
import { AnimationManager } from '../canvas/AnimationManager';
import {
  createTerrainRegistries,
  ALL_BASE_TERRAINS,
  ALL_FEATURES,
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
  buildingPlacementSystem,
  districtSystem,
  generateAIActions,
  victorySystem,
  effectSystem,
  visibilitySystem,
  crisisSystem,
  civicSystem,
  tradeSystem,
  specialistSystem,
  governorSystem,
  serializeState,
  deserializeState,
  createGameConfig,
  createInitialState,
  ALL_UNITS,
  getReachable,
  getMovementCost,
} from '@hex/engine';
import type { GameSetupConfig } from '@hex/engine';
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
  buildingPlacementSystem,
  districtSystem,
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
  governorSystem,
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

// Re-export GameSetupConfig so consumers that previously imported it from here still work
export type { GameSetupConfig };

// ── AI turn processing helper ──

/**
 * After a human END_TURN, loop through AI players:
 * START_TURN → generate AI actions → apply → END_TURN, until we reach a human player.
 * Returns the final state ready for the human's next turn.
 */
function processAITurns(eng: GameEngine, state: GameState): GameState {
  let next = state;
  let safety = 0;
  while (next.phase === 'start' && safety < 20) {
    safety++;
    next = eng.applyAction(next, { type: 'START_TURN' });
    const currentPlayer = next.players.get(next.currentPlayerId);
    if (currentPlayer && !currentPlayer.isHuman) {
      // AI turn: generate and apply actions
      const aiActions = generateAIActions(next);
      for (const aiAction of aiActions) {
        next = eng.applyAction(next, aiAction);
      }
      // If AI didn't end turn, force it
      if (next.currentPlayerId === currentPlayer.id && next.phase === 'actions') {
        next = eng.applyAction(next, { type: 'END_TURN' });
      }
    } else {
      break; // human player — stop and let them play
    }
  }
  return next;
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

      const prodAnim = animationManager.createProductionCompleteAnimation(
        cityId,
        city.position,
        currentItem.id,
        currentItem.type,
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
  state: GameState | null;
  dispatch: (action: GameAction) => void;
  initGame: (config: GameSetupConfig) => void;
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

  const [state, setState] = useState<GameState | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedHex, setSelectedHex] = useState<HexCoord | null>(null);
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [combatPreview, setCombatPreview] = useState<CombatPreview | null>(null);
  const [combatPreviewPosition, setCombatPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);

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
  const selectedUnit = (selectedUnitId && state) ? state.units.get(selectedUnitId) ?? null : null;
  const setSelectedUnit = useCallback((unit: UnitState | null) => {
    setSelectedUnitId(unit?.id ?? null);
  }, []);

  const clearValidation = useCallback(() => {
    setLastValidation(null);
  }, []);

  const initGame = useCallback((config: GameSetupConfig) => {
    const newState = createInitialState(config);
    setState(newState);
    setSelectedUnitId(null);
    setSelectedHex(null);
    setLastValidation(null);
  }, []);

  const dispatch = useCallback((action: GameAction) => {
    const animationManager = animationManagerRef.current;
    if (!animationManager) {
      // Fallback if animation manager not initialized
      setState(prev => {
        if (!prev) return prev;
        let next = engine.applyAction(prev, action);

        // Track validation result for feedback
        if (next.lastValidation) {
          setLastValidation(next.lastValidation);
        } else {
          setLastValidation(null);
        }

        // After END_TURN, process AI players, then start human turn
        if (action.type === 'END_TURN') {
          next = processAITurns(engine, next);
        }

        return next;
      });
      return;
    }

    setState(prev => {
      if (!prev) return prev;
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
        next = processAITurns(engine, next);
      }

      return next;
    });
  }, [unitRegistry]);

  const saveGame = useCallback(() => {
    if (!state) return;
    const json = serializeState(state);
    localStorage.setItem('hex-empires-save', json);
    // Store human-readable save date for the setup screen to display
    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    localStorage.setItem('hex-empires-save-meta', dateStr);
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
    if (!selectedUnit || selectedUnit.movementLeft <= 0 || !state) return null;
    const costFn = (_from: HexCoord, to: HexCoord) => {
      const tile = state.map.tiles.get(coordToKey(to));
      if (!tile) return null;
      return getMovementCost(tile);
    };
    return getReachable(selectedUnit.position, selectedUnit.movementLeft, costFn);
  }, [selectedUnit, state]);

  const value = useMemo(() => ({
    state,
    dispatch,
    initGame,
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
  }), [state, dispatch, initGame, registries, selectedUnit, selectedHex, hoveredHex, isAltPressed, combatPreview, combatPreviewPosition, reachableHexes, saveGame, loadGame, lastValidation, clearValidation]);

  // Expose game state for E2E testing (Playwright can read window.__gameState)
  useEffect(() => {
    (window as any).__gameState = state;
    (window as any).__gameDispatch = dispatch;
  }, [state, dispatch]);

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

/** Like useGame, but asserts state is non-null. Use only in components that render inside GameUI. */
export function useGameState(): GameContextValue & { state: GameState } {
  const ctx = useGame();
  if (!ctx.state) throw new Error('useGameState called before game was initialized');
  return ctx as GameContextValue & { state: GameState };
}
