import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useGameState } from '../providers/GameProvider';
import { Camera } from './Camera';
import { HexRenderer, pixelToHex, hexToPixel } from './HexRenderer';
import { RenderCache } from './RenderCache';
import { AnimationManager } from './AnimationManager';
import { AnimationRenderer } from './AnimationRenderer';
import { animationEventBus } from '../hooks/AnimationEventBus';
import { RANGED_PROJECTILE_COLOR } from './canvasTokens';
import type { HexCoord, CityState } from '@hex/engine';
import { coordToKey, findPath, getMovementCost, getAttackableUnits, calculateCombatPreview, calculateCityCombatPreview, getAttackableCities, getTileContents, getSelectionCycle, listValidTilesForBuilding } from '@hex/engine';

interface GameCanvasProps {
  onCityClick?: (city: CityState) => void;
  onToggleTechTree?: () => void;
  onToggleYields?: () => void;
  onBuilderSelected?: () => void;
  onBuilderDeselected?: () => void;
  /** Called when J is pressed but no idle units exist in the current player's army. */
  onNoIdleUnits?: () => void;
  cameraRef?: React.MutableRefObject<Camera | null>;
  showYields?: boolean;
  /** When true, draw unit-type text labels below unit icons for readability. */
  showLabels?: boolean;
}

