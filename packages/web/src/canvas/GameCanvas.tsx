import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameState } from '../providers/GameProvider';
import { Camera } from './Camera';
import { HexRenderer, pixelToHex, hexToPixel } from './HexRenderer';
import { RenderCache } from './RenderCache';
import { CombatHoverPreview } from '../ui/components/CombatHoverPreview';
import { ImprovementPanel } from '../ui/components/ImprovementPanel';
import { AnimationManager } from './AnimationManager';
import { AnimationRenderer } from './AnimationRenderer';
import type { HexCoord, UnitState, CityState } from '@hex/engine';
import { coordToKey, findPath, getMovementCost, getAttackableUnits, calculateCombatPreview, calculateCityCombatPreview, getAttackableCities } from '@hex/engine';

interface GameCanvasProps {
  onCityClick?: (city: CityState) => void;
  onToggleTechTree?: () => void;
  onToggleYields?: () => void;
  cameraRef?: React.MutableRefObject<Camera | null>;
  showYields?: boolean;
}

export function GameCanvas({ onCityClick, onToggleTechTree, onToggleYields, cameraRef: externalCameraRef, showYields = false }: GameCanvasProps) {
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
    reachableHexes, animationManager, setHoveredHex: setGlobalHoveredHex,
    combatPreview, setCombatPreview, combatPreviewPosition, setCombatPreviewPosition,
  } = useGameState();

  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);
  const [showImprovementPanel, setShowImprovementPanel] = useState(false);

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
  const mouseOverCanvasRef = useRef(false);
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
    animationManagerRef.current = animationManager ?? new AnimationManager();
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

    // Center camera on the player's first unit
    const playerUnit = [...state.units.values()].find(u => u.owner === state.currentPlayerId);
    if (playerUnit) {
      const { x, y } = hexToPixel(playerUnit.position);
      cameraRef.current.centerOn(x, y);
    }

    return () => window.removeEventListener('resize', resize);
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
        visibility: player?.visibility ?? null,
        explored: player?.explored ?? null,
        showYields,
        turnNumber: state.turn,
      });

      // Render animations on top
      if (animationRenderer && animationManager) {
        animationRenderer.render(cameraRef.current, animationManager, currentTime);
      }

      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [state, selectedHex, selectedUnit, hoveredHex, terrainRegistry, featureRegistry, resourceRegistry, reachableHexes, showYields, animationManager]);

  // Handle clicks — select units or move them
  const handleClick = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = screenX - rect.left;
    const sy = screenY - rect.top;
    const world = cameraRef.current.screenToWorld(sx, sy);
    const hex = pixelToHex(world.x, world.y);
    const key = coordToKey(hex);

    // Check if clicked on a unit
    let clickedUnit: UnitState | null = null;
    for (const unit of state.units.values()) {
      if (coordToKey(unit.position) === key && unit.owner === state.currentPlayerId) {
        clickedUnit = unit;
        break;
      }
    }

    // Check if clicked on a city
    let clickedCity: CityState | null = null;
    for (const city of state.cities.values()) {
      if (coordToKey(city.position) === key) {
        clickedCity = city;
        break;
      }
    }

    if (clickedCity && clickedCity.owner === state.currentPlayerId) {
      // Open city panel
      onCityClick?.(clickedCity);
      setSelectedUnit(null);
      setSelectedHex(hex);
    } else if (clickedUnit) {
      // Select the unit
      setSelectedUnit(clickedUnit);
      setSelectedHex(hex);
      setShowImprovementPanel(false);
    } else if (selectedUnit && selectedUnit.movementLeft > 0) {
      // Check if selected unit is a Builder
      const unitDef = unitRegistry.get(selectedUnit.typeId);
      const isBuilder = unitDef?.abilities.includes('build_improvement');

      if (isBuilder) {
        // Builder: show improvement panel for the clicked tile
        setSelectedHex(hex);
        setShowImprovementPanel(true);
      } else {
        // Regular unit: check for attack or move
        // Check if clicking on an enemy unit (attack)
        let enemyUnit: UnitState | null = null;
        for (const unit of state.units.values()) {
          if (coordToKey(unit.position) === key && unit.owner !== state.currentPlayerId) {
            enemyUnit = unit;
            break;
          }
        }

        if (enemyUnit) {
          // Attack the enemy
          dispatch({
            type: 'ATTACK_UNIT',
            attackerId: selectedUnit.id,
            targetId: enemyUnit.id,
          });
          // Keep unit selected but it will have 0 movement after attack
          setSelectedHex(hex);
        } else if (reachableHexes && reachableHexes.has(key)) {
          // Move selected unit to clicked hex
          const costFn = (from: HexCoord, to: HexCoord) => {
            const tile = state.map.tiles.get(coordToKey(to));
            if (!tile) return null;
            return getMovementCost(tile);
          };
          const path = findPath(selectedUnit.position, hex, costFn, selectedUnit.movementLeft);
          if (path && path.length > 0) {
            dispatch({
              type: 'MOVE_UNIT',
              unitId: selectedUnit.id,
              path,
            });
            // Keep unit selected at new position (will re-read from state via effect below)
            setSelectedHex(hex);
          }
        } else {
          // Clicked unreachable hex — deselect
          setSelectedUnit(null);
          setSelectedHex(hex);
        }
      }
    } else {
      // Deselect
      setSelectedUnit(null);
      setSelectedHex(hex);
    }
  }, [state, selectedUnit, reachableHexes, dispatch, setSelectedUnit, setSelectedHex]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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
    if (dragDistRef.current < 5) {
      handleClick(e.clientX, e.clientY);
    }
    isDraggingRef.current = false;
  }, [handleClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedUnit(null);
    setSelectedHex(null);
  }, [setSelectedUnit, setSelectedHex]);

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

      // Space — Cycle to next unit with movement left
      if (key === ' ') {
        e.preventDefault();
        const ownUnits = [...state.units.values()].filter(
          u => u.owner === state.currentPlayerId && u.movementLeft > 0,
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
  }, [setSelectedUnit, setSelectedHex, dispatch, selectedUnit, state, unitRegistry, onToggleTechTree, onToggleYields]);

  // Edge-of-screen scrolling
  // Top edge is small (8px) to avoid conflict with TopBar buttons
  // Bottom edge is small (8px) to avoid conflict with BottomBar
  // Left/right edges use a moderate zone
  useEffect(() => {
    const EDGE_SIDE = 15;
    const EDGE_TOP = 8;
    const EDGE_BOTTOM = 8;
    let edgeFrame: number;

    const edgeScroll = () => {
      const canvas = canvasRef.current;
      if (!canvas || !mouseOverCanvasRef.current) {
        edgeFrame = requestAnimationFrame(edgeScroll);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mx = lastMouseRef.current.x - rect.left;
      const my = lastMouseRef.current.y - rect.top;

      if (mx >= 0 && mx <= rect.width && my >= 0 && my <= rect.height) {
        if (mx < EDGE_SIDE) cameraRef.current.panByKey('ArrowLeft');
        if (mx > rect.width - EDGE_SIDE) cameraRef.current.panByKey('ArrowRight');
        if (my < EDGE_TOP) cameraRef.current.panByKey('ArrowUp');
        if (my > rect.height - EDGE_BOTTOM) cameraRef.current.panByKey('ArrowDown');
      }

      edgeFrame = requestAnimationFrame(edgeScroll);
    };
    edgeFrame = requestAnimationFrame(edgeScroll);

    return () => cancelAnimationFrame(edgeFrame);
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseEnter={() => { mouseOverCanvasRef.current = true; }}
        onMouseLeave={() => {
          mouseOverCanvasRef.current = false;
          isDraggingRef.current = false;
          setCombatPreview(null);
          setCombatPreviewPosition(null);
        }}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
      {combatPreview && (
        <CombatHoverPreview
          preview={combatPreview}
          position={combatPreviewPosition}
        />
      )}
      {showImprovementPanel && selectedUnit && (
        <ImprovementPanel
          builderUnitId={selectedUnit.id}
          onClose={() => {
            setShowImprovementPanel(false);
            setSelectedUnit(null);
            setSelectedHex(null);
          }}
        />
      )}
    </>
  );
}
