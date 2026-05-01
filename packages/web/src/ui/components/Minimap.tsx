import { useRef, useEffect, useCallback } from 'react';
import { coordToKey, type HexCoord } from '@hex/engine';
import { useGameState } from '../../providers/GameProvider';
import { hexToPixel } from '../../utils/hexMath';

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 130;

// Match the main renderer terrain palette
const TERRAIN_PALETTE: Record<string, string> = {
  grassland: '#5da84e',
  plains: '#d4b85a',
  desert: '#e8d5a3',
  tundra: '#b0c4ce',
  snow: '#eaf4f4',
  coast: '#5ba0d0',
  ocean: '#1e4d7a',
};
const TERRAIN_FALLBACK = '#454a52';

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

    // Fill background so unexplored regions still read correctly
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Fetch current player fog-of-war sets
    const currentPlayer = state.players.get(state.currentPlayerId);
    const visibility: ReadonlySet<string> | null = currentPlayer?.visibility ?? null;
    const explored: ReadonlySet<string> | null = currentPlayer?.explored ?? null;
    const hasFogData = visibility !== null && explored !== null;

    const isExplored = (coord: HexCoord) => {
      if (!hasFogData) return true;
      return explored!.has(coordToKey(coord));
    };

    const isVisible = (coord: HexCoord) => {
      if (!hasFogData) return true;
      return visibility!.has(coordToKey(coord));
    };

    // Draw terrain using the main-renderer palette
    for (const tile of state.map.tiles.values()) {
      const terrain = terrainRegistry.get(tile.terrain);
      if (!terrain) continue;
      const { x, y } = hexToPixel(tile.coord);
      const mx = (x - minX) * scaleX;
      const my = (y - minY) * scaleY;
      ctx.fillStyle = TERRAIN_PALETTE[tile.terrain] ?? TERRAIN_FALLBACK;
      ctx.fillRect(mx - 2, my - 2, 4, 4);
    }

    // Draw cities
    const playerColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];
    const playerIds = [...state.players.keys()];
    for (const city of state.cities.values()) {
      if (!isExplored(city.position)) continue;

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
      if (!isVisible(unit.position)) continue;

      const { x, y } = hexToPixel(unit.position);
      const mx = (x - minX) * scaleX;
      const my = (y - minY) * scaleY;
      const pi = playerIds.indexOf(unit.owner);
      ctx.fillStyle = playerColors[pi % playerColors.length];
      ctx.beginPath();
      ctx.arc(mx, my, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw fog overlay above terrain AND entities (including explored-but-hidden
    // content) so partially explored content is visibly dimmed.
    if (hasFogData) {
      for (const tile of state.map.tiles.values()) {
        const key = coordToKey(tile.coord);
        const { x, y } = hexToPixel(tile.coord);
        const mx = (x - minX) * scaleX;
        const my = (y - minY) * scaleY;

        if (!explored!.has(key)) {
          // Completely unexplored → 80% black overlay
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(mx - 2, my - 2, 4, 4);
        } else if (!visibility!.has(key)) {
          // Explored but not currently visible → 40% black overlay
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(mx - 2, my - 2, 4, 4);
        }
      }
    }

    // Draw camera viewport rectangle — thick black outer + white inner for contrast
    if (cameraRef?.current) {
      const cam = cameraRef.current;
      // Use actual window dimensions for viewport calculation
      const vpHalfW = (window.innerWidth / 2) / cam.zoom;
      const vpHalfH = (window.innerHeight / 2) / cam.zoom;
      const vpLeft = (cam.x - vpHalfW - minX) * scaleX;
      const vpTop = (cam.y - vpHalfH - minY) * scaleY;
      const vpW = (vpHalfW * 2) * scaleX;
      const vpH = (vpHalfH * 2) * scaleY;

      // Outer black outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 4;
      ctx.strokeRect(vpLeft, vpTop, vpW, vpH);
      // Inner white inset for contrast
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
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
    <div
      data-hud-id="minimap"
      className="absolute bottom-16 left-2 rounded-lg overflow-hidden cursor-pointer hud-z-minimap"
      style={{
        border: '1px solid var(--panel-border)',
        backgroundColor: 'var(--panel-bg)',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        onClick={handleClick}
      />
    </div>
  );
}
