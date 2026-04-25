import React, { createContext, useContext, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import type { GameState, GameAction, HexCoord, UnitState, CombatPreview, ValidationResult, CityId } from '@hex/engine';
import { animationEventBus } from '../hooks/AnimationEventBus';
import { useAltKey } from '../hooks/useAltKey';
import {
  createTerrainRegistries,
  ALL_BASE_TERRAINS,
  ALL_FEATURES,
  coordToKey,
  Registry,
  GameEngine,
  DEFAULT_SYSTEMS,
  generateAIActions,
  serializeState,
  deserializeState,
  createGameConfig,
  createInitialState,
  ALL_UNITS,
  getReachable,
  getMovementCost,
  evaluateLegends,
  applyAccountDelta,
  createDefaultAccountState,
} from '@hex/engine';
import type { AccountState } from '@hex/engine';
import type { GameSetupConfig } from '@hex/engine';
import type { TerrainDef, TerrainFeatureDef, UnitDef, CityState, SettlementType } from '@hex/engine';
import type { ResourceDef } from '@hex/engine';
import { ALL_RESOURCES } from '@hex/engine';

// ── AccountState localStorage helpers ──
//
// AccountState contains ReadonlyMap<string, ...> fields which do not
// round-trip through JSON.stringify/parse. We convert them to/from
// plain objects at the boundary.

interface SerializedAccountState {
  foundationXP: number;
  foundationLevel: number;
  leaderXP: [string, number][];
  leaderLevels: [string, number][];
  unlockedMementos: string[];
  unlockedAttributeNodes: [string, string[]][];
  unlockedLegacyCards: [string, string[]][];
  completedChallenges: string[];
}

function serializeAccount(account: AccountState): string {
  const serializable: SerializedAccountState = {
    foundationXP: account.foundationXP,
    foundationLevel: account.foundationLevel,
    leaderXP: [...account.leaderXP],
    leaderLevels: [...account.leaderLevels],
    unlockedMementos: [...account.unlockedMementos],
    unlockedAttributeNodes: [...account.unlockedAttributeNodes].map(([k, v]) => [k, [...v]]),
    unlockedLegacyCards: [...account.unlockedLegacyCards].map(([k, v]) => [k, [...v]]),
    completedChallenges: [...account.completedChallenges],
  };
  return JSON.stringify(serializable);
}

function deserializeAccount(json: string): AccountState {
  const raw = JSON.parse(json) as SerializedAccountState;
  return {
    foundationXP: raw.foundationXP ?? 0,
    foundationLevel: raw.foundationLevel ?? 1,
    leaderXP: new Map(raw.leaderXP ?? []),
    leaderLevels: new Map(raw.leaderLevels ?? []),
    unlockedMementos: raw.unlockedMementos ?? [],
    unlockedAttributeNodes: new Map((raw.unlockedAttributeNodes ?? []).map(([k, v]) => [k, v])),
    unlockedLegacyCards: new Map((raw.unlockedLegacyCards ?? []).map(([k, v]) => [k, v])),
    completedChallenges: raw.completedChallenges ?? [],
  };
}

const ACCOUNT_STORAGE_KEY = 'hex-empires-account';

function loadAccountFromStorage(): AccountState {
  try {
    const json = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (json) return deserializeAccount(json);
  } catch {
    // corrupt data — start fresh
  }
  return createDefaultAccountState();
}

function saveAccountToStorage(account: AccountState): void {
  try {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, serializeAccount(account));
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

// ── Engine singleton ──

const engine = new GameEngine(DEFAULT_SYSTEMS);

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

// ── Context ──

interface GameContextValue {
  state: GameState | null;
  dispatch: (action: GameAction) => void;
  initGame: (config: GameSetupConfig) => void;
  isProcessingAI: boolean;
  /** Current cross-session account state (Foundation XP, leader XP, mementos). */
  account: AccountState;
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
  // City selection state (moved from App.tsx so canvas and panels share it)
  selectedCityId: CityId | null;
  selectedCity: CityState | null;
  selectCity: (cityId: CityId | null) => void;
  // Combat preview state
  combatPreview: CombatPreview | null;
  setCombatPreview: (preview: CombatPreview | null) => void;
  combatPreviewPosition: { x: number; y: number } | null;
  setCombatPreviewPosition: (pos: { x: number; y: number } | null) => void;
  reachableHexes: ReadonlyMap<string, number> | null;
  saveGame: () => void;
  loadGame: () => void;
  lastValidation: ValidationResult | null;
  clearValidation: () => void;
  // ── Building placement mode (Cycle 3 of building-placement rework) ──
  //
  // Pure React/UI state — deliberately NOT part of GameState because it
  // represents a transient picker session, not a persistent game fact.
  // When non-null, the canvas overlay (Cycle 4) and CityPanel (Cycle 5)
  // cooperate to let the player click a tile, at which point the caller
  // dispatches SET_PRODUCTION with the chosen tile. ESC at the window
  // capture phase clears this without touching panel state.
  placementMode: { readonly cityId: CityId; readonly buildingId: string } | null;
  enterPlacementMode: (cityId: CityId, buildingId: string) => void;
  exitPlacementMode: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const registries = useMemo(
    () => createTerrainRegistries(ALL_BASE_TERRAINS, ALL_FEATURES),
    [],
  );

  const [state, setState] = useState<GameState | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<CityId | null>(null);
  const [selectedHex, setSelectedHex] = useState<HexCoord | null>(null);
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
  const isAltPressed = useAltKey();
  const [combatPreview, setCombatPreview] = useState<CombatPreview | null>(null);
  const [combatPreviewPosition, setCombatPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);
  const [placementMode, setPlacementMode] = useState<{ readonly cityId: CityId; readonly buildingId: string } | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const enterPlacementMode = useCallback((cityId: CityId, buildingId: string) => {
    setPlacementMode({ cityId, buildingId });
  }, []);
  const exitPlacementMode = useCallback(() => {
    setPlacementMode(null);
  }, []);

  // ── ESC cancels placement mode at window capture phase ──
  //
  // Registered in the capture phase so it runs before App.tsx's own ESC
  // handler (panel dismissal). We stopPropagation when a placement is
  // active so the player's ESC only cancels placement without also closing
  // the CityPanel behind it. When placement is not active, the event falls
  // through to the existing panel-ESC handler unmolested.
  useEffect(() => {
    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (placementMode) {
        setPlacementMode(null);
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDownCapture, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDownCapture, true);
    };
  }, [placementMode]);

  // Derive selectedUnit from state — always fresh reference
  const selectedUnit = (selectedUnitId && state) ? state.units.get(selectedUnitId) ?? null : null;
  const setSelectedUnit = useCallback((unit: UnitState | null) => {
    setSelectedUnitId(unit?.id ?? null);
  }, []);

  // Derive selectedCity from state — always fresh reference
  const selectedCity = (selectedCityId && state) ? state.cities.get(selectedCityId) ?? null : null;
  const selectCity = useCallback((cityId: CityId | null) => {
    setSelectedCityId(cityId);
  }, []);

  const clearValidation = useCallback(() => {
    setLastValidation(null);
  }, []);

  // AccountState — persisted in localStorage, drives Foundation XP + mementos.
  // The ref is used for synchronous access inside the dispatch updater; the
  // React state triggers re-renders when the account actually changes (on turn end).
  // We load from localStorage in the lazy initializer so the value is correct
  // on the very first render (before initGame is called).
  const [account, setAccount] = useState<AccountState>(() => loadAccountFromStorage());
  const accountRef = useRef<AccountState>(account);

  const initGame = useCallback((config: GameSetupConfig) => {
    // Optional deterministic seed via ?seed=<int> URL param — useful for E2E tests
    // that need stable starting positions across runs.
    const seedParam = new URLSearchParams(window.location.search).get('seed');
    const seed = seedParam ? Number(seedParam) : undefined;
    // Load persisted AccountState and pass it to createInitialState so
    // equipped mementos can be applied at game start.
    const loadedAccount = loadAccountFromStorage();
    accountRef.current = loadedAccount;
    setAccount(loadedAccount);
    const newState = createInitialState(config, Number.isFinite(seed) ? seed : undefined, loadedAccount);
    setState(newState);
    setSelectedUnitId(null);
    setSelectedCityId(null);
    setSelectedHex(null);
    setLastValidation(null);
  }, []);

  const dispatch = useCallback((action: GameAction) => {
    setState(prev => {
      if (!prev) return prev;

      let next = engine.applyAction(prev, action);

      // Track validation result for feedback
      if (next.lastValidation) {
        setLastValidation(next.lastValidation);
      } else {
        setLastValidation(null);
      }

      // Notify the canvas layer so it can enqueue animations based on the
      // state diff. The bus decouples Provider from AnimationManager — the
      // canvas owns that dependency, not the provider.
      // Schedule after the setState updater returns (microtask) so the bus
      // call is outside the React state batch.
      const prevSnapshot = prev;
      const nextSnapshot = next;
      Promise.resolve().then(() => {
        animationEventBus.emit(action, prevSnapshot, nextSnapshot);
      });

      return next;
    });

    // After END_TURN, evaluate legends (cross-session meta-progression) and
    // persist the updated AccountState to localStorage, then process AI turns.
    if (action.type === 'END_TURN') {
      // Evaluate legends synchronously against the latest state before AI turns.
      // Use functional setState to read the current state snapshot; update the
      // account ref + React state + localStorage.
      setState(prev => {
        if (!prev) return prev;
        const humanPlayerId = 'player1';
        const { accountDelta } = evaluateLegends(prev, accountRef.current, humanPlayerId);
        const updatedAccount = applyAccountDelta(accountRef.current, accountDelta);
        accountRef.current = updatedAccount;
        saveAccountToStorage(updatedAccount);
        // Schedule React state update after this batch (can't call setAccount
        // inside a setState updater directly — use Promise.resolve microtask).
        Promise.resolve().then(() => setAccount(updatedAccount));
        return prev; // legends don't mutate GameState itself
      });

      setIsProcessingAI(true);
      setTimeout(() => {
        setState(prev => {
          if (!prev) return prev;
          return processAITurns(engine, prev);
        });
        setIsProcessingAI(false);
      }, 50);
    }
  }, []);

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
      try {
        const loaded = deserializeState(json);
        // Reconstruct config from current data definitions (config is static, not serialized)
        setState({ ...loaded, config: createGameConfig(), lastValidation: null });
        setSelectedUnit(null);
        setSelectedHex(null);
        setLastValidation(null);
      } catch (err) {
        console.warn('Failed to load save game — corrupt data removed.', err);
        localStorage.removeItem('hex-empires-save');
        localStorage.removeItem('hex-empires-save-meta');
      }
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
    isProcessingAI,
    account,
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
    selectedCityId,
    selectedCity,
    selectCity,
    combatPreview,
    setCombatPreview,
    combatPreviewPosition,
    setCombatPreviewPosition,
    reachableHexes,
    saveGame,
    loadGame,
    lastValidation,
    clearValidation,
    placementMode,
    enterPlacementMode,
    exitPlacementMode,
  }), [state, dispatch, initGame, isProcessingAI, account, registries, selectedUnit, selectedHex, hoveredHex, isAltPressed, selectedCityId, selectedCity, selectCity, combatPreview, combatPreviewPosition, reachableHexes, saveGame, loadGame, lastValidation, clearValidation, placementMode, enterPlacementMode, exitPlacementMode]);

  // Expose game state for E2E testing (Playwright can read window.__gameState)
  useEffect(() => {
    (window as any).__gameState = state;
    (window as any).__gameDispatch = dispatch;
  }, [state, dispatch]);

  // E2E observability hook: expose current selection so Playwright tests can verify UI intent
  // (which unit/hex/city is selected) without scraping potentially-flaky body text.
  // Read-only for tests — GameCanvas reads selectedCityId from context, NOT from this hook.
  // (window as any) cast is intentional: this is a test escape hatch, not production API.
  useEffect(() => {
    (window as any).__selection = {
      unitId: selectedUnit?.id ?? null,
      hex: selectedHex,
      cityId: selectedCityId ?? null,
    };
  }, [selectedUnit, selectedHex, selectedCityId]);

  // Autosave on every turn advance — players never lose progress to a tab close.
  // Skips turn 1 (just-started game: nothing worth saving, and we don't want to clobber
  // a previous save the moment the setup screen hands off).
  const lastAutosavedTurn = useRef<number>(0);
  useEffect(() => {
    if (!state) return;
    if (state.turn === lastAutosavedTurn.current) return;
    if (state.turn <= 1) {
      lastAutosavedTurn.current = state.turn;
      return;
    }
    lastAutosavedTurn.current = state.turn;
    try {
      const json = serializeState(state);
      localStorage.setItem('hex-empires-save', json);
      const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      localStorage.setItem('hex-empires-save-meta', `Autosave · T${state.turn} · ${dateStr}`);
    } catch (err) {
      // Don't let a full-storage or serialization failure crash gameplay.
      console.warn('Autosave failed:', err);
    }
  }, [state?.turn, state]);

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
