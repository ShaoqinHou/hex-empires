import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useGameState } from '../providers/GameProvider';
import { Camera } from './Camera';
import { HexRenderer, pixelToHex, hexToPixel } from './HexRenderer';
import { RenderCache } from './RenderCache';
import { CombatHoverPreview } from '../ui/components/CombatHoverPreview';
import { ImprovementPanel } from '../ui/components/ImprovementPanel';
import { AnimationManager } from './AnimationManager';
import { AnimationRenderer } from './AnimationRenderer';
import type { HexCoord, CityState } from '@hex/engine';
import { coordToKey, findPath, getMovementCost, getAttackableUnits, calculateCombatPreview, calculateCityCombatPreview, getAttackableCities, getTileContents, getSelectionCycle } from '@hex/engine';

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
    selectCity,
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
            return getMovementCost(tile);
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

    const contents = getTileContents(state, hex, state.currentPlayerId);
    const cycle = getSelectionCycle(contents, state.currentPlayerId);

    // No own entities → deselect + tile info (never moves or attacks here).
    if (cycle.length === 0) {
      setSelectedUnit(null);
      setSelectedHex(hex);
      setShowImprovementPanel(false);
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
      setShowImprovementPanel(isBuilder);
    } else {
      // city
      const city = contents.city;
      if (city) {
        onCityClick?.(city);
        selectCity(city.id);
      }
      setSelectedUnit(null);
      setSelectedHex(hex);
      setShowImprovementPanel(false);
    }
  }, [state, selectedUnit, setSelectedUnit, setSelectedHex, selectCity, unitRegistry, onCityClick]);

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

    // 3. Move to reachable hex
    if (selectedUnit.movementLeft > 0 && reachableHexes && reachableHexes.has(key)) {
      const costFn = (_from: HexCoord, to: HexCoord) => {
        const tile = state.map.tiles.get(coordToKey(to));
        if (!tile) return null;
        return getMovementCost(tile);
      };
      const path = findPath(selectedUnit.position, hex, costFn, selectedUnit.movementLeft);
      if (path && path.length > 0) {
        dispatch({ type: 'MOVE_UNIT', unitId: selectedUnit.id, path });
        setSelectedHex(hex);
        return;
      }
    }

    // No valid action for this target — preserve selection (modern RTS semantics).
  }, [state, selectedUnit, reachableHexes, dispatch, setSelectedHex]);

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

        const currentCityIdx = ownCities.findIndex(c => c.id === (selectedUnit ? null : /* no selectedCity signal here */ c.id));
        // Track cycling via a ref anchored to ownCity list order; simplest path: find by
        // currently-selected city id (exposed to canvas via window.__selection for now, to
        // avoid plumbing another prop through — if selectCity just ran for city X, X is next.)
        const selState = (window as any).__selection as { cityId: string | null } | undefined;
        const curIdx = selState?.cityId ? ownCities.findIndex(c => c.id === selState.cityId) : -1;
        const nextIdx = (curIdx + 1) % ownCities.length;
        const nextCity = ownCities[nextIdx];

        setSelectedUnit(null);
        setSelectedHex(nextCity.position);
        selectCity(nextCity.id);
        onCityClick?.(nextCity);

        const { x, y } = hexToPixel(nextCity.position);
        cameraRef.current.centerOn(x, y);
        // Silence unused; kept for future if we swap to prop-based cycling index.
        void currentCityIdx;
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
  }, [setSelectedUnit, setSelectedHex, dispatch, selectedUnit, state, unitRegistry, onToggleTechTree, onToggleYields, selectCity, onCityClick]);

  // Edge-of-screen scrolling — triggers at WINDOW edges, not canvas edges.
  // This way the cursor must be at the very edge of the browser window
  // to scroll, which doesn't conflict with TopBar/BottomBar buttons.
  useEffect(() => {
    const EDGE = 3; // pixels from window edge
    let edgeFrame: number;
    const windowMouse = { x: 0, y: 0 };

    const trackMouse = (e: MouseEvent) => {
      windowMouse.x = e.clientX;
      windowMouse.y = e.clientY;
    };

    const edgeScroll = () => {
      const mx = windowMouse.x;
      const my = windowMouse.y;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (mx <= EDGE) cameraRef.current.panByKey('ArrowLeft');
      if (mx >= w - EDGE) cameraRef.current.panByKey('ArrowRight');
      if (my <= EDGE) cameraRef.current.panByKey('ArrowUp');
      if (my >= h - EDGE) cameraRef.current.panByKey('ArrowDown');

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
    <>
      <canvas
        ref={canvasRef}
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
