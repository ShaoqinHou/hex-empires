import { useRef, useEffect, useCallback } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { hexToPixel } from '../../utils/hexMath';

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 130;

interface MinimapProps {
  cameraRef?: React.RefObject<{ x: number; y: number; zoom: number; centerOn: (x: number, y: number) => void } | null>;
}

export function Minimap({ cameraRef }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, terrainRegistry } = useGameState();

  // Compute world bounds for coordinate mapping
  const worldBounds = useRef({ minX: 0, maxX: 1, minY: 0, maxY: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate world pixel bounds from all tiles
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const tile of state.map.tiles.values()) {
      const { x, y } = hexToPixel(tile.coord);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const pad = 50;
    minX -= pad; maxX += pad; minY -= pad; maxY += pad;
    worldBounds.current = { minX, maxX, minY, maxY };

    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const scaleX = MINIMAP_WIDTH / worldW;
    const scaleY = MINIMAP_HEIGHT / worldH;

    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Draw terrain
    for (const tile of state.map.tiles.values()) {
      const terrain = terrainRegistry.get(tile.terrain);
      if (!terrain) continue;
      const { x, y } = hexToPixel(tile.coord);
      const mx = (x - minX) * scaleX;
      const my = (y - minY) * scaleY;
      ctx.fillStyle = terrain.color;
      ctx.fillRect(mx - 2, my - 2, 4, 4);
    }

    // Draw cities
    const playerColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];
    const playerIds = [...state.players.keys()];
    for (const city of state.cities.values()) {
      const { x, y } = hexToPixel(city.position);
      const mx = (x - minX) * scaleX;
      const my = (y - minY) * scaleY;
      const pi = playerIds.indexOf(city.owner);
      ctx.fillStyle = playerColors[pi % playerColors.length];
      ctx.fillRect(mx - 3, my - 3, 6, 6);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(mx - 3, my - 3, 6, 6);
    }

    // Draw units
    for (const unit of state.units.values()) {
      const { x, y } = hexToPixel(unit.position);
      const mx = (x - minX) * scaleX;
      const my = (y - minY) * scaleY;
      const pi = playerIds.indexOf(unit.owner);
      ctx.fillStyle = playerColors[pi % playerColors.length];
      ctx.beginPath();
      ctx.arc(mx, my, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw camera viewport rectangle
    if (cameraRef?.current) {
      const cam = cameraRef.current;
      // Approximate viewport in world coords (assuming ~800x500 screen at current zoom)
      const vpHalfW = 400 / cam.zoom;
      const vpHalfH = 250 / cam.zoom;
      const vpLeft = (cam.x - vpHalfW - minX) * scaleX;
      const vpTop = (cam.y - vpHalfH - minY) * scaleY;
      const vpW = (vpHalfW * 2) * scaleX;
      const vpH = (vpHalfH * 2) * scaleY;

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vpLeft, vpTop, vpW, vpH);
    }
  }, [state, terrainRegistry, cameraRef]);

  // Click to navigate
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!cameraRef?.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { minX, maxX, minY, maxY } = worldBounds.current;
    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const worldX = minX + (mx / MINIMAP_WIDTH) * worldW;
    const worldY = minY + (my / MINIMAP_HEIGHT) * worldH;

    cameraRef.current.centerOn(worldX, worldY);
  }, [cameraRef]);

  return (
    <div className="absolute bottom-16 left-2 rounded-lg overflow-hidden cursor-pointer"
      style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
      <canvas
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        onClick={handleClick}
      />
    </div>
  );
}