export function GameCanvas({ onCityClick, onToggleTechTree, onToggleYields, onBuilderSelected, onBuilderDeselected, onNoIdleUnits, cameraRef: externalCameraRef, showYields = false, showLabels = false }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalCamera = useRef(new Camera());

  // Use external ref if provided, otherwise internal
  const cameraRef = { current: externalCameraRef?.current ?? internalCamera.current };
  // Sync external ref
  if (externalCameraRef && !externalCameraRef.current) {
    externalCameraRef.current = internalCamera.current;
    cameraRef.current = internalCamera.current;
  }

  const rendererRef = useRef<HexRenderer | null>(null);
  const renderCacheRef = useRef<RenderCache | null>(null);
  const animationManagerRef = useRef<AnimationManager | null>(null);
  const animationRendererRef = useRef<AnimationRenderer | null>(null);
  const {
    state, dispatch, terrainRegistry, featureRegistry, unitRegistry, resourceRegistry,
    selectedUnit, setSelectedUnit, selectedHex, setSelectedHex,
    reachableHexes, setHoveredHex: setGlobalHoveredHex,
    combatPreview, setCombatPreview, combatPreviewPosition, setCombatPreviewPosition,
    selectedCityId, selectCity,
    placementMode, enterPlacementMode, exitPlacementMode,
  } = useGameState();

  // Expose placement-mode entry/exit for E2E tests so Playwright can drive
  // the canvas overlay without having to click through CityPanel's build
  // list (which doesn't land until Cycle 5).
  useEffect(() => {
    (window as any).__enterPlacementMode = enterPlacementMode;
    (window as any).__exitPlacementMode = exitPlacementMode;
    (window as any).__placementMode = placementMode;
  }, [enterPlacementMode, exitPlacementMode, placementMode]);

  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);

  // ── Building placement overlay (Cycle 4) ──
  //
  // When placementMode is active, pre-compute the set of valid tile keys for
  // the chosen building/city pair. Memoed on placementMode + state so we
  // don't re-walk territory every frame. Null when inactive — the renderer
  // short-circuits.
  const placementValidTiles = useMemo<ReadonlySet<string> | null>(() => {
    if (!placementMode) return null;
    const tiles = listValidTilesForBuilding(placementMode.cityId, placementMode.buildingId, state);
    return new Set(tiles.map(coordToKey));
  }, [placementMode, state]);

  // Sync local hover state to global state for combat preview
  useEffect(() => {
    setGlobalHoveredHex(hoveredHex);
  }, [hoveredHex, setGlobalHoveredHex]);

  // Calculate combat preview when hovering over attackable targets
  useEffect(() => {
    if (!selectedUnit || !hoveredHex) {
      setCombatPreview(null);
      setCombatPreviewPosition(null);
      return;
    }

    // Check if hovering over an enemy unit
    let enemyUnitId: string | null = null;
    for (const [id, unit] of state.units) {
      if (unit.owner !== selectedUnit.owner && coordToKey(unit.position) === coordToKey(hoveredHex)) {
        enemyUnitId = id;
        break;
      }
    }

    // Check if hovering over an enemy city
    let enemyCityId: string | null = null;
    for (const [id, city] of state.cities) {
      if (city.owner !== selectedUnit.owner && coordToKey(city.position) === coordToKey(hoveredHex)) {
        enemyCityId = id;
        break;
      }
    }

    // Calculate preview if hovering over attackable target
    if (enemyUnitId) {
      const preview = calculateCombatPreview(state, selectedUnit.id, enemyUnitId);
      if (preview.canAttack) {
        setCombatPreview(preview);
        setCombatPreviewPosition(null); // Position will be set by mouse move
      } else {
        setCombatPreview(null);
        setCombatPreviewPosition(null);
      }
    } else if (enemyCityId) {
      // Use city combat preview
      const preview = calculateCityCombatPreview(state, selectedUnit.id, enemyCityId);
      if (preview.canAttack) {
        setCombatPreview(preview);
        setCombatPreviewPosition(null); // Position will be set by mouse move
      } else {
        setCombatPreview(null);
        setCombatPreviewPosition(null);
      }
    } else {
      setCombatPreview(null);
      setCombatPreviewPosition(null);
    }
  }, [selectedUnit, hoveredHex, state, setCombatPreview, setCombatPreviewPosition]);

  // Track drag state
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const dragDistRef = useRef(0);

  // Initialize canvas and renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize render cache for performance optimization
    renderCacheRef.current = new RenderCache();
    rendererRef.current = new HexRenderer(ctx, renderCacheRef.current);
    // AnimationManager is owned here — not by GameProvider. It's a purely
    // visual concern of the canvas layer.
    animationManagerRef.current = new AnimationManager();
    animationRendererRef.current = new AnimationRenderer(ctx);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      cameraRef.current.setCanvasSize(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    // Center camera on the map's visual center so the whole map is visible on
    // startup. Average all tile pixel positions for an accurate centroid.
    // This is preferable to centering on the player's first unit which is
    // often in the lower-left quadrant, leaving the upper-right cut off.
    {
      const tiles = [...state.map.tiles.values()];
      if (tiles.length > 0) {
        let sumX = 0, sumY = 0;
        for (const tile of tiles) {
          const px = hexToPixel(tile.coord);
          sumX += px.x; sumY += px.y;
        }
        cameraRef.current.centerOn(sumX / tiles.length, sumY / tiles.length);
      }
    }

    // Expose a hex→screen helper for E2E tests (Playwright needs to click on known hexes).
    (window as any).__hexToScreen = (q: number, r: number) => {
      const c = canvasRef.current;
      const cam = cameraRef.current;
      if (!c || !cam) return null;
      const { x: wx, y: wy } = hexToPixel({ q, r });
      const rect = c.getBoundingClientRect();
      return {
        x: rect.left + (wx - cam.x) * cam.zoom + c.width / 2,
        y: rect.top + (wy - cam.y) * cam.zoom + c.height / 2,
      };
    };
    // Debug hook: centers camera on any hex from tests.
    (window as any).__centerCameraOn = (q: number, r: number) => {
      const cam = cameraRef.current;
      if (!cam) return;
      const { x, y } = hexToPixel({ q, r });
      cam.centerOn(x, y);
    };
    (window as any).__cameraState = () => {
      const cam = cameraRef.current;
      return cam ? { x: cam.x, y: cam.y, zoom: cam.zoom } : null;
    };

    return () => {
      window.removeEventListener('resize', resize);
      delete (window as any).__hexToScreen;
    };
  }, []);

  // Re-center camera whenever a brand-new game loads (state.rng.seed changes).
  // The initialisation effect above only runs on mount, so switching from
  // an old game to a new one would leave the camera wherever it was.
  useEffect(() => {
    const tiles = [...state.map.tiles.values()];
    if (tiles.length === 0) return;
    let sumX = 0, sumY = 0;
    for (const tile of tiles) {
      const px = hexToPixel(tile.coord);
      sumX += px.x; sumY += px.y;
    }
    cameraRef.current.centerOn(sumX / tiles.length, sumY / tiles.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rng.seed]);

  // ── Animation event subscription ──
  //
  // Subscribe to the AnimationEventBus so we can enqueue animations after
  // each action without GameProvider needing to import AnimationManager.
  // The unitRegistry ref keeps the subscriber stable across re-renders.
  const unitRegistryRef = useRef(unitRegistry);
  useEffect(() => {
    unitRegistryRef.current = unitRegistry;
  }, [unitRegistry]);

  useEffect(() => {
    const unsubscribe = animationEventBus.subscribe(({ action, prevState, nextState }) => {
      const am = animationManagerRef.current;
      if (!am) return;
      const reg = unitRegistryRef.current;

      switch (action.type) {
        case 'MOVE_UNIT': {
          const unit = nextState.units.get(action.unitId);
          if (unit && action.path.length > 0) {
            am.add(am.createUnitMoveAnimation(action.unitId, unit.owner, unit.typeId, action.path, 400));
          }
          break;
        }

        case 'ATTACK_UNIT': {
          const attacker = nextState.units.get(action.attackerId);
          const target = prevState.units.get(action.targetId); // may be dead in nextState

          if (attacker && target) {
            const attackerDef = reg.get(attacker.typeId);
            const isRanged = attackerDef?.category === 'ranged' || attackerDef?.category === 'siege';

            if (isRanged) {
              am.add(am.createRangedAttackAnimation(
                action.attackerId, attacker.typeId, attacker.owner,
                action.targetId, target.typeId, target.owner,
                attacker.position, target.position,
                RANGED_PROJECTILE_COLOR, 500,
              ));
            } else {
              am.add(am.createMeleeAttackAnimation(
                action.attackerId, attacker.typeId, attacker.owner,
                action.targetId, target.typeId, target.owner,
                attacker.position, target.position, 300,
              ));
            }

            am.add(am.createDamageFlashAnimation(action.targetId, target.position, false, 200));

            // Floating damage on target
            const nextTarget = nextState.units.get(action.targetId);
            const dealtToTarget = nextTarget
              ? Math.max(0, target.health - nextTarget.health)
              : target.health;
            if (dealtToTarget > 0) {
              am.add(am.createFloatingDamageAnimation(action.targetId, target.position, dealtToTarget));
            }

            // Melee retaliation damage on attacker
            const prevAttacker = prevState.units.get(action.attackerId);
            const nextAttacker = nextState.units.get(action.attackerId);
            if (prevAttacker && nextAttacker) {
              const dealtToAttacker = Math.max(0, prevAttacker.health - nextAttacker.health);
              if (dealtToAttacker > 0) {
                am.add(am.createFloatingDamageAnimation(action.attackerId, prevAttacker.position, dealtToAttacker));
              }
            }
          }

          // Unit death
          if (!nextState.units.has(action.targetId) && prevState.units.has(action.targetId)) {
            const deadUnit = prevState.units.get(action.targetId);
            if (deadUnit) {
              am.add(am.createUnitDeathAnimation(action.targetId, deadUnit.position, deadUnit.owner, deadUnit.typeId, 600));
            }
          }
          break;
        }

        case 'ATTACK_CITY': {
          const city = nextState.cities.get(action.cityId);
          const prevCity = prevState.cities.get(action.cityId);
          if (city) {
            am.add(am.createDamageFlashAnimation(action.cityId, city.position, true, 300));
            if (prevCity) {
              const dealt = Math.max(0, prevCity.defenseHP - city.defenseHP);
              if (dealt > 0) {
                am.add(am.createFloatingDamageAnimation(action.cityId, city.position, dealt));
              }
            }
          }
          break;
        }

        case 'FOUND_CITY': {
          const newCity = Array.from(nextState.cities.values()).find(c =>
            !prevState.cities.has(c.id) && c.name === action.name,
          );
          if (newCity) {
            am.add(am.createCityFoundedAnimation(newCity.id, newCity.position, newCity.owner, action.name, 800));
          }
          break;
        }

        case 'SET_PRODUCTION': {
          const city = nextState.cities.get(action.cityId);
          if (city && city.productionProgress >= 100) {
            am.add(am.createProductionCompleteAnimation(action.cityId, city.position, action.itemId, action.itemType, 800));
          }
          break;
        }
      }

      // Detect turn-processing state changes (city growth, production, age transitions)
      // that happen as side-effects of END_TURN / AI turns.
      for (const [cityId, city] of nextState.cities) {
        const prevCity = prevState.cities.get(cityId);

        // City population growth
        if (prevCity && city.population > prevCity.population) {
          am.add(am.createCityGrowthAnimation(cityId, city.position, prevCity.population, city.population, 400));
        }

        // Production completion during turn processing
        if (prevCity && prevCity.productionProgress < 100 && city.productionProgress >= 100) {
          const currentItem = city.productionQueue[0];
          if (currentItem) {
            am.add(am.createProductionCompleteAnimation(cityId, city.position, currentItem.id, currentItem.type, 800));
          }
        }

        // New city founded during AI turn
        if (!prevState.cities.has(cityId)) {
          am.add(am.createCityFoundedAnimation(cityId, city.position, city.owner, city.name, 600));
        }
      }

      // Age transition screen shake (spec §4 row 16 / Phase 6.6).
      // Trigger point: the moment the new age is locked in (state.age.currentAge
      // changes), NOT when DramaModal opens. The canvas element is the target;
      // under prefers-reduced-motion AnimationManager falls back to a backdrop flash.
      if (prevState.age.currentAge !== nextState.age.currentAge) {
        am.startAgeShake(canvasRef.current);
      }
    });

    return unsubscribe;
  }, []);

  // Render loop
  useEffect(() => {
    let animFrame: number;

    const render = () => {
      const renderer = rendererRef.current;
      const animationManager = animationManagerRef.current;
      const animationRenderer = animationRendererRef.current;
      if (!renderer) return;

      const currentTime = performance.now();

      // Update animations
      if (animationManager) {
        animationManager.update(currentTime);
      }

      const reachableSet = reachableHexes
        ? new Set(reachableHexes.keys())
        : null;

      // When combatPreview is active it means the hovered hex holds an attackable enemy.
      // In that case show the red attack target; suppress the yellow MOVE preview so we
      // don't send mixed signals.
      const attackTarget: HexCoord | null = combatPreview && combatPreview.canAttack ? hoveredHex : null;

      // Compute the move-path preview: when a unit is selected AND the hovered hex is
      // within its reach, find the path so the renderer can draw it. Recomputed per
      // frame — pathfinding on a small 3–6 step grid is cheap (<1ms), so no need to memo.
      let pathPreview: ReadonlyArray<HexCoord> | null = null;
      if (!attackTarget && selectedUnit && hoveredHex && reachableSet) {
        const hoveredKey = coordToKey(hoveredHex);
        if (reachableSet.has(hoveredKey) && hoveredKey !== coordToKey(selectedUnit.position)) {
          const costFn = (_from: HexCoord, to: HexCoord) => {
            const tile = state.map.tiles.get(coordToKey(to));
            if (!tile) return null;
            return getMovementCost(tile)?.cost ?? null;
          };
          pathPreview = findPath(selectedUnit.position, hoveredHex, costFn, selectedUnit.movementLeft);
        }
      }

      const player = state.players.get(state.currentPlayerId);
      renderer.render(cameraRef.current, {
        state,
        terrainRegistry,
        featureRegistry,
        resourceRegistry,
        selectedHex,
        selectedUnit,
        reachableHexes: reachableSet,
        hoveredHex,
        pathPreview,
        attackTarget,
        visibility: player?.visibility ?? null,
        explored: player?.explored ?? null,
        showYields,
        showLabels,
        turnNumber: state.turn,
        placementCityId: placementMode?.cityId ?? null,
        placementValidTiles,
        placementHovered: placementMode ? hoveredHex : null,
      });

      // Render animations on top
      if (animationRenderer && animationManager) {
        const isTileVisible = player?.visibility && player?.explored
          ? (coord: HexCoord) => player.visibility?.has(coordToKey(coord)) ?? false
          : undefined;
        animationRenderer.render(cameraRef.current, animationManager, currentTime, isTileVisible);
      }

      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [state, selectedHex, selectedUnit, hoveredHex, terrainRegistry, featureRegistry, resourceRegistry, reachableHexes, showYields, showLabels, placementMode, placementValidTiles]);

  // ── Modern-RTS click semantics ──
  // LEFT-CLICK = SELECT ONLY. Never moves, never attacks. It picks/cycles own entities on
  // the clicked tile, or clears selection + shows terrain info on an empty tile.
  const handleClick = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = screenX - rect.left;
    const sy = screenY - rect.top;
    const world = cameraRef.current.screenToWorld(sx, sy);
    const hex = pixelToHex(world.x, world.y);

    // ── Placement-mode short-circuit (Cycle 4) ──
    //
    // When the player is in building placement mode, left-click either
    // commits the placement by dispatching SET_PRODUCTION with the chosen
    // tile (Cycle 1 engine path then auto-places on completion) or, on an
    // invalid tile, silently exits placement so the player can retry.
    // Normal selection/cycling is suppressed entirely.
    if (placementMode && placementValidTiles) {
      const hexKey = coordToKey(hex);
      if (placementValidTiles.has(hexKey)) {
        dispatch({
          type: 'SET_PRODUCTION',
          cityId: placementMode.cityId,
          itemId: placementMode.buildingId,
          itemType: 'building',
          tile: hex,
        });
      }
      exitPlacementMode();
      return;
    }

    const contents = getTileContents(state, hex, state.currentPlayerId);
    const cycle = getSelectionCycle(contents, state.currentPlayerId);

    // No own entities → deselect + tile info (never moves or attacks here).
    if (cycle.length === 0) {
      setSelectedUnit(null);
      setSelectedHex(hex);
      onBuilderDeselected?.();
      return;
    }

    // Cycle through own entities (military → civilian → city).
    const currentIdxInCycle = cycle.findIndex(e => e.type === 'unit' && selectedUnit?.id === e.id);
    const nextIdx = currentIdxInCycle >= 0 ? (currentIdxInCycle + 1) % cycle.length : 0;
    const next = cycle[nextIdx];

    if (next.type === 'unit') {
      const unit = state.units.get(next.id) ?? null;
      const unitDef = unit ? unitRegistry.get(unit.typeId) : null;
      const isBuilder = unitDef?.abilities.includes('build_improvement') ?? false;
      setSelectedUnit(unit);
      setSelectedHex(hex);
      if (isBuilder) {
        onBuilderSelected?.();
      } else {
        onBuilderDeselected?.();
      }
    } else {
      // city
      const city = contents.city;
      if (city) {
        onCityClick?.(city);
        selectCity(city.id);
      }
      setSelectedUnit(null);
      setSelectedHex(hex);
      onBuilderDeselected?.();
    }
  }, [state, selectedUnit, setSelectedUnit, setSelectedHex, selectCity, unitRegistry, onCityClick, placementMode, placementValidTiles, dispatch, exitPlacementMode, onBuilderSelected, onBuilderDeselected]);

  // Mouse handlers — left button drives drag-pan + click-select; right button is reserved
  // for handleContextMenu (RTS-style action). Middle button is ignored.
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragDistRef.current = 0;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Update hovered hex
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = cameraRef.current.screenToWorld(screenX, screenY);
    const hex = pixelToHex(world.x, world.y);
    setHoveredHex(prev => {
      if (prev && prev.q === hex.q && prev.r === hex.r) return prev;
      return hex;
    });

    // Update combat preview position if showing
    if (combatPreview) {
      setCombatPreviewPosition({ x: e.clientX, y: e.clientY });
    }

    // Always track mouse position for edge scrolling
    const prevMouse = lastMouseRef.current;

    // Pan if dragging
    if (isDraggingRef.current) {
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      dragDistRef.current += Math.abs(dx) + Math.abs(dy);
      cameraRef.current.pan(dx, dy);
    }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, [combatPreview, setCombatPreviewPosition]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Only left-button mouseup triggers selection. Right-button mouseup must NOT run
    // handleClick, otherwise the empty-tile deselect path would wipe selectedUnit before
    // (or after) handleContextMenu runs, swallowing the MOVE_UNIT/ATTACK dispatch.
    if (e.button !== 0) return;
    if (dragDistRef.current < 5) {
      handleClick(e.clientX, e.clientY);
    }
    isDraggingRef.current = false;
  }, [handleClick]);

  // RIGHT-CLICK = CONTEXTUAL ACTION. Attack enemies in range, else move the selected unit to
  // the target tile. Never deselects and never cycles. With no unit selected, right-click is
  // a no-op (use ESC or left-click empty terrain to clear selection).
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    // Building placement mode (Cycle 4): right-click cancels placement,
    // matching the ESC behaviour in GameProvider. Suppresses normal
    // unit-action routing so the player can bail without side effects.
    if (placementMode) {
      exitPlacementMode();
      return;
    }

    if (!selectedUnit) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = cameraRef.current.screenToWorld(sx, sy);
    const hex = pixelToHex(world.x, world.y);
    const key = coordToKey(hex);

    const contents = getTileContents(state, hex, state.currentPlayerId);

    // 1. Attack enemy unit in range
    if (contents.enemyUnits.length > 0) {
      const attackable = getAttackableUnits(state, selectedUnit.id);
      const target = contents.enemyUnits.find(en => attackable.some(a => a.unitId === en.id));
      if (target) {
        dispatch({ type: 'ATTACK_UNIT', attackerId: selectedUnit.id, targetId: target.id });
        return;
      }
    }

    // 2. Attack enemy city in range
    if (contents.city && contents.city.owner !== state.currentPlayerId) {
      const attackableCities = getAttackableCities(state, selectedUnit.id);
      if (attackableCities.some(a => a.cityId === contents.city!.id)) {
        dispatch({ type: 'ATTACK_CITY', attackerId: selectedUnit.id, cityId: contents.city.id });
        return;
      }
    }

    // Civ VII stacking: 1 military + 1 civilian per tile. If the target tile already
    // holds an OWN unit of the same class as selectedUnit, a MOVE_UNIT would bounce
    // off the engine with "cannot stack" — that's an unreachable UI path, so we silent
    // no-op here rather than flashing a toast. Mixed-class stacks fall through to
    // the normal move path below.
    const movingDef = unitRegistry.get(selectedUnit.typeId);
    const movingIsCivilian = movingDef?.category === 'civilian' || movingDef?.category === 'religious';
    const ownUnitsOnTile = [...state.units.values()].filter(
      u => u.id !== selectedUnit.id && u.owner === state.currentPlayerId && coordToKey(u.position) === key,
    );
    if (ownUnitsOnTile.length > 0) {
      const anySameClass = ownUnitsOnTile.some(u => {
        const d = unitRegistry.get(u.typeId);
        const otherIsCivilian = d?.category === 'civilian' || d?.category === 'religious';
        return otherIsCivilian === movingIsCivilian;
      });
      if (anySameClass) {
        // Silent no-op: no toast, no error, preserve selection.
        return;
      }
    }

    // 3. Move to reachable hex
    if (selectedUnit.movementLeft > 0 && reachableHexes && reachableHexes.has(key)) {
      const costFn = (_from: HexCoord, to: HexCoord) => {
        const tile = state.map.tiles.get(coordToKey(to));
        if (!tile) return null;
        return getMovementCost(tile)?.cost ?? null;
      };
      const path = findPath(selectedUnit.position, hex, costFn, selectedUnit.movementLeft);
      if (path && path.length > 0) {
        dispatch({ type: 'MOVE_UNIT', unitId: selectedUnit.id, path });
        setSelectedHex(hex);
        return;
      }
    }

    // No valid action for this target — preserve selection (modern RTS semantics).
  }, [state, selectedUnit, reachableHexes, dispatch, setSelectedHex, unitRegistry, placementMode, exitPlacementMode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    cameraRef.current.zoomAt(
      e.clientX - rect.left,
      e.clientY - rect.top,
      e.deltaY,
    );
  }, []);

  // Keyboard handler (arrows + WASD + game shortcuts)
  useEffect(() => {
    const keysDown = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.key.toLowerCase());
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }

      // Skip shortcuts when typing in an input field
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key;

      if (key === 'Escape') {
        setSelectedUnit(null);
        setSelectedHex(null);
      }

      // Enter — End turn
      if (key === 'Enter') {
        e.preventDefault();
        dispatch({ type: 'END_TURN' });
      }

      // T — Toggle tech tree panel
      if (key === 't' || key === 'T') {
        onToggleTechTree?.();
      }

      // Y — Toggle yield lens
      if (key === 'y' || key === 'Y') {
        onToggleYields?.();
      }

      // F — Fortify selected unit
      if (key === 'f' || key === 'F') {
        if (selectedUnit) {
          dispatch({ type: 'FORTIFY_UNIT', unitId: selectedUnit.id });
        }
      }

      // B — Found city (if selected unit has found_city ability)
      if (key === 'b' || key === 'B') {
        if (selectedUnit) {
          const unitDef = unitRegistry.get(selectedUnit.typeId);
          if (unitDef && unitDef.abilities.includes('found_city')) {
            const cityCount = [...state.cities.values()].filter(c => c.owner === state.currentPlayerId).length;
            dispatch({
              type: 'FOUND_CITY',
              unitId: selectedUnit.id,
              name: `City ${cityCount + 1}`,
            });
          }
        }
      }

      // U — Upgrade selected unit (if has upgrade path)
      if (key === 'u' || key === 'U') {
        if (selectedUnit) {
          const unitDef = unitRegistry.get(selectedUnit.typeId);
          if (unitDef?.upgradesTo) {
            dispatch({ type: 'UPGRADE_UNIT', unitId: selectedUnit.id });
          }
        }
      }

      // Space — Cycle to next unit that still needs orders.
      // Skips fortified units (they already chose to hold) so Space surfaces only
      // units waiting on a decision — matches Civ VII "Next Unit" behavior.
      if (key === ' ') {
        e.preventDefault();
        const ownUnits = [...state.units.values()].filter(
          u => u.owner === state.currentPlayerId && u.movementLeft > 0 && !u.fortified,
        );
        if (ownUnits.length === 0) return;

        // Find the index of the currently selected unit
        const currentIdx = selectedUnit
          ? ownUnits.findIndex(u => u.id === selectedUnit.id)
          : -1;
        // Pick the next one (wrap around)
        const nextIdx = (currentIdx + 1) % ownUnits.length;
        const nextUnit = ownUnits[nextIdx];

        setSelectedUnit(nextUnit);
        setSelectedHex(nextUnit.position);

        // Center camera on the unit
        const { x, y } = hexToPixel(nextUnit.position);
        cameraRef.current.centerOn(x, y);
      }

      // C — Jump to capital (standard 4X shortcut). Falls back to first own city if no
      // capital is flagged yet (e.g. capital was razed and no successor set).
      if (key === 'c' || key === 'C') {
        e.preventDefault();
        const ownCities = [...state.cities.values()].filter(c => c.owner === state.currentPlayerId);
        if (ownCities.length === 0) return;
        const capital = ownCities.find(c => c.isCapital) ?? ownCities[0];

        setSelectedUnit(null);
        setSelectedHex(capital.position);
        selectCity(capital.id);
        onCityClick?.(capital);

        const { x, y } = hexToPixel(capital.position);
        cameraRef.current.centerOn(x, y);
      }

      // N — Cycle to next own city (mirrors Space for units); opens city panel + recenters.
      if (key === 'n' || key === 'N') {
        e.preventDefault();
        const ownCities = [...state.cities.values()].filter(c => c.owner === state.currentPlayerId);
        if (ownCities.length === 0) return;

        // Find the currently-selected city's index using selectedCityId from context
        // (formerly read from window.__selection — now sourced from GameProvider context).
        const curIdx = selectedCityId ? ownCities.findIndex(c => c.id === selectedCityId) : -1;
        const nextIdx = (curIdx + 1) % ownCities.length;
        const nextCity = ownCities[nextIdx];

        setSelectedUnit(null);
        setSelectedHex(nextCity.position);
        selectCity(nextCity.id);
        onCityClick?.(nextCity);

        const { x, y } = hexToPixel(nextCity.position);
        cameraRef.current.centerOn(x, y);
      }

      // J — Jump to next idle unit (movementLeft > 0, not fortified).
      // Cycles through the army on repeated presses, same ordering as Space.
      // Differs from Space in that it keeps cycling even when no unit is
      // currently selected (Space starts at index 0; J resumes from where J
      // last left off via idleCycleIdxRef).
      if (key === 'j' || key === 'J') {
        e.preventDefault();
        const ownUnits = [...state.units.values()].filter(
          u => u.owner === state.currentPlayerId && u.movementLeft > 0 && !u.fortified,
        );
        if (ownUnits.length === 0) {
          onNoIdleUnits?.();
          return;
        }

        // Find next index relative to the currently selected unit (mirrors
        // Space behavior) so J and Space share the same cycle position.
        const currentIdx = selectedUnit
          ? ownUnits.findIndex(u => u.id === selectedUnit.id)
          : -1;
        const nextIdx = (currentIdx + 1) % ownUnits.length;
        const nextUnit = ownUnits[nextIdx];

        setSelectedUnit(nextUnit);
        setSelectedHex(nextUnit.position);

        // Smoothly center the camera on the found unit.
        const { x, y } = hexToPixel(nextUnit.position);
        cameraRef.current.centerOn(x, y);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.key.toLowerCase());
    };

    // Continuous key-based scrolling
    let scrollFrame: number;
    const scrollLoop = () => {
      if (keysDown.has('arrowleft') || keysDown.has('a')) cameraRef.current.panByKey('ArrowLeft');
      if (keysDown.has('arrowright') || keysDown.has('d')) cameraRef.current.panByKey('ArrowRight');
      if (keysDown.has('arrowup') || keysDown.has('w')) cameraRef.current.panByKey('ArrowUp');
      if (keysDown.has('arrowdown') || keysDown.has('s')) cameraRef.current.panByKey('ArrowDown');
      scrollFrame = requestAnimationFrame(scrollLoop);
    };
    scrollFrame = requestAnimationFrame(scrollLoop);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(scrollFrame);
    };
  }, [setSelectedUnit, setSelectedHex, dispatch, selectedUnit, state, unitRegistry, onToggleTechTree, onToggleYields, selectCity, selectedCityId, onCityClick, onNoIdleUnits]);

  // Edge-of-screen scrolling — triggers at WINDOW edges, not canvas edges.
  // This way the cursor must be at the very edge of the browser window
  // to scroll, which doesn't conflict with TopBar/BottomBar buttons.
  //
  // NOTE: `windowMouse` starts at (0,0). Without the `hasMouseMoved` guard
  // both `mx <= EDGE` and `my <= EDGE` would fire on every animation frame
  // before the first mousemove, panning the camera hundreds of px to the
  // top-left before the user has touched anything (confirmed root-cause of
  // the "all-ocean on load" bug — cam.x reached −279 346 in one test).
  useEffect(() => {
    const EDGE = 3; // pixels from window edge
    let edgeFrame: number;
    let hasMouseMoved = false;
    const windowMouse = { x: 0, y: 0 };

    const trackMouse = (e: MouseEvent) => {
      windowMouse.x = e.clientX;
      windowMouse.y = e.clientY;
      hasMouseMoved = true;
    };

    const edgeScroll = () => {
      if (hasMouseMoved) {
        const mx = windowMouse.x;
        const my = windowMouse.y;
        const w = window.innerWidth;
        const h = window.innerHeight;

        if (mx <= EDGE) cameraRef.current.panByKey('ArrowLeft');
        if (mx >= w - EDGE) cameraRef.current.panByKey('ArrowRight');
        if (my <= EDGE) cameraRef.current.panByKey('ArrowUp');
        if (my >= h - EDGE) cameraRef.current.panByKey('ArrowDown');
      }

      edgeFrame = requestAnimationFrame(edgeScroll);
    };

    window.addEventListener('mousemove', trackMouse);
    edgeFrame = requestAnimationFrame(edgeScroll);

    return () => {
      window.removeEventListener('mousemove', trackMouse);
      cancelAnimationFrame(edgeFrame);
    };
  }, []);

  // Dynamic cursor — communicates what a click will do right now:
  //   crosshair → right-click here will ATTACK (enemy in range)
  //   pointer   → left-click here will select an own entity
  //   grab      → default (drag to pan; active:grabbing kicks in via Tailwind)
  const cursor = useMemo<'grab' | 'pointer' | 'crosshair'>(() => {
    if (combatPreview?.canAttack) return 'crosshair';
    if (!hoveredHex) return 'grab';
    const hoverKey = coordToKey(hoveredHex);
    // Pointer when hovering any own entity — invites a left-click to select/cycle.
    for (const unit of state.units.values()) {
      if (unit.owner === state.currentPlayerId && coordToKey(unit.position) === hoverKey) return 'pointer';
    }
    for (const city of state.cities.values()) {
      if (city.owner === state.currentPlayerId && coordToKey(city.position) === hoverKey) return 'pointer';
    }
    return 'grab';
  }, [state, hoveredHex, combatPreview]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="game-canvas"
      data-placement-mode={placementMode ? 'active' : 'inactive'}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={cursor !== 'grab' ? { cursor } : undefined}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        isDraggingRef.current = false;
        setCombatPreview(null);
        setCombatPreviewPosition(null);
      }}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    />
  );
}
