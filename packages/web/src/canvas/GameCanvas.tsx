import { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../providers/GameProvider';
import { Camera } from './Camera';
import { HexRenderer, pixelToHex, hexToPixel } from './HexRenderer';
import type { HexCoord, UnitState, CityState } from '@hex/engine';
import { coordToKey, findPath, getMovementCost } from '@hex/engine';

interface GameCanvasProps {
  onCityClick?: (city: CityState) => void;
}

export function GameCanvas({ onCityClick }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(new Camera());
  const rendererRef = useRef<HexRenderer | null>(null);
  const {
    state, dispatch, terrainRegistry, featureRegistry,
    selectedUnit, setSelectedUnit, selectedHex, setSelectedHex,
    reachableHexes,
  } = useGame();

  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);

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

    rendererRef.current = new HexRenderer(ctx);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      cameraRef.current.setCanvasSize(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    // Center camera on first unit
    const firstUnit = state.units.values().next().value;
    if (firstUnit) {
      const { x, y } = hexToPixel(firstUnit.position);
      cameraRef.current.centerOn(x, y);
    }

    return () => window.removeEventListener('resize', resize);
  }, []);

  // Render loop
  useEffect(() => {
    let animFrame: number;

    const render = () => {
      const renderer = rendererRef.current;
      if (!renderer) return;

      const reachableSet = reachableHexes
        ? new Set(reachableHexes.keys())
        : null;

      renderer.render(cameraRef.current, {
        state,
        terrainRegistry,
        featureRegistry,
        selectedHex,
        selectedUnit,
        reachableHexes: reachableSet,
        hoveredHex,
      });

      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [state, selectedHex, selectedUnit, hoveredHex, terrainRegistry, featureRegistry, reachableHexes]);

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
    } else if (selectedUnit && selectedUnit.movementLeft > 0) {
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
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragDistRef.current < 5) {
      handleClick(e.clientX, e.clientY);
    }
    isDraggingRef.current = false;
  }, [handleClick]);

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

  // Keyboard handler (arrows + WASD)
  useEffect(() => {
    const keysDown = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.key.toLowerCase());
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        setSelectedUnit(null);
        setSelectedHex(null);
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
  }, [setSelectedUnit, setSelectedHex]);

  // Edge-of-screen scrolling
  useEffect(() => {
    const EDGE_SIZE = 30;
    const EDGE_SPEED = 8;
    let edgeFrame: number;

    const edgeScroll = () => {
      const canvas = canvasRef.current;
      if (!canvas) { edgeFrame = requestAnimationFrame(edgeScroll); return; }
      const rect = canvas.getBoundingClientRect();
      const mx = lastMouseRef.current.x - rect.left;
      const my = lastMouseRef.current.y - rect.top;

      if (mx >= 0 && mx <= rect.width && my >= 0 && my <= rect.height) {
        if (mx < EDGE_SIZE) cameraRef.current.panByKey('ArrowLeft');
        if (mx > rect.width - EDGE_SIZE) cameraRef.current.panByKey('ArrowRight');
        if (my < EDGE_SIZE) cameraRef.current.panByKey('ArrowUp');
        if (my > rect.height - EDGE_SIZE) cameraRef.current.panByKey('ArrowDown');
      }

      edgeFrame = requestAnimationFrame(edgeScroll);
    };
    edgeFrame = requestAnimationFrame(edgeScroll);

    return () => cancelAnimationFrame(edgeFrame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { isDraggingRef.current = false; }}
      onWheel={handleWheel}
    />
  );
}
